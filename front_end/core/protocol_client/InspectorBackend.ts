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

import {NodeURL} from './NodeURL.js';
import type * as Platform from '../platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export const DevToolsStubErrorCode = -32015;
// TODO(dgozman): we are not reporting generic errors in tests, but we should
// instead report them and just have some expected errors in test expectations.
const GenericErrorCode = -32000;
const ConnectionClosedErrorCode = -32001;

type MessageParams = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [x: string]: any,
};

type ProtocolDomainName = ProtocolProxyApi.ProtocolDomainName;

export interface MessageError {
  code: number;
  message: string;
  data?: string|null;
}

export type Message = {
  sessionId?: string,
  url?: Platform.DevToolsPath.UrlString,
  id?: number,
  error?: MessageError|null,
  result?: Object|null,
  method?: QualifiedName,
  params?: MessageParams|null,
};

interface EventMessage extends Message {
  method: QualifiedName;
  params?: MessageParams|null;
}

/** A qualified name, e.g. Domain.method */
export type QualifiedName = string&{qualifiedEventNameTag: string | undefined};
/** A qualified name, e.g. method */
export type UnqualifiedName = string&{unqualifiedEventNameTag: string | undefined};

export const splitQualifiedName = (string: QualifiedName): [string, UnqualifiedName] => {
  const [domain, eventName] = string.split('.');
  return [domain, eventName as UnqualifiedName];
};

export const qualifyName = (domain: string, name: UnqualifiedName): QualifiedName => {
  return `${domain}.${name}` as QualifiedName;
};

type EventParameterNames = Map<QualifiedName, string[]>;
type ReadonlyEventParameterNames = ReadonlyMap<QualifiedName, string[]>;

interface CommandParameter {
  name: string;
  type: string;
  optional: boolean;
  description: string;
}

type Callback = (error: MessageError|null, arg1: Object|null) => void;

interface CallbackWithDebugInfo {
  callback: Callback;
  method: string;
}

export class InspectorBackend {
  readonly agentPrototypes: Map<ProtocolDomainName, AgentPrototype> = new Map();
  #initialized: boolean = false;
  #eventParameterNamesForDomain = new Map<ProtocolDomainName, EventParameterNames>();
  readonly typeMap = new Map<QualifiedName, CommandParameter[]>();
  readonly enumMap = new Map<QualifiedName, Record<string, string>>();

  private getOrCreateEventParameterNamesForDomain(domain: ProtocolDomainName): EventParameterNames {
    let map = this.#eventParameterNamesForDomain.get(domain);
    if (!map) {
      map = new Map();
      this.#eventParameterNamesForDomain.set(domain, map);
    }
    return map;
  }

  getOrCreateEventParameterNamesForDomainForTesting(domain: ProtocolDomainName): EventParameterNames {
    return this.getOrCreateEventParameterNamesForDomain(domain);
  }

  getEventParameterNames(): ReadonlyMap<ProtocolDomainName, ReadonlyEventParameterNames> {
    return this.#eventParameterNamesForDomain;
  }

  static reportProtocolError(error: string, messageObject: Object): void {
    console.error(error + ': ' + JSON.stringify(messageObject));
  }

  static reportProtocolWarning(error: string, messageObject: Object): void {
    console.warn(error + ': ' + JSON.stringify(messageObject));
  }

  isInitialized(): boolean {
    return this.#initialized;
  }

  private agentPrototype(domain: ProtocolDomainName): AgentPrototype {
    let prototype = this.agentPrototypes.get(domain);
    if (!prototype) {
      prototype = new AgentPrototype(domain);
      this.agentPrototypes.set(domain, prototype);
    }
    return prototype;
  }

  registerCommand(method: QualifiedName, parameters: CommandParameter[], replyArgs: string[], description: string):
      void {
    const [domain, command] = splitQualifiedName(method);
    this.agentPrototype(domain as ProtocolDomainName).registerCommand(command, parameters, replyArgs, description);
    this.#initialized = true;
  }

