import * as Host from '../../../core/host/host.js';
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
    USER_QUERY = "user-query"
}
export declare const enum ErrorType {
    UNKNOWN = "unknown",
    ABORT = "abort",
    MAX_STEPS = "max-steps",
    BLOCK = "block"
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
    title: string;
    details: [ContextDetail, ...ContextDetail[]];
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
    code?: string;
    confirm: (confirm: boolean) => void;
}
interface SerializedSideEffectResponse extends Omit<SideEffectResponse, 'confirm'> {
}
export interface ActionResponse {
    type: ResponseType.ACTION;
    code?: string;
    output?: string;
    canceled: boolean;
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
export type ResponseData = AnswerResponse | SuggestionsResponse | ErrorResponse | ActionResponse | SideEffectResponse | ThoughtResponse | TitleResponse | QueryingResponse | ContextResponse | UserQuery;
export type SerializedResponseData = AnswerResponse | SuggestionsResponse | ErrorResponse | ActionResponse | SerializedSideEffectResponse | ThoughtResponse | TitleResponse | QueryingResponse | ContextResponse | UserQuery;
export type FunctionCallResponseData = TitleResponse | ThoughtResponse | ActionResponse | SideEffectResponse | SuggestionsResponse;
export interface BuildRequestOptions {
    text: string;
}
export interface RequestOptions {
    temperature?: number;
    modelId?: string;
}
export interface AgentOptions {
    aidaClient: Host.AidaClient.AidaClient;
    serverSideLoggingEnabled?: boolean;
    confirmSideEffectForTest?: typeof Promise.withResolvers;
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
export declare const enum ExternalRequestResponseType {
    ANSWER = "answer",
    NOTIFICATION = "notification",
    ERROR = "error"
}
export interface ExternalRequestAnswer {
    type: ExternalRequestResponseType.ANSWER;
    message: string;
    devToolsLogs: object[];
}
export interface ExternalRequestNotification {
    type: ExternalRequestResponseType.NOTIFICATION;
    message: string;
}
export interface ExternalRequestError {
    type: ExternalRequestResponseType.ERROR;
    message: string;
}
export type ExternalRequestResponse = ExternalRequestAnswer | ExternalRequestNotification | ExternalRequestError;
export declare abstract class ConversationContext<T> {
    abstract getOrigin(): string;
    abstract getItem(): T;
    abstract getTitle(): string;
    isOriginAllowed(agentOrigin: string | undefined): boolean;
    /**
     * This method is called at the start of `AiAgent.run`.
     * It will be overridden in subclasses to fetch data related to the context item.
     */
    refresh(): Promise<void>;
    getSuggestions(): Promise<ConversationSuggestions | undefined>;
}
export type FunctionCallHandlerResult<Result> = {
    result: Result;
} | {
    requiresApproval: true;
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
    handler: (args: Args, options?: FunctionHandlerOptions) => Promise<FunctionCallHandlerResult<ReturnType>>;
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
    /**
     * Add a fact which will be sent for any subsequent requests.
     * Returns the new list of all facts.
     * Facts are never automatically removed.
     */
    addFact(fact: Host.AidaClient.RequestFact): ReadonlySet<Host.AidaClient.RequestFact>;
    removeFact(fact: Host.AidaClient.RequestFact): boolean;
    clearFacts(): void;
    preambleFeatures(): string[];
    buildRequest(part: Host.AidaClient.Part | Host.AidaClient.Part[], role: Host.AidaClient.Role.USER | Host.AidaClient.Role.ROLE_UNSPECIFIED): Host.AidaClient.DoConversationRequest;
    get id(): string;
    get origin(): string | undefined;
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
    run(initialQuery: string, options: {
        selected: ConversationContext<T> | null;
        signal?: AbortSignal;
    }, multimodalInput?: MultimodalInput): AsyncGenerator<ResponseData, void, void>;
}
export {};
