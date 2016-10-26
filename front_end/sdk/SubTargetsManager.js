// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SDKModel}
 * @param {!WebInspector.Target} target
 */
WebInspector.SubTargetsManager = function(target)
{
    WebInspector.SDKModel.call(this, WebInspector.SubTargetsManager, target);
    target.registerTargetDispatcher(new WebInspector.SubTargetsDispatcher(this));
    this._lastAnonymousTargetId = 0;
    this._agent = target.targetAgent();

    /** @type {!Map<string, !WebInspector.Target>} */
    this._attachedTargets = new Map();
    /** @type {!Map<string, !WebInspector.SubTargetConnection>} */
    this._connections = new Map();

    this._agent.setAutoAttach(true /* autoAttach */, true /* waitForDebuggerOnStart */);
    if (Runtime.experiments.isEnabled("autoAttachToCrossProcessSubframes"))
        this._agent.setAttachToFrames(true);

    if (Runtime.experiments.isEnabled("nodeDebugging") && !target.parentTarget()) {
        var defaultLocations = [{host: "localhost", port: 9229}];
        this._agent.setRemoteLocations(defaultLocations);
        this._agent.setDiscoverTargets(true);
    }
    WebInspector.targetManager.addEventListener(WebInspector.TargetManager.Events.MainFrameNavigated, this._mainFrameNavigated, this);
};

/** @enum {symbol} */
WebInspector.SubTargetsManager.Events = {
    SubTargetAdded: Symbol("SubTargetAdded"),
    SubTargetRemoved: Symbol("SubTargetRemoved"),
};

WebInspector.SubTargetsManager._InfoSymbol = Symbol("SubTargetInfo");

WebInspector.SubTargetsManager.prototype = {
    /**
     * @override
     * @return {!Promise}
     */
    suspendModel: function()
    {
        var fulfill;
        var promise = new Promise(f => fulfill = f);
        this._agent.setAutoAttach(true /* autoAttach */, false /* waitForDebuggerOnStart */, fulfill);
        return promise;
    },

    /**
     * @override
     * @return {!Promise}
     */
    resumeModel: function()
    {
        var fulfill;
        var promise = new Promise(f => fulfill = f);
        this._agent.setAutoAttach(true /* autoAttach */, true /* waitForDebuggerOnStart */, fulfill);
        return promise;
    },

    /**
     * @override
     */
    dispose: function()
    {
        for (var connection of this._connections.values()) {
            this._agent.detachFromTarget(connection._targetId);
            connection._onDisconnect.call(null, "disposed");
        }
        this._connections.clear();
        this._attachedTargets.clear();
    },

    /**
     * @param {!TargetAgent.TargetID} targetId
     */
    activateTarget: function(targetId)
    {
        this._agent.activateTarget(targetId);
    },

    /**
     * @param {!TargetAgent.TargetID} targetId
     * @param {function(?WebInspector.TargetInfo)=} callback
     */
    getTargetInfo: function(targetId, callback)
    {
        /**
         * @param {?Protocol.Error} error
         * @param {?TargetAgent.TargetInfo} targetInfo
         */
        function innerCallback(error, targetInfo)
        {
            if (error) {
                console.error(error);
                callback(null);
                return;
            }
            if (targetInfo)
                callback(new WebInspector.TargetInfo(targetInfo));
            else
                callback(null);
        }
        this._agent.getTargetInfo(targetId, innerCallback);
    },

    /**
     * @param {string} targetId
     * @return {?WebInspector.Target}
     */
    targetForId: function(targetId)
    {
        return this._attachedTargets.get(targetId) || null;
    },

    /**
     * @param {!WebInspector.Target} target
     * @return {?WebInspector.TargetInfo}
     */
    targetInfo: function(target)
    {
        return target[WebInspector.SubTargetsManager._InfoSymbol] || null;
    },

    /**
     * @param {string} type
     * @return {number}
     */
    _capabilitiesForType: function(type)
    {
        if (type === "worker")
            return WebInspector.Target.Capability.JS | WebInspector.Target.Capability.Log;
        if (type === "service_worker")
            return WebInspector.Target.Capability.Log | WebInspector.Target.Capability.Network | WebInspector.Target.Capability.Target;
        if (type === "iframe")
            return WebInspector.Target.Capability.Browser | WebInspector.Target.Capability.DOM |
                WebInspector.Target.Capability.JS | WebInspector.Target.Capability.Log |
                WebInspector.Target.Capability.Network | WebInspector.Target.Capability.Target;
        if (type === "node")
            return WebInspector.Target.Capability.JS;
        return 0;
    },

    /**
     * @param {!WebInspector.TargetInfo} targetInfo
     * @param {boolean} waitingForDebugger
     */
    _attachedToTarget: function(targetInfo, waitingForDebugger)
    {
        var targetName = "";
        if (targetInfo.type === "node") {
            targetName = targetInfo.title;
        } else if (targetInfo.type !== "iframe") {
            var parsedURL = targetInfo.url.asParsedURL();
            targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() : "#" + (++this._lastAnonymousTargetId);
        }
        var target = WebInspector.targetManager.createTarget(targetName, this._capabilitiesForType(targetInfo.type), this._createConnection.bind(this, targetInfo.id), this.target());
        target[WebInspector.SubTargetsManager._InfoSymbol] = targetInfo;
        this._attachedTargets.set(targetInfo.id, target);

        // Only pause new worker if debugging SW - we are going through the pause on start checkbox.
        var mainIsServiceWorker = !this.target().parentTarget() && this.target().hasTargetCapability() && !this.target().hasBrowserCapability();
        if (mainIsServiceWorker && waitingForDebugger)
            target.debuggerAgent().pause();
        target.runtimeAgent().runIfWaitingForDebugger();

        this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.SubTargetAdded, target);
    },

    /**
     * @param {string} targetId
     * @param {!InspectorBackendClass.Connection.Params} params
     * @return {!InspectorBackendClass.Connection}
     */
    _createConnection: function(targetId, params)
    {
        var connection = new WebInspector.SubTargetConnection(this._agent, targetId, params);
        this._connections.set(targetId, connection);
        return connection;
    },

    /**
     * @param {string} targetId
     */
    _detachedFromTarget: function(targetId)
    {
        var target = this._attachedTargets.get(targetId);
        this._attachedTargets.delete(targetId);
        this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.SubTargetRemoved, target);
        var connection = this._connections.get(targetId);
        if (connection)
            connection._onDisconnect.call(null, "target terminated");
        this._connections.delete(targetId);
    },

    /**
     * @param {string} targetId
     * @param {string} message
     */
    _receivedMessageFromTarget: function(targetId, message)
    {
        var connection = this._connections.get(targetId);
        if (connection)
            connection._onMessage.call(null, message);
    },

    /**
     * @param {!WebInspector.TargetInfo} targetInfo
     */
    _targetCreated: function(targetInfo)
    {
        if (targetInfo.type !== "node")
            return;
        this._agent.attachToTarget(targetInfo.id);
    },

    /**
     * @param {string} targetId
     */
    _targetDestroyed: function(targetId)
    {
        // All the work is done in _detachedFromTarget.
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _mainFrameNavigated: function(event)
    {
        if (event.data.target() !== this.target())
            return;

        var idsToDetach = [];
        for (var targetId of this._attachedTargets.keys()) {
            var target = this._attachedTargets.get(targetId);
            var targetInfo = this.targetInfo(target);
            if (targetInfo.type === "worker")
                idsToDetach.push(targetId);
        }
        idsToDetach.forEach(id => this._detachedFromTarget(id));
    },

    __proto__: WebInspector.SDKModel.prototype
};

