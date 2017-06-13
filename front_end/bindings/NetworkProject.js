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
Bindings.NetworkProjectManager = class extends Common.Object {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    super();
    this._workspace = workspace;
    targetManager.observeTargets(this);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    new Bindings.NetworkProject(target, this._workspace);
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    Bindings.NetworkProject.forTarget(target)._dispose();
  }
};

Bindings.NetworkProjectManager.Events = {
  FrameAttributionAdded: Symbol('FrameAttributionAdded'),
  FrameAttributionRemoved: Symbol('FrameAttributionRemoved')
};

/**
 * @unrestricted
 */
Bindings.NetworkProject = class {
  /**
   * @param {!SDK.Target} target
   * @param {!Workspace.Workspace} workspace
   */
  constructor(target, workspace) {
    this._target = target;
    this._workspace = workspace;
    /** @type {!Map<string, !Bindings.ContentProviderBasedProject>} */
    this._workspaceProjects = new Map();
    target[Bindings.NetworkProject._networkProjectSymbol] = this;

    this._eventListeners = [];

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
   * @param {string} frameId
   */
  static _resolveFrame(uiSourceCode, frameId) {
    var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
    var resourceTreeModel = target && target.model(SDK.ResourceTreeModel);
    return resourceTreeModel ? resourceTreeModel.frameForId(frameId) : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static setInitialFrameAttribution(uiSourceCode, frameId) {
    var frame = Bindings.NetworkProject._resolveFrame(uiSourceCode, frameId);
    if (!frame)
      return;
    var attribution = new Map();
    attribution.set(frameId, {frame: frame, count: 1});
    uiSourceCode[Bindings.NetworkProject._frameAttributionSymbol] = attribution;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static addFrameAttribution(uiSourceCode, frameId) {
    var frame = Bindings.NetworkProject._resolveFrame(uiSourceCode, frameId);
    if (!frame)
      return;
    var frameAttribution = uiSourceCode[Bindings.NetworkProject._frameAttributionSymbol];
    var attributionInfo = frameAttribution.get(frameId) || {frame: frame, count: 0};
    attributionInfo.count += 1;
    frameAttribution.set(frameId, attributionInfo);
    if (attributionInfo.count !== 1)
      return;

    var data = {uiSourceCode: uiSourceCode, frame: frame};
    Bindings.networkProjectManager.dispatchEventToListeners(
        Bindings.NetworkProjectManager.Events.FrameAttributionAdded, data);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {string} frameId
   */
  static removeFrameAttribution(uiSourceCode, frameId) {
    var frameAttribution = uiSourceCode[Bindings.NetworkProject._frameAttributionSymbol];
    var attributionInfo = frameAttribution.get(frameId);
    console.assert(attributionInfo, 'Failed to remove frame attribution for url: ' + uiSourceCode.url());
    attributionInfo.count -= 1;
    if (attributionInfo.count > 0)
      return;
    frameAttribution.delete(frameId);
    var data = {uiSourceCode: uiSourceCode, frame: attributionInfo.frame};
    Bindings.networkProjectManager.dispatchEventToListeners(
        Bindings.NetworkProjectManager.Events.FrameAttributionRemoved, data);
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {?SDK.Target} target
   */
  static targetForUISourceCode(uiSourceCode) {
    return uiSourceCode.project()[Bindings.NetworkProject._targetSymbol] || null;
  }

  /**
   * @param {!Workspace.Project} project
   * @param {!SDK.Target} target
   */
  static setTargetForProject(project, target) {
    project[Bindings.NetworkProject._targetSymbol] = target;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @return {!Array<!SDK.ResourceTreeFrame>}
   */
  static framesForUISourceCode(uiSourceCode) {
    var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
    var resourceTreeModel = target && target.model(SDK.ResourceTreeModel);
    var attribution = uiSourceCode[Bindings.NetworkProject._frameAttributionSymbol];
    if (!resourceTreeModel || !attribution)
      return [];
    var frames = Array.from(attribution.keys()).map(frameId => resourceTreeModel.frameForId(frameId));
    return frames.filter(frame => !!frame);
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
   * @param {string} mimeType
   */
  _addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType) {
    /** @type {!Bindings.ContentProviderBasedProject} */ (uiSourceCode.project())
        .addUISourceCodeWithProvider(uiSourceCode, contentProvider, metadata, mimeType);
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
    var metadata = Bindings.metadataForURL(this._target, frameId, uiSourceCode.url());
    this._addUISourceCodeWithProvider(uiSourceCode, originalContentProvider, metadata, 'text/javascript');
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
   * @param {!Common.ContentProvider} contentProvider
   * @param {string} frameId
   * @param {boolean} isContentScript
   * @return {!Workspace.UISourceCode}
   */
  _createFile(contentProvider, frameId, isContentScript) {
    var url = contentProvider.contentURL();
    var project = this._workspaceProject(frameId, isContentScript);
    var uiSourceCode = project.createUISourceCode(url, contentProvider.contentType());
    if (frameId)
      Bindings.NetworkProject.setInitialFrameAttribution(uiSourceCode, frameId);
    return uiSourceCode;
  }

  _dispose() {
    for (var project of this._workspaceProjects.values())
      project.removeProject();
    Common.EventTarget.removeEventListeners(this._eventListeners);
    delete this._target[Bindings.NetworkProject._networkProjectSymbol];
    this._workspaceProjects.clear();
  }

  _resetForTest() {
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
};

Bindings.NetworkProject._networkProjectSymbol = Symbol('networkProject');
Bindings.NetworkProject._targetSymbol = Symbol('target');
Bindings.NetworkProject._frameIdSymbol = Symbol('frameid');

Bindings.NetworkProject._frameAttributionSymbol = Symbol('Bindings.NetworkProject._frameAttributionSymbol');
