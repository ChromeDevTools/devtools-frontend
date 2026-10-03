// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import { debugLog, isStructuredLogEnabled } from '../debug.js';
import { dispatchAiAssistanceDoneEvent } from '../DOMHelpers.js';
const MAX_SUGGESTION_LENGTH = 200;
/**
 * Matches a follow-up suggestions directive emitted by the model at the end of a line.
 *
 * Supported formats:
 * - Standard uppercase and case variations: `SUGGESTIONS: ["a", "b"]`, `Suggestions: ["a", "b"]`
 * - Markdown emphasis (`*`, `**`, `***`, `_`, `__`, `___`, `` ` ``) around the keyword, colon, or entire line
 * - Optional bullet list (`-`, `*`, `+`), numbered list (`1.`), or heading (`###`) prefixes
 * - Inline placement at the end of an answer line: `Summary text. SUGGESTIONS: [...]`
 * - Nested square brackets inside suggestion strings: `SUGGESTIONS: ["check [disabled] attribute"]`
 * - Trailing streaming state where the line ends right after `SUGGESTIONS:` or mid-array `SUGGESTIONS: ["a`
 *
 * Unsupported formats:
 * - Multi-line JSON arrays or multi-line Markdown lists (suggestions must be a JSON array on the same line)
 * - Spaces before the colon (e.g. `SUGGESTIONS : [...]`)
 * - Non-array prose after the colon (e.g. `Suggestions: check the padding` is preserved as answer text)
 */
