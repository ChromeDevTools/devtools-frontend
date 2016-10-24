// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ServiceManager = function()
{
};

WebInspector.ServiceManager.prototype = {
    /**
     * @param {string} serviceName
     * @return {!Promise<?WebInspector.ServiceManager.Service>}
     */
    createRemoteService: function(serviceName)
    {
        if (!this._remoteConnection) {
            var url = Runtime.queryParam("service-backend");
            if (!url) {
                console.error("No endpoint address specified");
                return /** @type {!Promise<?WebInspector.ServiceManager.Service>} */ (Promise.resolve(null));
            }
            this._remoteConnection = new WebInspector.ServiceManager.Connection(new WebInspector.ServiceManager.RemoteServicePort(url));
        }
        return this._remoteConnection._createService(serviceName);
    },

    /**
     * @param {string} appName
     * @param {string} serviceName
     * @param {boolean} isSharedWorker
     * @return {!Promise<?WebInspector.ServiceManager.Service>}
     */
    createAppService: function(appName, serviceName, isSharedWorker)
    {
        var url = appName + ".js";
        var remoteBase = Runtime.queryParam("remoteBase");
        if (remoteBase)
            url += "?remoteBase=" + remoteBase;

        var worker = isSharedWorker ? new SharedWorker(url, appName) : new Worker(url);
        var connection = new WebInspector.ServiceManager.Connection(new WebInspector.ServiceManager.WorkerServicePort(worker));
        return connection._createService(serviceName);
    }
};

/**
 * @constructor
 * @param {!ServicePort} port
 */
WebInspector.ServiceManager.Connection = function(port)
{
    this._port = port;
    this._port.setHandlers(this._onMessage.bind(this), this._connectionClosed.bind(this));

    this._lastId = 1;
    /** @type {!Map<number, function(?Object)>}*/
    this._callbacks = new Map();
    /** @type {!Map<string, !WebInspector.ServiceManager.Service>}*/
    this._services = new Map();
};

