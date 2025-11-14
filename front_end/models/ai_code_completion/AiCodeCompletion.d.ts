import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
export declare const DELAY_BEFORE_SHOWING_RESPONSE_MS = 500;
export declare const AIDA_REQUEST_DEBOUNCE_TIMEOUT_MS = 200;
/**
 * TODO(b/404796739): Remove these definitions of AgentOptions and RequestOptions and
 * use the existing ones which are used for AI assistance panel agents.
 **/
interface AgentOptions {
    aidaClient: Host.AidaClient.AidaClient;
    serverSideLoggingEnabled?: boolean;
    confirmSideEffectForTest?: typeof Promise.withResolvers;
}
export interface Callbacks {
    getSelectionHead: () => number;
    getCompletionHint: () => string | undefined | null;
    setAiAutoCompletion: (args: {
        text: string;
        from: number;
        startTime: number;
        onImpression: (rpcGlobalId: Host.AidaClient.RpcGlobalId, latency: number, sampleId?: number) => void;
        clearCachedRequest: () => void;
        rpcGlobalId?: Host.AidaClient.RpcGlobalId;
        sampleId?: number;
    } | null) => void;
}
export declare const consoleAdditionalContextFileContent = "/**\n * This file describes the execution environment of the Chrome DevTools Console.\n * The code is JavaScript, but with special global functions and variables.\n * Top-level await is available.\n * The console has direct access to the inspected page's `window` and `document`.\n */\n\n/**\n * @description Returns the value of the most recently evaluated expression.\n */\nlet $_;\n\n/**\n * @description A reference to the most recently selected DOM element.\n * $0, $1, $2, $3, $4 can be used to reference the last five selected DOM elements.\n */\nlet $0;\n\n/**\n * @description A query selector alias. $$('.my-class') is equivalent to document.querySelectorAll('.my-class').\n */\nfunction $$(selector, startNode) {}\n\n/**\n * @description An XPath selector. $x('//p') returns an array of all <p> elements.\n */\nfunction $x(path, startNode) {}\n\nfunction clear() {}\n\nfunction copy(object) {}\n\n/**\n * @description Selects and reveals the specified element in the Elements panel.\n */\nfunction inspect(object) {}\n\nfunction keys(object) {}\n\nfunction values(object) {}\n\n/**\n * @description When the specified function is called, the debugger is invoked.\n */\nfunction debug(func) {}\n\n/**\n * @description Stops the debugging of the specified function.\n */\nfunction undebug(func) {}\n\n/**\n * @description Logs a message to the console whenever the specified function is called,\n * along with the arguments passed to it.\n */\nfunction monitor(func) {}\n\n/**\n * @description Stops monitoring the specified function.\n */\nfunction unmonitor(func) {}\n\n/**\n * @description Logs all events dispatched to the specified object to the console.\n */\nfunction monitorEvents(object, events) {}\n\n/**\n * @description Returns an object containing all event listeners registered on the specified object.\n */\nfunction getEventListeners(object) {}\n\n/**\n * The global `console` object has several helpful methods\n */\nconst console = {\n  log: (...args) => {},\n  warn: (...args) => {},\n  error: (...args) => {},\n  info: (...args) => {},\n  debug: (...args) => {},\n  assert: (assertion, ...args) => {},\n  dir: (object) => {}, // Displays an interactive property listing of an object.\n  dirxml: (object) => {}, // Displays an XML/HTML representation of an object.\n  table: (data, columns) => {}, // Displays tabular data as a table.\n  group: (label) => {}, // Creates a new inline collapsible group.\n  groupEnd: () => {},\n  time: (label) => {}, // Starts a timer.\n  timeEnd: (label) => {} // Stops a timer and logs the elapsed time.\n};";
/**
 * The AiCodeCompletion class is responsible for fetching code completion suggestions
 * from the AIDA backend and displaying them in the text editor.
 *
 * 1. **Debouncing requests:** As the user types, we don't want to send a request
 *    for every keystroke. Instead, we use debouncing to schedule a request
 *    only after the user has paused typing for a short period
 *    (AIDA_REQUEST_THROTTLER_TIMEOUT_MS). This prevents spamming the backend with
 *    requests for intermediate typing states.
 *
 * 2. **Delaying suggestions:** When a suggestion is received from the AIDA
 *    backend, we don't show it immediately. There is a minimum delay
 *    (DELAY_BEFORE_SHOWING_RESPONSE_MS) from when the request was sent to when
 *    the suggestion is displayed.
 */
export declare class AiCodeCompletion extends Common.ObjectWrapper.ObjectWrapper<EventTypes> {
    #private;
    constructor(opts: AgentOptions, panel: ContextFlavor, callbacks?: Callbacks, stopSequences?: string[]);
    registerUserImpression(rpcGlobalId: Host.AidaClient.RpcGlobalId, latency: number, sampleId?: number): void;
    registerUserAcceptance(rpcGlobalId: Host.AidaClient.RpcGlobalId, sampleId?: number): void;
    clearCachedRequest(): void;
    onTextChanged(prefix: string, suffix: string, cursorPositionAtRequest: number, inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage): void;
    completeCode(prefix: string, suffix: string, cursorPositionAtRequest: number, inferenceLanguage?: Host.AidaClient.AidaInferenceLanguage, additionalFiles?: Host.AidaClient.AdditionalFile[]): Promise<{
        response: Host.AidaClient.CompletionResponse | null;
        fromCache: boolean;
    }>;
    remove(): void;
    static isAiCodeCompletionEnabled(locale: string): boolean;
}
export declare const enum ContextFlavor {
    CONSOLE = "console",// generated code can contain console specific APIs like `$0`.
    SOURCES = "sources"
}
export declare const enum Events {
    RESPONSE_RECEIVED = "ResponseReceived",
    REQUEST_TRIGGERED = "RequestTriggered"
}
export interface ResponseReceivedEvent {
    citations?: Host.AidaClient.Citation[];
}
export interface EventTypes {
    [Events.RESPONSE_RECEIVED]: ResponseReceivedEvent;
    [Events.REQUEST_TRIGGERED]: {};
}
export {};
