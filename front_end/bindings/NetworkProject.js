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
 * @implements {WebInspector.TargetManager.Observer}
 * @unrestricted
 */
WebInspector.NetworkProjectManager = class {
  /**
   * @param {!WebInspector.TargetManager} targetManager
   * @param {!WebInspector.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;
    targetManager.observeTargets(this);
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetAdded(target) {
    new WebInspector.NetworkProject(target, this._workspace, WebInspector.ResourceTreeModel.fromTarget(target));
  }

  /**
   * @override
   * @param {!WebInspector.Target} target
   */
  targetRemoved(target) {
    WebInspector.NetworkProject.forTarget(target)._dispose();
  }
};

/**
 * @unrestricted
 */
WebInspector.NetworkProject = class extends WebInspector.SDKObject {
  /**
   * @param {!WebInspector.Target} target
   * @param {!WebInspector.Workspace} workspace
   * @param {?WebInspector.ResourceTreeModel} resourceTreeModel
   */
  constructor(target, workspace, resourceTreeModel) {
    super(target);
    this._workspace = workspace;
    /** @type {!Map<string, !WebInspector.ContentProviderBasedProject>} */
    this._workspaceProjects = new Map();
    this._resourceTreeModel = resourceTreeModel;
    target[WebInspector.NetworkProject._networkProjectSymbol] = this;

    this._eventListeners = [];

    if (resourceTreeModel) {
      this._eventListeners.push(
          resourceTreeModel.addEventListener(
              WebInspector.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this),
          resourceTreeModel.addEventListener(
              WebInspector.ResourceTreeModel.Events.FrameWillNavigate, this._frameWillNavigate, this),
          resourceTreeModel.addEventListener(
              WebInspector.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this));
    }

    var debuggerModel = WebInspector.DebuggerModel.fromTarget(target);
    if (debuggerModel) {
      this._eventListeners.push(
          debuggerModel.addEventListener(
              WebInspector.DebuggerModel.Events.ParsedScriptSource, this._parsedScriptSource, this),
          debuggerModel.addEventListener(
              WebInspector.DebuggerModel.Events.FailedToParseScriptSource, this._parsedScriptSource, this));
    }
    var cssModel = WebInspector.CSSModel.fromTarget(target);
    if (cssModel) {
      this._eventListeners.push(
          cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetAdded, this._styleSheetAdded, this),
          cssModel.addEventListener(WebInspector.CSSModel.Events.StyleSheetRemoved, this._styleSheetRemoved, this));
    }
    this._eventListeners.push(target.targetManager().addEventListener(
        WebInspector.TargetManager.Events.SuspendStateChanged, this._suspendStateChanged, this));
  }

  /**
   * @param {!WebInspector.Target} target
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {boolean} isContentScripts
   * @return {string}
   */
  static projectId(target, frame, isContentScripts) {
    return target.id() + ':' + (frame ? frame.id : '') + ':' + (isContentScripts ? 'contentscripts' : '');
  }

  /**
   * @param {!WebInspector.Target} target
   * @return {!WebInspector.NetworkProject}
   */
  static forTarget(target) {
    return target[WebInspector.NetworkProject._networkProjectSymbol];
  }

  /**
   * @param {!WebInspector.Project} project
   * @return {?WebInspector.Target} target
   */
  static targetForProject(project) {
    return project[WebInspector.NetworkProject._targetSymbol] || null;
  }

  /**
   * @param {!WebInspector.Project} project
   * @return {?WebInspector.ResourceTreeFrame}
   */
  static frameForProject(project) {
    return project[WebInspector.NetworkProject._frameSymbol] || null;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {?WebInspector.Target} target
   */
  static targetForUISourceCode(uiSourceCode) {
    return uiSourceCode[WebInspector.NetworkProject._targetSymbol] || null;
  }

  /**
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @return {string}
   */
  static uiSourceCodeMimeType(uiSourceCode) {
    if (uiSourceCode[WebInspector.NetworkProject._scriptSymbol] ||
        uiSourceCode[WebInspector.NetworkProject._styleSheetSymbol]) {
      return uiSourceCode.contentType().canonicalMimeType();
    }
    var resource = uiSourceCode[WebInspector.NetworkProject._resourceSymbol];
    if (resource)
      return resource.mimeType;
    var mimeType = WebInspector.ResourceType.mimeFromURL(uiSourceCode.url());
    return mimeType || uiSourceCode.contentType().canonicalMimeType();
  }

  /**
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {boolean} isContentScripts
   * @return {!WebInspector.ContentProviderBasedProject}
   */
  _workspaceProject(frame, isContentScripts) {
    var projectId = WebInspector.NetworkProject.projectId(this.target(), frame, isContentScripts);
    var projectType = isContentScripts ? WebInspector.projectTypes.ContentScripts : WebInspector.projectTypes.Network;

    var project = this._workspaceProjects.get(projectId);
    if (project)
      return project;

    project = new WebInspector.ContentProviderBasedProject(this._workspace, projectId, projectType, '');
    project[WebInspector.NetworkProject._targetSymbol] = this.target();
    project[WebInspector.NetworkProject._frameSymbol] = frame;
    this._workspaceProjects.set(projectId, project);
    return project;
  }

  /**
   * @param {!WebInspector.ContentProvider} contentProvider
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {boolean} isContentScript
   * @param {?number} contentSize
   * @return {!WebInspector.UISourceCode}
   */
  addFile(contentProvider, frame, isContentScript, contentSize) {
    var uiSourceCode = this._createFile(contentProvider, frame, isContentScript || false);
    var metadata = typeof contentSize === 'number' ? new WebInspector.UISourceCodeMetadata(null, contentSize) : null;
    this._addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
    return uiSourceCode;
  }

  /**
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {string} url
   */
  _removeFileForURL(frame, url) {
    var project = this._workspaceProjects.get(WebInspector.NetworkProject.projectId(this.target(), frame, false));
    if (!project)
      return;
    project.removeFile(url);
  }

  _populate() {
    /**
     * @param {!WebInspector.ResourceTreeFrame} frame
     * @this {WebInspector.NetworkProject}
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
   * @param {!WebInspector.UISourceCode} uiSourceCode
   * @param {!WebInspector.ContentProvider} contentProvider
   * @param {?WebInspector.UISourceCodeMetadata} metadata
   */
  _addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata) {
    /** @type {!WebInspector.ContentProviderBasedProject} */ (uiSourceCode.project())
        .addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata);
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _parsedScriptSource(event) {
    var script = /** @type {!WebInspector.Script} */ (event.data);
    if (!script.sourceURL || script.isLiveEdit() || (script.isInlineScript() && !script.hasSourceURL))
      return;
    // Filter out embedder injected content scripts.
    if (script.isContentScript() && !script.hasSourceURL) {
      var parsedURL = new WebInspector.ParsedURL(script.sourceURL);
      if (!parsedURL.isValid)
        return;
    }
    var uiSourceCode =
        this._createFile(script, WebInspector.ResourceTreeFrame.fromScript(script), script.isContentScript());
    uiSourceCode[WebInspector.NetworkProject._scriptSymbol] = script;
    var resource = WebInspector.ResourceTreeModel.resourceForURL(uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, script, this._resourceMetadata(resource));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _styleSheetAdded(event) {
    var header = /** @type {!WebInspector.CSSStyleSheetHeader} */ (event.data);
    if (header.isInline && !header.hasSourceURL && header.origin !== 'inspector')
      return;

    var originalContentProvider = header.originalContentProvider();
    var uiSourceCode =
        this._createFile(originalContentProvider, WebInspector.ResourceTreeFrame.fromStyleSheet(header), false);
    uiSourceCode[WebInspector.NetworkProject._styleSheetSymbol] = header;
    var resource = WebInspector.ResourceTreeModel.resourceForURL(uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, this._resourceMetadata(resource));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _styleSheetRemoved(event) {
    var header = /** @type {!WebInspector.CSSStyleSheetHeader} */ (event.data);
    if (header.isInline && !header.hasSourceURL && header.origin !== 'inspector')
      return;

    this._removeFileForURL(WebInspector.ResourceTreeFrame.fromStyleSheet(header), header.resourceURL());
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _resourceAdded(event) {
    var resource = /** @type {!WebInspector.Resource} */ (event.data);
    this._addResource(resource);
  }

  /**
   * @param {!WebInspector.Resource} resource
   */
  _addResource(resource) {
    var resourceType = resource.resourceType();
    // Only load selected resource types from resources.
    if (resourceType !== WebInspector.resourceTypes.Image && resourceType !== WebInspector.resourceTypes.Font &&
        resourceType !== WebInspector.resourceTypes.Document && resourceType !== WebInspector.resourceTypes.Manifest) {
      return;
    }

    // Ignore non-images and non-fonts.
    if (resourceType === WebInspector.resourceTypes.Image && resource.mimeType &&
        !resource.mimeType.startsWith('image'))
      return;
    if (resourceType === WebInspector.resourceTypes.Font && resource.mimeType && !resource.mimeType.includes('font'))
      return;
    if ((resourceType === WebInspector.resourceTypes.Image || resourceType === WebInspector.resourceTypes.Font) &&
        resource.contentURL().startsWith('data:'))
      return;

    // Never load document twice.
    if (this._workspace.uiSourceCodeForURL(resource.url))
      return;

    var uiSourceCode = this._createFile(resource, WebInspector.ResourceTreeFrame.fromResource(resource), false);
    uiSourceCode[WebInspector.NetworkProject._resourceSymbol] = resource;
    this._addUISourceCodeWithProvider(uiSourceCode, resource, this._resourceMetadata(resource));
  }

  /**
   * @param {!WebInspector.Event} event
   */
  _frameWillNavigate(event) {
    var frame = /** @type {!WebInspector.ResourceTreeFrame} */ (event.data);
    var project = this._workspaceProject(frame, false);
    for (var resource of frame.resources())
      project.removeUISourceCode(resource.url);
    project = this._workspaceProject(frame, true);
    for (var resource of frame.resources())
      project.removeUISourceCode(resource.url);
  }

  /**
   * @param {!WebInspector.Event} event
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
   * @param {!WebInspector.ContentProvider} contentProvider
   * @param {?WebInspector.ResourceTreeFrame} frame
   * @param {boolean} isContentScript
   * @return {!WebInspector.UISourceCode}
   */
  _createFile(contentProvider, frame, isContentScript) {
    var url = contentProvider.contentURL();
    var project = this._workspaceProject(frame, isContentScript);
    var uiSourceCode = project.createUISourceCode(url, contentProvider.contentType());
    uiSourceCode[WebInspector.NetworkProject._targetSymbol] = this.target();
    return uiSourceCode;
  }

  /**
   * @param {?WebInspector.Resource} resource
   * @return {?WebInspector.UISourceCodeMetadata}
   */
  _resourceMetadata(resource) {
    if (!resource || (typeof resource.contentSize() !== 'number' && !resource.lastModified()))
      return null;
    return new WebInspector.UISourceCodeMetadata(resource.lastModified(), resource.contentSize());
  }

  _dispose() {
    this._reset();
    WebInspector.EventTarget.removeEventListeners(this._eventListeners);
    delete this.target()[WebInspector.NetworkProject._networkProjectSymbol];
  }

  _reset() {
    for (var project of this._workspaceProjects.values())
      project.removeProject();
    this._workspaceProjects.clear();
  }
};

WebInspector.NetworkProject._networkProjectSymbol = Symbol('networkProject');
WebInspector.NetworkProject._resourceSymbol = Symbol('resource');
WebInspector.NetworkProject._scriptSymbol = Symbol('script');
WebInspector.NetworkProject._styleSheetSymbol = Symbol('styleSheet');
WebInspector.NetworkProject._targetSymbol = Symbol('target');
WebInspector.NetworkProject._frameSymbol = Symbol('frame');
