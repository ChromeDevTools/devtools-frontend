// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.SDKObject}
 * @param {!WebInspector.Target} target
 * @implements {BrowserAgent.Dispatcher}
 */
WebInspector.RemoteLocationManager = function(target)
{
    WebInspector.SDKObject.call(this, target);
    /** @type {!Map<string, ?WebInspector.Target>} */
    this._connectedTargets = new Map();
    target.registerBrowserDispatcher(this);
    this._defaultLocations = [{host: "localhost", port: 9229}];

    this._throttler = new WebInspector.Throttler(1000);
    this._throttler.schedule(this._discoverTargets.bind(this));
}

WebInspector.RemoteLocationManager.prototype = {
    /**
     * @override
     * @param {string} targetId
     * @param {string} message
     */
    dispatchMessage: function(targetId, message)
    {
        var target = this._connectedTargets.get(targetId);
        if (target)
            target.connection().dispatch(message);
    },

    /**
     * @return {!Promise}
     */
    _discoverTargets: function()
    {
        return this.target().browserAgent().setRemoteLocations(this._defaultLocations, this._requestTargets.bind(this));
    },

    /**
     * @param {?Protocol.Error} error
     * @return {!Promise}
     */
    _requestTargets: function (error)
    {
        if (error) {
            console.error(error);
            return Promise.resolve();
        }

        return this.target().browserAgent().getTargets(this._processTargets.bind(this));
    },

    /**
     * @param {?Protocol.Error} error
     * @param {!Array<!BrowserAgent.TargetInfo>} targetInfos
     * @return {!Promise}
     */
    _processTargets: function(error, targetInfos)
    {
        if (error) {
            console.error(error);
            return  Promise.resolve();
        }
        /** @type {!Map<string, !BrowserAgent.TargetInfo>} */
        var newTargetInfos = new Map();
        for (var info of targetInfos) {
            if (info.type !== "node")
                continue;
            newTargetInfos.set(info.targetId, info);
        }

        for (var targetId of this._connectedTargets.keys()) {
            if (!newTargetInfos.has(targetId)) {
                var target = this._connectedTargets.get(targetId);
                this._connectedTargets.delete(targetId);
                if (target)
                    WebInspector.targetManager.removeTarget(target);
            }
        }

        var promises = [];
        for (var targetId of newTargetInfos.keys()) {
            if (this._connectedTargets.has(targetId))
                continue;

            this._connectedTargets.set(targetId, null);
            promises.push(this.target().browserAgent().attach(targetId, this._createConnection.bind(this, targetId, newTargetInfos.get(targetId).title)));
        }
        return Promise.all(promises).then(() => this._throttler.schedule(this._discoverTargets.bind(this)));
    },

    /**
     * @param {string} targetId
     * @param {string} title
     * @param {?Protocol.Error} error
     * @param {boolean} success
     */
    _createConnection: function(targetId, title, error, success)
    {
        if (!success || !this._connectedTargets.has(targetId)) {
            // Could not attach or target was deleted while we were connecting, do not proceed.
            return;
        }

        var nodeConnection = new WebInspector.RemoteLocationConnection(this.target().browserAgent(), targetId);
        var nodeCapabilities = WebInspector.Target.Capability.JS;
        var target = WebInspector.targetManager.createTarget(title, nodeCapabilities, nodeConnection, this.target());
        this._connectedTargets.set(targetId, target);
        target.runtimeAgent().runIfWaitingForDebugger();
    },

    __proto__: WebInspector.SDKObject.prototype
}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {!Protocol.BrowserAgent} agent
 * @param {string} targetId
 */
WebInspector.RemoteLocationConnection = function(agent, targetId)
{
    InspectorBackendClass.Connection.call(this);
    this._agent = agent;
    this._targetId = targetId;
}

WebInspector.RemoteLocationConnection.prototype = {
    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        this._agent.sendMessage(this._targetId, JSON.stringify(messageObject));
    },

    _close: function()
    {
        this.connectionClosed("node_detached");
    },

    __proto__: InspectorBackendClass.Connection.prototype
}
