// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as Root from '../root/root.js';

import {TargetManager} from './SDKModel.js';

export class MainConnection implements ProtocolClient.InspectorBackend.Connection {
  _onMessage: ((arg0: (Object|string)) => void)|null;
  _onDisconnect: ((arg0: string) => void)|null;
  _messageBuffer: string;
  _messageSize: number;
  _eventListeners: Common.EventTarget.EventDescriptor[];
  constructor() {
    this._onMessage = null;
    this._onDisconnect = null;
    this._messageBuffer = '';
    this._messageSize = 0;
    this._eventListeners = [
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.DispatchMessage, this._dispatchMessage, this),
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.DispatchMessageChunk, this._dispatchMessageChunk, this),
    ];
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this._onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this._onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    if (this._onMessage) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(message);
    }
  }

  _dispatchMessage(event: Common.EventTarget.EventTargetEvent): void {
    if (this._onMessage) {
      this._onMessage.call(null, (event.data as string));
    }
  }

  _dispatchMessageChunk(event: Common.EventTarget.EventTargetEvent): void {
    const messageChunk = (event.data['messageChunk'] as string);
    const messageSize = (event.data['messageSize'] as number);
    if (messageSize) {
      this._messageBuffer = '';
      this._messageSize = messageSize;
    }
    this._messageBuffer += messageChunk;
    if (this._messageBuffer.length === this._messageSize && this._onMessage) {
      this._onMessage.call(null, this._messageBuffer);
      this._messageBuffer = '';
      this._messageSize = 0;
    }
  }

  async disconnect(): Promise<void> {
    const onDisconnect = this._onDisconnect;
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._onDisconnect = null;
    this._onMessage = null;

    if (onDisconnect) {
      onDisconnect.call(null, 'force disconnect');
    }
  }
}

export class WebSocketConnection implements ProtocolClient.InspectorBackend.Connection {
  _socket: WebSocket|null;
  _onMessage: ((arg0: (Object|string)) => void)|null;
  _onDisconnect: ((arg0: string) => void)|null;
  _onWebSocketDisconnect: (() => void)|null;
  _connected: boolean;
  _messages: string[];
  constructor(url: string, onWebSocketDisconnect: () => void) {
    this._socket = new WebSocket(url);
    this._socket.onerror = this._onError.bind(this);
    this._socket.onopen = this._onOpen.bind(this);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this._socket.onmessage = (messageEvent: MessageEvent<any>): void => {
      if (this._onMessage) {
        this._onMessage.call(null, (messageEvent.data as string));
      }
    };
    this._socket.onclose = this._onClose.bind(this);

    this._onMessage = null;
    this._onDisconnect = null;
    this._onWebSocketDisconnect = onWebSocketDisconnect;
    this._connected = false;
    this._messages = [];
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this._onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this._onDisconnect = onDisconnect;
  }

  _onError(): void {
    if (this._onWebSocketDisconnect) {
      this._onWebSocketDisconnect.call(null);
    }
    if (this._onDisconnect) {
      // This is called if error occurred while connecting.
      this._onDisconnect.call(null, 'connection failed');
    }
    this._close();
  }

  _onOpen(): void {
    this._connected = true;
    if (this._socket) {
      this._socket.onerror = console.error;
      for (const message of this._messages) {
        this._socket.send(message);
      }
    }
    this._messages = [];
  }

  _onClose(): void {
    if (this._onWebSocketDisconnect) {
      this._onWebSocketDisconnect.call(null);
    }
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'websocket closed');
    }
    this._close();
  }

  _close(callback?: (() => void)): void {
    if (this._socket) {
      this._socket.onerror = null;
      this._socket.onopen = null;
      this._socket.onclose = callback || null;
      this._socket.onmessage = null;
      this._socket.close();
      this._socket = null;
    }
    this._onWebSocketDisconnect = null;
  }

  sendRawMessage(message: string): void {
    if (this._connected && this._socket) {
      this._socket.send(message);
    } else {
      this._messages.push(message);
    }
  }

  disconnect(): Promise<void> {
    return new Promise(fulfill => {
      this._close(() => {
        if (this._onDisconnect) {
          this._onDisconnect.call(null, 'force disconnect');
        }
        fulfill();
      });
    });
  }
}

export class StubConnection implements ProtocolClient.InspectorBackend.Connection {
  _onMessage: ((arg0: (Object|string)) => void)|null;
  _onDisconnect: ((arg0: string) => void)|null;
  constructor() {
    this._onMessage = null;
    this._onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this._onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this._onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    setTimeout(this._respondWithError.bind(this, message), 0);
  }

  _respondWithError(message: string): void {
    const messageObject = JSON.parse(message);
    const error = {
      message: 'This is a stub connection, can\'t dispatch message.',
      code: ProtocolClient.InspectorBackend.DevToolsStubErrorCode,
      data: messageObject,
    };
    if (this._onMessage) {
      this._onMessage.call(null, {id: messageObject.id, error: error});
    }
  }

  async disconnect(): Promise<void> {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
  }
}

export class ParallelConnection implements ProtocolClient.InspectorBackend.Connection {
  _connection: ProtocolClient.InspectorBackend.Connection;
  _sessionId: string;
  _onMessage: ((arg0: Object) => void)|null;
  _onDisconnect: ((arg0: string) => void)|null;
  constructor(connection: ProtocolClient.InspectorBackend.Connection, sessionId: string) {
    this._connection = connection;
    this._sessionId = sessionId;
    this._onMessage = null;
    this._onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: Object) => void): void {
    this._onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this._onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    const messageObject = JSON.parse(message);
    // If the message isn't for a specific session, it must be for the root session.
    if (!messageObject.sessionId) {
      messageObject.sessionId = this._sessionId;
    }
    this._connection.sendRawMessage(JSON.stringify(messageObject));
  }

  async disconnect(): Promise<void> {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
  }
}

export async function initMainConnection(
    createMainTarget: () => Promise<void>, websocketConnectionLost: () => void): Promise<void> {
  ProtocolClient.InspectorBackend.Connection.setFactory(_createMainConnection.bind(null, websocketConnectionLost));
  await createMainTarget();
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady();
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
      Host.InspectorFrontendHostAPI.Events.ReattachMainTarget, () => {
        const target = TargetManager.instance().mainTarget();
        if (target) {
          const router = target.router();
          if (router) {
            router.connection().disconnect();
          }
        }
        createMainTarget();
      });
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export function _createMainConnection(websocketConnectionLost: () => void): ProtocolClient.InspectorBackend.Connection {
  const wsParam = Root.Runtime.Runtime.queryParam('ws');
  const wssParam = Root.Runtime.Runtime.queryParam('wss');
  if (wsParam || wssParam) {
    const ws = wsParam ? `ws://${wsParam}` : `wss://${wssParam}`;
    return new WebSocketConnection(ws, websocketConnectionLost);
  }
  if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
    return new StubConnection();
  }

  return new MainConnection();
}
