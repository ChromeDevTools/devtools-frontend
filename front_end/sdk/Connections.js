// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';

import {TargetManager} from './SDKModel.js';

/**
 * @implements {ProtocolClient.InspectorBackend.Connection}
 */
export class MainConnection {
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

  /**
   * @override
   * @param {function((!Object|string))} onMessage
   */
  setOnMessage(onMessage) {
    this._onMessage = onMessage;
  }

  /**
   * @override
   * @param {function(string)} onDisconnect
   */
  setOnDisconnect(onDisconnect) {
    this._onDisconnect = onDisconnect;
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    if (this._onMessage) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(message);
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _dispatchMessage(event) {
    if (this._onMessage) {
      this._onMessage.call(null, /** @type {string} */ (event.data));
    }
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _dispatchMessageChunk(event) {
    const messageChunk = /** @type {string} */ (event.data['messageChunk']);
    const messageSize = /** @type {number} */ (event.data['messageSize']);
    if (messageSize) {
      this._messageBuffer = '';
      this._messageSize = messageSize;
    }
    this._messageBuffer += messageChunk;
    if (this._messageBuffer.length === this._messageSize) {
      this._onMessage.call(null, this._messageBuffer);
      this._messageBuffer = '';
      this._messageSize = 0;
    }
  }

  /**
   * @override
   * @return {!Promise}
   */
  disconnect() {
    const onDisconnect = this._onDisconnect;
    Common.EventTarget.EventTarget.removeEventListeners(this._eventListeners);
    this._onDisconnect = null;
    this._onMessage = null;

    if (onDisconnect) {
      onDisconnect.call(null, 'force disconnect');
    }
    return Promise.resolve();
  }
}

/**
 * @implements {ProtocolClient.InspectorBackend.Connection}
 */
export class WebSocketConnection {
  /**
   * @param {string} url
   * @param {function()} onWebSocketDisconnect
   */
  constructor(url, onWebSocketDisconnect) {
    this._socket = new WebSocket(url);
    this._socket.onerror = this._onError.bind(this);
    this._socket.onopen = this._onOpen.bind(this);
    this._socket.onmessage = messageEvent => {
      if (this._onMessage) {
        this._onMessage.call(null, /** @type {string} */ (messageEvent.data));
      }
    };
    this._socket.onclose = this._onClose.bind(this);

    this._onMessage = null;
    this._onDisconnect = null;
    this._onWebSocketDisconnect = onWebSocketDisconnect;
    this._connected = false;
    this._messages = [];
  }

  /**
   * @override
   * @param {function((!Object|string))} onMessage
   */
  setOnMessage(onMessage) {
    this._onMessage = onMessage;
  }

  /**
   * @override
   * @param {function(string)} onDisconnect
   */
  setOnDisconnect(onDisconnect) {
    this._onDisconnect = onDisconnect;
  }

  _onError() {
    this._onWebSocketDisconnect.call(null);
    // This is called if error occurred while connecting.
    this._onDisconnect.call(null, 'connection failed');
    this._close();
  }

  _onOpen() {
    this._socket.onerror = console.error;
    this._connected = true;
    for (const message of this._messages) {
      this._socket.send(message);
    }
    this._messages = [];
  }

  _onClose() {
    this._onWebSocketDisconnect.call(null);
    this._onDisconnect.call(null, 'websocket closed');
    this._close();
  }

  /**
   * @param {function()=} callback
   */
  _close(callback) {
    this._socket.onerror = null;
    this._socket.onopen = null;
    this._socket.onclose = callback || null;
    this._socket.onmessage = null;
    this._socket.close();
    this._socket = null;
    this._onWebSocketDisconnect = null;
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    if (this._connected) {
      this._socket.send(message);
    } else {
      this._messages.push(message);
    }
  }

  /**
   * @override
   * @return {!Promise}
   */
  disconnect() {
    let fulfill;
    const promise = new Promise(f => fulfill = f);
    this._close(() => {
      if (this._onDisconnect) {
        this._onDisconnect.call(null, 'force disconnect');
      }
      fulfill();
    });
    return promise;
  }
}

/**
 * @implements {ProtocolClient.InspectorBackend.Connection}
 */
export class StubConnection {
  constructor() {
    this._onMessage = null;
    this._onDisconnect = null;
  }

  /**
   * @override
   * @param {function((!Object|string))} onMessage
   */
  setOnMessage(onMessage) {
    this._onMessage = onMessage;
  }

  /**
   * @override
   * @param {function(string)} onDisconnect
   */
  setOnDisconnect(onDisconnect) {
    this._onDisconnect = onDisconnect;
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    setTimeout(this._respondWithError.bind(this, message), 0);
  }

  /**
   * @param {string} message
   */
  _respondWithError(message) {
    const messageObject = JSON.parse(message);
    const error = {
      message: 'This is a stub connection, can\'t dispatch message.',
      code: ProtocolClient.InspectorBackend.DevToolsStubErrorCode,
      data: messageObject
    };
    if (this._onMessage) {
      this._onMessage.call(null, {id: messageObject.id, error: error});
    }
  }

  /**
   * @override
   * @return {!Promise}
   */
  disconnect() {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
    return Promise.resolve();
  }
}

/**
 * @implements {ProtocolClient.InspectorBackend.Connection}
 */
export class ParallelConnection {
  /**
   * @param {!ProtocolClient.InspectorBackend.Connection} connection
   * @param {string} sessionId
   */
  constructor(connection, sessionId) {
    this._connection = connection;
    this._sessionId = sessionId;
    this._onMessage = null;
    this._onDisconnect = null;
  }

  /**
   * @override
   * @param {function(!Object)} onMessage
   */
  setOnMessage(onMessage) {
    this._onMessage = onMessage;
  }

  /**
   * @override
   * @param {function(string)} onDisconnect
   */
  setOnDisconnect(onDisconnect) {
    this._onDisconnect = onDisconnect;
  }

  /**
   * @override
   * @param {string} message
   */
  sendRawMessage(message) {
    const messageObject = JSON.parse(message);
    // If the message isn't for a specific session, it must be for the root session.
    if (!messageObject.sessionId) {
      messageObject.sessionId = this._sessionId;
    }
    this._connection.sendRawMessage(JSON.stringify(messageObject));
  }

  /**
   * @override
   * @return {!Promise}
   */
  disconnect() {
    if (this._onDisconnect) {
      this._onDisconnect.call(null, 'force disconnect');
    }
    this._onDisconnect = null;
    this._onMessage = null;
    return Promise.resolve();
  }
}

/**
 * @param {function():!Promise<undefined>} createMainTarget
 * @param {function()} websocketConnectionLost
 * @return {!Promise}
 */
export async function initMainConnection(createMainTarget, websocketConnectionLost) {
  ProtocolClient.InspectorBackend.Connection.setFactory(_createMainConnection.bind(null, websocketConnectionLost));
  await createMainTarget();
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady();
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
      Host.InspectorFrontendHostAPI.Events.ReattachMainTarget, () => {
        TargetManager.instance().mainTarget().router().connection().disconnect();
        createMainTarget();
      });
  return Promise.resolve();
}

/**
 * @param {function()} websocketConnectionLost
 * @return {!ProtocolClient.InspectorBackend.Connection}
 */
export function _createMainConnection(websocketConnectionLost) {
  const wsParam = Root.Runtime.queryParam('ws');
  const wssParam = Root.Runtime.queryParam('wss');
  if (wsParam || wssParam) {
    const ws = wsParam ? `ws://${wsParam}` : `wss://${wssParam}`;
    return new WebSocketConnection(ws, websocketConnectionLost);
  }
  if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
    return new StubConnection();
  }

  return new MainConnection();
}
