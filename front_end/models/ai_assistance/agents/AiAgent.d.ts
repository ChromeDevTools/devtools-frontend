import * as Host from '../../../core/host/host.js';
import type { UrlString } from '../../../core/platform/DevToolsPath.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type * as TextUtils from '../../text_utils/text_utils.js';
import type * as Trace from '../../trace/trace.js';
import type * as Workspace from '../../workspace/workspace.js';
export declare const enum ResponseType {
    CONTEXT = "context",
    TITLE = "title",
    THOUGHT = "thought",
    ACTION = "action",
    SIDE_EFFECT = "side-effect",
    SUGGESTIONS = "suggestions",
    ANSWER = "answer",
    ERROR = "error",
    QUERYING = "querying",
    USER_QUERY = "user-query",
    CONTEXT_CHANGE = "context-change"
}
export declare const enum ErrorType {
    UNKNOWN = "unknown",
    ABORT = "abort",
    MAX_STEPS = "max-steps",
    BLOCK = "block",
    CROSS_ORIGIN = "cross-origin"
}
export declare const enum MultimodalInputType {
    SCREENSHOT = "screenshot",
    UPLOADED_IMAGE = "uploaded-image"
}
export interface MultimodalInput {
    input: Host.AidaClient.Part;
    type: MultimodalInputType;
    id: string;
}
export interface AnswerResponse {
    type: ResponseType.ANSWER;
    text: string;
    complete: boolean;
    rpcId?: Host.AidaClient.RpcGlobalId;
    suggestions?: [string, ...string[]];
    widgets?: AiWidget[];
}
export interface SuggestionsResponse {
    type: ResponseType.SUGGESTIONS;
    suggestions: [string, ...string[]];
}
export interface ErrorResponse {
    type: ResponseType.ERROR;
    error: ErrorType;
}
export interface ContextDetail {
    title: string;
    text: string;
    codeLang?: string;
}
export interface ContextResponse {
    type: ResponseType.CONTEXT;
    details: [ContextDetail, ...ContextDetail[]];
    widgets?: AiWidget[];
}
export interface TitleResponse {
    type: ResponseType.TITLE;
    title: string;
    rpcId?: Host.AidaClient.RpcGlobalId;
}
export interface ThoughtResponse {
    type: ResponseType.THOUGHT;
    thought: string;
    rpcId?: Host.AidaClient.RpcGlobalId;
}
export interface SideEffectResponse {
    type: ResponseType.SIDE_EFFECT;
    description: string | null;
    code?: string;
    confirm: (confirm: boolean) => void;
}
export interface ContextChangeResponse {
    type: ResponseType.CONTEXT_CHANGE;
    /**
     * Information to pass down what was selected
     * Use to make the LLM understand the the user
     * already selected something.
     */
    description: string;
    context: ConversationContext<unknown>;
    widgets?: AiWidget[];
}
interface SerializedSideEffectResponse extends Omit<SideEffectResponse, 'confirm'> {
}
export interface ActionResponse {
    type: ResponseType.ACTION;
    code?: string;
    output?: string;
    canceled: boolean;
    widgets?: AiWidget[];
}
export interface QueryingResponse {
    type: ResponseType.QUERYING;
}
export interface UserQuery {
    type: ResponseType.USER_QUERY;
    query: string;
    imageInput?: Host.AidaClient.Part;
    imageId?: string;
}
export type ResponseData = AnswerResponse | SuggestionsResponse | ErrorResponse | ActionResponse | SideEffectResponse | ThoughtResponse | TitleResponse | QueryingResponse | ContextResponse | UserQuery | ContextChangeResponse;
export type SerializedResponseData = AnswerResponse | SuggestionsResponse | ErrorResponse | ActionResponse | SerializedSideEffectResponse | ThoughtResponse | TitleResponse | QueryingResponse | ContextResponse | UserQuery;
export type FunctionCallResponseData = TitleResponse | ThoughtResponse | ActionResponse | SideEffectResponse | SuggestionsResponse | ContextChangeResponse;
export interface BuildRequestOptions {
    text: string;
}
export interface RequestOptions {
    temperature?: number;
    modelId?: string;
}
export type AllowedOriginResult = {
    origin: string | undefined;
} | {
    blocked: true;
};
export interface AgentOptions {
    aidaClient: Host.AidaClient.AidaClient;
    serverSideLoggingEnabled?: boolean;
    sessionId?: string;
    confirmSideEffectForTest?: typeof Promise.withResolvers;
    onInspectElement?: () => Promise<SDK.DOMModel.DOMNode | null>;
    history?: Host.AidaClient.Content[];
    allowedOrigin?: () => AllowedOriginResult;
    lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON | null>;
}
export interface ParsedAnswer {
    answer: string;
    suggestions?: [string, ...string[]];
}
export type ParsedResponse = ParsedAnswer;
export declare const MAX_STEPS = 10;
export interface ConversationSuggestion {
    title: string;
    jslogContext?: string;
}
/** At least one. */
export type ConversationSuggestions = [ConversationSuggestion, ...ConversationSuggestion[]];
export declare abstract class ConversationContext<T> {
    abstract getURL(): string;
    abstract getItem(): T;
    abstract getTitle(): string;
    getOrigin(): string;
    /**
     * Returns true if this data context (e.g., a DOM node or Network Request) is
     * allowed to be included in a conversation that is locked to the provided
     * `establishedOrigin`.
     *
     * A conversation is "locked" to an origin once the first query is made.
     * This method ensures that we don't mix data from different origins in the
     * same conversation.
     *
     * @param establishedOrigin The origin that the current conversation is locked to.
     * If undefined, the conversation has not yet been locked to an origin.
     */
    isOriginAllowed(establishedOrigin: string | undefined): boolean;
    /**
     * This method is called at the start of `AiAgent.run`.
     * It will be overridden in subclasses to fetch data related to the context item.
     */
    refresh(): Promise<void>;
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
    /**
     * Returns a detailed description of the context item for inclusion in the AI model prompt.
     * Currently only used by AiAgent2.
     */
    getPromptDetails(): Promise<string | null>;
    /**
     * Returns a list of context details to display to the user in the UI.
     * Currently only used by AiAgent2.
     */
    getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]] | null>;
}
export interface ComputedStyleAiWidget {
    name: 'COMPUTED_STYLES';
    data: {
        computedStyles: Map<string, string>;
        backendNodeId: Protocol.DOM.BackendNodeId;
        matchedCascade: SDK.CSSMatchedStyles.CSSMatchedStyles;
        properties: string[];
    };
}
export interface CoreVitalsAiWidget {
    name: 'CORE_VITALS';
    data: {
        insightSetKey: string;
        parsedTrace: Trace.TraceModel.ParsedTrace;
    };
}
export interface StylePropertiesAiWidget {
    name: 'STYLE_PROPERTIES';
    data: {
        backendNodeId: Protocol.DOM.BackendNodeId;
        selector?: string;
    };
}
export interface DomTreeAiWidget {
    name: 'DOM_TREE';
    data: {
        root: SDK.DOMModel.DOMNodeSnapshot;
        networkRequest?: {
            url: string;
            size: number;
            resourceType: Protocol.Network.ResourceType;
            mimeType: string;
            imageContent?: TextUtils.ContentData.ContentData;
        };
    };
}
export interface PerformanceTraceAiWidget {
    name: 'PERFORMANCE_TRACE';
    data: {
        parsedTrace: Trace.TraceModel.ParsedTrace;
    };
}
export interface PerfInsightAiWidget {
    name: 'PERF_INSIGHT';
    data: {
        insight: Trace.Insights.Types.InsightKeys;
        insightData: Trace.Insights.Types.InsightModel;
    };
}
export interface TimelineRangeSummaryAiWidget {
    name: 'TIMELINE_RANGE_SUMMARY';
    data: {
        bounds: Trace.Types.Timing.TraceWindowMicro;
        parsedTrace: Trace.TraceModel.ParsedTrace;
        track: 'main';
    };
}
export interface BottomUpTreeAiWidget {
    name: 'BOTTOM_UP_TREE';
    data: {
        bounds: Trace.Types.Timing.TraceWindowMicro;
        parsedTrace: Trace.TraceModel.ParsedTrace;
    };
}
export interface SourceFileAiWidget {
    name: 'SOURCE_FILE';
    data: {
        uiSourceCode: Workspace.UISourceCode.UISourceCode;
    };
}
export interface SourceFilesListAiWidget {
    name: 'SOURCE_FILES_LIST';
    data: {
        uiSourceCodes: Workspace.UISourceCode.UISourceCode[];
    };
}
export interface NetworkRequestsListAiWidget {
    name: 'NETWORK_REQUESTS_LIST';
    data: {
        requests: SDK.NetworkRequest.NetworkRequest[];
    };
}
export interface LighthouseReportAiWidget {
    name: 'LIGHTHOUSE_REPORT';
    data: {
        report: LHModel.ReporterTypes.ReportJSON;
        snapshotReport?: boolean;
    };
}
export interface TimelineEventSummaryAiWidget {
    name: 'TIMELINE_EVENT_SUMMARY';
    data: {
        event: Trace.Types.Events.Event;
        parsedTrace: Trace.TraceModel.ParsedTrace;
    };
}
export interface NetworkRequestGeneralHeadersAiWidget {
    name: 'NETWORK_REQUEST_GENERAL_HEADERS';
    data: {
        request: SDK.NetworkRequest.NetworkRequest;
    };
}
export interface SourceCodeAiWidget {
    name: 'SOURCE_CODE';
    data: {
        url: UrlString;
        code: string;
        line?: number;
        column?: number;
    };
}
export type AiWidget = ComputedStyleAiWidget | CoreVitalsAiWidget | StylePropertiesAiWidget | DomTreeAiWidget | PerformanceTraceAiWidget | PerfInsightAiWidget | TimelineRangeSummaryAiWidget | BottomUpTreeAiWidget | SourceFileAiWidget | LighthouseReportAiWidget | TimelineEventSummaryAiWidget | NetworkRequestGeneralHeadersAiWidget | SourceCodeAiWidget | SourceFilesListAiWidget | NetworkRequestsListAiWidget;
export type FunctionCallHandlerResult<Result> = {
    requiresApproval: true;
    /**
     * Provides extra description of what the required
     * approval is requesting.
     */
    description: string | null;
} | {
    result: Result;
    widgets?: AiWidget[];
} | {
    context: ConversationContext<unknown>;
    description: string;
    widgets?: AiWidget[];
} | {
    error: string;
};
export interface FunctionHandlerOptions {
    /**
     * Shows that the user approved
     * the execution if it was required
     */
    approved?: boolean;
    signal?: AbortSignal;
}
export interface FunctionDeclaration<Args extends Record<string, unknown>, ReturnType> {
    /**
     * Description of function, this is send to the LLM
     * to explain what will the function do.
     */
    description: string;
    /**
     * JSON schema like representation of the parameters
     * the function needs to be called with.
     * Provide description to all parameters as this is
     * send to the LLM.
     */
    parameters: Host.AidaClient.FunctionObjectParam<keyof Args>;
    /**
     * Provided a way to give information back to the UI.
     */
    displayInfoFromArgs?: (args: Args) => {
        title?: string;
        thought?: string;
        action?: string;
        suggestions?: [string, ...string[]];
    };
    /**
     * Function implementation that the LLM will try to execute,
     */
    handler(args: Args, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<ReturnType>>;
}
/**
 * AiAgent is a base class for implementing an interaction with AIDA
 * that involves one or more requests being sent to AIDA optionally
 * utilizing function calling.
 *
 * TODO: missing a test that action code is yielded before the
 * confirmation dialog.
 * TODO: missing a test for an error if it took
 * more than MAX_STEPS iterations.
 */
export declare abstract class AiAgent<T> {
    #private;
    /**
     * WARNING: preamble defined in code is only used when userTier is
     * TESTERS. Otherwise, a server-side preamble is used (see
     * chrome_preambles.gcl).
     */
    abstract readonly preamble: string | undefined;
    abstract readonly options: RequestOptions;
    abstract readonly clientFeature: Host.AidaClient.ClientFeature;
    abstract readonly userTier: string | undefined;
    abstract handleContextDetails(select: ConversationContext<T> | null): AsyncGenerator<ContextResponse, void, void>;
    readonly confirmSideEffect: typeof Promise.withResolvers;
    /**
     * `context` does not change during `AiAgent.run()`, ensuring that calls to JS
     * have the correct `context`. We don't want element selection by the user to
     * change the `context` during an `AiAgent.run()`.
     */
    protected context?: ConversationContext<T>;
    constructor(opts: AgentOptions);
    enhanceQuery(query: string, selected: ConversationContext<T> | null, multimodalInputType?: MultimodalInputType): Promise<string>;
    currentFacts(): ReadonlySet<Host.AidaClient.RequestFact>;
    get history(): Host.AidaClient.Content[];
    /**
     * Add a fact which will be sent for any subsequent requests.
     * Returns the new list of all facts.
     * Facts are never automatically removed.
     */
    addFact(fact: Host.AidaClient.RequestFact): ReadonlySet<Host.AidaClient.RequestFact>;
    removeFact(fact: Host.AidaClient.RequestFact): boolean;
    clearFacts(): void;
    /**
     * Clears any subclass-specific caches. This is called when a run encounters
     * an error (e.g., cross-origin navigation, abort, or execution error) to
     * prevent unvalidated cached data from being replayed in subsequent runs.
     */
    clearCache(): void;
    protected disableServerSideLogging(): void;
    popPendingMultimodalInput(): MultimodalInput | undefined;
    buildRequest(part: Host.AidaClient.Part | Host.AidaClient.Part[], role: Host.AidaClient.Role.USER | Host.AidaClient.Role.ROLE_UNSPECIFIED): Host.AidaClient.DoConversationRequest;
    get sessionId(): string;
    /**
     * The AI has instructions to emit structured suggestions in their response. This
     * function parses for that.
     *
     * Note: currently only StylingAgent and PerformanceAgent utilize this, but
     * eventually all agents should support this.
     */
    parseTextResponseForSuggestions(text: string): ParsedResponse;
    /**
     * Parses a streaming text response into a
     * though/action/title/answer/suggestions component.
     */
    parseTextResponse(response: string): ParsedResponse;
    protected finalizeAnswer(answer: AnswerResponse): Promise<AnswerResponse>;
    /**
     * Declare a function that the AI model can call.
     * @param name The name of the function
     * @param declaration the function declaration. Currently functions must:
     * 1. Return an object of serializable key/value pairs. You cannot return
     *    anything other than a plain JavaScript object that can be serialized.
     * 2. Take one parameter which is an object that can have
     *    multiple keys and values. For example, rather than a function being called
     *    with two args, `foo` and `bar`, you should instead have the function be
     *    called with one object with `foo` and `bar` keys.
     */
    protected declareFunction<Args extends Record<string, unknown>, ReturnType = unknown>(name: string, declaration: FunctionDeclaration<Args, ReturnType>): void;
    protected clearDeclaredFunctions(): void;
    /**
     * Executed immediately after the current context is populated with the selected
     * context and before the request is built.
     */
    protected preRun(): Promise<void>;
    run(initialQuery: string, options: {
        selected: ConversationContext<T> | null;
        signal?: AbortSignal;
    }, multimodalInput?: MultimodalInput): AsyncGenerator<ResponseData, void, void>;
}
export {};
