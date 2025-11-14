// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  type CDPCommandRequest,
  type CDPConnection,
  type CDPConnectionObserver,
  type CDPError,
  CDPErrorStatus,
  type CDPReceivableMessage,
  type Command,
  type CommandParams,
  type CommandResult
} from './CDPConnection.js';
import type {ConnectionTransport} from './ConnectionTransport.js';
import {InspectorBackend, type MessageError, type QualifiedName, test} from './InspectorBackend.js';

interface CallbackWithDebugInfo {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resolve: (response: {result: CommandResult<any>}|{error: CDPError}) => void;
  method: string;
  sessionId: string|undefined;
}

type Callback = (error: MessageError|null, arg1: Object|null) => void;

const LongPollingMethods = new Set<string>(['CSS.takeComputedStyleUpdates']);

export class DevToolsCDPConnection implements CDPConnection {
  readonly #transport: ConnectionTransport;
  #lastMessageId = 1;
  #pendingResponsesCount = 0;
  readonly #pendingLongPollingMessageIds = new Set<number>();
  #pendingScripts: Array<() => void> = [];
  readonly #callbacks = new Map<number, CallbackWithDebugInfo>();
  readonly #observers = new Set<CDPConnectionObserver>();

  constructor(transport: ConnectionTransport) {
    this.#transport = transport;

    test.deprecatedRunAfterPendingDispatches = this.deprecatedRunAfterPendingDispatches.bind(this);
    test.sendRawMessage = this.sendRawMessageForTesting.bind(this);

    this.#transport.setOnMessage(this.onMessage.bind(this));
    this.#transport.setOnDisconnect(reason => {
      this.#observers.forEach(observer => observer.onDisconnect(reason));
    });
  }

  observe(observer: CDPConnectionObserver): void {
    this.#observers.add(observer);
  }

  unobserve(observer: CDPConnectionObserver): void {
    this.#observers.delete(observer);
  }

  send<T extends Command>(method: T, params: CommandParams<T>, sessionId: string|undefined):
      Promise<{result: CommandResult<T>}|{error: CDPError}> {
    const messageId = ++this.#lastMessageId;
    const messageObject: Partial<CDPCommandRequest<T>> = {
      id: messageId,
      method,
    };

    if (params) {
      messageObject.params = params;
    }
    if (sessionId) {
      messageObject.sessionId = sessionId;
    }

    if (test.dumpProtocol) {
      test.dumpProtocol('frontend: ' + JSON.stringify(messageObject));
    }

    if (test.onMessageSent) {
      const domain = method.split('.')[0];
      const paramsObject = JSON.parse(JSON.stringify(params || {}));
      test.onMessageSent({domain, method, params: (paramsObject as Object), id: messageId, sessionId});
    }

    ++this.#pendingResponsesCount;
    if (LongPollingMethods.has(method)) {
      this.#pendingLongPollingMessageIds.add(messageId);
    }

    return new Promise(resolve => {
      this.#callbacks.set(messageId, {resolve, method, sessionId});
      this.#transport.sendRawMessage(JSON.stringify(messageObject));
    });
  }

  resolvePendingCalls(sessionId: string): void {
    for (const {resolve, method, sessionId: callbackSessionId} of this.#callbacks.values()) {
      if (sessionId !== callbackSessionId) {
        continue;
      }
      resolve({
        error: {
          message: `Session is unregistering, can\'t dispatch pending call to ${method}`,
          code: CDPErrorStatus.SESSION_NOT_FOUND,
        }
      });
    }
  }

  private sendRawMessageForTesting(method: QualifiedName, params: Object|null, callback: Callback|null, sessionId = ''):
      void {
    void this.send(method as Command, params as CommandParams<Command>, sessionId).then(response => {
      if ('error' in response && response.error) {
        callback?.(response.error, null);
      } else if ('result' in response) {
        callback?.(null, response.result as Object | null);
      }
    });
  }

  private onMessage(message: string|Object): void {
    if (test.dumpProtocol) {
      test.dumpProtocol('backend: ' + ((typeof message === 'string') ? message : JSON.stringify(message)));
    }

    if (test.onMessageReceived) {
      const messageObjectCopy = JSON.parse((typeof message === 'string') ? message : JSON.stringify(message));
      test.onMessageReceived(messageObjectCopy);
    }

    const messageObject = ((typeof message === 'string') ? JSON.parse(message) : message) as CDPReceivableMessage;

    if ('id' in messageObject && messageObject.id !== undefined) {  // just a response for some request
      const callback = this.#callbacks.get(messageObject.id);
      this.#callbacks.delete(messageObject.id);
      if (!callback) {
        // Ignore messages with unknown IDs, we might see puppeteer proxied messages here.
        return;
      }

      callback.resolve(messageObject);
      --this.#pendingResponsesCount;
      this.#pendingLongPollingMessageIds.delete(messageObject.id);

      if (this.#pendingScripts.length && !this.hasOutstandingNonLongPollingRequests()) {
        this.deprecatedRunAfterPendingDispatches();
      }
    } else if ('method' in messageObject) {
      this.#observers.forEach(observer => observer.onEvent(messageObject));
    } else {
      InspectorBackend.reportProtocolError('Protocol Error: the message without method', messageObject);
    }
  }

  private hasOutstandingNonLongPollingRequests(): boolean {
    return this.#pendingResponsesCount - this.#pendingLongPollingMessageIds.size > 0;
  }

  private deprecatedRunAfterPendingDispatches(script?: (() => void)): void {
    if (script) {
      this.#pendingScripts.push(script);
    }

    // Execute all promises.
    setTimeout(() => {
      if (!this.hasOutstandingNonLongPollingRequests()) {
        this.executeAfterPendingDispatches();
      } else {
        this.deprecatedRunAfterPendingDispatches();
      }
    }, 0);
  }

  private executeAfterPendingDispatches(): void {
    if (!this.hasOutstandingNonLongPollingRequests()) {
      const scripts = this.#pendingScripts;
      this.#pendingScripts = [];
      for (let id = 0; id < scripts.length; ++id) {
        scripts[id]();
      }
    }
  }
}
