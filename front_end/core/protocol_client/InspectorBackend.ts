/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/* eslint-disable rulesdir/no_underscored_properties */

import {NodeURL} from './NodeURL.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

export const ProtocolError = Symbol('Protocol.Error');
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// ProtocolError has previously been typed as string and needs to
// be updated in the generated code like protocol.d.ts too.
export type ProtocolError = string;

export const DevToolsStubErrorCode = -32015;
// TODO(dgozman): we are not reporting generic errors in tests, but we should
// instead report them and just have some expected errors in test expectations.
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _GenericError = -32000;
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
const _ConnectionClosedErrorCode = -32001;

export type Message = {
  sessionId?: string,
  url?: string,
  id?: number,
  error?: Object|null,
  result?: Object|null,
  method?: string,
  params?: Array<string>,
};

export class InspectorBackend {
  _agentPrototypes: Map<string, _AgentPrototype>;
  _dispatcherPrototypes: Map<string, _DispatcherPrototype>;
  _initialized: boolean;

  constructor() {
    this._agentPrototypes = new Map();
    this._dispatcherPrototypes = new Map();
    this._initialized = false;
  }

  static reportProtocolError(error: string, messageObject: Object): void {
    console.error(error + ': ' + JSON.stringify(messageObject));
  }

  static reportProtocolWarning(error: string, messageObject: Object): void {
    console.warn(error + ': ' + JSON.stringify(messageObject));
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  _addAgentGetterMethodToProtocolTargetPrototype(domain: string): void {
    let upperCaseLength = 0;
    while (upperCaseLength < domain.length && domain[upperCaseLength].toLowerCase() !== domain[upperCaseLength]) {
      ++upperCaseLength;
    }

    const methodName = domain.substr(0, upperCaseLength).toLowerCase() + domain.slice(upperCaseLength) + 'Agent';

    function agentGetter(this: TargetBase): _AgentPrototype {
      return this._agents[domain];
    }

    // @ts-ignore Method code generation
    TargetBase.prototype[methodName] = agentGetter;

    function registerDispatcher(this: TargetBase, dispatcher: _DispatcherPrototype): void {
      this.registerDispatcher(domain, dispatcher);
    }

    // @ts-ignore Method code generation
    TargetBase.prototype['register' + domain + 'Dispatcher'] = registerDispatcher;

    function unregisterDispatcher(this: TargetBase, dispatcher: _DispatcherPrototype): void {
      this.unregisterDispatcher(domain, dispatcher);
    }

    // @ts-ignore Method code generation
    TargetBase.prototype['unregister' + domain + 'Dispatcher'] = unregisterDispatcher;
  }

  _agentPrototype(domain: string): _AgentPrototype {
    if (!this._agentPrototypes.has(domain)) {
      this._agentPrototypes.set(domain, new _AgentPrototype(domain));
      this._addAgentGetterMethodToProtocolTargetPrototype(domain);
    }

    return /** @type {!_AgentPrototype} */ this._agentPrototypes.get(domain) as _AgentPrototype;
  }

  _dispatcherPrototype(domain: string): _DispatcherPrototype {
    if (!this._dispatcherPrototypes.has(domain)) {
      this._dispatcherPrototypes.set(domain, new _DispatcherPrototype());
    }
    return /** @type {!_DispatcherPrototype} */ this._dispatcherPrototypes.get(domain) as _DispatcherPrototype;
  }

  registerCommand(
      method: string, signature: {
        name: string,
        type: string,
        optional: boolean,
      }[],
      replyArgs: string[]): void {
    const domainAndMethod = method.split('.');
    this._agentPrototype(domainAndMethod[0]).registerCommand(domainAndMethod[1], signature, replyArgs);
    this._initialized = true;
  }

  registerEnum(type: string, values: Object): void {
    const domainAndName = type.split('.');
    const domain = domainAndName[0];
    // @ts-ignore Protocol global namespace pollution
    if (!Protocol[domain]) {
      // @ts-ignore Protocol global namespace pollution
      Protocol[domain] = {};
    }

    // @ts-ignore Protocol global namespace pollution
    Protocol[domain][domainAndName[1]] = values;
    this._initialized = true;
  }

  registerEvent(eventName: string, params: Object): void {
    const domain = eventName.split('.')[0];
    this._dispatcherPrototype(domain).registerEvent(eventName, params);
    this._initialized = true;
  }

  wrapClientCallback<T, S>(
      clientCallback: (arg0: (T|undefined)) => void, errorPrefix: string, constructor?: (new(arg1: S) => T),
      defaultValue?: T): (arg0: string|null, arg1: S) => void {
    /**
     * @template S
     */
    function callbackWrapper(error: string|null, value: S): void {
      if (error) {
        console.error(errorPrefix + error);
        clientCallback(defaultValue);
        return;
      }
      if (constructor) {
        // @ts-ignore Special casting
        clientCallback(new constructor(value));
      } else {
        // @ts-ignore Special casting
        clientCallback(value);
      }
    }
    return callbackWrapper;
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
let _factory: () => Connection;

export class Connection {
  _onMessage!: ((arg0: Object) => void)|null;
  constructor() {
  }

  setOnMessage(_onMessage: (arg0: (Object|string)) => void): void {
  }

  setOnDisconnect(_onDisconnect: (arg0: string) => void): void {
  }

  sendRawMessage(_message: string): void {
  }

  disconnect(): Promise<void> {
    throw new Error('not implemented');
  }

  static setFactory(factory: () => Connection): void {
    _factory = factory;
  }

  static getFactory(): () => Connection {
    return _factory;
  }
}

type SendRawMessageCallback = (...args: unknown[]) => void;  // eslint-disable-line no-unused-vars

export const test = {
  /**
   * This will get called for every protocol message.
   * ProtocolClient.test.dumpProtocol = console.log
   */
  dumpProtocol: null as ((arg0: string) => void) | null,

  /**
   * Runs a function when no protocol activity is present.
   * ProtocolClient.test.deprecatedRunAfterPendingDispatches(() => console.log('done'))
   */
  deprecatedRunAfterPendingDispatches: null as ((arg0: () => void) => void) | null,

  /**
   * Sends a raw message over main connection.
   * ProtocolClient.test.sendRawMessage('Page.enable', {}, console.log)
   */
  sendRawMessage: null as ((arg0: string, arg1: Object|null, arg2: SendRawMessageCallback) => void) | null,

  /**
   * Set to true to not log any errors.
   */
  suppressRequestErrors: false as boolean,

  /**
   * Set to get notified about any messages sent over protocol.
   */
  onMessageSent: null as
          ((message: {domain: string, method: string, params: Object, id: number, sessionId?: string},
            target: TargetBase|null) => void) |
      null,

  /**
   * Set to get notified about any messages received over protocol.
   */
  onMessageReceived: null as ((message: Object, target: TargetBase|null) => void) | null,
};

const LongPollingMethods = new Set<string>(['CSS.takeComputedStyleUpdates']);

export class SessionRouter {
  _connection: Connection;
  _lastMessageId: number;
  _pendingResponsesCount: number;
  _pendingLongPollingMessageIds: Set<number>;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _domainToLogger: Map<any, any>;
  _sessions: Map<string, {
    target: TargetBase,
    callbacks: Map<number, _CallbackWithDebugInfo>,
    proxyConnection: ((Connection | undefined)|null),
  }>;
  _pendingScripts: (() => void)[];

  constructor(connection: Connection) {
    this._connection = connection;
    this._lastMessageId = 1;
    this._pendingResponsesCount = 0;
    this._pendingLongPollingMessageIds = new Set();
    this._domainToLogger = new Map();

    this._sessions = new Map();

    this._pendingScripts = [];

    test.deprecatedRunAfterPendingDispatches = this._deprecatedRunAfterPendingDispatches.bind(this);
    test.sendRawMessage = this._sendRawMessageForTesting.bind(this);

    this._connection.setOnMessage(this._onMessage.bind(this));

    this._connection.setOnDisconnect(reason => {
      const session = this._sessions.get('');
      if (session) {
        session.target.dispose(reason);
      }
    });
  }

  registerSession(target: TargetBase, sessionId: string, proxyConnection?: Connection|null): void {
    // Only the Audits panel uses proxy connections. If it is ever possible to have multiple active at the
    // same time, it should be tested thoroughly.
    if (proxyConnection) {
      for (const session of this._sessions.values()) {
        if (session.proxyConnection) {
          console.error('Multiple simultaneous proxy connections are currently unsupported');
          break;
        }
      }
    }

    this._sessions.set(sessionId, {target, callbacks: new Map(), proxyConnection});
  }

  unregisterSession(sessionId: string): void {
    const session = this._sessions.get(sessionId);
    if (!session) {
      return;
    }
    for (const callback of session.callbacks.values()) {
      SessionRouter.dispatchUnregisterSessionError(callback);
    }
    this._sessions.delete(sessionId);
  }

  _getTargetBySessionId(sessionId: string): TargetBase|null {
    const session = this._sessions.get(sessionId ? sessionId : '');
    if (!session) {
      return null;
    }
    return session.target;
  }

  _nextMessageId(): number {
    return this._lastMessageId++;
  }

  connection(): Connection {
    return this._connection;
  }

  sendMessage(sessionId: string, domain: string, method: string, params: Object|null, callback: _Callback): void {
    const messageId = this._nextMessageId();
    const messageObject: Message = {
      id: messageId,
      method: method,
    };

    if (params) {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      messageObject.params = params;
    }
    if (sessionId) {
      messageObject.sessionId = sessionId;
    }

    if (test.dumpProtocol) {
      test.dumpProtocol('frontend: ' + JSON.stringify(messageObject));
    }

    if (test.onMessageSent) {
      const paramsObject = JSON.parse(JSON.stringify(params || {}));
      test.onMessageSent(
          {domain, method, params: (paramsObject as Object), id: messageId, sessionId},
          this._getTargetBySessionId(sessionId));
    }

    ++this._pendingResponsesCount;
    if (LongPollingMethods.has(method)) {
      this._pendingLongPollingMessageIds.add(messageId);
    }

    const session = this._sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.callbacks.set(messageId, {callback, method});
    this._connection.sendRawMessage(JSON.stringify(messageObject));
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _sendRawMessageForTesting(method: string, params: Object|null, callback: ((...arg0: any[]) => void)|null): void {
    const domain = method.split('.')[0];
    this.sendMessage('', domain, method, params, callback || ((): void => {}));
  }

  _onMessage(message: string|Object): void {
    if (test.dumpProtocol) {
      test.dumpProtocol('backend: ' + ((typeof message === 'string') ? message : JSON.stringify(message)));
    }

    if (test.onMessageReceived) {
      const messageObjectCopy = JSON.parse((typeof message === 'string') ? message : JSON.stringify(message));
      test.onMessageReceived((messageObjectCopy as Object), this._getTargetBySessionId(messageObjectCopy.sessionId));
    }

    const messageObject = ((typeof message === 'string') ? JSON.parse(message) : message as Message);

    // Send all messages to proxy connections.
    let suppressUnknownMessageErrors = false;
    for (const session of this._sessions.values()) {
      if (!session.proxyConnection) {
        continue;
      }

      if (!session.proxyConnection._onMessage) {
        InspectorBackend.reportProtocolError(
            'Protocol Error: the session has a proxyConnection with no _onMessage', messageObject);
        continue;
      }

      session.proxyConnection._onMessage(messageObject);
      suppressUnknownMessageErrors = true;
    }

    const sessionId = messageObject.sessionId || '';
    const session = this._sessions.get(sessionId);
    if (!session) {
      if (!suppressUnknownMessageErrors) {
        InspectorBackend.reportProtocolError('Protocol Error: the message with wrong session id', messageObject);
      }
      return;
    }

    // If this message is directly for the target controlled by the proxy connection, don't handle it.
    if (session.proxyConnection) {
      return;
    }

    if (session.target._needsNodeJSPatching) {
      NodeURL.patch(messageObject);
    }

    if ('id' in messageObject) {  // just a response for some request
      const callback = session.callbacks.get(messageObject.id);
      session.callbacks.delete(messageObject.id);
      if (!callback) {
        if (!suppressUnknownMessageErrors) {
          InspectorBackend.reportProtocolError('Protocol Error: the message with wrong id', messageObject);
        }
        return;
      }

      callback.callback(messageObject.error, messageObject.result);
      --this._pendingResponsesCount;
      this._pendingLongPollingMessageIds.delete(messageObject.id);

      if (this._pendingScripts.length && !this._hasOutstandingNonLongPollingRequests()) {
        this._deprecatedRunAfterPendingDispatches();
      }
    } else {
      if (!('method' in messageObject)) {
        InspectorBackend.reportProtocolError('Protocol Error: the message without method', messageObject);
        return;
      }

      const method = messageObject.method.split('.');
      const domainName = method[0];
      if (!(domainName in session.target._dispatchers)) {
        InspectorBackend.reportProtocolError(
            `Protocol Error: the message ${messageObject.method} is for non-existing domain '${domainName}'`,
            messageObject);
        return;
      }
      session.target._dispatchers[domainName].dispatch(method[1], (messageObject as {
                                                         method: string,
                                                         params: Array<string>| null,
                                                       }));
    }
  }

  _hasOutstandingNonLongPollingRequests(): boolean {
    return this._pendingResponsesCount - this._pendingLongPollingMessageIds.size > 0;
  }

  _deprecatedRunAfterPendingDispatches(script?: (() => void)): void {
    if (script) {
      this._pendingScripts.push(script);
    }

    // Execute all promises.
    setTimeout(() => {
      if (!this._hasOutstandingNonLongPollingRequests()) {
        this._executeAfterPendingDispatches();
      } else {
        this._deprecatedRunAfterPendingDispatches();
      }
    }, 0);
  }

  _executeAfterPendingDispatches(): void {
    if (!this._hasOutstandingNonLongPollingRequests()) {
      const scripts = this._pendingScripts;
      this._pendingScripts = [];
      for (let id = 0; id < scripts.length; ++id) {
        scripts[id]();
      }
    }
  }

  static dispatchConnectionError(callback: _Callback, method: string): void {
    const error = {
      message: `Connection is closed, can\'t dispatch pending call to ${method}`,
      code: _ConnectionClosedErrorCode,
      data: null,
    };
    setTimeout(() => callback(error, null), 0);
  }

  static dispatchUnregisterSessionError({callback, method}: _CallbackWithDebugInfo): void {
    const error = {
      message: `Session is unregistering, can\'t dispatch pending call to ${method}`,
      code: _ConnectionClosedErrorCode,
      data: null,
    };
    setTimeout(() => callback(error, null), 0);
  }
}

export class TargetBase {
  _needsNodeJSPatching: boolean;
  _sessionId: string;
  _router: SessionRouter|null;
  _agents: {
    [x: string]: _AgentPrototype,
  };
  _dispatchers: {
    [x: string]: _DispatcherPrototype,
  };
  constructor(
      needsNodeJSPatching: boolean, parentTarget: TargetBase|null, sessionId: string, connection: Connection|null) {
    this._needsNodeJSPatching = needsNodeJSPatching;
    this._sessionId = sessionId;

    if ((!parentTarget && connection) || (!parentTarget && sessionId) || (connection && sessionId)) {
      throw new Error('Either connection or sessionId (but not both) must be supplied for a child target');
    }

    let router: SessionRouter;
    if (sessionId && parentTarget && parentTarget._router) {
      router = parentTarget._router;
    } else if (connection) {
      router = new SessionRouter(connection);
    } else {
      router = new SessionRouter(_factory());
    }

    this._router = router;

    router.registerSession(this, this._sessionId);

    this._agents = {};
    for (const [domain, agentPrototype] of inspectorBackend._agentPrototypes) {
      this._agents[domain] = Object.create((agentPrototype as _AgentPrototype));
      this._agents[domain]._target = this;
    }

    this._dispatchers = {};
    for (const [domain, dispatcherPrototype] of inspectorBackend._dispatcherPrototypes) {
      this._dispatchers[domain] = Object.create((dispatcherPrototype as _DispatcherPrototype));
      this._dispatchers[domain]._dispatchers = [];
    }
  }

  registerDispatcher(domain: string, dispatcher: Object): void {
    if (!this._dispatchers[domain]) {
      return;
    }
    this._dispatchers[domain].addDomainDispatcher(dispatcher);
  }

  unregisterDispatcher(domain: string, dispatcher: Object): void {
    if (!this._dispatchers[domain]) {
      return;
    }
    this._dispatchers[domain].removeDomainDispatcher(dispatcher);
  }

  dispose(_reason: string): void {
    if (!this._router) {
      return;
    }
    this._router.unregisterSession(this._sessionId);
    this._router = null;
  }

  isDisposed(): boolean {
    return !this._router;
  }

  markAsNodeJSForTest(): void {
    this._needsNodeJSPatching = true;
  }

  router(): SessionRouter|null {
    return this._router;
  }

  // Agent accessors, keep alphabetically sorted.

  accessibilityAgent(): ProtocolProxyApi.AccessibilityApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  animationAgent(): ProtocolProxyApi.AnimationApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  applicationCacheAgent(): ProtocolProxyApi.ApplicationCacheApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  auditsAgent(): ProtocolProxyApi.AuditsApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  backgroundServiceAgent(): ProtocolProxyApi.BackgroundServiceApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  cacheStorageAgent(): ProtocolProxyApi.CacheStorageApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  cssAgent(): ProtocolProxyApi.CSSApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  databaseAgent(): ProtocolProxyApi.DatabaseApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  debuggerAgent(): ProtocolProxyApi.DebuggerApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  deviceOrientationAgent(): ProtocolProxyApi.DeviceOrientationApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  domAgent(): ProtocolProxyApi.DOMApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  domdebuggerAgent(): ProtocolProxyApi.DOMDebuggerApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  domsnapshotAgent(): ProtocolProxyApi.DOMSnapshotApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  domstorageAgent(): ProtocolProxyApi.DOMStorageApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  emulationAgent(): ProtocolProxyApi.EmulationApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  heapProfilerAgent(): ProtocolProxyApi.HeapProfilerApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  indexedDBAgent(): ProtocolProxyApi.IndexedDBApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  inputAgent(): ProtocolProxyApi.InputApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  ioAgent(): ProtocolProxyApi.IOApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  inspectorAgent(): ProtocolProxyApi.InspectorApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  layerTreeAgent(): ProtocolProxyApi.LayerTreeApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  logAgent(): ProtocolProxyApi.LogApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  mediaAgent(): ProtocolProxyApi.MediaApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  memoryAgent(): ProtocolProxyApi.MemoryApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  networkAgent(): ProtocolProxyApi.NetworkApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  overlayAgent(): ProtocolProxyApi.OverlayApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  pageAgent(): ProtocolProxyApi.PageApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  profilerAgent(): ProtocolProxyApi.ProfilerApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  performanceAgent(): ProtocolProxyApi.PerformanceApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  runtimeAgent(): ProtocolProxyApi.RuntimeApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  securityAgent(): ProtocolProxyApi.SecurityApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  serviceWorkerAgent(): ProtocolProxyApi.ServiceWorkerApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  storageAgent(): ProtocolProxyApi.StorageApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  targetAgent(): ProtocolProxyApi.TargetApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  tracingAgent(): ProtocolProxyApi.TracingApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  webAudioAgent(): ProtocolProxyApi.WebAudioApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  webAuthnAgent(): ProtocolProxyApi.WebAuthnApi {
    throw new Error('Implemented in InspectorBackend.js');
  }

  // Dispatcher registration, keep alphabetically sorted.
  registerAnimationDispatcher(_dispatcher: ProtocolProxyApi.AnimationDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerApplicationCacheDispatcher(_dispatcher: ProtocolProxyApi.ApplicationCacheDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerAuditsDispatcher(_dispatcher: ProtocolProxyApi.AuditsDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerCSSDispatcher(_dispatcher: ProtocolProxyApi.CSSDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerDatabaseDispatcher(_dispatcher: ProtocolProxyApi.DatabaseDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerBackgroundServiceDispatcher(_dispatcher: ProtocolProxyApi.BackgroundServiceDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerDebuggerDispatcher(_dispatcher: ProtocolProxyApi.DebuggerDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  unregisterDebuggerDispatcher(_dispatcher: ProtocolProxyApi.DebuggerDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerDOMDispatcher(_dispatcher: ProtocolProxyApi.DOMDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerDOMStorageDispatcher(_dispatcher: ProtocolProxyApi.DOMStorageDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerHeapProfilerDispatcher(_dispatcher: ProtocolProxyApi.HeapProfilerDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }
  registerInspectorDispatcher(_dispatcher: ProtocolProxyApi.InspectorDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }
  registerLayerTreeDispatcher(_dispatcher: ProtocolProxyApi.LayerTreeDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerLogDispatcher(_dispatcher: ProtocolProxyApi.LogDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerMediaDispatcher(_dispatcher: ProtocolProxyApi.MediaDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerNetworkDispatcher(_dispatcher: ProtocolProxyApi.NetworkDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerOverlayDispatcher(_dispatcher: ProtocolProxyApi.OverlayDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerPageDispatcher(_dispatcher: ProtocolProxyApi.PageDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerProfilerDispatcher(_dispatcher: ProtocolProxyApi.ProfilerDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerRuntimeDispatcher(_dispatcher: ProtocolProxyApi.RuntimeDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerSecurityDispatcher(_dispatcher: ProtocolProxyApi.SecurityDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerServiceWorkerDispatcher(_dispatcher: ProtocolProxyApi.ServiceWorkerDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerStorageDispatcher(_dispatcher: ProtocolProxyApi.StorageDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerTargetDispatcher(_dispatcher: ProtocolProxyApi.TargetDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerTracingDispatcher(_dispatcher: ProtocolProxyApi.TracingDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }

  registerWebAudioDispatcher(_dispatcher: ProtocolProxyApi.WebAudioDispatcher): void {
    throw new Error('Implemented in InspectorBackend.js');
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
class _AgentPrototype {
  _replyArgs: {
    [x: string]: string[],
  };
  _domain: string;
  _target!: TargetBase;
  constructor(domain: string) {
    this._replyArgs = {};
    this._domain = domain;
  }

  registerCommand(
      methodName: string, signature: {
        name: string,
        type: string,
        optional: boolean,
      }[],
      replyArgs: string[]): void {
    const domainAndMethod = this._domain + '.' + methodName;

    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function sendMessagePromise(this: _AgentPrototype, _vararg: any): Promise<any> {
      const params = Array.prototype.slice.call(arguments);
      return _AgentPrototype.prototype._sendMessageToBackendPromise.call(this, domainAndMethod, signature, params);
    }

    // @ts-ignore Method code generation
    this[methodName] = sendMessagePromise;

    function invoke(this: _AgentPrototype, request: Object|undefined = {}): Promise<Object|null> {
      return this._invoke(domainAndMethod, request);
    }

    // @ts-ignore Method code generation
    this['invoke_' + methodName] = invoke;

    this._replyArgs[domainAndMethod] = replyArgs;
  }

  _prepareParameters(
      method: string, signature: {
        name: string,
        type: string,
        optional: boolean,
      }[],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: any[], errorCallback: (arg0: string) => void): Object|null {
    const params: {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [x: string]: any,
    } = {};
    let hasParams = false;

    for (const param of signature) {
      const paramName = param['name'];
      const typeName = param['type'];
      const optionalFlag = param['optional'];

      if (!args.length && !optionalFlag) {
        errorCallback(
            `Protocol Error: Invalid number of arguments for method '${method}' call. ` +
            `It must have the following arguments ${JSON.stringify(signature)}'.`);
        return null;
      }

      const value = args.shift();
      if (optionalFlag && typeof value === 'undefined') {
        continue;
      }

      if (typeof value !== typeName) {
        errorCallback(
            `Protocol Error: Invalid type of argument '${paramName}' for method '${method}' call. ` +
            `It must be '${typeName}' but it is '${typeof value}'.`);
        return null;
      }

      params[paramName] = value;
      hasParams = true;
    }

    if (args.length) {
      errorCallback(`Protocol Error: Extra ${args.length} arguments in a call to method '${method}'.`);
      return null;
    }

    return hasParams ? params : null;
  }

  _sendMessageToBackendPromise(
      method: string, signature: {
        name: string,
        type: string,
        optional: boolean,
      }[],
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      args: any[]): Promise<any> {
    let errorMessage;
    function onError(message: string): void {
      console.error(message);
      errorMessage = message;
    }
    const params = this._prepareParameters(method, signature, args, onError);
    if (errorMessage) {
      return Promise.resolve(null);
    }

    return new Promise(resolve => {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (error: any, result: any): void => {
        if (error) {
          if (!test.suppressRequestErrors && error.code !== DevToolsStubErrorCode && error.code !== _GenericError &&
              error.code !== _ConnectionClosedErrorCode) {
            console.error('Request ' + method + ' failed. ' + JSON.stringify(error));
          }

          resolve(null);
          return;
        }

        const args = this._replyArgs[method];
        resolve(result && args.length ? result[args[0]] : undefined);
      };

      if (!this._target._router) {
        SessionRouter.dispatchConnectionError(callback, method);
      } else {
        this._target._router.sendMessage(this._target._sessionId, this._domain, method, params, callback);
      }
    });
  }

  _invoke(method: string, request: Object|null): Promise<Object> {
    return new Promise(fulfill => {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback = (error: any, result: any): void => {
        if (error && !test.suppressRequestErrors && error.code !== DevToolsStubErrorCode &&
            error.code !== _GenericError && error.code !== _ConnectionClosedErrorCode) {
          console.error('Request ' + method + ' failed. ' + JSON.stringify(error));
        }

        if (!result) {
          result = {};
        }
        if (error) {
          // TODO(crbug.com/1011811): Remove Old lookup of ProtocolError
          result[ProtocolError] = error.message;
          // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result.getError = (): any => {
            return error.message;
          };
        } else {
          result.getError = (): undefined => {
            return undefined;
          };
        }
        fulfill(result);
      };

      if (!this._target._router) {
        SessionRouter.dispatchConnectionError(callback, method);
      } else {
        this._target._router.sendMessage(this._target._sessionId, this._domain, method, request, callback);
      }
    });
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
class _DispatcherPrototype {
  _eventArgs: {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [x: string]: any,
  };
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _dispatchers!: any[];
  constructor() {
    this._eventArgs = {};
  }

  registerEvent(eventName: string, params: Object): void {
    this._eventArgs[eventName] = params;
  }

  addDomainDispatcher(dispatcher: Object): void {
    this._dispatchers.push(dispatcher);
  }

  removeDomainDispatcher(dispatcher: Object): void {
    const index = this._dispatchers.indexOf(dispatcher);
    if (index === -1) {
      return;
    }
    this._dispatchers.splice(index, 1);
  }

  dispatch(functionName: string, messageObject: {
    method: string,
    params: ({
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [x: string]: any,
    }|undefined)|null,
  }): void {
    if (!this._dispatchers.length) {
      return;
    }

    if (!this._eventArgs[messageObject.method]) {
      InspectorBackend.reportProtocolWarning(
          `Protocol Warning: Attempted to dispatch an unspecified method '${messageObject.method}'`, messageObject);
      return;
    }

    const messageArgument = {...messageObject.params};

    for (let index = 0; index < this._dispatchers.length; ++index) {
      const dispatcher = this._dispatchers[index];

      if (functionName in dispatcher) {
        dispatcher[functionName].call(dispatcher, messageArgument);
      }
    }
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export type _Callback = (arg0: Object|null, arg1: Object|null) => void;
// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/naming-convention
export interface _CallbackWithDebugInfo {
  callback: (arg0: Object|null, arg1: Object|null) => void;
  method: string;
}

export const inspectorBackend = new InspectorBackend();
