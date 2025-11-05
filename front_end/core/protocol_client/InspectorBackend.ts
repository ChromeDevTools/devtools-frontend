// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as InspectorBackendCommands from '../../generated/InspectorBackendCommands.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Platform from '../platform/platform.js';

import {
  type CDPConnection,
  type CDPConnectionObserver,
  CDPErrorStatus,
  type CDPEvent,
  type Command,
  type CommandParams,
  type Event
} from './CDPConnection.js';
import {ConnectionTransport} from './ConnectionTransport.js';
import {DevToolsCDPConnection} from './DevToolsCDPConnection.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type MessageParams = Record<string, any>;

type ProtocolDomainName = ProtocolProxyApi.ProtocolDomainName;

export interface MessageError {
  code: number;
  message: string;
  data?: string|null;
}

export interface Message {
  sessionId?: string;
  url?: Platform.DevToolsPath.UrlString;
  id?: number;
  error?: MessageError|null;
  result?: Object|null;
  method?: QualifiedName;
  params?: MessageParams|null;
}

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

type CommandParameter = InspectorBackendCommands.CommandParameter;

export class InspectorBackend implements InspectorBackendCommands.InspectorBackendAPI {
  readonly agentPrototypes = new Map<ProtocolDomainName, AgentPrototype>();
  #eventParameterNamesForDomain = new Map<ProtocolDomainName, EventParameterNames>();
  readonly typeMap = new Map<QualifiedName, CommandParameter[]>();
  readonly enumMap = new Map<QualifiedName, Record<string, string>>();

  constructor() {
    // Create the global here because registering commands will involve putting
    // items onto the global.
    // @ts-expect-error Global namespace instantiation
    globalThis.Protocol ||= {};

    InspectorBackendCommands.registerCommands(this);
  }

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
  }

  registerEnum(type: QualifiedName, values: Record<string, string>): void {
    const [domain, name] = splitQualifiedName(type);
    // @ts-expect-error globalThis global namespace pollution
    if (!globalThis.Protocol[domain]) {
      // @ts-expect-error globalThis global namespace pollution
      globalThis.Protocol[domain] = {};
    }

    // @ts-expect-error globalThis global namespace pollution
    globalThis.Protocol[domain][name] = values;
    this.enumMap.set(type, values);
  }

  registerType(method: QualifiedName, parameters: CommandParameter[]): void {
    this.typeMap.set(method, parameters);
  }

  registerEvent(eventName: QualifiedName, params: string[]): void {
    const domain = eventName.split('.')[0];
    const eventParameterNames = this.getOrCreateEventParameterNamesForDomain(domain as ProtocolDomainName);
    eventParameterNames.set(eventName, params);
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
          ((message: {domain: string, method: string, params: Object, id: number, sessionId?: string}) => void) |
      null,

  /**
   * Set to get notified about any messages received over protocol.
   */
  onMessageReceived: null as ((message: Object) => void) | null,
};

