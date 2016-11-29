/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
 * @unrestricted
 */
SDK.ResourceTreeModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   * @param {?SDK.NetworkManager} networkManager
   * @param {!SDK.SecurityOriginManager} securityOriginManager
   */
  constructor(target, networkManager, securityOriginManager) {
    super(SDK.ResourceTreeModel, target);
    if (networkManager) {
      networkManager.addEventListener(SDK.NetworkManager.Events.RequestFinished, this._onRequestFinished, this);
      networkManager.addEventListener(
          SDK.NetworkManager.Events.RequestUpdateDropped, this._onRequestUpdateDropped, this);
    }

    this._agent = target.pageAgent();
    this._agent.enable();
    this._securityOriginManager = securityOriginManager;

    this._fetchResourceTree();

    target.registerPageDispatcher(new SDK.PageDispatcher(this));

    this._pendingReloadOptions = null;
    this._reloadSuspensionCount = 0;
    this._isInterstitialShowing = false;
  }

  /**
   * @param {!SDK.Target} target
   * @return {?SDK.ResourceTreeModel}
   */
  static fromTarget(target) {
    return /** @type {?SDK.ResourceTreeModel} */ (target.model(SDK.ResourceTreeModel));
  }

  /**
   * @return {!Array.<!SDK.ResourceTreeFrame>}
   */
  static frames() {
    var result = [];
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.DOM))
      result = result.concat(SDK.ResourceTreeModel.fromTarget(target)._frames.valuesArray());
    return result;
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource}
   */
  static resourceForURL(url) {
    for (var target of SDK.targetManager.targets(SDK.Target.Capability.DOM)) {
      var mainFrame = SDK.ResourceTreeModel.fromTarget(target).mainFrame;
      var result = mainFrame ? mainFrame.resourceForURL(url) : null;
      if (result)
        return result;
    }
    return null;
  }

  _fetchResourceTree() {
    /** @type {!Map<string, !SDK.ResourceTreeFrame>} */
    this._frames = new Map();
    this._cachedResourcesProcessed = false;
    this._agent.getResourceTree(this._processCachedResources.bind(this));
  }

  _processCachedResources(error, mainFramePayload) {
    if (!error) {
      this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillLoadCachedResources);
      this._addFramesRecursively(null, mainFramePayload);
      this.target().setInspectedURL(mainFramePayload.frame.url);
    }
    this._cachedResourcesProcessed = true;
    this.target().runtimeModel.setExecutionContextComparator(this._executionContextComparator.bind(this));
    this.target().runtimeModel.fireExecutionContextOrderChanged();
    this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.CachedResourcesLoaded);
  }

  /**
   * @return {boolean}
   */
  cachedResourcesLoaded() {
    return this._cachedResourcesProcessed;
  }

  /**
   * @return {boolean}
   */
  isInterstitialShowing() {
    return this._isInterstitialShowing;
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   * @param {boolean=} aboutToNavigate
   */
  _addFrame(frame, aboutToNavigate) {
    this._frames.set(frame.id, frame);
    if (frame.isMainFrame()) {
      this.mainFrame = frame;
      this._securityOriginManager.setMainSecurityOrigin(frame.url);
    }
    this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameAdded, frame);
    if (!aboutToNavigate)
      this._securityOriginManager.addSecurityOrigin(frame.securityOrigin);
  }

  /**
   * @param {!SDK.ResourceTreeFrame} mainFrame
   */
  _handleMainFrameDetached(mainFrame) {
    /**
     * @param {!SDK.ResourceTreeFrame} frame
     * @this {SDK.ResourceTreeModel}
     */
    function removeOriginForFrame(frame) {
      for (var i = 0; i < frame.childFrames.length; ++i)
        removeOriginForFrame.call(this, frame.childFrames[i]);
      if (!frame.isMainFrame())
        this._securityOriginManager.removeSecurityOrigin(frame.securityOrigin);
    }
    removeOriginForFrame.call(this, mainFrame);
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   * @param {?Protocol.Page.FrameId} parentFrameId
   * @return {?SDK.ResourceTreeFrame}
   */
  _frameAttached(frameId, parentFrameId) {
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed && parentFrameId)
      return null;
    if (this._frames.has(frameId))
      return null;

    var parentFrame = parentFrameId ? (this._frames.get(parentFrameId) || null) : null;
    var frame = new SDK.ResourceTreeFrame(this, parentFrame, frameId);
    if (frame.isMainFrame() && this.mainFrame) {
      this._handleMainFrameDetached(this.mainFrame);
      // Navigation to the new backend process.
      this._frameDetached(this.mainFrame.id);
    }
    this._addFrame(frame, true);
    return frame;
  }

  /**
   * @param {!Protocol.Page.Frame} framePayload
   */
  _frameNavigated(framePayload) {
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed && framePayload.parentId)
      return;
    var frame = this._frames.get(framePayload.id);
    if (!frame) {
      // Simulate missed "frameAttached" for a main frame navigation to the new backend process.
      console.assert(!framePayload.parentId, 'Main frame shouldn\'t have parent frame id.');
      frame = this._frameAttached(framePayload.id, framePayload.parentId || '');
      console.assert(frame);
    }

    this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameWillNavigate, frame);

    this._securityOriginManager.removeSecurityOrigin(frame.securityOrigin);
    frame._navigate(framePayload);
    var addedOrigin = frame.securityOrigin;

    this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameNavigated, frame);
    if (frame.isMainFrame()) {
      this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.MainFrameNavigated, frame);
      if (Common.moduleSetting('preserveConsoleLog').get())
        Common.console.log(Common.UIString('Navigated to %s', frame.url));
      else
        this.target().consoleModel.clear();
    }
    if (addedOrigin)
      this._securityOriginManager.addSecurityOrigin(addedOrigin);

    // Fill frame with retained resources (the ones loaded using new loader).
    var resources = frame.resources();
    for (var i = 0; i < resources.length; ++i)
      this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.ResourceAdded, resources[i]);

    if (frame.isMainFrame())
      this.target().setInspectedURL(frame.url);
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   */
  _frameDetached(frameId) {
    // Do nothing unless cached resource tree is processed - it will overwrite everything.
    if (!this._cachedResourcesProcessed)
      return;

    var frame = this._frames.get(frameId);
    if (!frame)
      return;

    this._securityOriginManager.removeSecurityOrigin(frame.securityOrigin);
    if (frame.parentFrame)
      frame.parentFrame._removeChildFrame(frame);
    else
      frame._remove();
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestFinished(event) {
    if (!this._cachedResourcesProcessed)
      return;

    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    if (request.failed || request.resourceType() === Common.resourceTypes.XHR)
      return;

    var frame = this._frames.get(request.frameId);
    if (frame)
      frame._addRequest(request);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestUpdateDropped(event) {
    if (!this._cachedResourcesProcessed)
      return;

    var frameId = event.data.frameId;
    var frame = this._frames.get(frameId);
    if (!frame)
      return;

    var url = event.data.url;
    if (frame._resourcesMap[url])
      return;

    var resource = new SDK.Resource(
        this.target(), null, url, frame.url, frameId, event.data.loaderId,
        Common.resourceTypes[event.data.resourceType], event.data.mimeType, event.data.lastModified, null);
    frame.addResource(resource);
  }

  /**
   * @param {!Protocol.Page.FrameId} frameId
   * @return {!SDK.ResourceTreeFrame}
   */
  frameForId(frameId) {
    return this._frames.get(frameId);
  }

  /**
   * @param {function(!SDK.Resource)} callback
   * @return {boolean}
   */
  forAllResources(callback) {
    if (this.mainFrame)
      return this.mainFrame._callForFrameResources(callback);
    return false;
  }

  /**
   * @return {!Array<!SDK.ResourceTreeFrame>}
   */
  frames() {
    return this._frames.valuesArray();
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource}
   */
  resourceForURL(url) {
    // Workers call into this with no frames available.
    return this.mainFrame ? this.mainFrame.resourceForURL(url) : null;
  }

  /**
   * @param {?SDK.ResourceTreeFrame} parentFrame
   * @param {!Protocol.Page.FrameResourceTree} frameTreePayload
   */
  _addFramesRecursively(parentFrame, frameTreePayload) {
    var framePayload = frameTreePayload.frame;
    var frame = new SDK.ResourceTreeFrame(this, parentFrame, framePayload.id, framePayload);
    this._addFrame(frame);

    var frameResource = this._createResourceFromFramePayload(
        framePayload, framePayload.url, Common.resourceTypes.Document, framePayload.mimeType, null, null);
    frame.addResource(frameResource);

    for (var i = 0; frameTreePayload.childFrames && i < frameTreePayload.childFrames.length; ++i)
      this._addFramesRecursively(frame, frameTreePayload.childFrames[i]);

    for (var i = 0; i < frameTreePayload.resources.length; ++i) {
      var subresource = frameTreePayload.resources[i];
      var resource = this._createResourceFromFramePayload(
          framePayload, subresource.url, Common.resourceTypes[subresource.type], subresource.mimeType,
          subresource.lastModified || null, subresource.contentSize || null);
      frame.addResource(resource);
    }
  }

  /**
   * @param {!Protocol.Page.Frame} frame
   * @param {string} url
   * @param {!Common.ResourceType} type
   * @param {string} mimeType
   * @param {?number} lastModifiedTime
   * @param {?number} contentSize
   * @return {!SDK.Resource}
   */
  _createResourceFromFramePayload(frame, url, type, mimeType, lastModifiedTime, contentSize) {
    var lastModified = typeof lastModifiedTime === 'number' ? new Date(lastModifiedTime * 1000) : null;
    return new SDK.Resource(
        this.target(), null, url, frame.url, frame.id, frame.loaderId, type, mimeType, lastModified, contentSize);
  }

  suspendReload() {
    this._reloadSuspensionCount++;
  }

  resumeReload() {
    this._reloadSuspensionCount--;
    console.assert(this._reloadSuspensionCount >= 0, 'Unbalanced call to ResourceTreeModel.resumeReload()');
    if (!this._reloadSuspensionCount && this._pendingReloadOptions)
      this.reloadPage.apply(this, this._pendingReloadOptions);
  }

  /**
   * @param {boolean=} bypassCache
   * @param {string=} scriptToEvaluateOnLoad
   */
  reloadPage(bypassCache, scriptToEvaluateOnLoad) {
    // Only dispatch PageReloadRequested upon first reload request to simplify client logic.
    if (!this._pendingReloadOptions)
      this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PageReloadRequested);
    if (this._reloadSuspensionCount) {
      this._pendingReloadOptions = [bypassCache, scriptToEvaluateOnLoad];
      return;
    }
    this._pendingReloadOptions = null;
    this.dispatchEventToListeners(SDK.ResourceTreeModel.Events.WillReloadPage);
    this._agent.reload(bypassCache, scriptToEvaluateOnLoad);
  }

  /**
   * @param {function(string, ?string,!Array<!Protocol.Page.AppManifestError>)} callback
   */
  fetchAppManifest(callback) {
    this._agent.getAppManifest(myCallback);
    /**
     * @param {?Protocol.Error} protocolError
     * @param {string} url
     * @param {!Array<!Protocol.Page.AppManifestError>} errors
     * @param {string=} data
     */
    function myCallback(protocolError, url, errors, data) {
      if (protocolError) {
        callback(url, null, []);
        return;
      }
      callback(url, data || null, errors);
    }
  }
  /**
   * @param {!SDK.ExecutionContext} a
   * @param {!SDK.ExecutionContext} b
   * @return {number}
   */
  _executionContextComparator(a, b) {
    /**
     * @param {!SDK.ResourceTreeFrame} frame
     */
    function framePath(frame) {
      var currentFrame = frame;
      var parents = [];
      while (currentFrame) {
        parents.push(currentFrame);
        currentFrame = currentFrame.parentFrame;
      }
      return parents.reverse();
    }

    var framesA = a.frameId ? framePath(this.frameForId(a.frameId)) : [];
    var framesB = b.frameId ? framePath(this.frameForId(b.frameId)) : [];
    var frameA;
    var frameB;
    for (var i = 0;; i++) {
      if (!framesA[i] || !framesB[i] || (framesA[i] !== framesB[i])) {
        frameA = framesA[i];
        frameB = framesB[i];
        break;
      }
    }
    if (!frameA && frameB)
      return -1;

    if (!frameB && frameA)
      return 1;

    if (frameA && frameB)
      return frameA.id.localeCompare(frameB.id);

    return SDK.ExecutionContext.comparator(a, b);
  }
};

