// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import type * as Lit from '../../../ui/lit/lit.js';
import {debugLog, isDebugMode} from '../debug.js';

export const enum ResponseType {
  CONTEXT = 'context',
  TITLE = 'title',
  THOUGHT = 'thought',
  ACTION = 'action',
  SIDE_EFFECT = 'side-effect',
  SUGGESTIONS = 'suggestions',
  ANSWER = 'answer',
  ERROR = 'error',
  QUERYING = 'querying',
  USER_QUERY = 'user-query',
}

export const enum ErrorType {
  UNKNOWN = 'unknown',
  ABORT = 'abort',
  MAX_STEPS = 'max-steps',
  BLOCK = 'block',
}

export interface AnswerResponse {
  type: ResponseType.ANSWER;
  text: string;
  // Whether this is the complete answer or only a part of it (for streaming reasons)
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

export interface ActionResponse {
  type: ResponseType.ACTION;
  code?: string;
  output?: string;
  canceled: boolean;
}

export interface QueryResponse {
  type: ResponseType.QUERYING;
  query?: string;
  imageInput?: Host.AidaClient.Part;
  imageId?: string;
}

export interface UserQuery {
  type: ResponseType.USER_QUERY;
  query: string;
  imageInput?: Host.AidaClient.Part;
  imageId?: string;
}

export type ResponseData = AnswerResponse|SuggestionsResponse|ErrorResponse|ActionResponse|SideEffectResponse|
    ThoughtResponse|TitleResponse|QueryResponse|ContextResponse|UserQuery;

export type FunctionCallResponseData =
    TitleResponse|ThoughtResponse|ActionResponse|SideEffectResponse|SuggestionsResponse;

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

export interface ParsedStep {
  thought?: string;
  title?: string;
  action?: string;
}

export type ParsedResponse = ParsedAnswer|ParsedStep;

export const enum AgentType {
  STYLING = 'freestyler',
  FILE = 'drjones-file',
  NETWORK = 'drjones-network-request',
  PERFORMANCE = 'drjones-performance',
  PERFORMANCE_INSIGHT = 'performance-insight',
  PATCH = 'patch',
}

export const MAX_STEPS = 10;

export abstract class ConversationContext<T> {
  abstract getOrigin(): string;
  abstract getItem(): T;
  abstract getIcon(): HTMLElement;
  abstract getTitle(): string|ReturnType<typeof Lit.Directives.until>;

  isOriginAllowed(agentOrigin: string|undefined): boolean {
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
  async refresh(): Promise<void> {
    return;
  }
}

export type FunctionCallHandlerResult<Result> = {
  result: Result,
}|{
  requiresApproval: true,
}|{error: string};

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
  displayInfoFromArgs?: (
      args: Args,
      ) => {
    title?: string, thought?: string, action?: string, suggestions?: [string, ...string[]],
  };
  /**
   * Function implementation that the LLM will try to execute,
   */
  handler: (args: Args, options?: {
    /**
     * Shows that the user approved
     * the execution if it was required
     */
    approved?: boolean,
    signal?: AbortSignal,
  }) => Promise<FunctionCallHandlerResult<ReturnType>>;
}

const OBSERVATION_PREFIX = 'OBSERVATION: ';

interface AidaFetchResult {
  text?: string;
  functionCall?: Host.AidaClient.AidaFunctionCallResponse;
  completed: boolean;
  rpcId?: Host.AidaClient.RpcGlobalId;
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
export abstract class AiAgent<T> {
  /** Subclasses need to define these. */
  abstract readonly type: AgentType;
  abstract readonly preamble: string|undefined;
  abstract readonly options: RequestOptions;
  abstract readonly clientFeature: Host.AidaClient.ClientFeature;
  abstract readonly userTier: string|undefined;
  abstract handleContextDetails(select: ConversationContext<T>|null): AsyncGenerator<ContextResponse, void, void>;

  readonly #sessionId: string = crypto.randomUUID();
  readonly #aidaClient: Host.AidaClient.AidaClient;
  readonly #serverSideLoggingEnabled: boolean;
  readonly confirmSideEffect: typeof Promise.withResolvers;
  readonly #functionDeclarations = new Map<string, FunctionDeclaration<Record<string, unknown>, unknown>>();

  /**
   * Used in the debug mode and evals.
   */
  readonly #structuredLog: Array<{
    request: Host.AidaClient.AidaRequest,
    response: string,
    aidaResponse?: Host.AidaClient.AidaResponse,
  }> = [];

