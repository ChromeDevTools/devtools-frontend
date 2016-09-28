// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var http = require("http");
var ws = require("ws");

function Dispatcher()
{
    this._constructors = new Map();
    this._objects = new Map();
    this._lastObjectId = 1;
}

Dispatcher.prototype = {
    start: function(port)
    {
        var http_server = http.createServer();
        http_server.listen(port);

        var WebSocketServer = ws.Server;
        var options = { server: http_server, path: "/endpoint" };
        var wss = new WebSocketServer(options);
        wss.on("connection", (socket) => {
            this._socket = socket;
            this._socket.on("message", this._dispatchMessageWrapped.bind(this));
            this._socket.on("close", this._connectionClosed.bind(this));
        });
    },

    registerObject: function(name, constructor)
    {
        this._constructors.set(name, constructor);
    },

    _dispatchMessageWrapped: function(data)
    {
        try {
            var message = JSON.parse(data);
            this._dispatchMessage(message);
        } catch(e) {
            this._sendErrorResponse(message.id, e.toString());
        }
    },

    _dispatchMessage: function(message)
    {
        var [objectName, method] = message.method.split(".");
        var result = JSON.stringify({id: message.id});
        var constructor = this._constructors.get(objectName);
        if (!constructor) {
            this._sendErrorResponse(message.id, "Could not resolve service '" + objectName + "'");
            return;
        }
        if (method === "create") {
            var id = String(this._lastObjectId++);
            var object = new constructor(this._notify.bind(this, id, objectName));
            this._objects.set(id, object);
            this._sendResponse(message.id, { id: id });
        } else if (method === "dispose") {
            var object = this._objects.get(message.params.id);
            if (!object) {
                console.error("Could not look up object with id for " + JSON.stringify(message));
                return;
            }
            this._objects.delete(message.params.id);
            object.dispose().then(() => this._sendResponse(message.id));
        } else {
            if (!message.params) {
                console.error("No params in the message: " + JSON.stringify(message));
                return;
            }
            var object = this._objects.get(message.params.id);
            if (!object) {
                console.error("Could not look up object with id for " + JSON.stringify(message));
                return;
            }
            var handler = object[method];
            if (!(handler instanceof Function)) {
                console.error("Handler for '" + method + "' is missing.");
                return;
            }
            object[method](message.params).then(result => this._sendResponse(message.id, result));
        }
    },

    _connectionClosed: function()
    {
        for (var object of this._objects.values())
            object.dispose();
        this._objects.clear();
    },

    _notify: function(objectId, objectName, method, params)
    {
        params["id"] = objectId;
        var message = { method: objectName + "." + method, params: params };
        this._socket.send(JSON.stringify(message));
    },

    _sendResponse: function(messageId, result)
    {
        var message = { id: messageId, result: result };
        this._socket.send(JSON.stringify(message));
    },

    _sendErrorResponse: function(messageId, error)
    {
        var message = { id: messageId, error: error };
        this._socket.send(JSON.stringify(message));
    },
}

exports.Dispatcher = Dispatcher;
