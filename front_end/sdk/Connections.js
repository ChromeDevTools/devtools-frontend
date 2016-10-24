// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 */
WebInspector.MainConnection = function()
{
    InspectorBackendClass.Connection.call(this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchMessage, this._dispatchMessage, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchMessageChunk, this._dispatchMessageChunk, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.EvaluateForTestInFrontend, this._evaluateForTestInFrontend, this);
};

WebInspector.MainConnection.prototype = {
    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        var message = JSON.stringify(messageObject);
        InspectorFrontendHost.sendMessageToBackend(message);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _dispatchMessage: function(event)
    {
        this.dispatch(/** @type {string} */ (event.data));
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
            this.dispatch(this._messageBuffer);
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

        this.deprecatedRunAfterPendingDispatches(invokeMethod);
    },

    /**
     * @override
     */
    forceClose: function()
    {
        InspectorFrontendHost.events.removeEventListener(InspectorFrontendHostAPI.Events.DispatchMessage, this._dispatchMessage, this);
        InspectorFrontendHost.events.removeEventListener(InspectorFrontendHostAPI.Events.DispatchMessageChunk, this._dispatchMessageChunk, this);
        InspectorFrontendHost.events.removeEventListener(InspectorFrontendHostAPI.Events.EvaluateForTestInFrontend, this._evaluateForTestInFrontend, this);
    },

    __proto__: InspectorBackendClass.Connection.prototype
};

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 * @param {string} url
 * @param {function(!InspectorBackendClass.Connection)} onConnectionReady
 */
WebInspector.WebSocketConnection = function(url, onConnectionReady)
{
    InspectorBackendClass.Connection.call(this);
    this._socket = new WebSocket(url);
    this._socket.onmessage = this._onMessage.bind(this);
    this._socket.onerror = this._onError.bind(this);
    this._socket.onopen = onConnectionReady.bind(null, this);
    this._socket.onclose = this.connectionClosed.bind(this, "websocket_closed");
};

/**
 * @param {string} url
 * @return {!Promise<!InspectorBackendClass.Connection>}
 */
WebInspector.WebSocketConnection.Create = function(url)
{
    var fulfill;
    var result = new Promise(resolve => fulfill = resolve);
    new WebInspector.WebSocketConnection(url, fulfill);
    return result;
};

WebInspector.WebSocketConnection.prototype = {

    /**
     * @param {!MessageEvent} message
     */
    _onMessage: function(message)
    {
        var data = /** @type {string} */ (message.data);
        this.dispatch(data);
    },

    /**
     * @param {!Event} error
     */
    _onError: function(error)
    {
        console.error(error);
    },

    /**
     * @override
     */
    forceClose: function()
    {
        this._socket.close();
    },

    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        var message = JSON.stringify(messageObject);
        this._socket.send(message);
    },

    __proto__: InspectorBackendClass.Connection.prototype
};

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 */
WebInspector.StubConnection = function()
{
    InspectorBackendClass.Connection.call(this);
};

WebInspector.StubConnection.prototype = {
    /**
     * @override
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        setTimeout(this._respondWithError.bind(this, messageObject), 0);
    },

    /**
     * @param {!Object} messageObject
     */
    _respondWithError: function(messageObject)
    {
        var error = { message: "This is a stub connection, can't dispatch message.", code:  InspectorBackendClass.DevToolsStubErrorCode, data: messageObject };
        this.dispatch({ id: messageObject.id, error: error });
    },

    __proto__: InspectorBackendClass.Connection.prototype
};


/**
 * @constructor
 * @param {function(string)} dispatchCallback
 * @param {function()} yieldCallback
 */
WebInspector.RawProtocolConnection = function(dispatchCallback, yieldCallback)
{
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchMessage, this._dispatchMessage, this);
    InspectorFrontendHost.events.addEventListener(InspectorFrontendHostAPI.Events.DispatchMessageChunk, this._dispatchMessageChunk, this);
    this._dispatchCallback = dispatchCallback;
    this._yieldCallback = yieldCallback;
    this._isClosed = false;
};

WebInspector.RawProtocolConnection.prototype = {
    /**
     * @param {string} message
     */
    send: function(message)
    {
        if (this._isClosed)
            return;
        InspectorFrontendHost.sendMessageToBackend(message);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _dispatchMessage: function(event)
    {
        this._dispatchCallback(/** @type {string} */ (event.data));
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
            this._dispatchCallback(this._messageBuffer);
            this._messageBuffer = "";
            this._messageSize = 0;
        }
    },

    yieldConnection: function()
    {
        InspectorFrontendHost.events.removeEventListener(InspectorFrontendHostAPI.Events.DispatchMessage, this._dispatchMessage, this);
        InspectorFrontendHost.events.removeEventListener(InspectorFrontendHostAPI.Events.DispatchMessageChunk, this._dispatchMessageChunk, this);
        this._isClosed = true;
        delete this._dispatchCallback;
        this._yieldCallback();
    }
};
