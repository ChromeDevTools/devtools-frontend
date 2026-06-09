// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import { areOriginsEquivalent, extractContextOrigin, isOpaqueOrigin } from '../AiOrigins.js';
import { debugLog, isStructuredLogEnabled } from '../debug.js';
const MAX_SUGGESTION_LENGTH = 200;
export const MAX_STEPS = 10;
export class ConversationContext {
    getOrigin() {
        return extractContextOrigin(this.getURL());
    }
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
    isOriginAllowed(establishedOrigin) {
        const origin = this.getOrigin();
        // If no origin is established yet, this context will be the one to lock the conversation.
        // Opaque origins are never allowed to be used as context.
        if (!establishedOrigin) {
            return !isOpaqueOrigin(origin);
        }
        // Only allow data that matches the origin the conversation is already locked to.
        return areOriginsEquivalent(origin, establishedOrigin);
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
    #serverSideLoggingEnabled;
    confirmSideEffect;
    #functionDeclarations = new Map();
    #allowedOrigin;
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
        this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
        // Disable logging for now.
        // For context, see b/454563259#comment35.
        // We should be able to remove this ~end of April.
        if (Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled) {
            this.#serverSideLoggingEnabled = false;
        }
        this.#sessionId = opts.sessionId ?? crypto.randomUUID();
        this.confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
        this.#history = opts.history ?? [];
        this.#allowedOrigin = opts.allowedOrigin;
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
    popPendingMultimodalInput() {
        return undefined;
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
                description: definition.description,
                parameters: definition.parameters,
            });
        }
        function validTemperature(temperature) {
            return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
        }
        const enableAidaFunctionCalling = declarations.length;
        const userTier = Host.AidaClient.convertToUserTierEnum(this.userTier);
        const clientFeatureName = Host.AidaClient.getClientFeatureName(this.clientFeature);
        debugLog(`Client ${clientFeatureName} running with userTier ${this.userTier}`);
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
                disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
                string_session_id: this.#sessionId,
                user_tier: userTier,
                client_version: Root.Runtime.getChromeVersion(),
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
     * function parses for that.
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
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('SUGGESTIONS:')) {
                try {
                    suggestions = sanitizeSuggestions(trimmed.substring('SUGGESTIONS:'.length).trim());
                }
                catch {
                }
            }
            else {
                answerLines.push(line);
            }
        }
        // Sometimes the model fails to put the SUGGESTIONS text on its own line. Handle
        // the case where the suggestions are part of the last line of the answer.
        if (!suggestions && answerLines.at(-1)?.includes('SUGGESTIONS:')) {
            const [answer, suggestionsText] = answerLines[answerLines.length - 1].split('SUGGESTIONS:', 2);
            try {
                suggestions = sanitizeSuggestions(suggestionsText.trim());
            }
            catch {
            }
            answerLines[answerLines.length - 1] = answer;
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
    async preRun() {
    }
    async *run(initialQuery, options, multimodalInput) {
        await this.preRun();
        await options.selected?.refresh();
        if (options.selected) {
            this.context = options.selected;
        }
        const enhancedQuery = await this.enhanceQuery(initialQuery, options.selected, multimodalInput?.type);
        Host.userMetrics.freestylerQueryLength(enhancedQuery.length);
        let query;
        query = multimodalInput ? [{ text: enhancedQuery }, multimodalInput.input] : [{ text: enhancedQuery }];
        // Request is built here to capture history up to this point.
        let request = this.buildRequest(query, Host.AidaClient.Role.USER);
        yield* this.handleContextDetails(options.selected);
        for (let i = 0; i < MAX_STEPS; i++) {
            yield {
                type: "querying" /* ResponseType.QUERYING */,
            };
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
                let error = "unknown" /* ErrorType.UNKNOWN */;
                if (err instanceof Host.AidaClient.AidaAbortError) {
                    error = "abort" /* ErrorType.ABORT */;
                }
                else if (err instanceof Host.AidaClient.AidaBlockError) {
                    error = "block" /* ErrorType.BLOCK */;
                }
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
            window.dispatchEvent(new CustomEvent('aiassistancedone'));
        }
        return;
    }
    async *#callFunction(name, args, thoughtSignature, options) {
        const call = this.#functionDeclarations.get(name);
        if (!call) {
            throw new Error(`Function ${name} is not found.`);
        }
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
            options?.signal?.addEventListener('abort', () => {
                sideEffectConfirmationPromiseWithResolvers.resolve(false);
            }, { once: true });
            yield {
                type: "side-effect" /* ResponseType.SIDE_EFFECT */,
                confirm: sideEffectConfirmationPromiseWithResolvers.resolve,
                description: result.description,
            };
            const approvedRun = await sideEffectConfirmationPromiseWithResolvers.promise;
            if (!approvedRun) {
                yield {
                    type: "action" /* ResponseType.ACTION */,
                    code,
                    output: 'Error: User denied code execution with side effects.',
                    canceled: true,
                };
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
            };
        }
        if ('error' in result) {
            yield {
                type: "action" /* ResponseType.ACTION */,
                code,
                output: result.error,
                canceled: false,
            };
        }
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
                debugLog('functionCalls.length', aidaResponse.functionCalls.length);
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
        debugLog({
            request,
            response: aidaResponse,
        });
        if (isStructuredLogEnabled() && aidaResponse) {
            this.#structuredLog.push({
                request: structuredClone(request),
                aidaResponse,
            });
            localStorage.setItem('aiAssistanceStructuredLog', JSON.stringify(this.#structuredLog));
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
//# sourceMappingURL=AiAgent.js.map