/** @enum {symbol} */
SDK.ResourceTreeModel.Events = {
  FrameAdded: Symbol('FrameAdded'),
  FrameNavigated: Symbol('FrameNavigated'),
  FrameDetached: Symbol('FrameDetached'),
  FrameResized: Symbol('FrameResized'),
  FrameWillNavigate: Symbol('FrameWillNavigate'),
  MainFrameNavigated: Symbol('MainFrameNavigated'),
  ResourceAdded: Symbol('ResourceAdded'),
  WillLoadCachedResources: Symbol('WillLoadCachedResources'),
  CachedResourcesLoaded: Symbol('CachedResourcesLoaded'),
  DOMContentLoaded: Symbol('DOMContentLoaded'),
  Load: Symbol('Load'),
  PageReloadRequested: Symbol('PageReloadRequested'),
  WillReloadPage: Symbol('WillReloadPage'),
  ScreencastFrame: Symbol('ScreencastFrame'),
  ScreencastVisibilityChanged: Symbol('ScreencastVisibilityChanged'),
  ColorPicked: Symbol('ColorPicked'),
  InterstitialShown: Symbol('InterstitialShown'),
  InterstitialHidden: Symbol('InterstitialHidden')
};


/**
 * @unrestricted
 */
SDK.ResourceTreeFrame = class {
  /**
   * @param {!SDK.ResourceTreeModel} model
   * @param {?SDK.ResourceTreeFrame} parentFrame
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Page.Frame=} payload
   */
  constructor(model, parentFrame, frameId, payload) {
    this._model = model;
    this._parentFrame = parentFrame;
    this._id = frameId;
    this._url = '';

    if (payload) {
      this._loaderId = payload.loaderId;
      this._name = payload.name;
      this._url = payload.url;
      this._securityOrigin = payload.securityOrigin;
      this._mimeType = payload.mimeType;
    }

    /**
     * @type {!Array.<!SDK.ResourceTreeFrame>}
     */
    this._childFrames = [];

    /**
     * @type {!Object.<string, !SDK.Resource>}
     */
    this._resourcesMap = {};

    if (this._parentFrame)
      this._parentFrame._childFrames.push(this);
  }

  /**
   * @param {!SDK.ExecutionContext|!SDK.CSSStyleSheetHeader|!SDK.Resource} object
   * @return {?SDK.ResourceTreeFrame}
   */
  static _fromObject(object) {
    var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(object.target());
    var frameId = object.frameId;
    if (!resourceTreeModel || !frameId)
      return null;
    return resourceTreeModel.frameForId(frameId);
  }

  /**
   * @param {!SDK.Script} script
   * @return {?SDK.ResourceTreeFrame}
   */
  static fromScript(script) {
    var executionContext = script.executionContext();
    if (!executionContext)
      return null;
    return SDK.ResourceTreeFrame._fromObject(executionContext);
  }

  /**
   * @param {!SDK.CSSStyleSheetHeader} header
   * @return {?SDK.ResourceTreeFrame}
   */
  static fromStyleSheet(header) {
    return SDK.ResourceTreeFrame._fromObject(header);
  }

  /**
   * @param {!SDK.Resource} resource
   * @return {?SDK.ResourceTreeFrame}
   */
  static fromResource(resource) {
    return SDK.ResourceTreeFrame._fromObject(resource);
  }

  /**
   * @return {!SDK.Target}
   */
  target() {
    return this._model.target();
  }

  /**
   * @return {string}
   */
  get id() {
    return this._id;
  }

  /**
   * @return {string}
   */
  get name() {
    return this._name || '';
  }

  /**
   * @return {string}
   */
  get url() {
    return this._url;
  }

  /**
   * @return {string}
   */
  get securityOrigin() {
    return this._securityOrigin;
  }

  /**
   * @return {string}
   */
  get loaderId() {
    return this._loaderId;
  }

  /**
   * @return {?SDK.ResourceTreeFrame}
   */
  get parentFrame() {
    return this._parentFrame;
  }

  /**
   * @return {!Array.<!SDK.ResourceTreeFrame>}
   */
  get childFrames() {
    return this._childFrames;
  }

  /**
   * @return {boolean}
   */
  isMainFrame() {
    return !this._parentFrame;
  }

  /**
   * @param {!Protocol.Page.Frame} framePayload
   */
  _navigate(framePayload) {
    this._loaderId = framePayload.loaderId;
    this._name = framePayload.name;
    this._url = framePayload.url;
    this._securityOrigin = framePayload.securityOrigin;
    this._mimeType = framePayload.mimeType;

    var mainResource = this._resourcesMap[this._url];
    this._resourcesMap = {};
    this._removeChildFrames();
    if (mainResource && mainResource.loaderId === this._loaderId)
      this.addResource(mainResource);
  }

  /**
   * @return {!SDK.Resource}
   */
  get mainResource() {
    return this._resourcesMap[this._url];
  }

  /**
   * @param {!SDK.ResourceTreeFrame} frame
   */
  _removeChildFrame(frame) {
    this._childFrames.remove(frame);
    frame._remove();
  }

  _removeChildFrames() {
    var frames = this._childFrames;
    this._childFrames = [];
    for (var i = 0; i < frames.length; ++i)
      frames[i]._remove();
  }

  _remove() {
    this._removeChildFrames();
    this._model._frames.delete(this.id);
    this._model.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameDetached, this);
  }

  /**
   * @param {!SDK.Resource} resource
   */
  addResource(resource) {
    if (this._resourcesMap[resource.url] === resource) {
      // Already in the tree, we just got an extra update.
      return;
    }
    this._resourcesMap[resource.url] = resource;
    this._model.dispatchEventToListeners(SDK.ResourceTreeModel.Events.ResourceAdded, resource);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _addRequest(request) {
    var resource = this._resourcesMap[request.url];
    if (resource && resource.request === request) {
      // Already in the tree, we just got an extra update.
      return;
    }
    resource = new SDK.Resource(
        this.target(), request, request.url, request.documentURL, request.frameId, request.loaderId,
        request.resourceType(), request.mimeType, null, null);
    this._resourcesMap[resource.url] = resource;
    this._model.dispatchEventToListeners(SDK.ResourceTreeModel.Events.ResourceAdded, resource);
  }

  /**
   * @return {!Array.<!SDK.Resource>}
   */
  resources() {
    var result = [];
    for (var url in this._resourcesMap)
      result.push(this._resourcesMap[url]);
    return result;
  }

  /**
   * @param {string} url
   * @return {?SDK.Resource}
   */
  resourceForURL(url) {
    var resource = this._resourcesMap[url] || null;
    if (resource)
      return resource;
    for (var i = 0; !resource && i < this._childFrames.length; ++i)
      resource = this._childFrames[i].resourceForURL(url);
    return resource;
  }

  /**
   * @param {function(!SDK.Resource)} callback
   * @return {boolean}
   */
  _callForFrameResources(callback) {
    for (var url in this._resourcesMap) {
      if (callback(this._resourcesMap[url]))
        return true;
    }

    for (var i = 0; i < this._childFrames.length; ++i) {
      if (this._childFrames[i]._callForFrameResources(callback))
        return true;
    }
    return false;
  }

  /**
   * @return {string}
   */
  displayName() {
    if (!this._parentFrame)
      return Common.UIString('top');
    var subtitle = new Common.ParsedURL(this._url).displayName;
    if (subtitle) {
      if (!this._name)
        return subtitle;
      return this._name + ' (' + subtitle + ')';
    }
    return Common.UIString('<iframe>');
  }
};