const SUGGESTIONS_REGEX = /^(?:(?:[-*+]|\d+\.|#{1,6})\s+|(.*\s))?(?:\*{1,3}|_{1,3}|`)?SUGGESTIONS(?:\*{1,3}|_{1,3}|`)?:(?:\*{1,3}|_{1,3}|`)?\s*`?(\[.*)?$/i;
/**
 * Matches a line that opens or closes a fenced code block: three or more backticks
 * (group 1), optionally followed by an info string such as a language name (group 2).
 * This covers the five-backtick fences that `AidaClient` emits for code chunks. A line
 * with an inline span such as ```` ```x``` text ```` does not match, because backticks
 * follow the opening run.
 */
const CODE_FENCE_REGEX = /^\s*(`{3,})([^`]*)$/;
export var ResponseType;
(function (ResponseType) {
    ResponseType["CONTEXT"] = "context";
    ResponseType["TITLE"] = "title";
    ResponseType["THOUGHT"] = "thought";
    ResponseType["ACTION"] = "action";
    ResponseType["SIDE_EFFECT"] = "side-effect";
    ResponseType["SUGGESTIONS"] = "suggestions";
    ResponseType["ANSWER"] = "answer";
    ResponseType["ERROR"] = "error";
    ResponseType["QUERYING"] = "querying";
    ResponseType["USER_QUERY"] = "user-query";
    ResponseType["CONTEXT_CHANGE"] = "context-change";
})(ResponseType || (ResponseType = {}));
export var ErrorType;
(function (ErrorType) {
    ErrorType["UNKNOWN"] = "unknown";
    ErrorType["ABORT"] = "abort";
    ErrorType["MAX_STEPS"] = "max-steps";
    ErrorType["BLOCK"] = "block";
    ErrorType["CROSS_ORIGIN"] = "cross-origin";
    ErrorType["QUOTA"] = "quota";
    ErrorType["PAYLOAD_TOO_LARGE"] = "payload-too-large";
})(ErrorType || (ErrorType = {}));
export var MultimodalInputType;
(function (MultimodalInputType) {
    MultimodalInputType["SCREENSHOT"] = "screenshot";
    MultimodalInputType["UPLOADED_IMAGE"] = "uploaded-image";
})(MultimodalInputType || (MultimodalInputType = {}));
export const MAX_STEPS = 10;
export class ConversationContext {
    /**
     * Returns true if the server-side logging is enabled when this context is active.
     * Currently only used for AI v2.
     */
    isLoggingEnabled() {
        return true;
    }
    /**
     * Checks whether this context can participate in a conversation locked to `establishedOrigin`.
     *
     * Evaluation rules:
     * 1. Returns `false` if this context origin is opaque. Opaque contexts can never
     *    participate in AI conversations.
     * 2. Returns `true` if `establishedOrigin` is `undefined` (conversation is not yet locked).
     * 3. Returns `true` if this context origin is same-origin with `establishedOrigin`.
     *
     * @param establishedOrigin The locked origin of the current conversation, or `undefined`
     * if the conversation has not made its first query.
     */
    isOriginAllowed(establishedOrigin) {
        const origin = this.getOrigin();
        if (origin.isOpaque()) {
            return false;
        }
        if (!establishedOrigin) {
            return true;
        }
        return origin.isSameOriginWith(establishedOrigin);
    }
    /**
     * This method is called at the start of `AiAgent.run`.
     * It will be overridden in subclasses to fetch data related to the context item.
     */
    async refresh() {
        return;
    }
    async getSuggestions() {
        return;
    }
    /**
     * Returns a detailed description of the context item for inclusion in the AI model prompt.
     * Currently only used by AiAgent2.
     */
    async getPromptDetails() {
        return null;
    }
    /**
     * Returns a list of context details to display to the user in the UI.
     * Currently only used by AiAgent2.
     */
    async getUserFacingDetails() {
        return null;
    }
    /**
     * Returns initial UI widgets to display in the conversation context header
     * when this context is active (e.g. Core Web Vitals summary for a performance trace).
     * Used by PerformanceAgent and AiAgent2.
     */
    async getWidgets() {
        return [];
    }
}
class CrossOriginError extends Error {
    constructor() {
        super('Cross-origin navigation detected');
        this.name = 'CrossOriginError';
    }
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
export class AiAgent {
    #sessionId;
    #aidaClient;
    /**
     * Tracks the dynamic runtime state of logging. Even if logging is allowed
     * by policy, tools or sensitive contexts can deactivate this to avoid logging sensitive data.
     */
    #serverSideLoggingActive;
    confirmSideEffect;
    #functionDeclarations = new Map();
    #allowedOrigin;
    #targetManager;
    /**
     * Used in the debug mode and evals.
     */
    #structuredLog = [];
    /**
     * `context` does not change during `AiAgent.run()`, ensuring that calls to JS
     * have the correct `context`. We don't want element selection by the user to
     * change the `context` during an `AiAgent.run()`.
     */
    context;
    #history;
    #facts = new Set();
    constructor(opts) {
        this.#aidaClient = opts.aidaClient;
        let serverSideLoggingAllowed = opts.serverSideLoggingAllowed ?? false;
        // Disable logging for now.
        // For context, see b/454563259#comment35.
        // We should be able to remove this ~end of April.
        if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
            serverSideLoggingAllowed = false;
        }
        this.#serverSideLoggingActive = serverSideLoggingAllowed;
        this.#sessionId = opts.sessionId ?? crypto.randomUUID();
        this.confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
        this.#history = opts.history ?? [];
        this.#allowedOrigin = opts.allowedOrigin;
        // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
        this.#targetManager = opts.targetManager ?? SDK.TargetManager.TargetManager.instance();
    }
    async enhanceQuery(query) {
        return query;
    }
    currentFacts() {
        return this.#facts;
    }
    get history() {
        return [...this.#history];
    }
    get targetManager() {
        return this.#targetManager;
    }
    /**
     * Add a fact which will be sent for any subsequent requests.
     * Returns the new list of all facts.
     * Facts are never automatically removed.
     */
    addFact(fact) {
        this.#facts.add(fact);
        return this.#facts;
    }
    removeFact(fact) {
        return this.#facts.delete(fact);
    }
    clearFacts() {
        this.#facts.clear();
    }
    /**
     * Clears any subclass-specific caches. This is called when a run encounters
     * an error (e.g., cross-origin navigation, abort, or execution error) to
     * prevent unvalidated cached data from being replayed in subsequent runs.
     */
    clearCache() {
    }
    /**
     * Disables server-side logging for the remainder of this agent instance's lifetime.
     *
     * Logging deactivation is irreversible for the session. Conversation history
     * accumulates across turns; re-enabling logging later would leak sensitive
     * data from prior turns to AIDA.
     */
    disableServerSideLogging() {
        this.#serverSideLoggingActive = false;
    }
    popPendingMultimodalInput() {
        return undefined;
    }
    /**
     * Preamble features appended to the `client_version` in metadata.
     * This is required ONLY for the Styling Agent for legacy reasons to serve
     * different server-side preambles based on the Chrome version.
     * Other agents should NOT set or override this.
     * If you are curious about this, look for `do_conversation_handler.cc` in
     * Google3 or chat to @jacktfranklin.
     */
    preambleFeatures() {
        return [];
    }
    buildRequest(part, role) {
        const parts = Array.isArray(part) ? part : [part];
        const currentMessage = {
            parts,
            role,
        };
        const history = [...this.#history];
        const declarations = [];
        for (const [name, definition] of this.#functionDeclarations.entries()) {
            declarations.push({
                name,
                description: typeof definition.description === 'function' ? definition.description() : definition.description,
                parameters: definition.parameters,
            });
        }
        function validTemperature(temperature) {
            return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
        }
        const enableAidaFunctionCalling = declarations.length;
        const userTier = Host.AidaClient.convertToUserTierEnum(this.userTier);
        const preamble = userTier === Host.AidaClient.UserTier.TESTERS ? this.preamble : undefined;
        const facts = Array.from(this.#facts);
        const request = {
            client: Host.AidaClient.CLIENT_NAME,
            current_message: currentMessage,
            preamble,
            historical_contexts: history.length ? history : undefined,
            facts: facts.length ? facts : undefined,
            ...(enableAidaFunctionCalling ? { function_declarations: declarations } : {}),
            options: {
                temperature: validTemperature(this.options.temperature),
                model_id: this.options.modelId || undefined,
            },
            metadata: {
                disable_user_content_logging: !(this.#serverSideLoggingActive ?? false),
                string_session_id: this.#sessionId,
                user_tier: userTier,
                client_version: Root.Runtime.getChromeVersion() + this.preambleFeatures().map(feature => `+${feature}`).join(''),
            },
            functionality_type: enableAidaFunctionCalling ? Host.AidaClient.FunctionalityType.AGENTIC_CHAT :
                Host.AidaClient.FunctionalityType.CHAT,
            client_feature: this.clientFeature,
        };
        return request;
    }
    get sessionId() {
        return this.#sessionId;
    }
    /**
     * The AI has instructions to emit structured suggestions in their response. This
     * function parses for that. Lines inside fenced code blocks are kept as answer text
     * and never parsed, so code that contains a `suggestions` key is left intact.
     *
     * Note: currently only StylingAgent and PerformanceAgent utilize this, but
     * eventually all agents should support this.
     */
    parseTextResponseForSuggestions(text) {
        if (!text) {
            return { answer: '' };
        }
        const lines = text.split('\n');
        const answerLines = [];
        let suggestions;
        // Length of the backtick run that opened the current code block, or 0 outside a block.
        let openFenceLength = 0;
        for (const [index, line] of lines.entries()) {
            const fence = line.match(CODE_FENCE_REGEX);
            if (fence && openFenceLength === 0) {
                openFenceLength = fence[1].length;
                answerLines.push(line);
                continue;
            }
            if (openFenceLength > 0) {
                // Per CommonMark, only a fence with no info string and at least as many
                // backticks as the opening fence closes the block.
                if (fence && fence[1].length >= openFenceLength && fence[2].trim() === '') {
                    openFenceLength = 0;
                }
                answerLines.push(line);
                continue;
            }
            const extracted = extractSuggestionsFromLine(line, index === lines.length - 1);
            if (extracted) {
                if (extracted.suggestions) {
                    suggestions = extracted.suggestions;
                }
                // Keep any preceding text on this line as part of the answer.
                if (extracted.remainingAnswerText) {
                    answerLines.push(extracted.remainingAnswerText);
                }
            }
            else {
                // Not a suggestions line. Keep as answer text.
                answerLines.push(line);
            }
        }
        const response = {
            // If we could not parse the parts, consider the response to be an
            // answer.
            answer: answerLines.join('\n'),
        };
        if (suggestions) {
            response.suggestions = suggestions;
        }
        return response;
    }
    /**
     * Parses a streaming text response into a
     * though/action/title/answer/suggestions component.
     */
    parseTextResponse(response) {
        return this.parseTextResponseForSuggestions(response.trim());
    }
    async finalizeAnswer(answer) {
        return answer;
    }
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
    declareFunction(name, declaration) {
        if (this.#functionDeclarations.has(name)) {
            throw new Error(`Duplicate function declaration ${name}`);
        }
        this.#functionDeclarations.set(name, declaration);
    }
    clearDeclaredFunctions() {
        this.#functionDeclarations.clear();
    }
    /**
     * Executed immediately after the current context is populated with the selected
     * context and before the request is built.
     */
    async preRun() {
    }
    async *run(initialQuery, options, multimodalInput) {
        await options.selected?.refresh();
        // Reset context on each run so cleared selections (`null`) do not leave
        // stale context references on long-lived agent instances (e.g. `AiAgent2`).
        this.context = options.selected ?? undefined;
        await this.preRun();
        const enhancedQuery = await this.enhanceQuery(initialQuery, options.selected, multimodalInput?.type);
        if (!enhancedQuery.trim() && !multimodalInput) {
            return;
        }
        Host.userMetrics.freestylerQueryLength(enhancedQuery.length);
        let query;
        query = multimodalInput ? [{ text: enhancedQuery }, multimodalInput.input] : [{ text: enhancedQuery }];
        // Request is built here to capture history up to this point.
        let request = this.buildRequest(query, Host.AidaClient.Role.USER);
        const clientFeatureName = Host.AidaClient.getClientFeatureName(this.clientFeature);
        debugLog(`[AiAgent] Starting conversation with client ${clientFeatureName}, userTier ${this.userTier}`);
        yield* this.handleContextDetails(options.selected);
        for (let i = 0; i < MAX_STEPS; i++) {
            yield {
                type: "querying" /* ResponseType.QUERYING */,
            };
            if (i === 0) {
                debugLog('[AiAgent] Step 1: Sending user prompt to model:', enhancedQuery);
            }
            else if (!Array.isArray(query) && 'functionResponse' in query) {
                debugLog(`[AiAgent] Step ${i + 1}: Sending function response for '${query.functionResponse.name}' to model:`, query.functionResponse.response);
            }
            else {
                debugLog(`[AiAgent] Step ${i + 1}: Sending request to model:`, request.current_message);
            }
            let rpcId;
            let textResponse = '';
            let functionCall = undefined;
            try {
                for await (const fetchResult of this.#aidaFetch(request, { signal: options.signal })) {
                    rpcId = fetchResult.rpcId;
                    textResponse = fetchResult.text ?? '';
                    functionCall = fetchResult.functionCall;
                    if (!functionCall && !fetchResult.completed) {
                        const parsed = this.parseTextResponse(textResponse);
                        const partialAnswer = 'answer' in parsed ? parsed.answer : '';
                        if (!partialAnswer) {
                            continue;
                        }
                        // Only yield partial responses here and do not add partial answers to the history.
                        yield {
                            type: "answer" /* ResponseType.ANSWER */,
                            text: partialAnswer,
                            complete: false,
                        };
                    }
                }
            }
            catch (err) {
                debugLog('Error calling the AIDA API', err);
                const error = aidaErrorToErrorType(err);
                yield this.#createErrorResponse(error);
                break;
            }
            this.#history.push(request.current_message);
            if (textResponse) {
                const parsedResponse = this.parseTextResponse(textResponse);
                if (!('answer' in parsedResponse)) {
                    throw new Error('Expected a completed response to have an answer');
                }
                if (!functionCall) {
                    debugLog(`[AiAgent] Step ${i + 1}: Model returned text response:`, parsedResponse.answer);
                    this.#history.push({
                        parts: [{
                                text: parsedResponse.answer,
                            }],
                        role: Host.AidaClient.Role.MODEL,
                    });
                }
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceAnswerReceived);
                yield await this.finalizeAnswer({
                    type: "answer" /* ResponseType.ANSWER */,
                    text: parsedResponse.answer,
                    suggestions: parsedResponse.suggestions,
                    complete: true,
                    rpcId,
                });
                if (!functionCall) {
                    break;
                }
            }
            if (functionCall) {
                debugLog(`[AiAgent] Step ${i + 1}: Model requested function call: ${functionCall.name}`, functionCall.args);
                const allowedOriginResult = this.#allowedOrigin?.();
                if (allowedOriginResult && 'blocked' in allowedOriginResult) {
                    // Abort immediately if the page navigated before we could lock the origin.
                    // This prevents the AI from accessing data from the new page.
                    yield this.#createErrorResponse("cross-origin" /* ErrorType.CROSS_ORIGIN */);
                    break;
                }
                try {
                    const result = yield* this.#callFunction(functionCall.name, functionCall.args, functionCall.thoughtSignature, {
                        ...options,
                        explanation: textResponse,
                    });
                    if (options.signal?.aborted) {
                        yield this.#createErrorResponse("abort" /* ErrorType.ABORT */);
                        break;
                    }
                    if ('context' in result) {
                        yield {
                            type: "context-change" /* ResponseType.CONTEXT_CHANGE */,
                            description: result.description,
                            context: result.context,
                            widgets: result.widgets,
                        };
                        return;
                    }
                    query = {
                        functionResponse: {
                            name: functionCall.name,
                            // Widgets are not sent back to the LLM
                            response: { ...result, widgets: undefined },
                        },
                    };
                    request = this.buildRequest(query, Host.AidaClient.Role.ROLE_UNSPECIFIED);
                }
                catch (err) {
                    if (err instanceof CrossOriginError) {
                        yield this.#createErrorResponse("cross-origin" /* ErrorType.CROSS_ORIGIN */);
                        break;
                    }
                    debugLog('Error handling function call', err);
                    yield this.#createErrorResponse("unknown" /* ErrorType.UNKNOWN */);
                    break;
                }
            }
            else {
                yield this.#createErrorResponse(i - 1 === MAX_STEPS ? "max-steps" /* ErrorType.MAX_STEPS */ : "unknown" /* ErrorType.UNKNOWN */);
                break;
            }
        }
        if (isStructuredLogEnabled()) {
            dispatchAiAssistanceDoneEvent();
        }
        return;
    }
    async *#callFunction(name, args, thoughtSignature, options) {
        const call = this.#functionDeclarations.get(name);
        if (!call) {
            throw new Error(`Function ${name} is not found.`);
        }
        debugLog(`[AiAgent] Executing tool '${name}' with args:`, args);
        const parts = [];
        if (options?.explanation) {
            parts.push({
                text: options.explanation,
            });
        }
        const functionCall = {
            name,
            args,
        };
        if (thoughtSignature) {
            functionCall.thoughtSignature = thoughtSignature;
        }
        parts.push({ functionCall });
        this.#history.push({
            parts,
            role: Host.AidaClient.Role.MODEL,
        });
        let code;
        if (call.displayInfoFromArgs) {
            const { title, thought, action: callCode } = call.displayInfoFromArgs(args);
            code = callCode;
            if (title) {
                yield {
                    type: "title" /* ResponseType.TITLE */,
                    title,
                };
            }
            if (thought) {
                yield {
                    type: "thought" /* ResponseType.THOUGHT */,
                    thought,
                };
            }
        }
        const isOriginBlocked = () => {
            const allowedOriginResult = this.#allowedOrigin?.();
            return Boolean(allowedOriginResult && 'blocked' in allowedOriginResult);
        };
        let result = await call.handler(args, options);
        // Check 1: After first handler execution.
        // Navigation could have occurred during the async handler execution.
        if (isOriginBlocked()) {
            throw new CrossOriginError();
        }
        if ('requiresApproval' in result) {
            if (code) {
                yield {
                    type: "action" /* ResponseType.ACTION */,
                    code,
                    canceled: false,
                };
            }
            const sideEffectConfirmationPromiseWithResolvers = this.confirmSideEffect();
            void sideEffectConfirmationPromiseWithResolvers.promise.then(result => {
                Host.userMetrics.actionTaken(result ? Host.UserMetrics.Action.AiAssistanceSideEffectConfirmed :
                    Host.UserMetrics.Action.AiAssistanceSideEffectRejected);
            });
            if (options?.signal?.aborted) {
                sideEffectConfirmationPromiseWithResolvers.resolve(false);
            }
            const onAbort = () => {
                sideEffectConfirmationPromiseWithResolvers.resolve(false);
            };
            options?.signal?.addEventListener('abort', onAbort, { once: true });
            yield {
                type: "side-effect" /* ResponseType.SIDE_EFFECT */,
                confirm: sideEffectConfirmationPromiseWithResolvers.resolve,
                description: result.description,
            };
            let approvedRun = false;
            try {
                approvedRun = await sideEffectConfirmationPromiseWithResolvers.promise;
            }
            finally {
                options?.signal?.removeEventListener('abort', onAbort);
            }
            if (!approvedRun) {
                yield {
                    type: "action" /* ResponseType.ACTION */,
                    code,
                    output: 'Error: User denied code execution with side effects.',
                    canceled: true,
                };
                debugLog(`[AiAgent] Tool '${name}' denied by user.`);
                return {
                    result: 'Error: User denied code execution with side effects.',
                };
            }
            // Re-check allowed origin after the approval await to prevent a TOCTOU (Time-of-Check
            // to Time-of-Use) race condition where the page might have navigated cross-origin
            // while the user was confirming the action.
            // Check 2: After waiting for user approval.
            if (isOriginBlocked()) {
                throw new CrossOriginError();
            }
            result = await call.handler(args, {
                ...options,
                approved: true,
            });
            // Check 3: After second handler execution (approved run).
            // Navigation could have occurred during the async execution of the approved action.
            if (isOriginBlocked()) {
                throw new CrossOriginError();
            }
        }
        if ('result' in result) {
            yield {
                type: "action" /* ResponseType.ACTION */,
                code,
                output: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
                widgets: result.widgets,
                canceled: false,
                toolName: name,
            };
        }
        if ('error' in result) {
            yield {
                type: "action" /* ResponseType.ACTION */,
                code,
                output: result.error,
                canceled: false,
                toolName: name,
            };
        }
        debugLog(`[AiAgent] Tool '${name}' result:`, result);
        if ('context' in result) {
            return result;
        }
        return result;
    }
    async *#aidaFetch(request, options) {
        let aidaResponse = undefined;
        let rpcId;
        for await (aidaResponse of this.#aidaClient.doConversation(request, options)) {
            if (aidaResponse.functionCalls?.length) {
                if (aidaResponse.functionCalls.length > 1) {
                    debugLog(`[AiAgent] Unexpected: received ${aidaResponse.functionCalls.length} function calls in response:`, aidaResponse.functionCalls);
                }
                yield {
                    rpcId,
                    functionCall: aidaResponse.functionCalls[0],
                    completed: true,
                    text: aidaResponse.explanation,
                };
                break;
            }
            rpcId = aidaResponse.metadata.rpcGlobalId ?? rpcId;
            yield {
                rpcId,
                text: aidaResponse.explanation,
                completed: aidaResponse.completed,
            };
        }
        if (isStructuredLogEnabled() && aidaResponse) {
            this.#structuredLog.push({
                request: structuredClone(request),
                aidaResponse,
            });
            try {
                localStorage.setItem('aiAssistanceStructuredLog', JSON.stringify(this.#structuredLog));
            }
            catch (err) {
                console.warn('Failed to write to local storage "aiAssistanceStructuredLog":', err);
            }
        }
    }
    #removeLastRunParts() {
        this.#history.splice(this.#history.findLastIndex(item => {
            return item.role === Host.AidaClient.Role.USER;
        }));
    }
    #createErrorResponse(error) {
        this.#removeLastRunParts();
        this.clearCache();
        if (error !== "abort" /* ErrorType.ABORT */) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        }
        return {
            type: "error" /* ResponseType.ERROR */,
            error,
        };
    }
}
function sanitizeSuggestions(suggestions) {
    const parsed = JSON.parse(suggestions);
    if (!Array.isArray(parsed)) {
        return undefined;
    }
    const sanitized = [];
    for (const item of parsed) {
        if (typeof item !== 'string') {
            continue;
        }
        // Collapse multiple whitespace/newlines into a single space.
        const noExtraWhitespace = item.replace(/\s+/g, ' ').trim();
        if (noExtraWhitespace.length === 0) {
            continue;
        }
        sanitized.push(noExtraWhitespace.substring(0, MAX_SUGGESTION_LENGTH));
    }
    if (sanitized.length === 0) {
        return undefined;
    }
    return sanitized;
}
/**
 * Attempts to extract suggestions from a single line of model output:
 * 1. Match the suggestions directive at the end of the line. If absent (including
 *    when `Suggestions:` is followed by non-array prose), returns null so the
 *    caller keeps the entire line as answer text.
 * 2. If anything other than markdown closers (`*`, `_`, `` ` ``) or whitespace
 *    follows the last `]`, returns null. This keeps lines such as
 *    `suggestions: ["a"],` or `suggestions: [docs](url)` as answer text.
 * 3. Attempt to parse the bracketed JSON array. If the array is incomplete or
 *    invalid and this is not the last line, returns null: only the last line can
 *    be a partially streamed directive, so earlier lines are ordinary text.
 * 4. Otherwise, preserve any text preceding the directive as `remainingAnswerText`
 *    and strip the directive, so incomplete suggestion syntax on the last line
 *    never flashes in the chat UI while streaming.
 */
