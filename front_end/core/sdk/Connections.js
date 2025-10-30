// Copyright 2015 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as Root from '../root/root.js';
import { RehydratingConnection } from './RehydratingConnection.js';
const UIStrings = {
    /**
     * @description Text on the remote debugging window to indicate the connection is lost
     */
    websocketDisconnected: 'WebSocket disconnected',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/Connections.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class MainConnection {
    onMessage = null;
    #onDisconnect = null;
    #messageBuffer = '';
    #messageSize = 0;
    #eventListeners;
    constructor() {
        this.#eventListeners = [
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.DispatchMessage, this.dispatchMessage, this),
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(Host.InspectorFrontendHostAPI.Events.DispatchMessageChunk, this.dispatchMessageChunk, this),
        ];
    }
    setOnMessage(onMessage) {
        this.onMessage = onMessage;
    }
    setOnDisconnect(onDisconnect) {
        this.#onDisconnect = onDisconnect;
    }
    sendRawMessage(message) {
        if (this.onMessage) {
            Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(message);
        }
    }
    dispatchMessage(event) {
        if (this.onMessage) {
            this.onMessage.call(null, event.data);
        }
    }
    dispatchMessageChunk(event) {
        const { messageChunk, messageSize } = event.data;
        if (messageSize) {
            this.#messageBuffer = '';
            this.#messageSize = messageSize;
        }
        this.#messageBuffer += messageChunk;
        if (this.#messageBuffer.length === this.#messageSize && this.onMessage) {
            this.onMessage.call(null, this.#messageBuffer);
            this.#messageBuffer = '';
            this.#messageSize = 0;
        }
    }
    async disconnect() {
        const onDisconnect = this.#onDisconnect;
        Common.EventTarget.removeEventListeners(this.#eventListeners);
        this.#onDisconnect = null;
        this.onMessage = null;
        if (onDisconnect) {
            onDisconnect.call(null, 'force disconnect');
        }
    }
}
export class WebSocketConnection {
    #socket;
    onMessage = null;
    #onDisconnect = null;
    #onWebSocketDisconnect;
    #connected = false;
    #messages = [];
    constructor(url, onWebSocketDisconnect) {
        this.#socket = new WebSocket(url);
        this.#socket.onerror = this.onError.bind(this);
        this.#socket.onopen = this.onOpen.bind(this);
        this.#socket.onmessage = (messageEvent) => {
            if (this.onMessage) {
                this.onMessage.call(null, messageEvent.data);
            }
        };
        this.#socket.onclose = this.onClose.bind(this);
        this.#onWebSocketDisconnect = onWebSocketDisconnect;
    }
    setOnMessage(onMessage) {
        this.onMessage = onMessage;
    }
    setOnDisconnect(onDisconnect) {
        this.#onDisconnect = onDisconnect;
    }
    onError() {
        if (this.#onWebSocketDisconnect) {
            this.#onWebSocketDisconnect.call(null, i18nString(UIStrings.websocketDisconnected));
        }
        if (this.#onDisconnect) {
            // This is called if error occurred while connecting.
            this.#onDisconnect.call(null, 'connection failed');
        }
        this.close();
    }
    onOpen() {
        this.#connected = true;
        if (this.#socket) {
            this.#socket.onerror = console.error;
            for (const message of this.#messages) {
                this.#socket.send(message);
            }
        }
        this.#messages = [];
    }
    onClose() {
        if (this.#onWebSocketDisconnect) {
            this.#onWebSocketDisconnect.call(null, i18nString(UIStrings.websocketDisconnected));
        }
        if (this.#onDisconnect) {
            this.#onDisconnect.call(null, 'websocket closed');
        }
        this.close();
    }
    close(callback) {
        if (this.#socket) {
            this.#socket.onerror = null;
            this.#socket.onopen = null;
            this.#socket.onclose = callback || null;
            this.#socket.onmessage = null;
            this.#socket.close();
            this.#socket = null;
        }
        this.#onWebSocketDisconnect = null;
    }
    sendRawMessage(message) {
        if (this.#connected && this.#socket) {
            this.#socket.send(message);
        }
        else {
            this.#messages.push(message);
        }
    }
    disconnect() {
        return new Promise(fulfill => {
            this.close(() => {
                if (this.#onDisconnect) {
                    this.#onDisconnect.call(null, 'force disconnect');
                }
                fulfill();
            });
        });
    }
}
export class StubConnection {
    onMessage = null;
    #onDisconnect = null;
    setOnMessage(onMessage) {
        this.onMessage = onMessage;
    }
    setOnDisconnect(onDisconnect) {
        this.#onDisconnect = onDisconnect;
    }
    sendRawMessage(message) {
        window.setTimeout(this.respondWithError.bind(this, message), 0);
    }
    respondWithError(message) {
        const messageObject = JSON.parse(message);
        const error = {
            message: 'This is a stub connection, can\'t dispatch message.',
            code: ProtocolClient.InspectorBackend.DevToolsStubErrorCode,
            data: messageObject,
        };
        if (this.onMessage) {
            this.onMessage.call(null, { id: messageObject.id, error });
        }
    }
    async disconnect() {
        if (this.#onDisconnect) {
            this.#onDisconnect.call(null, 'force disconnect');
        }
        this.#onDisconnect = null;
        this.onMessage = null;
    }
}
export class ParallelConnection {
    #connection;
    #sessionId;
    onMessage = null;
    #onDisconnect = null;
    constructor(connection, sessionId) {
        this.#connection = connection;
        this.#sessionId = sessionId;
    }
    setOnMessage(onMessage) {
        this.onMessage = onMessage;
    }
    setOnDisconnect(onDisconnect) {
        this.#onDisconnect = onDisconnect;
    }
    getOnDisconnect() {
        return this.#onDisconnect;
    }
    sendRawMessage(message) {
        const messageObject = JSON.parse(message);
        // If the message isn't for a specific session, it must be for the root session.
        if (!messageObject.sessionId) {
            messageObject.sessionId = this.#sessionId;
        }
        this.#connection.sendRawMessage(JSON.stringify(messageObject));
    }
    getSessionId() {
        return this.#sessionId;
    }
    async disconnect() {
        if (this.#onDisconnect) {
            this.#onDisconnect.call(null, 'force disconnect');
        }
        this.#onDisconnect = null;
        this.onMessage = null;
    }
}
export async function initMainConnection(createRootTarget, onConnectionLost) {
    ProtocolClient.ConnectionTransport.ConnectionTransport.setFactory(createMainConnection.bind(null, onConnectionLost));
    await createRootTarget();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady();
}
function createMainConnection(onConnectionLost) {
    if (Root.Runtime.Runtime.isTraceApp()) {
        return new RehydratingConnection(onConnectionLost);
    }
    const wsParam = Root.Runtime.Runtime.queryParam('ws');
    const wssParam = Root.Runtime.Runtime.queryParam('wss');
    if (wsParam || wssParam) {
        const ws = (wsParam ? `ws://${wsParam}` : `wss://${wssParam}`);
        return new WebSocketConnection(ws, onConnectionLost);
    }
    const notEmbeddedOrWs = Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode();
    if (notEmbeddedOrWs) {
        // eg., hosted mode (e.g. `http://localhost:9222/devtools/inspector.html`) without a WebSocket URL,
        return new StubConnection();
    }
    return new MainConnection();
}
//# sourceMappingURL=Connections.js.map