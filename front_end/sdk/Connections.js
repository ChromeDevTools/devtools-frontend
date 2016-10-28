// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @implements {InspectorBackendClass.Connection}
 * @param {!InspectorBackendClass.Connection.Params} params
 */
WebInspector.MainConnection = function(params)
{
    this._onMessage = params.onMessage;
    this._onDisconnect = params.onDisconnect;
    this._disconnected = false;
    this._eventListeners = [
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchMessage, this._dispatchMessage, this),
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchMessageChunk, this._dispatchMessageChunk, this),
        InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.EvaluateForTestInFrontend, this._evaluateForTestInFrontend, this),
    ];
};

WebInspector.MainConnection.prototype = {

    /**
     * @override
     * @param {string} message
     */
    sendMessage: function(message)
    {
        if (!this._disconnected)
            InspectorFrontendHost.sendMessageToBackend(message);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _dispatchMessage: function(event)
    {
        this._onMessage.call(null, /** @type {string} */ (event.data));
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _dispatchMessageChunk: function(event)
    {
        var messageChunk = /** @type {string} */ (event.data["messageChunk"]);
        var messageSize = /** @type {number} */ (event.data["messageSize"]);
        if (messageSize) {
            this._messageBuffer = "";
            this._messageSize = messageSize;
        }
        this._messageBuffer += messageChunk;
        if (this._messageBuffer.length === this._messageSize) {
            this._onMessage.call(null, this._messageBuffer);
            this._messageBuffer = "";
            this._messageSize = 0;
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _evaluateForTestInFrontend: function(event)
    {
        if (!InspectorFrontendHost.isUnderTest())
            return;

        var callId = /** @type {number} */ (event.data["callId"]);
        var script = /** @type {number} */ (event.data["script"]);

        /**
         * @suppressGlobalPropertiesCheck
         */
        function invokeMethod()
        {
            try {
                script = script + "//# sourceURL=evaluateInWebInspector" + callId + ".js";
                window.eval(script);
            } catch (e) {
                console.error(e.stack);
            }
        }

        InspectorBackendClass.deprecatedRunAfterPendingDispatches(invokeMethod);
    },

    /**
     * @override
     * @return {!Promise}
     */
    disconnect: function()
    {
        var onDisconnect = this._onDisconnect;
        WebInspector.EventTarget.removeEventListeners(this._eventListeners);
        this._onDisconnect = null;
        this._onMessage = null;
        this._disconnected = true;

        var fulfill;
        var promise = new Promise(f => fulfill = f);
        InspectorFrontendHost.reattach(() => {
            onDisconnect.call(null, "force disconnect");
            fulfill();
        });
        return promise;
    },
};

/**
 * @constructor
 * @implements {InspectorBackendClass.Connection}
 * @param {string} url
 * @param {!InspectorBackendClass.Connection.Params} params
 */
WebInspector.WebSocketConnection = function(url, params)
{
    this._socket = new WebSocket(url);
    this._socket.onerror = this._onError.bind(this);
    this._socket.onopen = this._onOpen.bind(this);
    this._socket.onmessage = (messageEvent) => params.onMessage.call(null, /** @type {string} */ (messageEvent.data));
    this._onDisconnect = params.onDisconnect;
    this._socket.onclose = params.onDisconnect.bind(null, "websocket closed");

    this._connected = false;
    this._messages = [];
};

WebInspector.WebSocketConnection.prototype = {
    _onError: function()
    {
        // This is called if error occurred while connecting.
        this._onDisconnect.call(null, "connection failed");
        this._close();
    },

    _onOpen: function()
    {
        this._socket.onerror = console.error;
        this._connected = true;
        for (var message of this._messages)
            this._socket.send(message);
        this._messages = [];
    },

    _close: function()
    {
        this._socket.onerror = null;
        this._socket.onopen = null;
        this._socket.onclose = null;
        this._socket.onmessage = null;
        this._socket.close();
        this._socket = null;
    },

    /**
     * @override
     * @param {string} message
     */
    sendMessage: function(message)
    {
        if (this._connected)
            this._socket.send(message);
        else
            this._messages.push(message);
    },

    /**
     * @override
     * @return {!Promise}
     */
    disconnect: function()
    {
        this._onDisconnect.call(null, "force disconnect");
        this._close();
        return Promise.resolve();
    }
};

/**
 * @constructor
 * @implements {InspectorBackendClass.Connection}
 * @param {!InspectorBackendClass.Connection.Params} params
 */
WebInspector.StubConnection = function(params)
{
    this._onMessage = params.onMessage;
    this._onDisconnect = params.onDisconnect;
};

WebInspector.StubConnection.prototype = {
    /**
     * @override
     * @param {string} message
     */
    sendMessage: function(message)
    {
        setTimeout(this._respondWithError.bind(this, message), 0);
    },

    /**
     * @param {string} message
     */
    _respondWithError: function(message)
    {
        var messageObject = JSON.parse(message);
        var error = { message: "This is a stub connection, can't dispatch message.", code:  InspectorBackendClass.DevToolsStubErrorCode, data: messageObject };
        this._onMessage.call(null, { id: messageObject.id, error: error });
    },

    /**
     * @override
     * @return {!Promise}
     */
    disconnect: function()
    {
        this._onDisconnect.call(null, "force disconnect");
        this._onDisconnect = null;
        this._onMessage = null;
        return Promise.resolve();
    },
};
