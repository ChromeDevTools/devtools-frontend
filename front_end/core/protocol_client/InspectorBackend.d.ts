import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Platform from '../platform/platform.js';
import { ConnectionTransport } from './ConnectionTransport.js';
export declare const DevToolsStubErrorCode = -32015;
type MessageParams = Record<string, any>;
type ProtocolDomainName = ProtocolProxyApi.ProtocolDomainName;
export interface MessageError {
    code: number;
    message: string;
    data?: string | null;
}
export interface Message {
    sessionId?: string;
    url?: Platform.DevToolsPath.UrlString;
    id?: number;
    error?: MessageError | null;
    result?: Object | null;
    method?: QualifiedName;
    params?: MessageParams | null;
}
interface EventMessage extends Message {
    method: QualifiedName;
    params?: MessageParams | null;
}
/** A qualified name, e.g. Domain.method */
export type QualifiedName = string & {
    qualifiedEventNameTag: string | undefined;
};
/** A qualified name, e.g. method */
export type UnqualifiedName = string & {
    unqualifiedEventNameTag: string | undefined;
};
export declare const splitQualifiedName: (string: QualifiedName) => [string, UnqualifiedName];
export declare const qualifyName: (domain: string, name: UnqualifiedName) => QualifiedName;
type EventParameterNames = Map<QualifiedName, string[]>;
type ReadonlyEventParameterNames = ReadonlyMap<QualifiedName, string[]>;
interface CommandParameter {
    name: string;
    type: string;
    optional: boolean;
    description: string;
}
interface ResponseWithError {
    error: MessageError | null;
    result: Object | null;
}
export declare class InspectorBackend {
    #private;
    readonly agentPrototypes: Map<keyof ProtocolProxyApi.ProtocolApi, AgentPrototype>;
    readonly typeMap: Map<QualifiedName, CommandParameter[]>;
    readonly enumMap: Map<QualifiedName, Record<string, string>>;
    constructor();
    private getOrCreateEventParameterNamesForDomain;
    getOrCreateEventParameterNamesForDomainForTesting(domain: ProtocolDomainName): EventParameterNames;
    getEventParameterNames(): ReadonlyMap<ProtocolDomainName, ReadonlyEventParameterNames>;
    static reportProtocolError(error: string, messageObject: Object): void;
    static reportProtocolWarning(error: string, messageObject: Object): void;
    private agentPrototype;
    registerCommand(method: QualifiedName, parameters: CommandParameter[], replyArgs: string[], description: string): void;
    registerEnum(type: QualifiedName, values: Record<string, string>): void;
    registerType(method: QualifiedName, parameters: CommandParameter[]): void;
    registerEvent(eventName: QualifiedName, params: string[]): void;
}
type SendRawMessageCallback = (...args: unknown[]) => void;
export declare const test: {
    /**
     * This will get called for every protocol message.
     * ProtocolClient.test.dumpProtocol = console.log
     */
    dumpProtocol: ((arg0: string) => void) | null;
    /**
     * Runs a function when no protocol activity is present.
     * ProtocolClient.test.deprecatedRunAfterPendingDispatches(() => console.log('done'))
     */
    deprecatedRunAfterPendingDispatches: ((arg0: () => void) => void) | null;
    /**
     * Sends a raw message over main connection.
     * ProtocolClient.test.sendRawMessage('Page.enable', {}, console.log)
     */
    sendRawMessage: ((method: QualifiedName, args: Object | null, arg2: SendRawMessageCallback) => void) | null;
    /**
     * Set to true to not log any errors.
     */
    suppressRequestErrors: boolean;
    /**
     * Set to get notified about any messages sent over protocol.
     */
    onMessageSent: ((message: {
        domain: string;
        method: string;
        params: Object;
        id: number;
        sessionId?: string;
    }) => void) | null;
    /**
     * Set to get notified about any messages received over protocol.
     */
    onMessageReceived: ((message: Object) => void) | null;
};
export declare class SessionRouter {
    #private;
    constructor(connection: ConnectionTransport);
    registerSession(target: TargetBase, sessionId: string, proxyConnection?: ConnectionTransport | null): void;
    unregisterSession(sessionId: string): void;
    private nextMessageId;
    connection(): ConnectionTransport;
    sendMessage(sessionId: string, domain: string, method: QualifiedName, params: Object | null): Promise<ResponseWithError>;
    private sendRawMessageForTesting;
    private onMessage;
    private hasOutstandingNonLongPollingRequests;
    private deprecatedRunAfterPendingDispatches;
    private executeAfterPendingDispatches;
}
export declare class TargetBase {
    #private;
    needsNodeJSPatching: boolean;
    readonly sessionId: string;
    constructor(needsNodeJSPatching: boolean, parentTarget: TargetBase | null, sessionId: string, connection: ConnectionTransport | null);
    dispatch(eventMessage: EventMessage): void;
    dispose(_reason: string): void;
    isDisposed(): boolean;
    markAsNodeJSForTest(): void;
    router(): SessionRouter | null;
    /**
     * Make sure that `Domain` is only ever instantiated with one protocol domain
     * name, because if `Domain` allows multiple domains, the type is unsound.
     */
    private getAgent;
    accessibilityAgent(): ProtocolProxyApi.AccessibilityApi;
    animationAgent(): ProtocolProxyApi.AnimationApi;
    auditsAgent(): ProtocolProxyApi.AuditsApi;
    autofillAgent(): ProtocolProxyApi.AutofillApi;
    browserAgent(): ProtocolProxyApi.BrowserApi;
    backgroundServiceAgent(): ProtocolProxyApi.BackgroundServiceApi;
    cacheStorageAgent(): ProtocolProxyApi.CacheStorageApi;
    cssAgent(): ProtocolProxyApi.CSSApi;
    debuggerAgent(): ProtocolProxyApi.DebuggerApi;
    deviceOrientationAgent(): ProtocolProxyApi.DeviceOrientationApi;
    domAgent(): ProtocolProxyApi.DOMApi;
    domdebuggerAgent(): ProtocolProxyApi.DOMDebuggerApi;
    domsnapshotAgent(): ProtocolProxyApi.DOMSnapshotApi;
    domstorageAgent(): ProtocolProxyApi.DOMStorageApi;
    emulationAgent(): ProtocolProxyApi.EmulationApi;
    eventBreakpointsAgent(): ProtocolProxyApi.EventBreakpointsApi;
    extensionsAgent(): ProtocolProxyApi.ExtensionsApi;
    fetchAgent(): ProtocolProxyApi.FetchApi;
    heapProfilerAgent(): ProtocolProxyApi.HeapProfilerApi;
    indexedDBAgent(): ProtocolProxyApi.IndexedDBApi;
    inputAgent(): ProtocolProxyApi.InputApi;
    ioAgent(): ProtocolProxyApi.IOApi;
    inspectorAgent(): ProtocolProxyApi.InspectorApi;
    layerTreeAgent(): ProtocolProxyApi.LayerTreeApi;
    logAgent(): ProtocolProxyApi.LogApi;
    mediaAgent(): ProtocolProxyApi.MediaApi;
    memoryAgent(): ProtocolProxyApi.MemoryApi;
    networkAgent(): ProtocolProxyApi.NetworkApi;
    overlayAgent(): ProtocolProxyApi.OverlayApi;
    pageAgent(): ProtocolProxyApi.PageApi;
    preloadAgent(): ProtocolProxyApi.PreloadApi;
    profilerAgent(): ProtocolProxyApi.ProfilerApi;
    performanceAgent(): ProtocolProxyApi.PerformanceApi;
    runtimeAgent(): ProtocolProxyApi.RuntimeApi;
    securityAgent(): ProtocolProxyApi.SecurityApi;
    serviceWorkerAgent(): ProtocolProxyApi.ServiceWorkerApi;
    storageAgent(): ProtocolProxyApi.StorageApi;
    systemInfo(): ProtocolProxyApi.SystemInfoApi;
    targetAgent(): ProtocolProxyApi.TargetApi;
    tracingAgent(): ProtocolProxyApi.TracingApi;
    webAudioAgent(): ProtocolProxyApi.WebAudioApi;
    webAuthnAgent(): ProtocolProxyApi.WebAuthnApi;
    /**
     * Make sure that `Domain` is only ever instantiated with one protocol domain
     * name, because if `Domain` allows multiple domains, the type is unsound.
     */
    private registerDispatcher;
    /**
     * Make sure that `Domain` is only ever instantiated with one protocol domain
     * name, because if `Domain` allows multiple domains, the type is unsound.
     */
    private unregisterDispatcher;
    registerAccessibilityDispatcher(dispatcher: ProtocolProxyApi.AccessibilityDispatcher): void;
    registerAutofillDispatcher(dispatcher: ProtocolProxyApi.AutofillDispatcher): void;
    registerAnimationDispatcher(dispatcher: ProtocolProxyApi.AnimationDispatcher): void;
    registerAuditsDispatcher(dispatcher: ProtocolProxyApi.AuditsDispatcher): void;
    registerCSSDispatcher(dispatcher: ProtocolProxyApi.CSSDispatcher): void;
    registerBackgroundServiceDispatcher(dispatcher: ProtocolProxyApi.BackgroundServiceDispatcher): void;
    registerDebuggerDispatcher(dispatcher: ProtocolProxyApi.DebuggerDispatcher): void;
    unregisterDebuggerDispatcher(dispatcher: ProtocolProxyApi.DebuggerDispatcher): void;
    registerDOMDispatcher(dispatcher: ProtocolProxyApi.DOMDispatcher): void;
    registerDOMStorageDispatcher(dispatcher: ProtocolProxyApi.DOMStorageDispatcher): void;
    registerFetchDispatcher(dispatcher: ProtocolProxyApi.FetchDispatcher): void;
    registerHeapProfilerDispatcher(dispatcher: ProtocolProxyApi.HeapProfilerDispatcher): void;
    registerInspectorDispatcher(dispatcher: ProtocolProxyApi.InspectorDispatcher): void;
    registerLayerTreeDispatcher(dispatcher: ProtocolProxyApi.LayerTreeDispatcher): void;
    registerLogDispatcher(dispatcher: ProtocolProxyApi.LogDispatcher): void;
    registerMediaDispatcher(dispatcher: ProtocolProxyApi.MediaDispatcher): void;
    registerNetworkDispatcher(dispatcher: ProtocolProxyApi.NetworkDispatcher): void;
    registerOverlayDispatcher(dispatcher: ProtocolProxyApi.OverlayDispatcher): void;
    registerPageDispatcher(dispatcher: ProtocolProxyApi.PageDispatcher): void;
    registerPreloadDispatcher(dispatcher: ProtocolProxyApi.PreloadDispatcher): void;
    registerProfilerDispatcher(dispatcher: ProtocolProxyApi.ProfilerDispatcher): void;
    registerRuntimeDispatcher(dispatcher: ProtocolProxyApi.RuntimeDispatcher): void;
    registerSecurityDispatcher(dispatcher: ProtocolProxyApi.SecurityDispatcher): void;
    registerServiceWorkerDispatcher(dispatcher: ProtocolProxyApi.ServiceWorkerDispatcher): void;
    registerStorageDispatcher(dispatcher: ProtocolProxyApi.StorageDispatcher): void;
    registerTargetDispatcher(dispatcher: ProtocolProxyApi.TargetDispatcher): void;
    registerTracingDispatcher(dispatcher: ProtocolProxyApi.TracingDispatcher): void;
    registerWebAudioDispatcher(dispatcher: ProtocolProxyApi.WebAudioDispatcher): void;
    registerWebAuthnDispatcher(dispatcher: ProtocolProxyApi.WebAuthnDispatcher): void;
    getNeedsNodeJSPatching(): boolean;
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
declare class AgentPrototype {
    description: string;
    metadata: Record<string, {
        parameters: CommandParameter[];
        description: string;
        replyArgs: string[];
    }>;
    readonly domain: string;
    target: TargetBase;
    constructor(domain: string);
    registerCommand(methodName: UnqualifiedName, parameters: CommandParameter[], replyArgs: string[], description: string): void;
    private invoke;
}
export declare const inspectorBackend: InspectorBackend;
export {};