  /**
   * Might need to be part of history in case we allow chatting in
   * historical conversations.
   */
  #origin?: string;
  #context?: ConversationContext<T>;
  #id: string = crypto.randomUUID();
  #history: Host.AidaClient.Content[] = [];

  constructor(opts: AgentOptions) {
    this.#aidaClient = opts.aidaClient;
    this.#serverSideLoggingEnabled = opts.serverSideLoggingEnabled ?? false;
    this.confirmSideEffect = opts.confirmSideEffectForTest ?? (() => Promise.withResolvers());
  }

  async enhanceQuery(query: string, selected: ConversationContext<T>|null, hasImageInput?: boolean): Promise<string>;
  async enhanceQuery(query: string): Promise<string> {
    return query;
  }

  buildRequest(
      part: Host.AidaClient.Part|Host.AidaClient.Part[],
      role: Host.AidaClient.Role.USER|Host.AidaClient.Role.ROLE_UNSPECIFIED): Host.AidaClient.AidaRequest {
    const parts = Array.isArray(part) ? part : [part];
    const currentMessage: Host.AidaClient.Content = {
      parts,
      role,
    };
    const history = [...this.#history];
    const declarations: Host.AidaClient.FunctionDeclaration[] = [];
    for (const [name, definition] of this.#functionDeclarations.entries()) {
      declarations.push({
        name,
        description: definition.description,
        parameters: definition.parameters,
      });
    }
    function validTemperature(temperature: number|undefined): number|undefined {
      return typeof temperature === 'number' && temperature >= 0 ? temperature : undefined;
    }
    const enableAidaFunctionCalling = declarations.length && !this.functionCallEmulationEnabled;
    const request: Host.AidaClient.AidaRequest = {
      client: Host.AidaClient.CLIENT_NAME,

      current_message: currentMessage,
      preamble: this.preamble,

      historical_contexts: history.length ? history : undefined,

      ...(enableAidaFunctionCalling ? {function_declarations: declarations} : {}),
      options: {
        temperature: validTemperature(this.options.temperature),
        model_id: this.options.modelId,
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: Host.AidaClient.convertToUserTierEnum(this.userTier),
        client_version: Root.Runtime.getChromeVersion(),
      },

      functionality_type: enableAidaFunctionCalling ? Host.AidaClient.FunctionalityType.AGENTIC_CHAT :
                                                      Host.AidaClient.FunctionalityType.CHAT,

      client_feature: this.clientFeature,
    };
    return request;
  }

  get id(): string {
    return this.#id;
  }

  get isEmpty(): boolean {
    return this.#history.length === 0;
  }

  get origin(): string|undefined {
    return this.#origin;
  }

  /**
   * Parses a streaming text response into a
   * though/action/title/answer/suggestions component. This is only used
   * by StylingAgent.
   */
  parseTextResponse(response: string): ParsedResponse {
    return {answer: response};
  }

  /**
   * Declare a function that the AI model can call.
   * @param name - The name of the function
   * @param declaration - the function declaration. Currently functions must:
   * 1. Return an object of serializable key/value pairs. You cannot return
   *    anything other than a plain JavaScript object that can be serialized.
   * 2. Take one parameter which is an object that can have
   *    multiple keys and values. For example, rather than a function being called
   *    with two args, `foo` and `bar`, you should instead have the function be
   *    called with one object with `foo` and `bar` keys.
   */
  protected declareFunction<Args extends Record<string, unknown>, ReturnType = unknown>(
      name: string, declaration: FunctionDeclaration<Args, ReturnType>): void {
    if (this.#functionDeclarations.has(name)) {
      throw new Error(`Duplicate function declaration ${name}`);
    }
    this.#functionDeclarations.set(name, declaration as FunctionDeclaration<Record<string, unknown>, ReturnType>);
  }

  protected formatParsedAnswer({answer}: ParsedAnswer): string {
    return answer;
  }

  /**
   * Special mode for StylingAgent that turns custom text output into a
   * function call.
   */
  protected functionCallEmulationEnabled = false;
  protected emulateFunctionCall(_aidaResponse: Host.AidaClient.AidaResponse): Host.AidaClient.AidaFunctionCallResponse|
      'no-function-call'|'wait-for-completion' {
    throw new Error('Unexpected emulateFunctionCall. Only StylingAgent implements function call emulation');
  }

  async *
      run(initialQuery: string, options: {
        signal?: AbortSignal, selected: ConversationContext<T>|null,
      },
          imageInput?: Host.AidaClient.Part, imageId?: string): AsyncGenerator<ResponseData, void, void> {
    await options.selected?.refresh();

    // First context set on the agent determines its origin from now on.
    if (options.selected && this.#origin === undefined && options.selected) {
      this.#origin = options.selected.getOrigin();
    }
    // Remember if the context that is set.
    if (options.selected && !this.#context) {
      this.#context = options.selected;
    }

    const enhancedQuery = await this.enhanceQuery(initialQuery, options.selected, Boolean(imageInput));
    Host.userMetrics.freestylerQueryLength(enhancedQuery.length);

    let query: Host.AidaClient.Part|Host.AidaClient.Part[];
    query = imageInput ? [{text: enhancedQuery}, imageInput] : [{text: enhancedQuery}];
    // Request is built here to capture history up to this point.
    let request = this.buildRequest(query, Host.AidaClient.Role.USER);

    yield {
      type: ResponseType.USER_QUERY,
      query: initialQuery,
      imageInput,
      imageId,
    };

    yield* this.handleContextDetails(options.selected);

    for (let i = 0; i < MAX_STEPS; i++) {
      yield {
        type: ResponseType.QUERYING,
      };

      let rpcId: Host.AidaClient.RpcGlobalId|undefined;
      let textResponse = '';
      let functionCall: Host.AidaClient.AidaFunctionCallResponse|undefined = undefined;
      try {
        for await (const fetchResult of this.#aidaFetch(request, {signal: options.signal})) {
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
              type: ResponseType.ANSWER,
              text: partialAnswer,
              complete: false,
            };
          }
          if (functionCall) {
            break;
          }
        }
      } catch (err) {
        debugLog('Error calling the AIDA API', err);

        let error = ErrorType.UNKNOWN;
        if (err instanceof Host.AidaClient.AidaAbortError) {
          error = ErrorType.ABORT;
        } else if (err instanceof Host.AidaClient.AidaBlockError) {
          error = ErrorType.BLOCK;
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
        this.#history.push({
          parts: [{
            text: this.formatParsedAnswer(parsedResponse),
          }],
          role: Host.AidaClient.Role.MODEL,
        });
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceAnswerReceived);
        yield {
          type: ResponseType.ANSWER,
          text: parsedResponse.answer,
          suggestions: parsedResponse.suggestions,
          complete: true,
          rpcId,
        };
        break;
      }