/**
 * @constructor
 * @implements {TargetAgent.Dispatcher}
 * @param {!WebInspector.SubTargetsManager} manager
 */
WebInspector.SubTargetsDispatcher = function(manager)
{
    this._manager = manager;
};

WebInspector.SubTargetsDispatcher.prototype = {
    /**
     * @override
     * @param {!TargetAgent.TargetInfo} targetInfo
     */
    targetCreated: function(targetInfo)
    {
        this._manager._targetCreated(new WebInspector.TargetInfo(targetInfo));
    },

    /**
     * @override
     * @param {string} targetId
     */
    targetDestroyed: function(targetId)
    {
        this._manager._targetDestroyed(targetId);
    },

    /**
     * @override
     * @param {!TargetAgent.TargetInfo} targetInfo
     * @param {boolean} waitingForDebugger
     */
    attachedToTarget: function(targetInfo, waitingForDebugger)
    {
        this._manager._attachedToTarget(new WebInspector.TargetInfo(targetInfo), waitingForDebugger);
    },

    /**
     * @override
     * @param {string} targetId
     */
    detachedFromTarget: function(targetId)
    {
        this._manager._detachedFromTarget(targetId);
    },

    /**
     * @override
     * @param {string} targetId
     * @param {string} message
     */
    receivedMessageFromTarget: function(targetId, message)
    {
        this._manager._receivedMessageFromTarget(targetId, message);
    }
};

/**
 * @constructor
 * @implements {InspectorBackendClass.Connection}
 * @param {!Protocol.TargetAgent} agent
 * @param {string} targetId
 * @param {!InspectorBackendClass.Connection.Params} params
 */
WebInspector.SubTargetConnection = function(agent, targetId, params)
{
    this._agent = agent;
    this._targetId = targetId;
    this._onMessage = params.onMessage;
    this._onDisconnect = params.onDisconnect;
};

WebInspector.SubTargetConnection.prototype = {
    /**
     * @override
     * @param {string} message
     */
    sendMessage: function(message)
    {
        this._agent.sendMessageToTarget(this._targetId, message);
    },

    /**
     * @override
     * @return {!Promise}
     */
    disconnect: function()
    {
        throw new Error("Not implemented");
    },
};

/**
 * @constructor
 * @param {!TargetAgent.TargetInfo} payload
 */
WebInspector.TargetInfo = function(payload)
{
    this.id = payload.targetId;
    this.url = payload.url;
    this.type = payload.type;
    if (this.type !== "page" && this.type !== "iframe") {
        this.title = WebInspector.UIString("Worker: %s", this.url);
        this.canActivate = false;
    } else {
        this.title = payload.title;
        this.canActivate = true;
    }
};
