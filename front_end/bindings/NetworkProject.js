/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Bindings.NetworkProjectManager = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;
    targetManager.observeTargets(this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    new Bindings.NetworkProject(target, this._workspace, target.model(SDK.ResourceTreeModel));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    Bindings.NetworkProject.forTarget(target)._dispose();
  }
};

/**
 * @unrestricted
 */
Bindings.NetworkProject = class {
  /**
   * @param {!SDK.Target} target
   * @param {!Workspace.Workspace} workspace
   * @param {?SDK.ResourceTreeModel} resourceTreeModel
   */
  constructor(target, workspace, resourceTreeModel) {
    this._target = target;
    this._workspace = workspace;
    /** @type {!Map<string, !Bindings.ContentProviderBasedProject>} */
    this._workspaceProjects = new Map();
    this._resourceTreeModel = resourceTreeModel;
    target[Bindings.NetworkProject._networkProjectSymbol] = this;

    this._eventListeners = [];

    if (resourceTreeModel) {
      this._eventListeners.push(
          resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this),
          resourceTreeModel.addEventListener(
              SDK.ResourceTreeModel.Events.FrameWillNavigate, this._frameWillNavigate, this),
          resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this));
    }

    this._debuggerModel = target.model(SDK.DebuggerModel);
    /** @type {!Set<!SDK.Script>} */
    this._acceptedScripts = new Set();
    if (this._debuggerModel) {
      var runtimeModel = this._debuggerModel.runtimeModel();
      this._eventListeners.push(
          runtimeModel.addEventListener(
              SDK.RuntimeModel.Events.ExecutionContextDestroyed, this._executionContextDestroyed, this),
          this._debuggerModel.addEventListener(
              SDK.DebuggerModel.Events.GlobalObjectCleared, this._globalObjectCleared, this),
          this._debuggerModel.addEventListener(
              SDK.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this),
          this._debuggerModel.addEventListener(
              SDK.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this));
    }
    var cssModel = target.model(SDK.CSSModel);
    if (cssModel) {
      this._eventListeners.push(
          cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
          cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this));
    }
  }

  /**
   * @param {!SDK.Target} target
   * @param {string} frameId
   * @param {boolean} isContentScripts
   * @return {string}
   */
  static projectId(target, frameId, isContentScripts) {
    return target.id() + ':' + frameId + ':' + (isContentScripts ? 'contentscripts' : '');
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Bindings.NetworkProject}
   */
  static forTarget(target) {
    return target[Bindings.NetworkProject._networkProjectSymbol];
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?Set<string>}
   */
  static frameAttribution(uiSourceCode) {
    var frameId = uiSourceCode[Bindings.NetworkProject._frameAttributionSymbol];
    return frameId ? new Set([frameId]) : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?SDK.Target} target
   */
  static targetForUISourceCode(uiSourceCode) {
    return uiSourceCode.project()[Bindings.NetworkProject._targetSymbol] || null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.ResourceTreeFrame>}
   */
  static framesForUISourceCode(uiSourceCode) {
    var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
    var resourceTreeModel = target && target.model(SDK.ResourceTreeModel);
    var frameIds = Bindings.NetworkProject.frameAttribution(uiSourceCode);
    if (!resourceTreeModel || !frameIds)
      return [];
    var frames = Array.from(frameIds).map(frameId => resourceTreeModel.frameForId(frameId));
    return frames.filter(frame => !!frame);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {string}
   */
  static uiSourceCodeMimeType(uiSourceCode) {
    if (uiSourceCode[Bindings.NetworkProject._scriptSymbol] || uiSourceCode[Bindings.NetworkProject._styleSheetSymbol])
      return uiSourceCode.contentType().canonicalMimeType();

    var resource = uiSourceCode[Bindings.NetworkProject._resourceSymbol];
    if (resource)
      return resource.mimeType;
    var mimeType = Common.ResourceType.mimeFromURL(uiSourceCode.url());
    return mimeType || uiSourceCode.contentType().canonicalMimeType();
  }

  /**
   * @param {string} frameId
   * @param {boolean} isContentScripts
   * @return {!Bindings.ContentProviderBasedProject}
   */
  _workspaceProject(frameId, isContentScripts) {
    var projectId = Bindings.NetworkProject.projectId(this._target, frameId, isContentScripts);
    var projectType = isContentScripts ? Workspace.projectTypes.ContentScripts : Workspace.projectTypes.Network;

    var project = this._workspaceProjects.get(projectId);
    if (project)
      return project;

    project = new Bindings.ContentProviderBasedProject(
        this._workspace, projectId, projectType, '', false /* isServiceProject */);
    project[Bindings.NetworkProject._targetSymbol] = this._target;
    this._workspaceProjects.set(projectId, project);
    return project;
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {string} frameId
   * @param {boolean} isContentScript
   * @param {?number} contentSize
   * @return {!Workspace.UISourceCode}
   */
  addSourceMapFile(contentProvider, frameId, isContentScript, contentSize) {
    var uiSourceCode = this._createFile(contentProvider, frameId, isContentScript || false);
    var metadata = typeof contentSize === 'number' ? new Workspace.UISourceCodeMetadata(null, contentSize) : null;
    this._addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
    return uiSourceCode;
  }

  /**
   * @param {string} url
   * @param {string} frameId
   * @param {boolean} isContentScript
   */
  removeSourceMapFile(url, frameId, isContentScript) {
    this._removeFileForURL(url, frameId, isContentScript);
  }

  /**
   * @param {string} frameId
   * @param {string} url
   * @param {boolean} isContentScript
   */
  _removeFileForURL(url, frameId, isContentScript) {
    var project =
        this._workspaceProjects.get(Bindings.NetworkProject.projectId(this._target, frameId, isContentScript));
    if (!project)
      return;
    project.removeFile(url);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {!Common.ContentProvider} contentProvider
   * @param {?Workspace.UISourceCodeMetadata} metadata
   */
  _addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata) {
    /** @type {!Bindings.ContentProviderBasedProject} */ (uiSourceCode.project())
        .addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
  }

  /**
   * @param {!SDK.Script} script
   * @return {boolean}
   */
  _acceptsScript(script) {
    if (!script.sourceURL || script.isLiveEdit() || (script.isInlineScript() && !script.hasSourceURL))
      return false;
    // Filter out embedder injected content scripts.
    if (script.isContentScript() && !script.hasSourceURL) {
      var parsedURL = new Common.ParsedURL(script.sourceURL);
      if (!parsedURL.isValid)
        return false;
    }
    return true;
  }

  /**
   * @param {!Common.Event} event
   */
  _parsedScriptSource(event) {
    var script = /** @type {!SDK.Script} */ (event.data);
    if (!this._acceptsScript(script))
      return;
    this._acceptedScripts.add(script);
    var originalContentProvider = script.originalContentProvider();
    var frameId = Bindings.frameIdForScript(script);
    script[Bindings.NetworkProject._frameIdSymbol] = frameId;
    var uiSourceCode = this._createFile(originalContentProvider, frameId, script.isContentScript());
    uiSourceCode[Bindings.NetworkProject._scriptSymbol] = script;
    var metadata = this._fetchMetadata(frameId, uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, metadata);
  }

  /**
   * @param {!Common.Event} event
   */
  _executionContextDestroyed(event) {
    var executionContext = /** @type {!SDK.ExecutionContext} */ (event.data);
    var scripts = this._debuggerModel.scriptsForExecutionContext(executionContext);
    this._removeScripts(scripts);
  }

  /**
   * @param {!Array<!SDK.Script>} scripts
   */
  _removeScripts(scripts) {
    for (var script of scripts) {
      if (!this._acceptedScripts.has(script))
        continue;
      this._acceptedScripts.delete(script);
      var frameId = script[Bindings.NetworkProject._frameIdSymbol];
      this._removeFileForURL(script.contentURL(), frameId, script.isContentScript());
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _globalObjectCleared(event) {
    this._removeScripts(Array.from(this._acceptedScripts));
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   */
  _acceptsHeader(header) {
    if (header.isInline && !header.hasSourceURL && header.origin !== 'inspector')
      return false;
    if (!header.resourceURL())
      return false;
    return true;
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetAdded(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (!this._acceptsHeader(header))
      return;

    var originalContentProvider = header.originalContentProvider();
    var uiSourceCode = this._createFile(originalContentProvider, header.frameId, false);
    uiSourceCode[Bindings.NetworkProject._styleSheetSymbol] = header;
    var metadata = this._fetchMetadata(header.frameId, uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, metadata);
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetRemoved(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (!this._acceptsHeader(header))
      return;
    this._removeFileForURL(header.resourceURL(), header.frameId, false);
  }

  /**
   * @param {!Common.Event} event
   */
  _resourceAdded(event) {
    var resource = /** @type {!SDK.Resource} */ (event.data);
    this._addResource(resource);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  _acceptsResource(resource) {
    var resourceType = resource.resourceType();
    // Only load selected resource types from resources.
    if (resourceType !== Common.resourceTypes.Image && resourceType !== Common.resourceTypes.Font &&
        resourceType !== Common.resourceTypes.Document && resourceType !== Common.resourceTypes.Manifest)
      return false;

    // Ignore non-images and non-fonts.
    if (resourceType === Common.resourceTypes.Image && resource.mimeType && !resource.mimeType.startsWith('image'))
      return false;
    if (resourceType === Common.resourceTypes.Font && resource.mimeType && !resource.mimeType.includes('font'))
      return false;
    if ((resourceType === Common.resourceTypes.Image || resourceType === Common.resourceTypes.Font) &&
        resource.contentURL().startsWith('data:'))
      return false;
    return true;
  }

  /**
   * @param {!SDK.Resource} resource
   */
  _addResource(resource) {
    if (!this._acceptsResource(resource))
      return;

    var uiSourceCode = this._createFile(resource, resource.frameId, false);
    uiSourceCode[Bindings.NetworkProject._resourceSymbol] = resource;
    this._addUISourceCodeWithProvider(uiSourceCode, resource, Bindings.resourceMetadata(resource));
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _removeFrameResources(frame) {
    var regularProject = this._workspaceProject(frame.id, false);
    var contentScriptsProject = this._workspaceProject(frame.id, true);
    for (var resource of frame.resources()) {
      if (!this._acceptsResource(resource))
        continue;
      regularProject.removeFile(resource.url);
      contentScriptsProject.removeFile(resource.url);
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _frameWillNavigate(event) {
    var frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    this._removeFrameResources(frame);
  }

  /**
   * @param {!Common.Event} event
   */
  _frameDetached(event) {
    var frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    this._removeFrameResources(frame);
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {string} frameId
   * @param {boolean} isContentScript
   * @return {!Workspace.UISourceCode}
   */
  _createFile(contentProvider, frameId, isContentScript) {
    var url = contentProvider.contentURL();
    var project = this._workspaceProject(frameId, isContentScript);
    var uiSourceCode = project.createUISourceCode(url, contentProvider.contentType());
    uiSourceCode[Bindings.NetworkProject._frameAttributionSymbol] = frameId;
    return uiSourceCode;
  }

  /**
   * @param {string} frameId
   * @param {string} url
   * @return {?Workspace.UISourceCodeMetadata}
   */
  _fetchMetadata(frameId, url) {
    if (!this._resourceTreeModel)
      return null;
    var frame = this._resourceTreeModel.frameForId(frameId);
    if (!frame)
      return null;
    return Bindings.resourceMetadata(frame.resourceForURL(url));
  }

  _dispose() {
    this._reset();
    Common.EventTarget.removeEventListeners(this._eventListeners);
    delete this._target[Bindings.NetworkProject._networkProjectSymbol];
  }

  _reset() {
    for (var project of this._workspaceProjects.values())
      project.removeProject();
    this._workspaceProjects.clear();
  }

  /**
   * @param {!Workspace.Workspace} workspace
   * @param {string} url
   * @param {!SDK.Script} script
   * @return {?Workspace.UISourceCode}
   */
  static uiSourceCodeForScriptURL(workspace, url, script) {
    var target = script.debuggerModel.target();
    var executionContext = script.executionContext();
    var frameId = executionContext ? executionContext.frameId || '' : '';
    return workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frameId, false), url) ||
        workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frameId, true), url);
  }

  /**
   * @param {!Workspace.Workspace} workspace
   * @param {string} url
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {?Workspace.UISourceCode}
   */
  static uiSourceCodeForStyleURL(workspace, url, header) {
    return workspace.uiSourceCode(
        Bindings.NetworkProject.projectId(header.cssModel().target(), header.frameId, false), url);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?SDK.CSSStyleSheetHeader}
   */
  static styleHeaderForUISourceCode(uiSourceCode) {
    return uiSourceCode[Bindings.NetworkProject._styleSheetSymbol];
  }
};

Bindings.NetworkProject._networkProjectSymbol = Symbol('networkProject');
Bindings.NetworkProject._resourceSymbol = Symbol('resource');
Bindings.NetworkProject._scriptSymbol = Symbol('script');
Bindings.NetworkProject._styleSheetSymbol = Symbol('styleSheet');
Bindings.NetworkProject._targetSymbol = Symbol('target');
Bindings.NetworkProject._frameIdSymbol = Symbol('frameid');

Bindings.NetworkProject._frameAttributionSymbol = Symbol('Bindings.NetworkProject._frameAttributionSymbol');