      if (functionCall) {
        try {
          const result = yield* this.#callFunction(functionCall.name, functionCall.args, options);
          if (options.signal?.aborted) {
            yield this.#createErrorResponse(ErrorType.ABORT);
            break;
          }
          query = this.functionCallEmulationEnabled ? {text: OBSERVATION_PREFIX + result.result} : {
            functionResponse: {
              name: functionCall.name,
              response: result,
            },
          };
          request = this.buildRequest(
              query,
              this.functionCallEmulationEnabled ? Host.AidaClient.Role.USER : Host.AidaClient.Role.ROLE_UNSPECIFIED);
        } catch {
          yield this.#createErrorResponse(ErrorType.UNKNOWN);
          break;
        }
      } else {
        yield this.#createErrorResponse(i - 1 === MAX_STEPS ? ErrorType.MAX_STEPS : ErrorType.UNKNOWN);
        break;
      }
    }

    if (isDebugMode()) {
      window.dispatchEvent(new CustomEvent('aiassistancedone'));
    }
  }

  async * #callFunction(name: string, args: Record<string, unknown>, options?: {
    signal?: AbortSignal,
    approved?: boolean,
  }): AsyncGenerator<FunctionCallResponseData, {result: unknown}> {
    const call = this.#functionDeclarations.get(name);
    if (!call) {
      throw new Error(`Function ${name} is not found.`);
    }
    if (this.functionCallEmulationEnabled) {
      if (!call.displayInfoFromArgs) {
        throw new Error('functionCallEmulationEnabled requires all functions to provide displayInfoFromArgs');
      }
      // Emulated function calls are formatted as text.
      this.#history.push({
        parts: [{text: this.#formatParsedStep(call.displayInfoFromArgs(args))}],
        role: Host.AidaClient.Role.MODEL,
      });
    } else {
      this.#history.push({
        parts: [{
          functionCall: {
            name,
            args,
          },
        }],
        role: Host.AidaClient.Role.MODEL,
      });
    }

    let code;
    if (call.displayInfoFromArgs) {
      const {title, thought, action: callCode} = call.displayInfoFromArgs(args);
      code = callCode;
      if (title) {
        yield {
          type: ResponseType.TITLE,
          title,
        };
      }

      if (thought) {
        yield {
          type: ResponseType.THOUGHT,
          thought,
        };
      }
    }

    let result = await call.handler(args, options) as FunctionCallHandlerResult<unknown>;

    if ('requiresApproval' in result) {
      if (code) {
        yield {
          type: ResponseType.ACTION,
          code,
          canceled: false,
        };
      }

      const sideEffectConfirmationPromiseWithResolvers = this.confirmSideEffect<boolean>();

      void sideEffectConfirmationPromiseWithResolvers.promise.then(result => {
        Host.userMetrics.actionTaken(
            result ? Host.UserMetrics.Action.AiAssistanceSideEffectConfirmed :
                     Host.UserMetrics.Action.AiAssistanceSideEffectRejected,
        );
      });

      if (options?.signal?.aborted) {
        sideEffectConfirmationPromiseWithResolvers.resolve(false);
      }

      options?.signal?.addEventListener('abort', () => {
        sideEffectConfirmationPromiseWithResolvers.resolve(false);
      }, {once: true});

      yield {
        type: ResponseType.SIDE_EFFECT,
        confirm: (result: boolean) => {
          sideEffectConfirmationPromiseWithResolvers.resolve(result);
        },
      };

      const approvedRun = await sideEffectConfirmationPromiseWithResolvers.promise;
      if (!approvedRun) {
        yield {
          type: ResponseType.ACTION,
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
        approved: approvedRun,
      });
    }

    if ('result' in result) {
      yield {
        type: ResponseType.ACTION,
        code,
        output: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
        canceled: false,
      };
    }

    if ('error' in result) {
      yield {
        type: ResponseType.ACTION,
        code,
        output: result.error,
        canceled: false,
      };
    }

    return result as {result: unknown};
  }

  async *
      #aidaFetch(request: Host.AidaClient.AidaRequest, options?: {signal?: AbortSignal}):
          AsyncGenerator<AidaFetchResult, void, void> {
    let aidaResponse: Host.AidaClient.AidaResponse|undefined = undefined;
    let response = '';
    let rpcId: Host.AidaClient.RpcGlobalId|undefined;

    for await (aidaResponse of this.#aidaClient.fetch(request, options)) {
      if (aidaResponse.functionCalls?.length) {
        debugLog('functionCalls.length', aidaResponse.functionCalls.length);
        yield {
          rpcId,
          functionCall: aidaResponse.functionCalls[0],
          completed: true,
        };
        break;
      }

      if (this.functionCallEmulationEnabled) {
        const emulatedFunctionCall = this.emulateFunctionCall(aidaResponse);
        if (emulatedFunctionCall === 'wait-for-completion') {
          continue;
        }
        if (emulatedFunctionCall !== 'no-function-call') {
          yield {
            rpcId,
            functionCall: emulatedFunctionCall,
            completed: true,
          };
          break;
        }
      }

      response = aidaResponse.explanation;
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
    if (isDebugMode()) {
      this.#structuredLog.push({
        request: structuredClone(request),
        response,
        aidaResponse,
      });
      localStorage.setItem('aiAssistanceStructuredLog', JSON.stringify(this.#structuredLog));
    }
  }

  #formatParsedStep(step: ParsedStep): string {
    let text = '';
    if (step.thought) {
      text = `THOUGHT: ${step.thought}`;
    }
    if (step.title) {
      text += `\nTITLE: ${step.title}`;
    }
    if (step.action) {
      text += `\nACTION
${step.action}
STOP`;
    }

    return text;
  }

  #removeLastRunParts(): void {
    this.#history.splice(this.#history.findLastIndex(item => {
      return item.role === Host.AidaClient.Role.USER;
    }));
  }

  #createErrorResponse(error: ErrorType): ResponseData {
    this.#removeLastRunParts();
    if (error !== ErrorType.ABORT) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
    }

    return {
      type: ResponseType.ERROR,
      error,
    };
  }
}
