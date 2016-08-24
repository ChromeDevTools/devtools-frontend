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
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 * @param {?WebInspector.NetworkManager} networkManager
 * @param {!WebInspector.SecurityOriginManager} securityOriginManager
 */
WebInspector.ResourceTreeModel = function(target, networkManager, securityOriginManager)
{
    WebInspector.SDKModel.call(this, WebInspector.ResourceTreeModel, target);
    if (networkManager) {
        networkManager.addEventListener(WebInspector.NetworkManager.Events.RequestFinished,
            this._onRequestFinished, this);
        networkManager.addEventListener(WebInspector.NetworkManager.Events.RequestUpdateDropped,
            this._onRequestUpdateDropped, this);
    }

    this._agent = target.pageAgent();
    this._agent.enable();
    this._securityOriginManager = securityOriginManager;

    this._fetchResourceTree();

    target.registerPageDispatcher(new WebInspector.PageDispatcher(this));

    this._pendingReloadOptions = null;
    this._reloadSuspensionCount = 0;
    this._fireExecutionContextOrderChanged = target.runtimeModel.fireExecutionContextOrderChanged.bind(target.runtimeModel);

    target.runtimeModel.setExecutionContextComparator(this._executionContextComparator.bind(this));
}

/** @enum {symbol} */
WebInspector.ResourceTreeModel.Events = {
    FrameAdded: Symbol("FrameAdded"),
    FrameNavigated: Symbol("FrameNavigated"),
    FrameDetached: Symbol("FrameDetached"),
    FrameResized: Symbol("FrameResized"),
    FrameWillNavigate: Symbol("FrameWillNavigate"),
    MainFrameNavigated: Symbol("MainFrameNavigated"),
    ResourceAdded: Symbol("ResourceAdded"),
    WillLoadCachedResources: Symbol("WillLoadCachedResources"),
    CachedResourcesLoaded: Symbol("CachedResourcesLoaded"),
    DOMContentLoaded: Symbol("DOMContentLoaded"),
    Load: Symbol("Load"),
    PageReloadRequested: Symbol("PageReloadRequested"),
    WillReloadPage: Symbol("WillReloadPage"),
    ScreencastFrame: Symbol("ScreencastFrame"),
    ScreencastVisibilityChanged: Symbol("ScreencastVisibilityChanged"),
    ColorPicked: Symbol("ColorPicked"),
    InterstitialShown: Symbol("InterstitialShown"),
    InterstitialHidden: Symbol("InterstitialHidden")
}

/**
 * @param {!WebInspector.Target} target
 * @return {?WebInspector.ResourceTreeModel}
 */
WebInspector.ResourceTreeModel.fromTarget = function(target)
{
    return /** @type {?WebInspector.ResourceTreeModel} */ (target.model(WebInspector.ResourceTreeModel));
}

/**
 * @return {!Array.<!WebInspector.ResourceTreeFrame>}
 */
WebInspector.ResourceTreeModel.frames = function()
{
    var result = [];
    for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.DOM))
        result = result.concat(WebInspector.ResourceTreeModel.fromTarget(target)._frames.valuesArray());
    return result;
}

/**
 * @param {string} url
 * @return {?WebInspector.Resource}
 */
WebInspector.ResourceTreeModel.resourceForURL = function(url)
{
    for (var target of WebInspector.targetManager.targets(WebInspector.Target.Capability.DOM)) {
        var mainFrame = WebInspector.ResourceTreeModel.fromTarget(target).mainFrame;
        var result = mainFrame ? mainFrame.resourceForURL(url) : null;
        if (result)
            return result;
    }
    return null;
}

