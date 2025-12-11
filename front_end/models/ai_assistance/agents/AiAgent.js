// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import { debugLog, isStructuredLogEnabled } from '../debug.js';
export const MAX_STEPS = 10;
export class ConversationContext {
    isOriginAllowed(agentOrigin) {
        if (!agentOrigin) {
            return true;
        }
        // Currently does not handle opaque origins because they
        // are not available to DevTools, instead checks
        // that serialization of the origin is the same
        // https://html.spec.whatwg.org/#ascii-serialisation-of-an-origin.
        return this.getOrigin() === agentOrigin;
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
    #history = [];
    #facts = new Set();
    constructor(opts) {
        this.#aidaClient = opts.aidaClient;
        this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
        this.#sessionId = opts.sessionId ?? crypto.randomUUID();
        this.confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
    }
    async enhanceQuery(query) {
        return query;
    }
    currentFacts() {
        return this.#facts;
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
                description: definition.description,
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
                disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
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
                    // TODO: Do basic validation this is an array with strings
                    suggestions = JSON.parse(trimmed.substring('SUGGESTIONS:'.length).trim());
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
                // TODO: Do basic validation this is an array with strings
                suggestions = JSON.parse(suggestionsText.trim().substring('SUGGESTIONS:'.length).trim());
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
    async *run(initialQuery, options, multimodalInput) {
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
        yield {
            type: "user-query" /* ResponseType.USER_QUERY */,
            query: initialQuery,
            imageInput: multimodalInput?.input,
            imageId: multimodalInput?.id,
        };
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
                yield {
                    type: "answer" /* ResponseType.ANSWER */,
                    text: parsedResponse.answer,
                    suggestions: parsedResponse.suggestions,
                    complete: true,
                    rpcId,
                };
                if (!functionCall) {
                    break;
                }
            }
            if (functionCall) {
                try {
                    const result = yield* this.#callFunction(functionCall.name, functionCall.args, {
                        ...options,
                        explanation: textResponse,
                    });
                    if (options.signal?.aborted) {
                        yield this.#createErrorResponse("abort" /* ErrorType.ABORT */);
                        break;
                    }
                    query = {
                        functionResponse: {
                            name: functionCall.name,
                            response: result,
                        },
                    };
                    request = this.buildRequest(query, Host.AidaClient.Role.ROLE_UNSPECIFIED);
                }
                catch {
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
    }
    async *#callFunction(name, args, options) {
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
        parts.push({
            functionCall: {
                name,
                args,
            },
        });
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
        let result = await call.handler(args, options);
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
            result = await call.handler(args, {
                ...options,
                approved: true,
            });
        }
        if ('result' in result) {
            yield {
                type: "action" /* ResponseType.ACTION */,
                code,
                output: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
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
        if (error !== "abort" /* ErrorType.ABORT */) {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
        }
        return {
            type: "error" /* ResponseType.ERROR */,
            error,
        };
    }
}
//# sourceMappingURL=AiAgent.js.map