// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as Lit from '../../../ui/lit/lit.js';

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
}

export interface UserQuery {
  type: ResponseType.USER_QUERY;
  query: string;
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
   * Provided a way to give information back to
   * the UI before running the the handler
   */
  displayInfoFromArgs?: (
      args: Args,
      ) => {
    title?: string, thought?: string, code?: string, suggestions?: [string, ...string[]],
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

const OBSERVATION_PREFIX = 'OBSERVATION:';

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

  async enhanceQuery(query: string, selected: ConversationContext<T>|null): Promise<string>;
  async enhanceQuery(query: string): Promise<string> {
    return query;
  }

  buildRequest(part: Host.AidaClient.Part, role: Host.AidaClient.Role.USER|Host.AidaClient.Role.ROLE_UNSPECIFIED):
      Host.AidaClient.AidaRequest {
    const currentMessage: Host.AidaClient.Content = {
      parts: [part],
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
    const request: Host.AidaClient.AidaRequest = {
      client: Host.AidaClient.CLIENT_NAME,

      current_message: currentMessage,
      preamble: this.preamble,

      historical_contexts: history.length ? history : undefined,

      ...(declarations.length ? {function_declarations: declarations} : {}),
      options: {
        temperature: validTemperature(this.options.temperature),
        model_id: this.options.modelId,
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: Host.AidaClient.convertToUserTierEnum(this.userTier),
      },

      functionality_type: declarations.length ? Host.AidaClient.FunctionalityType.AGENTIC_CHAT :
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

  parseResponse(response: Host.AidaClient.AidaResponse): ParsedResponse {
    if (response.functionCalls && response.completed) {
      throw new Error('Function calling not supported yet');
    }
    return {
      answer: response.explanation,
    };
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

  protected handleAction(action: string, options?: {signal?: AbortSignal}):
      AsyncGenerator<SideEffectResponse, ActionResponse, void>;
  protected handleAction(): never {
    throw new Error('Unexpected action found');
  }

  async * run(initialQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<T>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    await options.selected?.refresh();

    // First context set on the agent determines its origin from now on.
    if (options.selected && this.#origin === undefined && options.selected) {
      this.#origin = options.selected.getOrigin();
    }
    // Remember if the context that is set.
    if (options.selected && !this.#context) {
      this.#context = options.selected;
    }

    const enhancedQuery = await this.enhanceQuery(initialQuery, options.selected);

    Host.userMetrics.freestylerQueryLength(enhancedQuery.length);

    let query: Host.AidaClient.Part = {text: enhancedQuery};
    // Request is built here to capture history up to this point.
    let request = this.buildRequest(query, Host.AidaClient.Role.USER);

    yield {
      type: ResponseType.USER_QUERY,
      query: initialQuery,
    };

    yield* this.handleContextDetails(options.selected);

    for (let i = 0; i < MAX_STEPS; i++) {
      yield {
        type: ResponseType.QUERYING,
      };

      let rpcId: Host.AidaClient.RpcGlobalId|undefined;
      let parsedResponse: ParsedResponse|undefined = undefined;
      let functionCall: Host.AidaClient.AidaFunctionCallResponse|undefined = undefined;
      try {
        for await (const fetchResult of this.#aidaFetch(request, {signal: options.signal})) {
          rpcId = fetchResult.rpcId;
          parsedResponse = fetchResult.parsedResponse;
          functionCall = fetchResult.functionCall;

          // Only yield partial responses here and do not add partial answers to the history.
          if (!fetchResult.completed && !fetchResult.functionCall && 'answer' in parsedResponse &&
              parsedResponse.answer) {
            yield {
              type: ResponseType.ANSWER,
              text: parsedResponse.answer,
            };
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

      if (parsedResponse && 'answer' in parsedResponse && Boolean(parsedResponse.answer)) {
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
          rpcId,
        };
        break;
      } else if (parsedResponse && !('answer' in parsedResponse)) {
        const {
          title,
          thought,
          action,
        } = parsedResponse;

        if (title) {
          yield {
            type: ResponseType.TITLE,
            title,
            rpcId,
          };
        }

        if (thought) {
          yield {
            type: ResponseType.THOUGHT,
            thought,
            rpcId,
          };
        }

        this.#history.push({
          parts: [{
            text: this.#formatParsedStep(parsedResponse),
          }],
          role: Host.AidaClient.Role.MODEL,
        });

        if (action) {
          const result = yield* this.handleAction(action, {signal: options.signal});
          if (options?.signal?.aborted) {
            yield this.#createErrorResponse(ErrorType.ABORT);
            break;
          }
          query = {text: `${OBSERVATION_PREFIX} ${result.output}`};
          // Capture history state for the next iteration query.
          request = this.buildRequest(query, Host.AidaClient.Role.USER);
          yield result;
        }
      } else if (functionCall) {
        try {
          const result = yield* this.#callFunction(functionCall.name, functionCall.args);

          if (result.result) {
            yield {
              type: ResponseType.ACTION,
              output: JSON.stringify(result.result),
              canceled: false,
            };
          }

          query = {
            functionResponse: {
              name: functionCall.name,
              response: result,
            },
          };
          request = this.buildRequest(query, Host.AidaClient.Role.ROLE_UNSPECIFIED);
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
      window.dispatchEvent(new CustomEvent('freestylerdone'));
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
    this.#history.push({
      parts: [{
        functionCall: {
          name,
          args,
        },
      }],
      role: Host.AidaClient.Role.MODEL,
    });

    if (call.displayInfoFromArgs) {
      const {title, thought, code, suggestions} = call.displayInfoFromArgs(args);
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

      if (code) {
        yield {
          type: ResponseType.ACTION,
          code,
          canceled: false,
        };
      }

      if (suggestions) {
        yield {
          type: ResponseType.SUGGESTIONS,
          suggestions,
        };
      }
    }

    let result = await call.handler(args, options);

    if ('requiresApproval' in result) {
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
          code: '',
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

    return result as {result: unknown};
  }

  async *
      #aidaFetch(request: Host.AidaClient.AidaRequest, options?: {signal?: AbortSignal}): AsyncGenerator<
          {
            parsedResponse: ParsedResponse,
            functionCall?: Host.AidaClient.AidaFunctionCallResponse, completed: boolean,
            rpcId?: Host.AidaClient.RpcGlobalId,
          },
          void, void> {
    let aidaResponse: Host.AidaClient.AidaResponse|undefined = undefined;
    let response = '';
    let rpcId: Host.AidaClient.RpcGlobalId|undefined;

    for await (aidaResponse of this.#aidaClient.fetch(request, options)) {
      if (aidaResponse.functionCalls?.length) {
        debugLog('functionCalls.length', aidaResponse.functionCalls.length);
        yield {
          rpcId,
          parsedResponse: {answer: ''},
          functionCall: aidaResponse.functionCalls[0],
          completed: true,
        };
        break;
      }

      response = aidaResponse.explanation;
      rpcId = aidaResponse.metadata.rpcGlobalId ?? rpcId;
      const parsedResponse = this.parseResponse(aidaResponse);
      yield {
        rpcId,
        parsedResponse,
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
      localStorage.setItem('freestylerStructuredLog', JSON.stringify(this.#structuredLog));
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

export function isDebugMode(): boolean {
  return Boolean(localStorage.getItem('debugFreestylerEnabled'));
}

export function debugLog(...log: unknown[]): void {
  if (!isDebugMode()) {
    return;
  }

  // eslint-disable-next-line no-console
  console.log(...log);
}

function setDebugFreestylerEnabled(enabled: boolean): void {
  if (enabled) {
    localStorage.setItem('debugFreestylerEnabled', 'true');
  } else {
    localStorage.removeItem('debugFreestylerEnabled');
  }
}
// @ts-ignore
globalThis.setDebugFreestylerEnabled = setDebugFreestylerEnabled;
