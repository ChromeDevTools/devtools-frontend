// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as InspectorBackendCommands from '../../generated/InspectorBackendCommands.js';
import { ConnectionTransport } from './ConnectionTransport.js';
import { NodeURL } from './NodeURL.js';
export const DevToolsStubErrorCode = -32015;
// TODO(dgozman): we are not reporting generic errors in tests, but we should
// instead report them and just have some expected errors in test expectations.
const GenericErrorCode = -32000;
const ConnectionClosedErrorCode = -32001;
export const splitQualifiedName = (string) => {
    const [domain, eventName] = string.split('.');
    return [domain, eventName];
};
export const qualifyName = (domain, name) => {
    return `${domain}.${name}`;
};
export class InspectorBackend {
    agentPrototypes = new Map();
    #eventParameterNamesForDomain = new Map();
    typeMap = new Map();
    enumMap = new Map();
    constructor() {
        // Create the global here because registering commands will involve putting
        // items onto the global.
        // @ts-expect-error Global namespace instantiation
        globalThis.Protocol ||= {};
        InspectorBackendCommands.registerCommands(this);
    }
    getOrCreateEventParameterNamesForDomain(domain) {
        let map = this.#eventParameterNamesForDomain.get(domain);
        if (!map) {
            map = new Map();
            this.#eventParameterNamesForDomain.set(domain, map);
        }
        return map;
    }
    getOrCreateEventParameterNamesForDomainForTesting(domain) {
        return this.getOrCreateEventParameterNamesForDomain(domain);
    }
    getEventParameterNames() {
        return this.#eventParameterNamesForDomain;
    }
    static reportProtocolError(error, messageObject) {
        console.error(error + ': ' + JSON.stringify(messageObject));
    }
    static reportProtocolWarning(error, messageObject) {
        console.warn(error + ': ' + JSON.stringify(messageObject));
    }
    agentPrototype(domain) {
        let prototype = this.agentPrototypes.get(domain);
        if (!prototype) {
            prototype = new AgentPrototype(domain);
            this.agentPrototypes.set(domain, prototype);
        }
        return prototype;
    }
    registerCommand(method, parameters, replyArgs, description) {
        const [domain, command] = splitQualifiedName(method);
        this.agentPrototype(domain).registerCommand(command, parameters, replyArgs, description);
    }
    registerEnum(type, values) {
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
    registerType(method, parameters) {
        this.typeMap.set(method, parameters);
    }
    registerEvent(eventName, params) {
        const domain = eventName.split('.')[0];
        const eventParameterNames = this.getOrCreateEventParameterNamesForDomain(domain);
        eventParameterNames.set(eventName, params);
    }
}
export const test = {
    /**
     * This will get called for every protocol message.
     * ProtocolClient.test.dumpProtocol = console.log
     */
    dumpProtocol: null,
    /**
     * Runs a function when no protocol activity is present.
     * ProtocolClient.test.deprecatedRunAfterPendingDispatches(() => console.log('done'))
     */
    deprecatedRunAfterPendingDispatches: null,
    /**
     * Sends a raw message over main connection.
     * ProtocolClient.test.sendRawMessage('Page.enable', {}, console.log)
     */
    sendRawMessage: null,
    /**
     * Set to true to not log any errors.
     */
    suppressRequestErrors: false,
    /**
     * Set to get notified about any messages sent over protocol.
     */
    onMessageSent: null,
    /**
     * Set to get notified about any messages received over protocol.
     */
    onMessageReceived: null,
};
const LongPollingMethods = new Set(['CSS.takeComputedStyleUpdates']);
export class SessionRouter {
    #connection;
    #lastMessageId = 1;
    #pendingResponsesCount = 0;
    #pendingLongPollingMessageIds = new Set();
    #sessions = new Map();
    #pendingScripts = [];
    constructor(connection) {
        this.#connection = connection;
        test.deprecatedRunAfterPendingDispatches = this.deprecatedRunAfterPendingDispatches.bind(this);
        test.sendRawMessage = this.sendRawMessageForTesting.bind(this);
        this.#connection.setOnMessage(this.onMessage.bind(this));
        this.#connection.setOnDisconnect(reason => {
            const session = this.#sessions.get('');
            if (session) {
                session.target.dispose(reason);
            }
        });
    }
    registerSession(target, sessionId, proxyConnection) {
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
        this.#sessions.set(sessionId, { target, callbacks: new Map(), proxyConnection });
    }
    unregisterSession(sessionId) {
        const session = this.#sessions.get(sessionId);
        if (!session) {
            return;
        }
        for (const { resolve, method } of session.callbacks.values()) {
            resolve({
                result: null,
                error: {
                    message: `Session is unregistering, can\'t dispatch pending call to ${method}`,
                    code: ConnectionClosedErrorCode,
                    data: null,
                }
            });
        }
        this.#sessions.delete(sessionId);
    }
    nextMessageId() {
        return this.#lastMessageId++;
    }
    connection() {
        return this.#connection;
    }
    sendMessage(sessionId, domain, method, params) {
        const messageId = this.nextMessageId();
        const messageObject = {
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
            test.onMessageSent({ domain, method, params: paramsObject, id: messageId, sessionId });
        }
        ++this.#pendingResponsesCount;
        if (LongPollingMethods.has(method)) {
            this.#pendingLongPollingMessageIds.add(messageId);
        }
        const session = this.#sessions.get(sessionId);
        if (!session) {
            return Promise.resolve({ error: null, result: null });
        }
        return new Promise(resolve => {
            session.callbacks.set(messageId, { resolve, method });
            this.#connection.sendRawMessage(JSON.stringify(messageObject));
        });
    }
    sendRawMessageForTesting(method, params, callback, sessionId = '') {
        const domain = method.split('.')[0];
        void this.sendMessage(sessionId, domain, method, params).then(({ error, result }) => callback?.(error, result));
    }
    onMessage(message) {
        if (test.dumpProtocol) {
            test.dumpProtocol('backend: ' + ((typeof message === 'string') ? message : JSON.stringify(message)));
        }
        if (test.onMessageReceived) {
            const messageObjectCopy = JSON.parse((typeof message === 'string') ? message : JSON.stringify(message));
            test.onMessageReceived(messageObjectCopy);
        }
        const messageObject = ((typeof message === 'string') ? JSON.parse(message) : message);
        // Send all messages to proxy connections.
        let suppressUnknownMessageErrors = false;
        for (const session of this.#sessions.values()) {
            if (!session.proxyConnection) {
                continue;
            }
            if (!session.proxyConnection.onMessage) {
                InspectorBackend.reportProtocolError('Protocol Error: the session has a proxyConnection with no _onMessage', messageObject);
                continue;
            }
            session.proxyConnection.onMessage(messageObject);
            suppressUnknownMessageErrors = true;
        }
        const sessionId = messageObject.sessionId || '';
        const session = this.#sessions.get(sessionId);
        if (!session) {
            // In the DevTools MCP case, we may share the transport with puppeteer so we silently
            // ignore unknown sessions.
            return;
        }
        // If this message is directly for the target controlled by the proxy connection, don't handle it.
        if (session.proxyConnection) {
            return;
        }
        if (session.target.getNeedsNodeJSPatching()) {
            NodeURL.patch(messageObject);
        }
        if (messageObject.id !== undefined) { // just a response for some request
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
            callback.resolve({ error: messageObject.error || null, result: messageObject.result || null });
            --this.#pendingResponsesCount;
            this.#pendingLongPollingMessageIds.delete(messageObject.id);
            if (this.#pendingScripts.length && !this.hasOutstandingNonLongPollingRequests()) {
                this.deprecatedRunAfterPendingDispatches();
            }
        }
        else {
            if (messageObject.method === undefined) {
                InspectorBackend.reportProtocolError('Protocol Error: the message without method', messageObject);
                return;
            }
            // This cast is justified as we just checked for the presence of messageObject.method.
            const eventMessage = messageObject;
            session.target.dispatch(eventMessage);
        }
    }
    hasOutstandingNonLongPollingRequests() {
        return this.#pendingResponsesCount - this.#pendingLongPollingMessageIds.size > 0;
    }
    deprecatedRunAfterPendingDispatches(script) {
        if (script) {
            this.#pendingScripts.push(script);
        }
        // Execute all promises.
        window.setTimeout(() => {
            if (!this.hasOutstandingNonLongPollingRequests()) {
                this.executeAfterPendingDispatches();
            }
            else {
                this.deprecatedRunAfterPendingDispatches();
            }
        }, 0);
    }
    executeAfterPendingDispatches() {
        if (!this.hasOutstandingNonLongPollingRequests()) {
            const scripts = this.#pendingScripts;
            this.#pendingScripts = [];
            for (let id = 0; id < scripts.length; ++id) {
                scripts[id]();
            }
        }
    }
}
export class TargetBase {
    needsNodeJSPatching;
    sessionId;
    #router;
    #agents = new Map();
    #dispatchers = new Map();
    constructor(needsNodeJSPatching, parentTarget, sessionId, connection) {
        this.needsNodeJSPatching = needsNodeJSPatching;
        this.sessionId = sessionId;
        if (parentTarget && !sessionId) {
            throw new Error('Specifying a parent target requires a session ID');
        }
        let router;
        if (parentTarget && parentTarget.#router) {
            router = parentTarget.#router;
        }
        else if (connection) {
            router = new SessionRouter(connection);
        }
        else {
            router = new SessionRouter(ConnectionTransport.getFactory()());
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
    dispatch(eventMessage) {
        const [domainName, method] = splitQualifiedName(eventMessage.method);
        const dispatcher = this.#dispatchers.get(domainName);
        if (!dispatcher) {
            InspectorBackend.reportProtocolError(`Protocol Error: the message ${eventMessage.method} is for non-existing domain '${domainName}'`, eventMessage);
            return;
        }
        dispatcher.dispatch(method, eventMessage);
    }
    dispose(_reason) {
        if (!this.#router) {
            return;
        }
        this.#router.unregisterSession(this.sessionId);
        this.#router = null;
    }
    isDisposed() {
        return !this.#router;
    }
    markAsNodeJSForTest() {
        this.needsNodeJSPatching = true;
    }
    router() {
        return this.#router;
    }
    // Agent accessors, keep alphabetically sorted.
    /**
     * Make sure that `Domain` is only ever instantiated with one protocol domain
     * name, because if `Domain` allows multiple domains, the type is unsound.
     */
    getAgent(domain) {
        const agent = this.#agents.get(domain);
        if (!agent) {
            throw new Error('Accessing undefined agent');
        }
        return agent;
    }
    accessibilityAgent() {
        return this.getAgent('Accessibility');
    }
    animationAgent() {
        return this.getAgent('Animation');
    }
    auditsAgent() {
        return this.getAgent('Audits');
    }
    autofillAgent() {
        return this.getAgent('Autofill');
    }
    browserAgent() {
        return this.getAgent('Browser');
    }
    backgroundServiceAgent() {
        return this.getAgent('BackgroundService');
    }
    cacheStorageAgent() {
        return this.getAgent('CacheStorage');
    }
    cssAgent() {
        return this.getAgent('CSS');
    }
    debuggerAgent() {
        return this.getAgent('Debugger');
    }
    deviceOrientationAgent() {
        return this.getAgent('DeviceOrientation');
    }
    domAgent() {
        return this.getAgent('DOM');
    }
    domdebuggerAgent() {
        return this.getAgent('DOMDebugger');
    }
    domsnapshotAgent() {
        return this.getAgent('DOMSnapshot');
    }
    domstorageAgent() {
        return this.getAgent('DOMStorage');
    }
    emulationAgent() {
        return this.getAgent('Emulation');
    }
    eventBreakpointsAgent() {
        return this.getAgent('EventBreakpoints');
    }
    extensionsAgent() {
        return this.getAgent('Extensions');
    }
    fetchAgent() {
        return this.getAgent('Fetch');
    }
    heapProfilerAgent() {
        return this.getAgent('HeapProfiler');
    }
    indexedDBAgent() {
        return this.getAgent('IndexedDB');
    }
    inputAgent() {
        return this.getAgent('Input');
    }
    ioAgent() {
        return this.getAgent('IO');
    }
    inspectorAgent() {
        return this.getAgent('Inspector');
    }
    layerTreeAgent() {
        return this.getAgent('LayerTree');
    }
    logAgent() {
        return this.getAgent('Log');
    }
    mediaAgent() {
        return this.getAgent('Media');
    }
    memoryAgent() {
        return this.getAgent('Memory');
    }
    networkAgent() {
        return this.getAgent('Network');
    }
    overlayAgent() {
        return this.getAgent('Overlay');
    }
    pageAgent() {
        return this.getAgent('Page');
    }
    preloadAgent() {
        return this.getAgent('Preload');
    }
    profilerAgent() {
        return this.getAgent('Profiler');
    }
    performanceAgent() {
        return this.getAgent('Performance');
    }
    runtimeAgent() {
        return this.getAgent('Runtime');
    }
    securityAgent() {
        return this.getAgent('Security');
    }
    serviceWorkerAgent() {
        return this.getAgent('ServiceWorker');
    }
    storageAgent() {
        return this.getAgent('Storage');
    }
    systemInfo() {
        return this.getAgent('SystemInfo');
    }
    targetAgent() {
        return this.getAgent('Target');
    }
    tracingAgent() {
        return this.getAgent('Tracing');
    }
    webAudioAgent() {
        return this.getAgent('WebAudio');
    }
    webAuthnAgent() {
        return this.getAgent('WebAuthn');
    }
    // Dispatcher registration and de-registration, keep alphabetically sorted.
    /**
     * Make sure that `Domain` is only ever instantiated with one protocol domain
     * name, because if `Domain` allows multiple domains, the type is unsound.
     */
    registerDispatcher(domain, dispatcher) {
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
    unregisterDispatcher(domain, dispatcher) {
        const manager = this.#dispatchers.get(domain);
        if (!manager) {
            return;
        }
        manager.removeDomainDispatcher(dispatcher);
    }
    registerAccessibilityDispatcher(dispatcher) {
        this.registerDispatcher('Accessibility', dispatcher);
    }
    registerAutofillDispatcher(dispatcher) {
        this.registerDispatcher('Autofill', dispatcher);
    }
    registerAnimationDispatcher(dispatcher) {
        this.registerDispatcher('Animation', dispatcher);
    }
    registerAuditsDispatcher(dispatcher) {
        this.registerDispatcher('Audits', dispatcher);
    }
    registerCSSDispatcher(dispatcher) {
        this.registerDispatcher('CSS', dispatcher);
    }
    registerBackgroundServiceDispatcher(dispatcher) {
        this.registerDispatcher('BackgroundService', dispatcher);
    }
    registerDebuggerDispatcher(dispatcher) {
        this.registerDispatcher('Debugger', dispatcher);
    }
    unregisterDebuggerDispatcher(dispatcher) {
        this.unregisterDispatcher('Debugger', dispatcher);
    }
    registerDOMDispatcher(dispatcher) {
        this.registerDispatcher('DOM', dispatcher);
    }
    registerDOMStorageDispatcher(dispatcher) {
        this.registerDispatcher('DOMStorage', dispatcher);
    }
    registerFetchDispatcher(dispatcher) {
        this.registerDispatcher('Fetch', dispatcher);
    }
    registerHeapProfilerDispatcher(dispatcher) {
        this.registerDispatcher('HeapProfiler', dispatcher);
    }
    registerInspectorDispatcher(dispatcher) {
        this.registerDispatcher('Inspector', dispatcher);
    }
    registerLayerTreeDispatcher(dispatcher) {
        this.registerDispatcher('LayerTree', dispatcher);
    }
    registerLogDispatcher(dispatcher) {
        this.registerDispatcher('Log', dispatcher);
    }
    registerMediaDispatcher(dispatcher) {
        this.registerDispatcher('Media', dispatcher);
    }
    registerNetworkDispatcher(dispatcher) {
        this.registerDispatcher('Network', dispatcher);
    }
    registerOverlayDispatcher(dispatcher) {
        this.registerDispatcher('Overlay', dispatcher);
    }
    registerPageDispatcher(dispatcher) {
        this.registerDispatcher('Page', dispatcher);
    }
    registerPreloadDispatcher(dispatcher) {
        this.registerDispatcher('Preload', dispatcher);
    }
    registerProfilerDispatcher(dispatcher) {
        this.registerDispatcher('Profiler', dispatcher);
    }
    registerRuntimeDispatcher(dispatcher) {
        this.registerDispatcher('Runtime', dispatcher);
    }
    registerSecurityDispatcher(dispatcher) {
        this.registerDispatcher('Security', dispatcher);
    }
    registerServiceWorkerDispatcher(dispatcher) {
        this.registerDispatcher('ServiceWorker', dispatcher);
    }
    registerStorageDispatcher(dispatcher) {
        this.registerDispatcher('Storage', dispatcher);
    }
    registerTargetDispatcher(dispatcher) {
        this.registerDispatcher('Target', dispatcher);
    }
    registerTracingDispatcher(dispatcher) {
        this.registerDispatcher('Tracing', dispatcher);
    }
    registerWebAudioDispatcher(dispatcher) {
        this.registerDispatcher('WebAudio', dispatcher);
    }
    registerWebAuthnDispatcher(dispatcher) {
        this.registerDispatcher('WebAuthn', dispatcher);
    }
    getNeedsNodeJSPatching() {
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
    description = '';
    metadata;
    domain;
    target;
    constructor(domain) {
        this.domain = domain;
        this.metadata = {};
    }
    registerCommand(methodName, parameters, replyArgs, description) {
        const domainAndMethod = qualifyName(this.domain, methodName);
        this.metadata[domainAndMethod] = { parameters, description, replyArgs };
        function invoke(request = {}) {
            return this.invoke(domainAndMethod, request);
        }
        // @ts-expect-error Method code generation
        this['invoke_' + methodName] = invoke;
    }
    invoke(method, request) {
        const router = this.target.router();
        if (!router) {
            return Promise.resolve({ result: null, getError: () => `Connection is closed, can\'t dispatch pending call to ${method}` });
        }
        return router.sendMessage(this.target.sessionId, this.domain, method, request).then(({ error, result }) => {
            if (error && !test.suppressRequestErrors && error.code !== DevToolsStubErrorCode &&
                error.code !== GenericErrorCode && error.code !== ConnectionClosedErrorCode) {
                console.error('Request ' + method + ' failed. ' + JSON.stringify(error));
            }
            const errorMessage = error?.message;
            return { ...result, getError: () => errorMessage };
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
class DispatcherManager {
    #eventArgs;
    #dispatchers = [];
    constructor(eventArgs) {
        this.#eventArgs = eventArgs;
    }
    addDomainDispatcher(dispatcher) {
        this.#dispatchers.push(dispatcher);
    }
    removeDomainDispatcher(dispatcher) {
        const index = this.#dispatchers.indexOf(dispatcher);
        if (index === -1) {
            return;
        }
        this.#dispatchers.splice(index, 1);
    }
    dispatch(event, messageObject) {
        if (!this.#dispatchers.length) {
            return;
        }
        if (!this.#eventArgs.has(messageObject.method)) {
            InspectorBackend.reportProtocolWarning(`Protocol Warning: Attempted to dispatch an unspecified event '${messageObject.method}'`, messageObject);
            return;
        }
        for (let index = 0; index < this.#dispatchers.length; ++index) {
            const dispatcher = this.#dispatchers[index];
            if (event in dispatcher) {
                const f = dispatcher[event];
                // @ts-expect-error Can't type check the dispatch.
                f.call(dispatcher, messageObject.params);
            }
        }
    }
}
export const inspectorBackend = new InspectorBackend();
//# sourceMappingURL=InspectorBackend.js.map