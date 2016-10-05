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

    /** @type {!Map<string, !WebInspector.TargetInfo>} */
    this._allTargets = new Map();

    /** @type {!Map<string, !WebInspector.Target>} */
    this._attachedTargets = new Map();
    /** @type {!Map<string, !WebInspector.SubTargetConnection>} */
    this._connections = new Map();

    this._agent.setAutoAttach(true /* autoAttach */, true /* waitForDebuggerOnStart */);
    this._agent.setAttachToFrames(Runtime.experiments.isEnabled("autoAttachToCrossProcessSubframes"));
}

/** @enum {symbol} */
WebInspector.SubTargetsManager.Events = {
    SubTargetAdded: Symbol("SubTargetAdded"),
    SubTargetRemoved: Symbol("SubTargetRemoved"),
}

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
        for (var connection of this._connections.values())
            connection._close();
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
                callback(null)
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
            return WebInspector.Target.Capability.Log | WebInspector.Target.Capability.Network | WebInspector.Target.Capability.Worker;
        if (type === "iframe")
            return WebInspector.Target.Capability.Browser | WebInspector.Target.Capability.DOM |
                WebInspector.Target.Capability.JS | WebInspector.Target.Capability.Log |
                WebInspector.Target.Capability.Network | WebInspector.Target.Capability.Worker;
        return 0;
    },

    /**
     * @param {!WebInspector.TargetInfo} targetInfo
     */
    _targetCreated: function(targetInfo)
    {
        console.assert(!this._allTargets.has(targetInfo.id));
        console.assert(!this._attachedTargets.has(targetInfo.id));
        this._allTargets.set(targetInfo.id, targetInfo);
    },

    /**
     * @param {string} targetId
     */
    _targetRemoved: function(targetId)
    {
        console.assert(this._allTargets.has(targetId));
        console.assert(!this._attachedTargets.has(targetId));
        this._allTargets.delete(targetId);
    },

    /**
     * @param {string} targetId
     * @param {boolean} waitingForDebugger
     */
    _attachedToTarget: function(targetId, waitingForDebugger)
    {
        var targetInfo = /** @type {!WebInspector.TargetInfo} */ (this._allTargets.get(targetId));

        var connection = new WebInspector.SubTargetConnection(this._agent, targetId);
        this._connections.set(targetId, connection);

        var targetName = "";
        if (targetInfo.type !== "iframe") {
            var parsedURL = targetInfo.url.asParsedURL();
            targetName = parsedURL ? parsedURL.lastPathComponentWithFragment() : "#" + (++this._lastAnonymousTargetId);
        }
        var target = WebInspector.targetManager.createTarget(targetName, this._capabilitiesForType(targetInfo.type), connection, this.target());
        target[WebInspector.SubTargetsManager._InfoSymbol] = targetInfo;
        this._attachedTargets.set(targetId, target);

        // Only pause new worker if debugging SW - we are going through the pause on start checkbox.
        var mainIsServiceWorker = !this.target().parentTarget() && this.target().hasWorkerCapability() && !this.target().hasBrowserCapability();
        if (mainIsServiceWorker && waitingForDebugger)
            target.debuggerAgent().pause();
        target.runtimeAgent().runIfWaitingForDebugger();

        this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.SubTargetAdded, target);
    },

    /**
     * @param {string} targetId
     */
    _detachedFromTarget: function(targetId)
    {
        var connection = this._connections.get(targetId);
        if (connection)
            connection._close();
        this._connections.delete(targetId);
        var target = this._attachedTargets.get(targetId);
        this._attachedTargets.delete(targetId);
        this.dispatchEventToListeners(WebInspector.SubTargetsManager.Events.SubTargetRemoved, target);
    },

    /**
     * @param {string} targetId
     * @param {string} message
     */
    _receivedMessageFromTarget: function(targetId, message)
    {
        var connection = this._connections.get(targetId);
        if (connection)
            connection.dispatch(message);
    },

    __proto__: WebInspector.SDKModel.prototype
}

/**
 * @constructor
 * @implements {TargetAgent.Dispatcher}
 * @param {!WebInspector.SubTargetsManager} manager
 */
WebInspector.SubTargetsDispatcher = function(manager)
{
    this._manager = manager;
}

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
    targetRemoved: function(targetId)
    {
        this._manager._targetRemoved(targetId);
    },

    /**
     * @override
     * @param {string} targetId
     * @param {boolean} waitingForDebugger
     */
    attachedToTarget: function(targetId, waitingForDebugger)
    {
        this._manager._attachedToTarget(targetId, waitingForDebugger);
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
}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {!Protocol.TargetAgent} agent
 * @param {string} targetId
 */
WebInspector.SubTargetConnection = function(agent, targetId)
{
    InspectorBackendClass.Connection.call(this);
    this._agent = agent;
    this._targetId = targetId;
}

WebInspector.SubTargetConnection.prototype = {
    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        this._agent.sendMessageToTarget(this._targetId, JSON.stringify(messageObject));
    },

    _close: function()
    {
        this.connectionClosed("target_terminated");
    },

    __proto__: InspectorBackendClass.Connection.prototype
}

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
}
