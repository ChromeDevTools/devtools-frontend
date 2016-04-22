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
}

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

    __proto__: InspectorBackendClass.Connection.prototype
}

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
}

/**
 * @param {string} url
 * @param {function(!InspectorBackendClass.Connection)} onConnectionReady
 */
WebInspector.WebSocketConnection.Create = function(url, onConnectionReady)
{
    new WebInspector.WebSocketConnection(url, onConnectionReady);
}

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
     * @param {!Object} messageObject
     */
    sendMessage: function(messageObject)
    {
        var message = JSON.stringify(messageObject);
        this._socket.send(message);
    },

    __proto__: InspectorBackendClass.Connection.prototype
}

/**
 * @constructor
 * @extends {InspectorBackendClass.Connection}
 */
WebInspector.StubConnection = function()
{
    InspectorBackendClass.Connection.call(this);
}

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
}
