// Copyright (c) 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import * as Host from '../host/host.js';
import * as ProtocolClient from '../protocol_client/protocol_client.js';
import * as Root from '../root/root.js';

import {TargetManager} from './TargetManager.js';

export class MainConnection implements ProtocolClient.InspectorBackend.Connection {
  onMessage: ((arg0: (Object|string)) => void)|null;
  #onDisconnect: ((arg0: string) => void)|null;
  #messageBuffer: string;
  #messageSize: number;
  readonly #eventListeners: Common.EventTarget.EventDescriptor[];
  constructor() {
    this.onMessage = null;
    this.#onDisconnect = null;
    this.#messageBuffer = '';
    this.#messageSize = 0;
    this.#eventListeners = [
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.DispatchMessage, this.dispatchMessage, this),
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
          Host.InspectorFrontendHostAPI.Events.DispatchMessageChunk, this.dispatchMessageChunk, this),
    ];
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this.onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.#onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    if (this.onMessage) {
      Host.InspectorFrontendHost.InspectorFrontendHostInstance.sendMessageToBackend(message);
    }
  }

  private dispatchMessage(event: Common.EventTarget.EventTargetEvent<string>): void {
    if (this.onMessage) {
      this.onMessage.call(null, event.data);
    }
  }

  private dispatchMessageChunk(
      event: Common.EventTarget.EventTargetEvent<Host.InspectorFrontendHostAPI.DispatchMessageChunkEvent>): void {
    const {messageChunk, messageSize} = event.data;
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

  async disconnect(): Promise<void> {
    const onDisconnect = this.#onDisconnect;
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#onDisconnect = null;
    this.onMessage = null;

    if (onDisconnect) {
      onDisconnect.call(null, 'force disconnect');
    }
  }
}

export class WebSocketConnection implements ProtocolClient.InspectorBackend.Connection {
  #socket: WebSocket|null;
  onMessage: ((arg0: (Object|string)) => void)|null;
  #onDisconnect: ((arg0: string) => void)|null;
  #onWebSocketDisconnect: (() => void)|null;
  #connected: boolean;
  #messages: string[];
  constructor(url: Platform.DevToolsPath.UrlString, onWebSocketDisconnect: () => void) {
    this.#socket = new WebSocket(url);
    this.#socket.onerror = this.onError.bind(this);
    this.#socket.onopen = this.onOpen.bind(this);
    this.#socket.onmessage = (messageEvent: MessageEvent<string>): void => {
      if (this.onMessage) {
        this.onMessage.call(null, messageEvent.data);
      }
    };
    this.#socket.onclose = this.onClose.bind(this);