WebInspector.ResourceTreeModel.prototype = {
    _fetchResourceTree: function()
    {
        /** @type {!Map<string, !WebInspector.ResourceTreeFrame>} */
        this._frames = new Map();
        this._cachedResourcesProcessed = false;
        this._agent.getResourceTree(this._processCachedResources.bind(this));
    },

    _processCachedResources: function(error, mainFramePayload)
    {
        if (!error) {
            this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.WillLoadCachedResources);
            this._addFramesRecursively(null, mainFramePayload);
            this.target().setInspectedURL(mainFramePayload.frame.url);
        }
        this._cachedResourcesProcessed = true;
        this._fireExecutionContextOrderChanged();
        this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.CachedResourcesLoaded);
    },

    /**
     * @return {boolean}
     */
    cachedResourcesLoaded: function()
    {
        return this._cachedResourcesProcessed;
    },

    /**
     * @param {!WebInspector.ResourceTreeFrame} frame
     * @param {boolean=} aboutToNavigate
     */
    _addFrame: function(frame, aboutToNavigate)
    {
        this._frames.set(frame.id, frame);
        if (frame.isMainFrame()) {
            this.mainFrame = frame;
            this._securityOriginManager.setMainSecurityOrigin(frame.url);
        }
        this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.FrameAdded, frame);
        if (!aboutToNavigate)
            this._securityOriginManager.addSecurityOrigin(frame.securityOrigin);
    },

    /**
     * @param {!WebInspector.ResourceTreeFrame} mainFrame
     */
    _handleMainFrameDetached: function(mainFrame)
    {
        /**
         * @param {!WebInspector.ResourceTreeFrame} frame
         * @this {WebInspector.ResourceTreeModel}
         */
        function removeOriginForFrame(frame)
        {
            for (var i = 0; i < frame.childFrames.length; ++i)
                removeOriginForFrame.call(this, frame.childFrames[i]);
            if (!frame.isMainFrame())
                this._securityOriginManager.removeSecurityOrigin(frame.securityOrigin);
        }
        removeOriginForFrame.call(this, mainFrame);
    },

    /**
     * @param {!PageAgent.FrameId} frameId
     * @param {?PageAgent.FrameId} parentFrameId
     * @return {?WebInspector.ResourceTreeFrame}
     */
    _frameAttached: function(frameId, parentFrameId)
    {
        // Do nothing unless cached resource tree is processed - it will overwrite everything.
        if (!this._cachedResourcesProcessed && parentFrameId)
            return null;
        if (this._frames.has(frameId))
            return null;

        var parentFrame = parentFrameId ? (this._frames.get(parentFrameId) || null) : null;
        var frame = new WebInspector.ResourceTreeFrame(this, parentFrame, frameId);
        if (frame.isMainFrame() && this.mainFrame) {
            this._handleMainFrameDetached(this.mainFrame);
            // Navigation to the new backend process.
            this._frameDetached(this.mainFrame.id);
        }
        this._addFrame(frame, true);
        return frame;
    },

    /**
     * @param {!PageAgent.Frame} framePayload
     */
    _frameNavigated: function(framePayload)
    {
        // Do nothing unless cached resource tree is processed - it will overwrite everything.
        if (!this._cachedResourcesProcessed && framePayload.parentId)
            return;
        var frame = this._frames.get(framePayload.id);
        if (!frame) {
            // Simulate missed "frameAttached" for a main frame navigation to the new backend process.
            console.assert(!framePayload.parentId, "Main frame shouldn't have parent frame id.");
            frame = this._frameAttached(framePayload.id, framePayload.parentId || "");
            console.assert(frame);
        }

        this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.FrameWillNavigate, frame);

        this._securityOriginManager.removeSecurityOrigin(frame.securityOrigin);
        frame._navigate(framePayload);
        var addedOrigin = frame.securityOrigin;

        this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.FrameNavigated, frame);
        if (frame.isMainFrame()) {
            this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.MainFrameNavigated, frame);
            if (WebInspector.moduleSetting("preserveConsoleLog").get())
                WebInspector.console.log(WebInspector.UIString("Navigated to %s", frame.url));
            else
                this.target().consoleModel.clear();
        }
        if (addedOrigin)
            this._securityOriginManager.addSecurityOrigin(addedOrigin);

        // Fill frame with retained resources (the ones loaded using new loader).
        var resources = frame.resources();
        for (var i = 0; i < resources.length; ++i)
            this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.ResourceAdded, resources[i]);

        if (frame.isMainFrame())
            this.target().setInspectedURL(frame.url);
    },

    /**
     * @param {!PageAgent.FrameId} frameId
     */
    _frameDetached: function(frameId)
    {
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
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRequestFinished: function(event)
    {
        if (!this._cachedResourcesProcessed)
            return;

        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        if (request.failed || request.resourceType() === WebInspector.resourceTypes.XHR)
            return;

        var frame = this._frames.get(request.frameId);
        if (frame)
            frame._addRequest(request);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRequestUpdateDropped: function(event)
    {
        if (!this._cachedResourcesProcessed)
            return;

        var frameId = event.data.frameId;
        var frame = this._frames.get(frameId);
        if (!frame)
            return;

        var url = event.data.url;
        if (frame._resourcesMap[url])
            return;

        var resource = new WebInspector.Resource(this.target(), null, url, frame.url, frameId, event.data.loaderId, WebInspector.resourceTypes[event.data.resourceType], event.data.mimeType);
        frame.addResource(resource);
    },

    /**
     * @param {!PageAgent.FrameId} frameId
     * @return {!WebInspector.ResourceTreeFrame}
     */
    frameForId: function(frameId)
    {
        return this._frames.get(frameId);
    },

    /**
     * @param {function(!WebInspector.Resource)} callback
     * @return {boolean}
     */
    forAllResources: function(callback)
    {
        if (this.mainFrame)
            return this.mainFrame._callForFrameResources(callback);
        return false;
    },

    /**
     * @return {!Array<!WebInspector.ResourceTreeFrame>}
     */
    frames: function()
    {
        return this._frames.valuesArray();
    },

    /**
     * @param {string} url
     * @return {?WebInspector.Resource}
     */
    resourceForURL: function(url)
    {
        // Workers call into this with no frames available.
        return this.mainFrame ? this.mainFrame.resourceForURL(url) : null;
    },

    /**
     * @param {?WebInspector.ResourceTreeFrame} parentFrame
     * @param {!PageAgent.FrameResourceTree} frameTreePayload
     */
    _addFramesRecursively: function(parentFrame, frameTreePayload)
    {
        var framePayload = frameTreePayload.frame;
        var frame = new WebInspector.ResourceTreeFrame(this, parentFrame, framePayload.id, framePayload);
        this._addFrame(frame);

        var frameResource = this._createResourceFromFramePayload(framePayload, framePayload.url, WebInspector.resourceTypes.Document, framePayload.mimeType);
        frame.addResource(frameResource);

        for (var i = 0; frameTreePayload.childFrames && i < frameTreePayload.childFrames.length; ++i)
            this._addFramesRecursively(frame, frameTreePayload.childFrames[i]);

        for (var i = 0; i < frameTreePayload.resources.length; ++i) {
            var subresource = frameTreePayload.resources[i];
            var resource = this._createResourceFromFramePayload(framePayload, subresource.url, WebInspector.resourceTypes[subresource.type], subresource.mimeType);
            frame.addResource(resource);
        }
    },

    /**
     * @param {!PageAgent.Frame} frame
     * @param {string} url
     * @param {!WebInspector.ResourceType} type
     * @param {string} mimeType
     * @return {!WebInspector.Resource}
     */
    _createResourceFromFramePayload: function(frame, url, type, mimeType)
    {
        return new WebInspector.Resource(this.target(), null, url, frame.url, frame.id, frame.loaderId, type, mimeType);
    },

    suspendReload: function()
    {
        this._reloadSuspensionCount++;
    },

    resumeReload: function()
    {
        this._reloadSuspensionCount--;
        console.assert(this._reloadSuspensionCount >= 0, "Unbalanced call to ResourceTreeModel.resumeReload()");
        if (!this._reloadSuspensionCount && this._pendingReloadOptions)
            this.reloadPage.apply(this, this._pendingReloadOptions);
    },

    /**
     * @param {boolean=} bypassCache
     * @param {string=} scriptToEvaluateOnLoad
     */
    reloadPage: function(bypassCache, scriptToEvaluateOnLoad)
    {
        // Only dispatch PageReloadRequested upon first reload request to simplify client logic.
        if (!this._pendingReloadOptions)
            this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.PageReloadRequested);
        if (this._reloadSuspensionCount) {
            this._pendingReloadOptions = [bypassCache, scriptToEvaluateOnLoad];
            return;
        }
        this._pendingReloadOptions = null;
        this.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.WillReloadPage);
        this._agent.reload(bypassCache, scriptToEvaluateOnLoad);
    },

    /**
     * @param {function(string, ?string,!Array<!PageAgent.AppManifestError>)} callback
     */
    fetchAppManifest: function(callback)
    {
        this._agent.getAppManifest(myCallback);
        /**
         * @param {?Protocol.Error} protocolError
         * @param {string} url
         * @param {!Array<!PageAgent.AppManifestError>} errors
         * @param {string=} data
         */
        function myCallback(protocolError, url, errors, data)
        {
            if (protocolError) {
                callback(url, null, []);
                return;
            }
            callback(url, data || null, errors);
        }
    },
    /**
     * @param {!WebInspector.ExecutionContext} a
     * @param {!WebInspector.ExecutionContext} b
     * @return {number}
     */
    _executionContextComparator: function(a,b)
    {
        /**
         * @param {!WebInspector.ResourceTreeFrame} frame
         */
        function framePath(frame)
        {
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
        for (var i = 0; ; i++) {
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

        if (frameA && frameB) {
            return frameA.id.localeCompare(frameB.id);
        }
        return WebInspector.ExecutionContext.comparator(a,b);
    },

    __proto__: WebInspector.SDKModel.prototype
}

/**
 * @constructor
 * @param {!WebInspector.ResourceTreeModel} model
 * @param {?WebInspector.ResourceTreeFrame} parentFrame
 * @param {!PageAgent.FrameId} frameId
 * @param {!PageAgent.Frame=} payload
 */
WebInspector.ResourceTreeFrame = function(model, parentFrame, frameId, payload)
{
    this._model = model;
    this._parentFrame = parentFrame;
    this._id = frameId;
    this._url = "";

    if (payload) {
        this._loaderId = payload.loaderId;
        this._name = payload.name;
        this._url = payload.url;
        this._securityOrigin = payload.securityOrigin;
        this._mimeType = payload.mimeType;
    }

    /**
     * @type {!Array.<!WebInspector.ResourceTreeFrame>}
     */
    this._childFrames = [];

    /**
     * @type {!Object.<string, !WebInspector.Resource>}
     */
    this._resourcesMap = {};

    if (this._parentFrame)
        this._parentFrame._childFrames.push(this);
}

/**
 * @param {!WebInspector.ExecutionContext|!WebInspector.CSSStyleSheetHeader|!WebInspector.Resource} object
 * @return {?WebInspector.ResourceTreeFrame}
 */
WebInspector.ResourceTreeFrame._fromObject = function(object)
{
    var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(object.target());
    var frameId = object.frameId;
    if (!resourceTreeModel || !frameId)
        return null;
    return resourceTreeModel.frameForId(frameId);
}

/**
 * @param {!WebInspector.Script} script
 * @return {?WebInspector.ResourceTreeFrame}
 */
WebInspector.ResourceTreeFrame.fromScript = function(script)
{
    var executionContext = script.executionContext();
    if (!executionContext)
        return null;
    return WebInspector.ResourceTreeFrame._fromObject(executionContext);
}

/**
 * @param {!WebInspector.CSSStyleSheetHeader} header
 * @return {?WebInspector.ResourceTreeFrame}
 */
WebInspector.ResourceTreeFrame.fromStyleSheet = function(header)
{
    return WebInspector.ResourceTreeFrame._fromObject(header);
}

/**
 * @param {!WebInspector.Resource} resource
 * @return {?WebInspector.ResourceTreeFrame}
 */
WebInspector.ResourceTreeFrame.fromResource = function(resource)
{
    return WebInspector.ResourceTreeFrame._fromObject(resource);
}

WebInspector.ResourceTreeFrame.prototype = {
    /**
     * @return {!WebInspector.Target}
     */
    target: function()
    {
        return this._model.target();
    },

    /**
     * @return {string}
     */
    get id()
    {
        return this._id;
    },

    /**
     * @return {string}
     */
    get name()
    {
        return this._name || "";
    },

    /**
     * @return {string}
     */
    get url()
    {
        return this._url;
    },

    /**
     * @return {string}
     */
    get securityOrigin()
    {
        return this._securityOrigin;
    },

    /**
     * @return {string}
     */
    get loaderId()
    {
        return this._loaderId;
    },

    /**
     * @return {?WebInspector.ResourceTreeFrame}
     */
    get parentFrame()
    {
        return this._parentFrame;
    },

    /**
     * @return {!Array.<!WebInspector.ResourceTreeFrame>}
     */
    get childFrames()
    {
        return this._childFrames;
    },

    /**
     * @return {boolean}
     */
    isMainFrame: function()
    {
        return !this._parentFrame;
    },

    /**
     * @param {!PageAgent.Frame} framePayload
     */
    _navigate: function(framePayload)
    {
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
    },

    /**
     * @return {!WebInspector.Resource}
     */
    get mainResource()
    {
        return this._resourcesMap[this._url];
    },

    /**
     * @param {!WebInspector.ResourceTreeFrame} frame
     */
    _removeChildFrame: function(frame)
    {
        this._childFrames.remove(frame);
        frame._remove();
    },

    _removeChildFrames: function()
    {
        var frames = this._childFrames;
        this._childFrames = [];
        for (var i = 0; i < frames.length; ++i)
            frames[i]._remove();
    },

    _remove: function()
    {
        this._removeChildFrames();
        this._model._frames.delete(this.id);
        this._model.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.FrameDetached, this);
    },

    /**
     * @param {!WebInspector.Resource} resource
     */
    addResource: function(resource)
    {
        if (this._resourcesMap[resource.url] === resource) {
            // Already in the tree, we just got an extra update.
            return;
        }
        this._resourcesMap[resource.url] = resource;
        this._model.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.ResourceAdded, resource);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     * @return {!WebInspector.Resource}
     */
    _addRequest: function(request)
    {
        var resource = this._resourcesMap[request.url];
        if (resource && resource.request === request) {
            // Already in the tree, we just got an extra update.
            return resource;
        }
        resource = new WebInspector.Resource(this.target(), request, request.url, request.documentURL, request.frameId, request.loaderId, request.resourceType(), request.mimeType);
        this._resourcesMap[resource.url] = resource;
        this._model.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.ResourceAdded, resource);
        return resource;
    },

    /**
     * @return {!Array.<!WebInspector.Resource>}
     */
    resources: function()
    {
        var result = [];
        for (var url in this._resourcesMap)
            result.push(this._resourcesMap[url]);
        return result;
    },

    /**
     * @param {string} url
     * @return {?WebInspector.Resource}
     */
    resourceForURL: function(url)
    {
        var result;
        function filter(resource)
        {
            if (resource.url === url) {
                result = resource;
                return true;
            }
        }
        this._callForFrameResources(filter);
        return result || null;
    },

    /**
     * @param {function(!WebInspector.Resource)} callback
     * @return {boolean}
     */
    _callForFrameResources: function(callback)
    {
        for (var url in this._resourcesMap) {
            if (callback(this._resourcesMap[url]))
                return true;
        }

        for (var i = 0; i < this._childFrames.length; ++i) {
            if (this._childFrames[i]._callForFrameResources(callback))
                return true;
        }
        return false;
    },

    /**
     * @return {string}
     */
    displayName: function()
    {
        if (!this._parentFrame)
            return WebInspector.UIString("top");
        var subtitle = new WebInspector.ParsedURL(this._url).displayName;
        if (subtitle) {
            if (!this._name)
                return subtitle;
            return this._name + " (" + subtitle + ")";
        }
        return WebInspector.UIString("<iframe>");
    }
}

