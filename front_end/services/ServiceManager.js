// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ServiceManager = function()
{
    this._lastId = 1;
    /** @type {!Map<number, function(?Object)>}*/
    this._callbacks = new Map();
    /** @type {!Map<string, !WebInspector.ServiceManager.Service>}*/
    this._services = new Map();
}

WebInspector.ServiceManager.prototype = {
    /**
     * @param {string} serviceName
     * @return {!Promise<?WebInspector.ServiceManager.Service>}
     */
    createService: function(serviceName)
    {
        return this._sendCommand(serviceName + ".create").then(result => {
            if (!result)
                return null;
            var service = new WebInspector.ServiceManager.Service(this, serviceName, result.id);
            this._services.set(serviceName + ":" + result.id, service);
            return service;
        });
    },

    /**
     * @param {string} method
     * @param {!Object=} params
     * @return {!Promise<?Object>}
     */
    _sendCommand: function(method, params)
    {
        var id = this._lastId++;
        var message = JSON.stringify({id: id, method: method, params: params || {}});
        this._connect().then(() => this._socket ? this._socket.send(message) : this._callbacks.get(id)(null));
        return new Promise(fulfill => this._callbacks.set(id, fulfill));
    },

    /**
     * @return {!Promise}
     */
    _connect: function()
    {
        var url = Runtime.queryParam("service-backend");
        if (!url) {
            console.error("No endpoint address specified");
            return Promise.resolve(null);
        }

        if (!this._connectionPromise)
            this._connectionPromise = new Promise(promiseBody.bind(this));
        return this._connectionPromise;

        /**
         * @param {function()} fulfill
         * @param {function()} reject
         * @this {WebInspector.ServiceManager}
         */
        function promiseBody(fulfill, reject)
        {
            var socket = new WebSocket(/** @type {string} */(url));
            socket.onmessage = this._onMessage.bind(this);
            socket.onopen = this._connectionOpened.bind(this, socket, fulfill);
            socket.onclose = this._connectionClosed.bind(this);
        }
    },

    /**
     * @param {!MessageEvent} message
     */
    _onMessage: function(message)
    {
        var data = /** @type {string} */ (message.data);
        var object;
        try {
            object = JSON.parse(data);
        } catch (e) {
            console.error(e);
            return;
        }
        if (object.id) {
            if (object.error)
                console.error("Service error: " + object.error);
            this._callbacks.get(object.id)(object.error ? null : object.result);
            this._callbacks.delete(object.id);
            return;
        }

        var tokens = object.method.split(".");
        var serviceName = tokens[0];
        var methodName = tokens[1];
        var service = this._services.get(serviceName + ":" + object.params.id);
        if (!service) {
            console.error("Unable to lookup stub for " + serviceName + ":" + object.params.id);
            return;
        }
        service._dispatchNotification(methodName, object.params);
    },

    /**
     * @param {!WebSocket} socket
     * @param {function()} callback
     */
    _connectionOpened: function(socket, callback)
    {
        this._socket = socket;
        callback();
    },

    _connectionClosed: function()
    {
        for (var callback of this._callbacks.values())
            callback(null);
        this._callbacks.clear();
        for (var service of this._services.values())
            service._dispatchNotification("disposed");
        this._services.clear();
        delete this._connectionPromise;
    }
}

/**
 * @constructor
 * @param {!WebInspector.ServiceManager} manager
 * @param {string} serviceName
 * @param {string} objectId
 */
WebInspector.ServiceManager.Service = function(manager, serviceName, objectId)
{
    this._manager = manager;
    this._serviceName = serviceName;
    this._objectId = objectId;
    /** @type {!Map<string, function(!Object=)>}*/
    this._notificationHandlers = new Map();
}

WebInspector.ServiceManager.Service.prototype = {
    /**
     * @return {!Promise}
     */
    dispose: function()
    {
        var params = { id: this._objectId };
        this._manager._services.delete(this._serviceName + ":" + this._objectId);
        return this._manager._sendCommand(this._serviceName + ".dispose", params);
    },

    /**
     * @param {string} methodName
     * @param {function(!Object=)} handler
     */
    on: function(methodName, handler)
    {
        this._notificationHandlers.set(methodName, handler);
    },

    /**
     * @param {string} methodName
     * @param {!Object=} params
     * @return {!Promise}
     */
    send: function(methodName, params)
    {
        params = params || {};
        params.id = this._objectId;
        return this._manager._sendCommand(this._serviceName + "." + methodName, params);
    },

    /**
     * @param {string} methodName
     * @param {!Object=} params
     */
    _dispatchNotification: function(methodName, params)
    {
        var handler = this._notificationHandlers.get(methodName);
        if (!handler) {
            console.error("Could not report notification '" + methodName + "' on '" + this._objectId + "'");
            return;
        }
        handler(params);
    }
}

WebInspector.serviceManager = new WebInspector.ServiceManager();