    this.onMessage = null;
    this.#onDisconnect = null;
    this.#onWebSocketDisconnect = onWebSocketDisconnect;
    this.#connected = false;
    this.#messages = [];
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this.onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.#onDisconnect = onDisconnect;
  }

  private onError(): void {
    if (this.#onWebSocketDisconnect) {
      this.#onWebSocketDisconnect.call(null);
    }
    if (this.#onDisconnect) {
      // This is called if error occurred while connecting.
      this.#onDisconnect.call(null, 'connection failed');
    }
    this.close();
  }

  private onOpen(): void {
    this.#connected = true;
    if (this.#socket) {
      this.#socket.onerror = console.error;
      for (const message of this.#messages) {
        this.#socket.send(message);
      }
    }
    this.#messages = [];
  }

  private onClose(): void {
    if (this.#onWebSocketDisconnect) {
      this.#onWebSocketDisconnect.call(null);
    }
    if (this.#onDisconnect) {
      this.#onDisconnect.call(null, 'websocket closed');
    }
    this.close();
  }

  private close(callback?: (() => void)): void {
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

  sendRawMessage(message: string): void {
    if (this.#connected && this.#socket) {
      this.#socket.send(message);
    } else {
      this.#messages.push(message);
    }
  }

  disconnect(): Promise<void> {
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

export class StubConnection implements ProtocolClient.InspectorBackend.Connection {
  onMessage: ((arg0: (Object|string)) => void)|null;
  #onDisconnect: ((arg0: string) => void)|null;
  constructor() {
    this.onMessage = null;
    this.#onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: (Object|string)) => void): void {
    this.onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.#onDisconnect = onDisconnect;
  }

  sendRawMessage(message: string): void {
    window.setTimeout(this.respondWithError.bind(this, message), 0);
  }

  private respondWithError(message: string): void {
    const messageObject = JSON.parse(message);
    const error = {
      message: 'This is a stub connection, can\'t dispatch message.',
      code: ProtocolClient.InspectorBackend.DevToolsStubErrorCode,
      data: messageObject,
    };
    if (this.onMessage) {
      this.onMessage.call(null, {id: messageObject.id, error: error});
    }
  }

  async disconnect(): Promise<void> {
    if (this.#onDisconnect) {
      this.#onDisconnect.call(null, 'force disconnect');
    }
    this.#onDisconnect = null;
    this.onMessage = null;
  }
}

export interface ParallelConnectionInterface extends ProtocolClient.InspectorBackend.Connection {
  getSessionId: () => string;
  getOnDisconnect: () => ((arg0: string) => void) | null;
}

export class ParallelConnection implements ParallelConnectionInterface {
  readonly #connection: ProtocolClient.InspectorBackend.Connection;
  #sessionId: string;
  onMessage: ((arg0: Object) => void)|null;
  #onDisconnect: ((arg0: string) => void)|null;
  constructor(connection: ProtocolClient.InspectorBackend.Connection, sessionId: string) {
    this.#connection = connection;
    this.#sessionId = sessionId;
    this.onMessage = null;
    this.#onDisconnect = null;
  }

  setOnMessage(onMessage: (arg0: Object) => void): void {
    this.onMessage = onMessage;
  }

  setOnDisconnect(onDisconnect: (arg0: string) => void): void {
    this.#onDisconnect = onDisconnect;
  }

  getOnDisconnect(): ((arg0: string) => void)|null {
    return this.#onDisconnect;
  }

  sendRawMessage(message: string): void {
    const messageObject = JSON.parse(message);
    // If the message isn't for a specific session, it must be for the root session.
    if (!messageObject.sessionId) {
      messageObject.sessionId = this.#sessionId;
    }
    this.#connection.sendRawMessage(JSON.stringify(messageObject));
  }

  getSessionId(): string {
    return this.#sessionId;
  }

  async disconnect(): Promise<void> {
    if (this.#onDisconnect) {
      this.#onDisconnect.call(null, 'force disconnect');
    }
    this.#onDisconnect = null;
    this.onMessage = null;
  }
}

export async function initMainConnection(
    createMainTarget: () => Promise<void>, websocketConnectionLost: () => void): Promise<void> {
  ProtocolClient.InspectorBackend.Connection.setFactory(createMainConnection.bind(null, websocketConnectionLost));
  await createMainTarget();
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.connectionReady();
  Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.addEventListener(
      Host.InspectorFrontendHostAPI.Events.ReattachMainTarget, () => {
        const target = TargetManager.instance().mainTarget();
        if (target) {
          const router = target.router();
          if (router) {
            void router.connection().disconnect();
          }
        }
        void createMainTarget();
      });
}

function createMainConnection(websocketConnectionLost: () => void): ProtocolClient.InspectorBackend.Connection {
  const wsParam = Root.Runtime.Runtime.queryParam('ws');
  const wssParam = Root.Runtime.Runtime.queryParam('wss');
  if (wsParam || wssParam) {
    const ws = (wsParam ? `ws://${wsParam}` : `wss://${wssParam}`) as Platform.DevToolsPath.UrlString;
    return new WebSocketConnection(ws, websocketConnectionLost);
  }
  if (Host.InspectorFrontendHost.InspectorFrontendHostInstance.isHostedMode()) {
    return new StubConnection();
  }

  return new MainConnection();
}