WebInspector.ServiceManager.Connection.prototype = {
    /**
     * @param {string} serviceName
     * @return {!Promise<?WebInspector.ServiceManager.Service>}
     */
    _createService: function(serviceName)
    {
        return this._sendCommand(serviceName + ".create").then(result => {
            if (!result) {
                console.error("Could not initialize service: " + serviceName);
                return null;
            }
            var service = new WebInspector.ServiceManager.Service(this, serviceName, result.id);
            this._services.set(serviceName + ":" + result.id, service);
            return service;
        });
    },

    /**
     * @param {!WebInspector.ServiceManager.Service} service
     */
    _serviceDisposed: function(service)
    {
        this._services.delete(service._serviceName + ":" + service._objectId);
        if (!this._services.size) {
            // Terminate the connection since it is no longer used.
            this._port.close();
        }
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
        return this._port.send(message).then(success => {
            if (!success)
                return Promise.resolve(null);
            return new Promise(fulfill => this._callbacks.set(id, fulfill));
        });
    },

    /**
     * @param {string} data
     */
    _onMessage: function(data)
    {
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

    _connectionClosed: function()
    {
        for (var callback of this._callbacks.values())
            callback(null);
        this._callbacks.clear();
        for (var service of this._services.values())
            service._dispatchNotification("disposed");
        this._services.clear();
    }
};

/**
 * @constructor
 * @param {!WebInspector.ServiceManager.Connection} connection
 * @param {string} serviceName
 * @param {string} objectId
 */
WebInspector.ServiceManager.Service = function(connection, serviceName, objectId)
{
    this._connection = connection;
    this._serviceName = serviceName;
    this._objectId = objectId;
    /** @type {!Map<string, function(!Object=)>}*/
    this._notificationHandlers = new Map();
};

WebInspector.ServiceManager.Service.prototype = {
    /**
     * @return {!Promise}
     */
    dispose: function()
    {
        var params = { id: this._objectId };
        return this._connection._sendCommand(this._serviceName + ".dispose", params).then(() => {
            this._connection._serviceDisposed(this);
        });
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
        return this._connection._sendCommand(this._serviceName + "." + methodName, params);
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
};

/**
 * @constructor
 * @implements {ServicePort}
 * @param {string} url
 */
WebInspector.ServiceManager.RemoteServicePort = function(url)
{
    this._url = url;
};

WebInspector.ServiceManager.RemoteServicePort.prototype = {
    /**
     * @override
     * @param {function(string)} messageHandler
     * @param {function(string)} closeHandler
     */
    setHandlers: function(messageHandler, closeHandler)
    {
        this._messageHandler = messageHandler;
        this._closeHandler = closeHandler;
    },

    /**
     * @return {!Promise<boolean>}
     */
    _open: function()
    {
        if (!this._connectionPromise)
            this._connectionPromise = new Promise(promiseBody.bind(this));
        return this._connectionPromise;

        /**
         * @param {function(boolean)} fulfill
         * @this {WebInspector.ServiceManager.RemoteServicePort}
         */
        function promiseBody(fulfill)
        {
            var socket;
            try {
                socket = new WebSocket(/** @type {string} */(this._url));
                socket.onmessage = onMessage.bind(this);
                socket.onclose = this._closeHandler;
                socket.onopen = onConnect.bind(this);
            } catch (e) {
                fulfill(false);
            }

            /**
             * @this {WebInspector.ServiceManager.RemoteServicePort}
             */
            function onConnect()
            {
                this._socket = socket;
                fulfill(true);
            }

            /**
             * @param {!Event} event
             * @this {WebInspector.ServiceManager.RemoteServicePort}
             */
            function onMessage(event)
            {
                this._messageHandler(event.data);
            }
        }
    },

    /**
     * @override
     * @param {string} message
     * @return {!Promise<boolean>}
     */
    send: function(message)
    {
        return this._open().then(() => {
            if (this._socket) {
                this._socket.send(message);
                return true;
            }
            return false;
        });
    },

    /**
     * @override
     * @return {!Promise}
     */
    close: function()
    {
        return this._open().then(() => {
            if (this._socket) {
                this._socket.close();
                this._socket = null;
                delete this._connectionPromise;
            }
            return true;
        });
    },
};

/**
 * @constructor
 * @implements {ServicePort}
 * @param {!Worker|!SharedWorker} worker
 */
WebInspector.ServiceManager.WorkerServicePort = function(worker)
{
    this._worker = worker;

    var fulfill;
    this._workerPromise = new Promise(resolve => fulfill = resolve);
    this._isSharedWorker = worker instanceof SharedWorker;

    if (this._isSharedWorker) {
        this._worker.port.onmessage = onMessage.bind(this);
        this._worker.port.onclose = this._closeHandler;
    } else {
        this._worker.onmessage = onMessage.bind(this);
        this._worker.onclose = this._closeHandler;
    }

    /**
     * @param {!Event} event
     * @this {WebInspector.ServiceManager.WorkerServicePort}
     */
    function onMessage(event)
    {
        if (event.data === "workerReady") {
            fulfill(true);
            return;
        }
        this._messageHandler(event.data);
    }
};

WebInspector.ServiceManager.WorkerServicePort.prototype = {
    /**
     * @override
     * @param {function(string)} messageHandler
     * @param {function(string)} closeHandler
     */
    setHandlers: function(messageHandler, closeHandler)
    {
        this._messageHandler = messageHandler;
        this._closeHandler = closeHandler;
    },

    /**
     * @override
     * @param {string} message
     * @return {!Promise<boolean>}
     */
    send: function(message)
    {
        return this._workerPromise.then(() => {
            try {
                if (this._isSharedWorker)
                    this._worker.port.postMessage(message);
                else
                    this._worker.postMessage(message);
                return true;
            } catch (e) {
                return false;
            }
        });
    },

    /**
     * @override
     * @return {!Promise}
     */
    close: function()
    {
        return this._workerPromise.then(() => {
            if (this._worker)
                this._worker.terminate();
            return false;
        });
    }
};

WebInspector.serviceManager = new WebInspector.ServiceManager();