/**
 * @constructor
 * @implements {PageAgent.Dispatcher}
 */
WebInspector.PageDispatcher = function(resourceTreeModel)
{
    this._resourceTreeModel = resourceTreeModel;
}

WebInspector.PageDispatcher.prototype = {
    /**
     * @override
     * @param {number} time
     */
    domContentEventFired: function(time)
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.DOMContentLoaded, time);
    },

    /**
     * @override
     * @param {number} time
     */
    loadEventFired: function(time)
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.Load, time);
    },

    /**
     * @override
     * @param {!PageAgent.FrameId} frameId
     * @param {!PageAgent.FrameId} parentFrameId
     */
    frameAttached: function(frameId, parentFrameId)
    {
        this._resourceTreeModel._frameAttached(frameId, parentFrameId);
    },

    /**
     * @override
     * @param {!PageAgent.Frame} frame
     */
    frameNavigated: function(frame)
    {
        this._resourceTreeModel._frameNavigated(frame);
    },

    /**
     * @override
     * @param {!PageAgent.FrameId} frameId
     */
    frameDetached: function(frameId)
    {
        this._resourceTreeModel._frameDetached(frameId);
    },

    /**
     * @override
     * @param {!PageAgent.FrameId} frameId
     */
    frameStartedLoading: function(frameId)
    {
    },

    /**
     * @override
     * @param {!PageAgent.FrameId} frameId
     */
    frameStoppedLoading: function(frameId)
    {
    },

    /**
     * @override
     * @param {!PageAgent.FrameId} frameId
     * @param {number} delay
     */
    frameScheduledNavigation: function(frameId, delay)
    {
    },

    /**
     * @override
     * @param {!PageAgent.FrameId} frameId
     */
    frameClearedScheduledNavigation: function(frameId)
    {
    },

    /**
     * @override
     */
    frameResized: function()
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.FrameResized, null);
    },

    /**
     * @override
     * @param {string} message
     * @param {string} dialogType
     */
    javascriptDialogOpening: function(message, dialogType)
    {
    },

    /**
     * @override
     * @param {boolean} result
     */
    javascriptDialogClosed: function(result)
    {
    },

    /**
     * @override
     * @param {string} data
     * @param {!PageAgent.ScreencastFrameMetadata=} metadata
     * @param {number=} sessionId
     */
    screencastFrame: function(data, metadata, sessionId)
    {
        this._resourceTreeModel._agent.screencastFrameAck(sessionId);
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.ScreencastFrame, { data: data, metadata: metadata });
    },

    /**
     * @override
     * @param {boolean} visible
     */
    screencastVisibilityChanged: function(visible)
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.ScreencastVisibilityChanged, { visible: visible });
    },

    /**
     * @override
     * @param {!DOMAgent.RGBA} color
     */
    colorPicked: function(color)
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.ColorPicked, color);
    },

    /**
     * @override
     */
    interstitialShown: function()
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.InterstitialShown);
    },

    /**
     * @override
     */
    interstitialHidden: function()
    {
        this._resourceTreeModel.dispatchEventToListeners(WebInspector.ResourceTreeModel.Events.InterstitialHidden);
    },

    /**
     * @override
     */
    navigationRequested: function()
    {
       // Frontend is not interested in when navigations are requested.
    }

}