/**
 * @implements {Protocol.PageDispatcher}
 * @unrestricted
 */
SDK.PageDispatcher = class {
  constructor(resourceTreeModel) {
    this._resourceTreeModel = resourceTreeModel;
  }

  /**
   * @override
   * @param {number} time
   */
  domContentEventFired(time) {
    this._resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.DOMContentLoaded, time);
  }

  /**
   * @override
   * @param {number} time
   */
  loadEventFired(time) {
    this._resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.Load, time);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   * @param {!Protocol.Page.FrameId} parentFrameId
   */
  frameAttached(frameId, parentFrameId) {
    this._resourceTreeModel._frameAttached(frameId, parentFrameId);
  }

  /**
   * @override
   * @param {!Protocol.Page.Frame} frame
   */
  frameNavigated(frame) {
    this._resourceTreeModel._frameNavigated(frame);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameDetached(frameId) {
    this._resourceTreeModel._frameDetached(frameId);
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameStartedLoading(frameId) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameStoppedLoading(frameId) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   * @param {number} delay
   */
  frameScheduledNavigation(frameId, delay) {
  }

  /**
   * @override
   * @param {!Protocol.Page.FrameId} frameId
   */
  frameClearedScheduledNavigation(frameId) {
  }

  /**
   * @override
   */
  frameResized() {
    this._resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.FrameResized, null);
  }

  /**
   * @override
   * @param {string} message
   * @param {string} dialogType
   */
  javascriptDialogOpening(message, dialogType) {
  }

  /**
   * @override
   * @param {boolean} result
   */
  javascriptDialogClosed(result) {
  }

  /**
   * @override
   * @param {string} data
   * @param {!Protocol.Page.ScreencastFrameMetadata=} metadata
   * @param {number=} sessionId
   */
  screencastFrame(data, metadata, sessionId) {
    this._resourceTreeModel._agent.screencastFrameAck(sessionId);
    this._resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.ScreencastFrame, {data: data, metadata: metadata});
  }

  /**
   * @override
   * @param {boolean} visible
   */
  screencastVisibilityChanged(visible) {
    this._resourceTreeModel.dispatchEventToListeners(
        SDK.ResourceTreeModel.Events.ScreencastVisibilityChanged, {visible: visible});
  }

  /**
   * @override
   * @param {!Protocol.DOM.RGBA} color
   */
  colorPicked(color) {
    this._resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.ColorPicked, color);
  }

  /**
   * @override
   */
  interstitialShown() {
    this._resourceTreeModel._isInterstitialShowing = true;
    this._resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialShown);
  }

  /**
   * @override
   */
  interstitialHidden() {
    this._resourceTreeModel._isInterstitialShowing = false;
    this._resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.InterstitialHidden);
  }

  /**
   * @override
   */
  navigationRequested() {
    // Frontend is not interested in when navigations are requested.
  }
};