  registerEnum(type: QualifiedName, values: Record<string, string>): void {
    const [domain, name] = splitQualifiedName(type);
    // @ts-ignore globalThis global namespace pollution
    if (!globalThis.Protocol[domain]) {
      // @ts-ignore globalThis global namespace pollution
      globalThis.Protocol[domain] = {};
    }

    // @ts-ignore globalThis global namespace pollution
    globalThis.Protocol[domain][name] = values;
    this.enumMap.set(type, values);
    this.#initialized = true;
  }

  registerType(method: QualifiedName, parameters: CommandParameter[]): void {
    this.typeMap.set(method, parameters);
    this.#initialized = true;
  }

  registerEvent(eventName: QualifiedName, params: string[]): void {
    const domain = eventName.split('.')[0];
    const eventParameterNames = this.getOrCreateEventParameterNamesForDomain(domain as ProtocolDomainName);
    eventParameterNames.set(eventName, params);
    this.#initialized = true;
  }
}

let connectionFactory: () => Connection;

export class Connection {
  onMessage!: ((arg0: Object) => void)|null;
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
    connectionFactory = factory;
  }

  static getFactory(): () => Connection {
    return connectionFactory;
  }
}

type SendRawMessageCallback = (...args: unknown[]) => void;

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
  sendRawMessage: null as ((method: QualifiedName, args: Object|null, arg2: SendRawMessageCallback) => void) | null,

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
  readonly #connectionInternal: Connection;
  #lastMessageId: number;
  #pendingResponsesCount: number;
  readonly #pendingLongPollingMessageIds: Set<number>;
  readonly #sessions: Map<string, {
    target: TargetBase,
    callbacks: Map<number, CallbackWithDebugInfo>,
    proxyConnection: ((Connection | undefined)|null),
  }>;
  #pendingScripts: (() => void)[];

  constructor(connection: Connection) {
    this.#connectionInternal = connection;
    this.#lastMessageId = 1;
    this.#pendingResponsesCount = 0;
    this.#pendingLongPollingMessageIds = new Set();

    this.#sessions = new Map();

    this.#pendingScripts = [];

    test.deprecatedRunAfterPendingDispatches = this.deprecatedRunAfterPendingDispatches.bind(this);
    test.sendRawMessage = this.sendRawMessageForTesting.bind(this);

    this.#connectionInternal.setOnMessage(this.onMessage.bind(this));

    this.#connectionInternal.setOnDisconnect(reason => {
      const session = this.#sessions.get('');
      if (session) {
        session.target.dispose(reason);
      }
    });
  }

  registerSession(target: TargetBase, sessionId: string, proxyConnection?: Connection|null): void {
    // Only the Audits panel uses proxy connections. If it is ever possible to have multiple active at the
    // same time, it should be tested thoroughly.
    if (proxyConnection) {
      for (const session of this.#sessions.values()) {
        if (session.proxyConnection) {
          console.error('Multiple simultaneous proxy connections are currently unsupported');
          break;
        }
      }
    }

    this.#sessions.set(sessionId, {target, callbacks: new Map(), proxyConnection});
  }

  unregisterSession(sessionId: string): void {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      return;
    }
    for (const callback of session.callbacks.values()) {
      SessionRouter.dispatchUnregisterSessionError(callback);
    }
    this.#sessions.delete(sessionId);
  }

  private getTargetBySessionId(sessionId: string): TargetBase|null {
    const session = this.#sessions.get(sessionId ? sessionId : '');
    if (!session) {
      return null;
    }
    return session.target;
  }

  private nextMessageId(): number {
    return this.#lastMessageId++;
  }

  connection(): Connection {
    return this.#connectionInternal;
  }

  sendMessage(sessionId: string, domain: string, method: QualifiedName, params: Object|null, callback: Callback): void {
    const messageId = this.nextMessageId();
    const messageObject: Message = {
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
      const paramsObject = JSON.parse(JSON.stringify(params || {}));
      test.onMessageSent(
          {domain, method, params: (paramsObject as Object), id: messageId, sessionId},
          this.getTargetBySessionId(sessionId));
    }

    ++this.#pendingResponsesCount;
    if (LongPollingMethods.has(method)) {
      this.#pendingLongPollingMessageIds.add(messageId);
    }

    const session = this.#sessions.get(sessionId);
    if (!session) {
      return;
    }
    session.callbacks.set(messageId, {callback, method});
    this.#connectionInternal.sendRawMessage(JSON.stringify(messageObject));
  }

  private sendRawMessageForTesting(method: QualifiedName, params: Object|null, callback: Callback|null, sessionId = ''):
      void {
    const domain = method.split('.')[0];
    this.sendMessage(sessionId, domain, method, params, callback || (() => {}));
  }

  private onMessage(message: string|Object): void {
    if (test.dumpProtocol) {
      test.dumpProtocol('backend: ' + ((typeof message === 'string') ? message : JSON.stringify(message)));
    }

    if (test.onMessageReceived) {
      const messageObjectCopy = JSON.parse((typeof message === 'string') ? message : JSON.stringify(message));
      test.onMessageReceived(messageObjectCopy, this.getTargetBySessionId(messageObjectCopy.sessionId));
    }

    const messageObject = ((typeof message === 'string') ? JSON.parse(message) : message) as Message;

    // Send all messages to proxy connections.
    let suppressUnknownMessageErrors = false;
    for (const session of this.#sessions.values()) {
      if (!session.proxyConnection) {
        continue;
      }

      if (!session.proxyConnection.onMessage) {
        InspectorBackend.reportProtocolError(
            'Protocol Error: the session has a proxyConnection with no _onMessage', messageObject);
        continue;
      }

      session.proxyConnection.onMessage(messageObject);
      suppressUnknownMessageErrors = true;
    }

    const sessionId = messageObject.sessionId || '';
    const session = this.#sessions.get(sessionId);
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

    if (session.target.getNeedsNodeJSPatching()) {
      NodeURL.patch(messageObject);
    }

    if (messageObject.id !== undefined) {  // just a response for some request
      const callback = session.callbacks.get(messageObject.id);
      session.callbacks.delete(messageObject.id);
      if (!callback) {
        if (messageObject.error?.code === ConnectionClosedErrorCode) {
          // Ignore the errors that are sent as responses after the session closes.
          return;
        }
        if (!suppressUnknownMessageErrors) {
          InspectorBackend.reportProtocolError('Protocol Error: the message with wrong id', messageObject);
        }
        return;
      }

      callback.callback(messageObject.error || null, messageObject.result || null);
      --this.#pendingResponsesCount;
      this.#pendingLongPollingMessageIds.delete(messageObject.id);

      if (this.#pendingScripts.length && !this.hasOutstandingNonLongPollingRequests()) {
        this.deprecatedRunAfterPendingDispatches();
      }
    } else {
      if (messageObject.method === undefined) {
        InspectorBackend.reportProtocolError('Protocol Error: the message without method', messageObject);
        return;
      }
      // This cast is justified as we just checked for the presence of messageObject.method.
      const eventMessage = messageObject as EventMessage;
      session.target.dispatch(eventMessage);
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
    window.setTimeout(() => {
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

  static dispatchConnectionError(callback: Callback, method: string): void {
    const error = {
      message: `Connection is closed, can\'t dispatch pending call to ${method}`,
      code: ConnectionClosedErrorCode,
      data: null,
    };
    window.setTimeout(() => callback(error, null), 0);
  }

  static dispatchUnregisterSessionError({callback, method}: CallbackWithDebugInfo): void {
    const error = {
      message: `Session is unregistering, can\'t dispatch pending call to ${method}`,
      code: ConnectionClosedErrorCode,
      data: null,
    };
    window.setTimeout(() => callback(error, null), 0);
  }
}

/**
 * Make sure that `Domain` in get/set is only ever instantiated with one protocol domain
 * name, because if `Domain` allows multiple domains, the type is unsound.
 */
interface AgentsMap extends Map<ProtocolDomainName, ProtocolProxyApi.ProtocolApi[ProtocolDomainName]> {
  get<Domain extends ProtocolDomainName>(key: Domain): ProtocolProxyApi.ProtocolApi[Domain]|undefined;
  set<Domain extends ProtocolDomainName>(key: Domain, value: ProtocolProxyApi.ProtocolApi[Domain]): this;
}

/**
 * Make sure that `Domain` in get/set is only ever instantiated with one protocol domain
 * name, because if `Domain` allows multiple domains, the type is unsound.
 */
interface DispatcherMap extends Map<ProtocolDomainName, ProtocolProxyApi.ProtocolDispatchers[ProtocolDomainName]> {
  get<Domain extends ProtocolDomainName>(key: Domain): DispatcherManager<Domain>|undefined;
  set<Domain extends ProtocolDomainName>(key: Domain, value: DispatcherManager<Domain>): this;
}

export class TargetBase {
  needsNodeJSPatching: boolean;
  readonly sessionId: string;
  routerInternal: SessionRouter|null;
  #agents: AgentsMap = new Map();
  #dispatchers: DispatcherMap = new Map();

  constructor(
      needsNodeJSPatching: boolean, parentTarget: TargetBase|null, sessionId: string, connection: Connection|null) {
    this.needsNodeJSPatching = needsNodeJSPatching;
    this.sessionId = sessionId;

    if ((!parentTarget && connection) || (!parentTarget && sessionId) || (connection && sessionId)) {
      throw new Error('Either connection or sessionId (but not both) must be supplied for a child target');
    }

    let router: SessionRouter;
    if (sessionId && parentTarget && parentTarget.routerInternal) {
      router = parentTarget.routerInternal;
    } else if (connection) {
      router = new SessionRouter(connection);
    } else {
      router = new SessionRouter(connectionFactory());
    }

    this.routerInternal = router;

    router.registerSession(this, this.sessionId);

    for (const [domain, agentPrototype] of inspectorBackend.agentPrototypes) {
      const agent = Object.create((agentPrototype as AgentPrototype));
      agent.target = this;
      this.#agents.set(domain, agent);
    }

    for (const [domain, eventParameterNames] of inspectorBackend.getEventParameterNames().entries()) {
      this.#dispatchers.set(domain, new DispatcherManager(eventParameterNames));
    }
  }

  dispatch(eventMessage: EventMessage): void {
    const [domainName, method] = splitQualifiedName(eventMessage.method);
    const dispatcher = this.#dispatchers.get(domainName as ProtocolDomainName);
    if (!dispatcher) {
      InspectorBackend.reportProtocolError(
          `Protocol Error: the message ${eventMessage.method} is for non-existing domain '${domainName}'`,
          eventMessage);
      return;
    }
    dispatcher.dispatch(method, eventMessage);
  }

  dispose(_reason: string): void {
    if (!this.routerInternal) {
      return;
    }
    this.routerInternal.unregisterSession(this.sessionId);
    this.routerInternal = null;
  }

  isDisposed(): boolean {
    return !this.routerInternal;
  }

  markAsNodeJSForTest(): void {
    this.needsNodeJSPatching = true;
  }

  router(): SessionRouter|null {
    return this.routerInternal;
  }

  // Agent accessors, keep alphabetically sorted.

  /**
   * Make sure that `Domain` is only ever instantiated with one protocol domain
   * name, because if `Domain` allows multiple domains, the type is unsound.
   */
  private getAgent<Domain extends ProtocolDomainName>(domain: Domain): ProtocolProxyApi.ProtocolApi[Domain] {
    const agent = this.#agents.get<Domain>(domain);
    if (!agent) {
      throw new Error('Accessing undefined agent');
    }
    return agent;
  }

  accessibilityAgent(): ProtocolProxyApi.AccessibilityApi {
    return this.getAgent('Accessibility');
  }

  animationAgent(): ProtocolProxyApi.AnimationApi {
    return this.getAgent('Animation');
  }

  auditsAgent(): ProtocolProxyApi.AuditsApi {
    return this.getAgent('Audits');
  }

  autofillAgent(): ProtocolProxyApi.AutofillApi {
    return this.getAgent('Autofill');
  }

  browserAgent(): ProtocolProxyApi.BrowserApi {
    return this.getAgent('Browser');
  }

  backgroundServiceAgent(): ProtocolProxyApi.BackgroundServiceApi {
    return this.getAgent('BackgroundService');
  }

  cacheStorageAgent(): ProtocolProxyApi.CacheStorageApi {
    return this.getAgent('CacheStorage');
  }

  cssAgent(): ProtocolProxyApi.CSSApi {
    return this.getAgent('CSS');
  }

  databaseAgent(): ProtocolProxyApi.DatabaseApi {
    return this.getAgent('Database');
  }

  debuggerAgent(): ProtocolProxyApi.DebuggerApi {
    return this.getAgent('Debugger');
  }

  deviceOrientationAgent(): ProtocolProxyApi.DeviceOrientationApi {
    return this.getAgent('DeviceOrientation');
  }

  domAgent(): ProtocolProxyApi.DOMApi {
    return this.getAgent('DOM');
  }

  domdebuggerAgent(): ProtocolProxyApi.DOMDebuggerApi {
    return this.getAgent('DOMDebugger');
  }

  domsnapshotAgent(): ProtocolProxyApi.DOMSnapshotApi {
    return this.getAgent('DOMSnapshot');
  }

  domstorageAgent(): ProtocolProxyApi.DOMStorageApi {
    return this.getAgent('DOMStorage');
  }

  emulationAgent(): ProtocolProxyApi.EmulationApi {
    return this.getAgent('Emulation');
  }

  eventBreakpointsAgent(): ProtocolProxyApi.EventBreakpointsApi {
    return this.getAgent('EventBreakpoints');
  }

  extensionsAgent(): ProtocolProxyApi.ExtensionsApi {
    return this.getAgent('Extensions');
  }

  fetchAgent(): ProtocolProxyApi.FetchApi {
    return this.getAgent('Fetch');
  }

  heapProfilerAgent(): ProtocolProxyApi.HeapProfilerApi {
    return this.getAgent('HeapProfiler');
  }

  indexedDBAgent(): ProtocolProxyApi.IndexedDBApi {
    return this.getAgent('IndexedDB');
  }

  inputAgent(): ProtocolProxyApi.InputApi {
    return this.getAgent('Input');
  }

  ioAgent(): ProtocolProxyApi.IOApi {
    return this.getAgent('IO');
  }

  inspectorAgent(): ProtocolProxyApi.InspectorApi {
    return this.getAgent('Inspector');
  }

  layerTreeAgent(): ProtocolProxyApi.LayerTreeApi {
    return this.getAgent('LayerTree');
  }

  logAgent(): ProtocolProxyApi.LogApi {
    return this.getAgent('Log');
  }

  mediaAgent(): ProtocolProxyApi.MediaApi {
    return this.getAgent('Media');
  }

  memoryAgent(): ProtocolProxyApi.MemoryApi {
    return this.getAgent('Memory');
  }

  networkAgent(): ProtocolProxyApi.NetworkApi {
    return this.getAgent('Network');
  }

  overlayAgent(): ProtocolProxyApi.OverlayApi {
    return this.getAgent('Overlay');
  }

  pageAgent(): ProtocolProxyApi.PageApi {
    return this.getAgent('Page');
  }

  preloadAgent(): ProtocolProxyApi.PreloadApi {
    return this.getAgent('Preload');
  }

  profilerAgent(): ProtocolProxyApi.ProfilerApi {
    return this.getAgent('Profiler');
  }

  performanceAgent(): ProtocolProxyApi.PerformanceApi {
    return this.getAgent('Performance');
  }

  runtimeAgent(): ProtocolProxyApi.RuntimeApi {
    return this.getAgent('Runtime');
  }

  securityAgent(): ProtocolProxyApi.SecurityApi {
    return this.getAgent('Security');
  }

  serviceWorkerAgent(): ProtocolProxyApi.ServiceWorkerApi {
    return this.getAgent('ServiceWorker');
  }

  storageAgent(): ProtocolProxyApi.StorageApi {
    return this.getAgent('Storage');
  }

  systemInfo(): ProtocolProxyApi.SystemInfoApi {
    return this.getAgent('SystemInfo');
  }

  targetAgent(): ProtocolProxyApi.TargetApi {
    return this.getAgent('Target');
  }

  tracingAgent(): ProtocolProxyApi.TracingApi {
    return this.getAgent('Tracing');
  }

  webAudioAgent(): ProtocolProxyApi.WebAudioApi {
    return this.getAgent('WebAudio');
  }

  webAuthnAgent(): ProtocolProxyApi.WebAuthnApi {
    return this.getAgent('WebAuthn');
  }

  // Dispatcher registration and de-registration, keep alphabetically sorted.

  /**
   * Make sure that `Domain` is only ever instantiated with one protocol domain
   * name, because if `Domain` allows multiple domains, the type is unsound.
   */
  private registerDispatcher<Domain extends ProtocolDomainName>(
      domain: Domain, dispatcher: ProtocolProxyApi.ProtocolDispatchers[Domain]): void {
    const manager = this.#dispatchers.get(domain);
    if (!manager) {
      return;
    }
    manager.addDomainDispatcher(dispatcher);
  }

  /**
   * Make sure that `Domain` is only ever instantiated with one protocol domain
   * name, because if `Domain` allows multiple domains, the type is unsound.
   */
  private unregisterDispatcher<Domain extends ProtocolDomainName>(
      domain: Domain, dispatcher: ProtocolProxyApi.ProtocolDispatchers[Domain]): void {
    const manager = this.#dispatchers.get(domain);
    if (!manager) {
      return;
    }
    manager.removeDomainDispatcher(dispatcher);
  }

  registerAccessibilityDispatcher(dispatcher: ProtocolProxyApi.AccessibilityDispatcher): void {
    this.registerDispatcher('Accessibility', dispatcher);
  }

  registerAutofillDispatcher(dispatcher: ProtocolProxyApi.AutofillDispatcher): void {
    this.registerDispatcher('Autofill', dispatcher);
  }

  registerAnimationDispatcher(dispatcher: ProtocolProxyApi.AnimationDispatcher): void {
    this.registerDispatcher('Animation', dispatcher);
  }

  registerAuditsDispatcher(dispatcher: ProtocolProxyApi.AuditsDispatcher): void {
    this.registerDispatcher('Audits', dispatcher);
  }

  registerCSSDispatcher(dispatcher: ProtocolProxyApi.CSSDispatcher): void {
    this.registerDispatcher('CSS', dispatcher);
  }

  registerDatabaseDispatcher(dispatcher: ProtocolProxyApi.DatabaseDispatcher): void {
    this.registerDispatcher('Database', dispatcher);
  }

  registerBackgroundServiceDispatcher(dispatcher: ProtocolProxyApi.BackgroundServiceDispatcher): void {
    this.registerDispatcher('BackgroundService', dispatcher);
  }

  registerDebuggerDispatcher(dispatcher: ProtocolProxyApi.DebuggerDispatcher): void {
    this.registerDispatcher('Debugger', dispatcher);
  }

  unregisterDebuggerDispatcher(dispatcher: ProtocolProxyApi.DebuggerDispatcher): void {
    this.unregisterDispatcher('Debugger', dispatcher);
  }

  registerDOMDispatcher(dispatcher: ProtocolProxyApi.DOMDispatcher): void {
    this.registerDispatcher('DOM', dispatcher);
  }

  registerDOMStorageDispatcher(dispatcher: ProtocolProxyApi.DOMStorageDispatcher): void {
    this.registerDispatcher('DOMStorage', dispatcher);
  }

  registerFetchDispatcher(dispatcher: ProtocolProxyApi.FetchDispatcher): void {
    this.registerDispatcher('Fetch', dispatcher);
  }

  registerHeapProfilerDispatcher(dispatcher: ProtocolProxyApi.HeapProfilerDispatcher): void {
    this.registerDispatcher('HeapProfiler', dispatcher);
  }

  registerInspectorDispatcher(dispatcher: ProtocolProxyApi.InspectorDispatcher): void {
    this.registerDispatcher('Inspector', dispatcher);
  }

  registerLayerTreeDispatcher(dispatcher: ProtocolProxyApi.LayerTreeDispatcher): void {
    this.registerDispatcher('LayerTree', dispatcher);
  }

  registerLogDispatcher(dispatcher: ProtocolProxyApi.LogDispatcher): void {
    this.registerDispatcher('Log', dispatcher);
  }

  registerMediaDispatcher(dispatcher: ProtocolProxyApi.MediaDispatcher): void {
    this.registerDispatcher('Media', dispatcher);
  }

  registerNetworkDispatcher(dispatcher: ProtocolProxyApi.NetworkDispatcher): void {
    this.registerDispatcher('Network', dispatcher);
  }

  registerOverlayDispatcher(dispatcher: ProtocolProxyApi.OverlayDispatcher): void {
    this.registerDispatcher('Overlay', dispatcher);
  }

  registerPageDispatcher(dispatcher: ProtocolProxyApi.PageDispatcher): void {
    this.registerDispatcher('Page', dispatcher);
  }

  registerPreloadDispatcher(dispatcher: ProtocolProxyApi.PreloadDispatcher): void {
    this.registerDispatcher('Preload', dispatcher);
  }

  registerProfilerDispatcher(dispatcher: ProtocolProxyApi.ProfilerDispatcher): void {
    this.registerDispatcher('Profiler', dispatcher);
  }

  registerRuntimeDispatcher(dispatcher: ProtocolProxyApi.RuntimeDispatcher): void {
    this.registerDispatcher('Runtime', dispatcher);
  }

  registerSecurityDispatcher(dispatcher: ProtocolProxyApi.SecurityDispatcher): void {
    this.registerDispatcher('Security', dispatcher);
  }

  registerServiceWorkerDispatcher(dispatcher: ProtocolProxyApi.ServiceWorkerDispatcher): void {
    this.registerDispatcher('ServiceWorker', dispatcher);
  }

  registerStorageDispatcher(dispatcher: ProtocolProxyApi.StorageDispatcher): void {
    this.registerDispatcher('Storage', dispatcher);
  }

  registerTargetDispatcher(dispatcher: ProtocolProxyApi.TargetDispatcher): void {
    this.registerDispatcher('Target', dispatcher);
  }

  registerTracingDispatcher(dispatcher: ProtocolProxyApi.TracingDispatcher): void {
    this.registerDispatcher('Tracing', dispatcher);
  }

  registerWebAudioDispatcher(dispatcher: ProtocolProxyApi.WebAudioDispatcher): void {
    this.registerDispatcher('WebAudio', dispatcher);
  }

  registerWebAuthnDispatcher(dispatcher: ProtocolProxyApi.WebAuthnDispatcher): void {
    this.registerDispatcher('WebAuthn', dispatcher);
  }

  getNeedsNodeJSPatching(): boolean {
    return this.needsNodeJSPatching;
  }
}

/**
 * This is a class that serves as the prototype for a domains #agents (every target
 * has it's own set of #agents). The InspectorBackend keeps an instance of this class
 * per domain, and each TargetBase creates its #agents (via Object.create) and installs
 * this instance as prototype.
 *
 * The reasons this is done is so that on the prototypes we can install the implementations
 * of the invoke_enable, etc. methods that the front-end uses.
 */
class AgentPrototype {
  replyArgs: {
    [x: string]: string[],
  };
  description = '';
  metadata: {[commandName: string]: {parameters: CommandParameter[], description: string, replyArgs: string[]}};
  readonly domain: string;
  target!: TargetBase;
  constructor(domain: string) {
    this.replyArgs = {};
    this.domain = domain;
    this.metadata = {};
  }

  registerCommand(
      methodName: UnqualifiedName, parameters: CommandParameter[], replyArgs: string[], description: string): void {
    const domainAndMethod = qualifyName(this.domain, methodName);
    function sendMessagePromise(this: AgentPrototype, ...args: unknown[]): Promise<unknown> {
      return AgentPrototype.prototype.sendMessageToBackendPromise.call(this, domainAndMethod, parameters, args);
    }
    // @ts-ignore Method code generation
    this[methodName] = sendMessagePromise;
    this.metadata[domainAndMethod] = {parameters, description, replyArgs};

    function invoke(this: AgentPrototype, request: Object|undefined = {}): Promise<Protocol.ProtocolResponseWithError> {
      return this.invoke(domainAndMethod, request);
    }

    // @ts-ignore Method code generation
    this['invoke_' + methodName] = invoke;
    this.replyArgs[domainAndMethod] = replyArgs;
  }

  private prepareParameters(
      method: string, parameters: CommandParameter[], args: unknown[], errorCallback: (arg0: string) => void): Object
      |null {
    const params: {[x: string]: unknown} = {};
    let hasParams = false;

    for (const param of parameters) {
      const paramName = param.name;
      const typeName = param.type;
      const optionalFlag = param.optional;

      if (!args.length && !optionalFlag) {
        errorCallback(
            `Protocol Error: Invalid number of arguments for method '${method}' call. ` +
            `It must have the following arguments ${JSON.stringify(parameters)}'.`);
        return null;
      }

      const value = args.shift();
      if (optionalFlag && typeof value === 'undefined') {
        continue;
      }
      const expectedJSType = typeName === 'array' ? 'object' : typeName;
      if (typeof value !== expectedJSType) {
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

  private sendMessageToBackendPromise(method: QualifiedName, parameters: CommandParameter[], args: unknown[]):
      Promise<unknown> {
    let errorMessage;
    function onError(message: string): void {
      console.error(message);
      errorMessage = message;
    }
    const params = this.prepareParameters(method, parameters, args, onError);
    if (errorMessage) {
      return Promise.resolve(null);
    }

    return new Promise(resolve => {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const callback: Callback = (error: MessageError|null, result: any|null): void => {
        if (error) {
          if (!test.suppressRequestErrors && error.code !== DevToolsStubErrorCode && error.code !== GenericErrorCode &&
              error.code !== ConnectionClosedErrorCode) {
            console.error('Request ' + method + ' failed. ' + JSON.stringify(error));
          }

          resolve(null);
          return;
        }

        const args = this.replyArgs[method];
        resolve(result && args.length ? result[args[0]] : undefined);
      };

      const router = this.target.router();
      if (!router) {
        SessionRouter.dispatchConnectionError(callback, method);
      } else {
        router.sendMessage(this.target.sessionId, this.domain, method, params, callback);
      }
    });
  }

  private invoke(method: QualifiedName, request: Object|null): Promise<Protocol.ProtocolResponseWithError> {
    return new Promise(fulfill => {
      const callback: Callback = (error: MessageError|undefined|null, result: Object|null): void => {
        if (error && !test.suppressRequestErrors && error.code !== DevToolsStubErrorCode &&
            error.code !== GenericErrorCode && error.code !== ConnectionClosedErrorCode) {
          console.error('Request ' + method + ' failed. ' + JSON.stringify(error));
        }

        const errorMessage = error?.message;
        fulfill({...result, getError: () => errorMessage});
      };

      const router = this.target.router();
      if (!router) {
        SessionRouter.dispatchConnectionError(callback, method);
      } else {
        router.sendMessage(this.target.sessionId, this.domain, method, request, callback);
      }
    });
  }
}

/**
 * A `DispatcherManager` has a collection of #dispatchers that implement one of the
 * `ProtocolProxyApi.{Foo}Dispatcher` interfaces. Each target uses one of these per
 * domain to manage the registered #dispatchers. The class knows the parameter names
 * of the events via `#eventArgs`, which is a map managed by the inspector back-end
 * so that there is only one map per domain that is shared among all DispatcherManagers.
 */
class DispatcherManager<Domain extends ProtocolDomainName> {
  #eventArgs: ReadonlyEventParameterNames;
  #dispatchers: ProtocolProxyApi.ProtocolDispatchers[Domain][] = [];

  constructor(eventArgs: ReadonlyEventParameterNames) {
    this.#eventArgs = eventArgs;
  }

  addDomainDispatcher(dispatcher: ProtocolProxyApi.ProtocolDispatchers[Domain]): void {
    this.#dispatchers.push(dispatcher);
  }

  removeDomainDispatcher(dispatcher: ProtocolProxyApi.ProtocolDispatchers[Domain]): void {
    const index = this.#dispatchers.indexOf(dispatcher);
    if (index === -1) {
      return;
    }
    this.#dispatchers.splice(index, 1);
  }

  dispatch(event: UnqualifiedName, messageObject: EventMessage): void {
    if (!this.#dispatchers.length) {
      return;
    }

    if (!this.#eventArgs.has(messageObject.method)) {
      InspectorBackend.reportProtocolWarning(
          `Protocol Warning: Attempted to dispatch an unspecified event '${messageObject.method}'`, messageObject);
      return;
    }

    const messageParams = {...messageObject.params};
    for (let index = 0; index < this.#dispatchers.length; ++index) {
      const dispatcher = this.#dispatchers[index];

      if (event in dispatcher) {
        const f = dispatcher[event as string as keyof ProtocolProxyApi.ProtocolDispatchers[Domain]];
        // @ts-ignore Can't type check the dispatch.
        f.call(dispatcher, messageParams);
      }
    }
  }
}

export const inspectorBackend = new InspectorBackend();