export class SessionRouter implements CDPConnectionObserver {
  readonly #connection: CDPConnection;
  readonly #sessions = new Map<string, {
    target: TargetBase,
  }>();

  constructor(connection: CDPConnection) {
    this.#connection = connection;
    this.#connection.observe(this);
  }

  registerSession(target: TargetBase, sessionId: string): void {
    this.#sessions.set(sessionId, {target});
  }

  unregisterSession(sessionId: string): void {
    const session = this.#sessions.get(sessionId);
    if (!session) {
      return;
    }
    if (this.#connection instanceof DevToolsCDPConnection) {
      this.#connection.resolvePendingCalls(sessionId);
    }
    this.#sessions.delete(sessionId);
  }

  onDisconnect(reason: string): void {
    const session = this.#sessions.get('');
    if (session) {
      session.target.dispose(reason);
    }
  }

  onEvent<T extends Event>(event: CDPEvent<T>): void {
    const sessionId = event.sessionId || '';
    const session = this.#sessions.get(sessionId);
    session?.target.dispatch(event as unknown as EventMessage);
  }

  get connection(): CDPConnection {
    return this.#connection;
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
  readonly sessionId: string;
  #router: SessionRouter|null;
  #agents: AgentsMap = new Map();
  #dispatchers: DispatcherMap = new Map();

  constructor(parentTarget: TargetBase|null, sessionId: string, connection: CDPConnection|null) {
    this.sessionId = sessionId;

    if (parentTarget && !sessionId) {
      throw new Error('Specifying a parent target requires a session ID');
    }

    let router: SessionRouter;
    if (parentTarget && parentTarget.#router) {
      router = parentTarget.#router;
    } else if (connection) {
      router = new SessionRouter(connection);
    } else {
      router = new SessionRouter(new DevToolsCDPConnection(ConnectionTransport.getFactory()()));
    }

    this.#router = router;

    router.registerSession(this, this.sessionId);

    for (const [domain, agentPrototype] of inspectorBackend.agentPrototypes) {
      const agent = Object.create((agentPrototype));
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
    if (!this.#router) {
      return;
    }
    this.#router.unregisterSession(this.sessionId);
    this.#router = null;
  }

  isDisposed(): boolean {
    return !this.#router;
  }

  router(): SessionRouter|null {
    return this.#router;
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
}

/** These are not logged as console.error */
const IGNORED_ERRORS = new Set<CDPErrorStatus>([
  CDPErrorStatus.DEVTOOLS_STUB_ERROR,
  CDPErrorStatus.SERVER_ERROR,
  CDPErrorStatus.SESSION_NOT_FOUND,
]);

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
  description = '';
  metadata: Record<string, {parameters: CommandParameter[], description: string, replyArgs: string[]}>;
  readonly domain: string;
  target!: TargetBase;
  constructor(domain: string) {
    this.domain = domain;
    this.metadata = {};
  }

  registerCommand(
      methodName: UnqualifiedName, parameters: CommandParameter[], replyArgs: string[], description: string): void {
    const domainAndMethod = qualifyName(this.domain, methodName);
    this.metadata[domainAndMethod] = {parameters, description, replyArgs};

    function invoke(this: AgentPrototype, request: Object|undefined = {}): Promise<Protocol.ProtocolResponseWithError> {
      return this.invoke(domainAndMethod, request);
    }

    // @ts-expect-error Method code generation
    this['invoke_' + methodName] = invoke;
  }

  private invoke(method: QualifiedName, request: Object|null): Promise<Protocol.ProtocolResponseWithError> {
    const connection = this.target.router()?.connection;
    if (!connection) {
      return Promise.resolve(
          {result: null, getError: () => `Connection is closed, can\'t dispatch pending call to ${method}`});
    }

    return connection.send(method as Command, request as CommandParams<Command>, this.target.sessionId)
        .then(response => {
          if ('error' in response && response.error) {
            if (!test.suppressRequestErrors && !IGNORED_ERRORS.has(response.error.code)) {
              console.error('Request ' + method + ' failed. ' + JSON.stringify(response.error));
            }
            return {getError: () => response.error.message};
          }

          if ('result' in response) {
            return {...response.result, getError: () => undefined};
          }
          return {getError: () => undefined};
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
  readonly #eventArgs: ReadonlyEventParameterNames;
  readonly #dispatchers: Array<ProtocolProxyApi.ProtocolDispatchers[Domain]> = [];

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

    for (let index = 0; index < this.#dispatchers.length; ++index) {
      const dispatcher = this.#dispatchers[index];

      if (event in dispatcher) {
        const f = dispatcher[event as string as keyof ProtocolProxyApi.ProtocolDispatchers[Domain]];
        // @ts-expect-error Can't type check the dispatch.
        f.call(dispatcher, messageObject.params);
      }
    }
  }
}

export const inspectorBackend = new InspectorBackend();
