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
    new Bindings.NetworkProject(target, this._workspace, SDK.ResourceTreeModel.fromTarget(target));
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
Bindings.NetworkProject = class extends SDK.SDKObject {
  /**
   * @param {!SDK.Target} target
   * @param {!Workspace.Workspace} workspace
   * @param {?SDK.ResourceTreeModel} resourceTreeModel
   */
  constructor(target, workspace, resourceTreeModel) {
    super(target);
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
          resourceTreeModel.addEventListener(
              SDK.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this));
    }

    var debuggerModel = SDK.DebuggerModel.fromTarget(target);
    if (debuggerModel) {
      this._eventListeners.push(
          debuggerModel.addEventListener(SDK.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this),
          debuggerModel.addEventListener(
              SDK.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this));
    }
    var cssModel = target.model(SDK.CSSModel);
    if (cssModel) {
      this._eventListeners.push(
          cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
          cssModel.addEventListener(SDK.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this));
    }
    this._eventListeners.push(target.targetManager().addEventListener(
        SDK.TargetManager.Events.SuspendStateChanged, this._suspendStateChanged, this));
  }

  /**
   * @param {!SDK.Target} target
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {boolean} isContentScripts
   * @return {string}
   */
  static projectId(target, frame, isContentScripts) {
    return target.id() + ':' + (frame ? frame.id : '') + ':' + (isContentScripts ? 'contentscripts' : '');
  }

  /**
   * @param {!SDK.Target} target
   * @return {!Bindings.NetworkProject}
   */
  static forTarget(target) {
    return target[Bindings.NetworkProject._networkProjectSymbol];
  }

  /**
   * @param {!Workspace.Project} project
   * @return {?SDK.Target} target
   */
  static targetForProject(project) {
    return project[Bindings.NetworkProject._targetSymbol] || null;
  }

  /**
   * @param {!Workspace.Project} project
   * @return {?SDK.ResourceTreeFrame}
   */
  static frameForProject(project) {
    return project[Bindings.NetworkProject._frameSymbol] || null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?SDK.Target} target
   */
  static targetForUISourceCode(uiSourceCode) {
    return uiSourceCode[Bindings.NetworkProject._targetSymbol] || null;
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
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {boolean} isContentScripts
   * @return {!Bindings.ContentProviderBasedProject}
   */
  _workspaceProject(frame, isContentScripts) {
    var projectId = Bindings.NetworkProject.projectId(this.target(), frame, isContentScripts);
    var projectType = isContentScripts ? Workspace.projectTypes.ContentScripts : Workspace.projectTypes.Network;

    var project = this._workspaceProjects.get(projectId);
    if (project)
      return project;

    project = new Bindings.ContentProviderBasedProject(
        this._workspace, projectId, projectType, '', false /* isServiceProject */);
    project[Bindings.NetworkProject._targetSymbol] = this.target();
    project[Bindings.NetworkProject._frameSymbol] = frame;
    this._workspaceProjects.set(projectId, project);
    return project;
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {boolean} isContentScript
   * @param {?number} contentSize
   * @return {!Workspace.UISourceCode}
   */
  addFile(contentProvider, frame, isContentScript, contentSize) {
    var uiSourceCode = this._createFile(contentProvider, frame, isContentScript || false);
    var metadata = typeof contentSize === 'number' ? new Workspace.UISourceCodeMetadata(null, contentSize) : null;
    this._addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
    return uiSourceCode;
  }

  /**
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {string} url
   */
  _removeFileForURL(frame, url) {
    var project = this._workspaceProjects.get(Bindings.NetworkProject.projectId(this.target(), frame, false));
    if (!project)
      return;
    project.removeFile(url);
  }

  _populate() {
    /**
     * @param {!SDK.ResourceTreeFrame} frame
     * @this {Bindings.NetworkProject}
     */
    function populateFrame(frame) {
      for (var i = 0; i < frame.childFrames.length; ++i)
        populateFrame.call(this, frame.childFrames[i]);

      var resources = frame.resources();
      for (var i = 0; i < resources.length; ++i)
        this._addResource(resources[i]);
    }

    var resourceTreeModel = this._resourceTreeModel;
    var mainFrame = resourceTreeModel && resourceTreeModel.mainFrame;
    if (mainFrame)
      populateFrame.call(this, mainFrame);
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
   * @param {!Common.Event} event
   */
  _parsedScriptSource(event) {
    var script = /** @type {!SDK.Script} */ (event.data);
    if (!script.sourceURL || script.isLiveEdit() || (script.isInlineScript() && !script.hasSourceURL))
      return;
    // Filter out embedder injected content scripts.
    if (script.isContentScript() && !script.hasSourceURL) {
      var parsedURL = new Common.ParsedURL(script.sourceURL);
      if (!parsedURL.isValid)
        return;
    }
    var originalContentProvider = script.originalContentProvider();
    var uiSourceCode =
        this._createFile(originalContentProvider, SDK.ResourceTreeFrame.fromScript(script), script.isContentScript());
    uiSourceCode[Bindings.NetworkProject._scriptSymbol] = script;
    var resource = SDK.ResourceTreeModel.resourceForURL(uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, this._resourceMetadata(resource));
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetAdded(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (header.isInline && !header.hasSourceURL && header.origin !== 'inspector')
      return;
    if (!header.resourceURL())
      return;

    var originalContentProvider = header.originalContentProvider();
    var uiSourceCode = this._createFile(originalContentProvider, SDK.ResourceTreeFrame.fromStyleSheet(header), false);
    uiSourceCode[Bindings.NetworkProject._styleSheetSymbol] = header;
    var resource = SDK.ResourceTreeModel.resourceForURL(uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, this._resourceMetadata(resource));
  }

  /**
   * @param {!Common.Event} event
   */
  _styleSheetRemoved(event) {
    var header = /** @type {!SDK.CSSStyleSheetHeader} */ (event.data);
    if (header.isInline && !header.hasSourceURL && header.origin !== 'inspector')
      return;

    this._removeFileForURL(SDK.ResourceTreeFrame.fromStyleSheet(header), header.resourceURL());
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
  _addResource(resource) {
    var resourceType = resource.resourceType();
    // Only load selected resource types from resources.
    if (resourceType !== Common.resourceTypes.Image && resourceType !== Common.resourceTypes.Font &&
        resourceType !== Common.resourceTypes.Document && resourceType !== Common.resourceTypes.Manifest)
      return;


    // Ignore non-images and non-fonts.
    if (resourceType === Common.resourceTypes.Image && resource.mimeType && !resource.mimeType.startsWith('image'))
      return;
    if (resourceType === Common.resourceTypes.Font && resource.mimeType && !resource.mimeType.includes('font'))
      return;
    if ((resourceType === Common.resourceTypes.Image || resourceType === Common.resourceTypes.Font) &&
        resource.contentURL().startsWith('data:'))
      return;

    // Never load document twice.
    if (this._workspace.uiSourceCodeForURL(resource.url))
      return;

    var uiSourceCode = this._createFile(resource, SDK.ResourceTreeFrame.fromResource(resource), false);
    uiSourceCode[Bindings.NetworkProject._resourceSymbol] = resource;
    this._addUISourceCodeWithProvider(uiSourceCode, resource, this._resourceMetadata(resource));
  }

  /**
   * @param {!Common.Event} event
   */
  _frameWillNavigate(event) {
    var frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    var project = this._workspaceProject(frame, false);
    for (var resource of frame.resources())
      project.removeUISourceCode(resource.url);
    project = this._workspaceProject(frame, true);
    for (var resource of frame.resources())
      project.removeUISourceCode(resource.url);
  }

  /**
   * @param {!Common.Event} event
   */
  _mainFrameNavigated(event) {
    this._reset();
    this._populate();
  }

  _suspendStateChanged() {
    if (this.target().targetManager().allTargetsSuspended())
      this._reset();
    else
      this._populate();
  }

  /**
   * @param {!Common.ContentProvider} contentProvider
   * @param {?SDK.ResourceTreeFrame} frame
   * @param {boolean} isContentScript
   * @return {!Workspace.UISourceCode}
   */
  _createFile(contentProvider, frame, isContentScript) {
    var url = contentProvider.contentURL();
    var project = this._workspaceProject(frame, isContentScript);
    var uiSourceCode = project.createUISourceCode(url, contentProvider.contentType());
    uiSourceCode[Bindings.NetworkProject._targetSymbol] = this.target();
    return uiSourceCode;
  }

  /**
   * @param {?SDK.Resource} resource
   * @return {?Workspace.UISourceCodeMetadata}
   */
  _resourceMetadata(resource) {
    if (!resource || (typeof resource.contentSize() !== 'number' && !resource.lastModified()))
      return null;
    return new Workspace.UISourceCodeMetadata(resource.lastModified(), resource.contentSize());
  }

  _dispose() {
    this._reset();
    Common.EventTarget.removeEventListeners(this._eventListeners);
    delete this.target()[Bindings.NetworkProject._networkProjectSymbol];
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
    var frame = SDK.ResourceTreeFrame.fromScript(script);
    return workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frame, false), url) ||
        workspace.uiSourceCode(Bindings.NetworkProject.projectId(target, frame, true), url);
  }

  /**
   * @param {!Workspace.Workspace} workspace
   * @param {string} url
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {?Workspace.UISourceCode}
   */
  static uiSourceCodeForStyleURL(workspace, url, header) {
    var frame = SDK.ResourceTreeFrame.fromStyleSheet(header);
    return workspace.uiSourceCode(Bindings.NetworkProject.projectId(header.target(), frame, false), url);
  }
};

Bindings.NetworkProject._networkProjectSymbol = Symbol('networkProject');
Bindings.NetworkProject._resourceSymbol = Symbol('resource');
Bindings.NetworkProject._scriptSymbol = Symbol('script');
Bindings.NetworkProject._styleSheetSymbol = Symbol('styleSheet');
Bindings.NetworkProject._targetSymbol = Symbol('target');
Bindings.NetworkProject._frameSymbol = Symbol('frame');
