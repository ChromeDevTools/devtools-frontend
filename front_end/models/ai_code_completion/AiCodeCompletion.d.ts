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