function extractSuggestionsFromLine(line, isLastLine) {
    const match = line.match(SUGGESTIONS_REGEX);
    if (!match) {
        return null;
    }
    let parsed;
    let isCompleteArray = false;
    const rawArray = match[2];
    const lastBracketIndex = rawArray?.lastIndexOf(']') ?? -1;
    if (rawArray && lastBracketIndex !== -1) {
        if (!/^[*_`\s]*$/.test(rawArray.slice(lastBracketIndex + 1))) {
            return null;
        }
        try {
            parsed = sanitizeSuggestions(rawArray.slice(0, lastBracketIndex + 1));
            isCompleteArray = true;
        }
        catch {
            // Leave `isCompleteArray` false: the array is still streaming or malformed.
        }
    }
    if (!isCompleteArray && !isLastLine) {
        return null;
    }
    const textBefore = (match[1] ?? '').trimEnd();
    const remainingAnswerText = textBefore.length > 0 ? textBefore : undefined;
    return {
        suggestions: parsed,
        remainingAnswerText,
    };
}
/**
 * Maps AIDA-specific client error instances to user-facing ErrorType enums.
 * This handles AIDA API failure modes such as quota exhaustion or blockages.
 * Other application-level errors (like CROSS_ORIGIN or MAX_STEPS) are handled separately.
 */
export function aidaErrorToErrorType(err) {
    if (err instanceof Host.AidaClient.AidaAbortError) {
        return "abort" /* ErrorType.ABORT */;
    }
    if (err instanceof Host.AidaClient.AidaBlockError) {
        return "block" /* ErrorType.BLOCK */;
    }
    if (err instanceof Host.AidaClient.AidaQuotaError) {
        return "quota" /* ErrorType.QUOTA */;
    }
    if (err instanceof Host.AidaClient.AidaPayloadTooLargeError) {
        return "payload-too-large" /* ErrorType.PAYLOAD_TOO_LARGE */;
    }
    return "unknown" /* ErrorType.UNKNOWN */;
}
//# sourceMappingURL=AiAgent.js.map