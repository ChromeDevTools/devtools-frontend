// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {SDK.SDKModelObserver<!SDK.ResourceTreeModel>}
 */
Bindings.ResourceMapping = class {
  /**
   * @param {!SDK.TargetManager} targetManager
   * @param {!Workspace.Workspace} workspace
   */
  constructor(targetManager, workspace) {
    this._workspace = workspace;
    /** @type {!Map<!SDK.ResourceTreeModel, !Bindings.ResourceMapping.ModelInfo>} */
    this._modelToInfo = new Map();
    targetManager.observeModels(SDK.ResourceTreeModel, this);
  }

  /**
   * @override
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  modelAdded(resourceTreeModel) {
    var info = new Bindings.ResourceMapping.ModelInfo(this._workspace, resourceTreeModel);
    this._modelToInfo.set(resourceTreeModel, info);
  }

  /**
   * @override
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  modelRemoved(resourceTreeModel) {
    var info = this._modelToInfo.get(resourceTreeModel);
    info.dispose();
    this._modelToInfo.delete(resourceTreeModel);
  }

  /**
   * @param {!SDK.Target} target
   * @return {?Bindings.ResourceMapping.ModelInfo}
   */
  _infoForTarget(target) {
    var resourceTreeModel = target.model(SDK.ResourceTreeModel);
    return resourceTreeModel ? this._modelToInfo.get(resourceTreeModel) : null;
  }

  /**
   * @param {!SDK.CSSLocation} cssLocation
   * @return {?Workspace.UILocation}
   */
  cssLocationToUILocation(cssLocation) {
    var info = this._infoForTarget(cssLocation.cssModel().target());
    if (!info)
      return null;
    var uiSourceCode = info._project.uiSourceCodeForURL(cssLocation.url);
    return uiSourceCode ? uiSourceCode.uiLocation(cssLocation.lineNumber, cssLocation.columnNumber) : null;
  }

  /**
   * @param {!SDK.DebuggerModel.Location} jsLocation
   * @return {?Workspace.UILocation}
   */
  jsLocationToUILocation(jsLocation) {
    var script = jsLocation.script();
    if (!script)
      return null;
    var info = this._infoForTarget(jsLocation.debuggerModel.target());
    if (!info)
      return null;
    var uiSourceCode = info._project.uiSourceCodeForURL(script.sourceURL);
    return uiSourceCode ? uiSourceCode.uiLocation(jsLocation.lineNumber, jsLocation.columnNumber) : null;
  }

  /**
   * @param {!Workspace.UISourceCode} uiSourceCode
   * @param {number} lineNumber
   * @param {number} columnNumber
   * @return {?SDK.DebuggerModel.Location}
   */
  uiLocationToJSLocation(uiSourceCode, lineNumber, columnNumber) {
    if (!uiSourceCode[Bindings.ResourceMapping._symbol])
      return null;
    var target = Bindings.NetworkProject.targetForUISourceCode(uiSourceCode);
    if (!target)
      return null;
    var debuggerModel = target.model(SDK.DebuggerModel);
    if (!debuggerModel)
      return null;
    return debuggerModel.createRawLocationByURL(uiSourceCode.url(), lineNumber, columnNumber);
  }

  /**
   * @param {!SDK.Target} target
   */
  _resetForTest(target) {
    var resourceTreeModel = target.model(SDK.ResourceTreeModel);
    var info = resourceTreeModel ? this._modelToInfo.get(resourceTreeModel) : null;
    if (info)
      info._resetForTest();
  }
};

Bindings.ResourceMapping.ModelInfo = class {
  /**
   * @param {!Workspace.Workspace} workspace
   * @param {!SDK.ResourceTreeModel} resourceTreeModel
   */
  constructor(workspace, resourceTreeModel) {
    var target = resourceTreeModel.target();
    this._project = new Bindings.ContentProviderBasedProject(
        workspace, 'resources:' + target.id(), Workspace.projectTypes.Network, '', false /* isServiceProject */);
    Bindings.NetworkProject.setTargetForProject(this._project, target);

    /** @type {!Map<string, !Bindings.ResourceMapping.Binding>} */
    this._bindings = new Map();

    this._eventListeners = [
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.ResourceAdded, this._resourceAdded, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameWillNavigate, this._frameWillNavigate, this),
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.FrameDetached, this._frameDetached, this)
    ];
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
   * @param {!Common.Event} event
   */
  _resourceAdded(event) {
    var resource = /** @type {!SDK.Resource} */ (event.data);
    if (!this._acceptsResource(resource))
      return;

    var binding = this._bindings.get(resource.url);
    if (!binding) {
      binding = new Bindings.ResourceMapping.Binding(this._project, resource);
      this._bindings.set(resource.url, binding);
    } else {
      binding.addResource(resource);
    }
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _removeFrameResources(frame) {
    for (var resource of frame.resources()) {
      if (!this._acceptsResource(resource))
        continue;
      var binding = this._bindings.get(resource.url);
      if (binding._resources.size === 1) {
        binding.dispose();
        this._bindings.delete(resource.url);
      } else {
        binding.removeResource(resource);
      }
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

  _resetForTest() {
    for (var binding of this._bindings.valuesArray())
      binding.dispose();
    this._bindings.clear();
  }

  dispose() {
    Common.EventTarget.removeEventListeners(this._eventListeners);
    for (var binding of this._bindings.valuesArray())
      binding.dispose();
    this._bindings.clear();
    this._project.removeProject();
  }
};

/**
 * @implements {Common.ContentProvider}
 */
Bindings.ResourceMapping.Binding = class {
  /**
   * @param {!Bindings.ContentProviderBasedProject} project
   * @param {!SDK.Resource} resource
   */
  constructor(project, resource) {
    this._resources = new Set([resource]);
    this._project = project;
    this._uiSourceCode = this._project.createUISourceCode(resource.url, resource.contentType());
    this._uiSourceCode[Bindings.ResourceMapping._symbol] = true;
    Bindings.NetworkProject.setInitialFrameAttribution(this._uiSourceCode, resource.frameId);
    this._project.addUISourceCodeWithProvider(
        this._uiSourceCode, this, Bindings.resourceMetadata(resource), resource.mimeType);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  addResource(resource) {
    this._resources.add(resource);
    Bindings.NetworkProject.addFrameAttribution(this._uiSourceCode, resource.frameId);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  removeResource(resource) {
    this._resources.delete(resource);
    Bindings.NetworkProject.removeFrameAttribution(this._uiSourceCode, resource.frameId);
  }

  dispose() {
    this._project.removeFile(this._uiSourceCode.url());
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._resources.firstValue().contentURL();
  }

  /**
   * @override
   * @return {!Common.ResourceType}
   */
  contentType() {
    return this._resources.firstValue().contentType();
  }

  /**
   * @override
   * @return {!Promise<boolean>}
   */
  contentEncoded() {
    return this._resources.firstValue().contentEncoded();
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    return this._resources.firstValue().requestContent();
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @return {!Promise<!Array<!Common.ContentProvider.SearchMatch>>}
   */
  searchInContent(query, caseSensitive, isRegex) {
    return this._resources.firstValue().searchInContent(query, caseSensitive, isRegex);
  }
};

Bindings.ResourceMapping._symbol = Symbol('Bindings.ResourceMapping._symbol');