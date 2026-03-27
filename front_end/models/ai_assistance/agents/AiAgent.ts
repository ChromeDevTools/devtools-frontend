// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as Greendev from '../../greendev/greendev.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type * as Trace from '../../trace/trace.js';
import {debugLog, isStructuredLogEnabled} from '../debug.js';

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
  CONTEXT_CHANGE = 'context-change'
}

export const enum ErrorType {
  UNKNOWN = 'unknown',
  ABORT = 'abort',
  MAX_STEPS = 'max-steps',
  BLOCK = 'block',
  CROSS_ORIGIN = 'cross-origin'
}

export const enum MultimodalInputType {
  SCREENSHOT = 'screenshot',
  UPLOADED_IMAGE = 'uploaded-image',
}

export interface MultimodalInput {
  input: Host.AidaClient.Part;
  type: MultimodalInputType;
  id: string;
}

export interface AnswerResponse {
  type: ResponseType.ANSWER;
  text: string;
  // Whether this is the complete answer or only a part of it (for streaming reasons)
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
  description: string|null;
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

interface SerializedSideEffectResponse extends Omit<SideEffectResponse, 'confirm'> {}

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

export type ResponseData = AnswerResponse|SuggestionsResponse|ErrorResponse|ActionResponse|SideEffectResponse|
    ThoughtResponse|TitleResponse|QueryingResponse|ContextResponse|UserQuery|ContextChangeResponse;

export type SerializedResponseData = AnswerResponse|SuggestionsResponse|ErrorResponse|ActionResponse|
    SerializedSideEffectResponse|ThoughtResponse|TitleResponse|QueryingResponse|ContextResponse|UserQuery;

export type FunctionCallResponseData =
    TitleResponse|ThoughtResponse|ActionResponse|SideEffectResponse|SuggestionsResponse|ContextChangeResponse;

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
  sessionId?: string;
  confirmSideEffectForTest?: typeof Promise.withResolvers;
  onInspectElement?: () => Promise<SDK.DOMModel.DOMNode|null>;
  history?: Host.AidaClient.Content[];
  allowedOrigin?: () => string | undefined;
  lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.ReporterTypes.ReportJSON|null>;
}

export interface ParsedAnswer {
  answer: string;
  suggestions?: [string, ...string[]];
}

export type ParsedResponse = ParsedAnswer;

export const MAX_STEPS = 10;

export interface ConversationSuggestion {
  title: string;
  jslogContext?: string;
}

/** At least one. */
export type ConversationSuggestions = [ConversationSuggestion, ...ConversationSuggestion[]];

export const enum ExternalRequestResponseType {
  ANSWER = 'answer',
  NOTIFICATION = 'notification',
  ERROR = 'error',
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

export type ExternalRequestResponse = ExternalRequestAnswer|ExternalRequestNotification|ExternalRequestError;

export abstract class ConversationContext<T> {
  abstract getOrigin(): string;
  abstract getItem(): T;
  abstract getTitle(): string;

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

  async getSuggestions(): Promise<ConversationSuggestions|undefined> {
    return;
  }
}

export interface ComputedStyleAiWidget {
  name: 'COMPUTED_STYLES';
  data: {
    computedStyles: Map<string, string>,
    backendNodeId: Protocol.DOM.BackendNodeId,
    matchedCascade: SDK.CSSMatchedStyles.CSSMatchedStyles,
    // The subset of CSS properties that the AI looked up.
    properties: string[],
  };
}
export interface CoreVitalsAiWidget {
  name: 'CORE_VITALS';
  data: {
    insightSetKey: string,
    parsedTrace: Trace.TraceModel.ParsedTrace,
  };
}

export interface StylePropertiesAiWidget {
  name: 'STYLE_PROPERTIES';
  data: {
    backendNodeId: Protocol.DOM.BackendNodeId,
    selector?: string,
  };
}

export interface DomTreeAiWidget {
  name: 'DOM_TREE';
  data: {
    root: SDK.DOMModel.DOMNodeSnapshot,
    networkRequest?: {
      url: string,
      size: number,
      resourceType: Protocol.Network.ResourceType,
      mimeType: string,
      imageUrl?: string,
    },
  };
}

export interface PerformanceTraceAiWidget {
  name: 'PERFORMANCE_TRACE';
  data: {
    parsedTrace: Trace.TraceModel.ParsedTrace,
  };
}

export interface LcpBreakdownAiWidget {
  name: 'LCP_BREAKDOWN';
  data: {
    lcpData: Trace.Insights.Models.LCPBreakdown.LCPBreakdownInsightModel,
  };
}

export interface TimelineRangeSummaryAiWidget {
  name: 'TIMELINE_RANGE_SUMMARY';
  data: {
    bounds: Trace.Types.Timing.TraceWindowMicro,
    parsedTrace: Trace.TraceModel.ParsedTrace,
    // We can use this component for other tracks summaries later, so
    // we include the track in the data.
    track: 'main',
  };
}

export interface BottomUpTreeAiWidget {
  name: 'BOTTOM_UP_TREE';
  data: {
    bounds: Trace.Types.Timing.TraceWindowMicro,
    parsedTrace: Trace.TraceModel.ParsedTrace,
  };
}

// This type will grow as we add more widgets.
export type AiWidget = ComputedStyleAiWidget|CoreVitalsAiWidget|StylePropertiesAiWidget|DomTreeAiWidget|
    PerformanceTraceAiWidget|LcpBreakdownAiWidget|TimelineRangeSummaryAiWidget|BottomUpTreeAiWidget;

export type FunctionCallHandlerResult<Result> = {
  requiresApproval: true,
  /**
   * Provides extra description of what the required
   * approval is requesting.
   */
  description: string|null,
}|{
  result: Result,
  widgets?: AiWidget[],
}|{
  context: ConversationContext<unknown>,
  description: string,
  widgets?: AiWidget[],
}|{
  error: string,
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
  displayInfoFromArgs?: (
      args: Args,
      ) => {
    title?: string, thought?: string, action?: string, suggestions?: [string, ...string[]],
  };
  /**
   * Function implementation that the LLM will try to execute,
   */
  handler(args: Args, options?: FunctionHandlerOptions): Promise<FunctionCallHandlerResult<ReturnType>>;
}

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
  /**
   * WARNING: preamble defined in code is only used when userTier is
   * TESTERS. Otherwise, a server-side preamble is used (see
   * chrome_preambles.gcl).
   */
  abstract readonly preamble: string|undefined;
  abstract readonly options: RequestOptions;
  abstract readonly clientFeature: Host.AidaClient.ClientFeature;
  abstract readonly userTier: string|undefined;
  abstract handleContextDetails(select: ConversationContext<T>|null): AsyncGenerator<ContextResponse, void, void>;

  readonly #sessionId: string;
  readonly #aidaClient: Host.AidaClient.AidaClient;
  readonly #serverSideLoggingEnabled: boolean;
  readonly confirmSideEffect: typeof Promise.withResolvers;
  readonly #functionDeclarations = new Map<string, FunctionDeclaration<Record<string, unknown>, unknown>>();

  /**
   * Used in the debug mode and evals.
   */
  readonly #structuredLog: Array<{
    request: Host.AidaClient.DoConversationRequest,
    aidaResponse: Host.AidaClient.DoConversationResponse,
  }> = [];

  /**
   * `context` does not change during `AiAgent.run()`, ensuring that calls to JS
   * have the correct `context`. We don't want element selection by the user to
   * change the `context` during an `AiAgent.run()`.
   */
  protected context?: ConversationContext<T>;

  #history: Host.AidaClient.Content[];

  #facts: Set<Host.AidaClient.RequestFact> = new Set<Host.AidaClient.RequestFact>();

  constructor(opts: AgentOptions) {
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
  }

  async enhanceQuery(query: string, selected: ConversationContext<T>|null, multimodalInputType?: MultimodalInputType):
      Promise<string>;
  async enhanceQuery(query: string): Promise<string> {
    return query;
  }

  currentFacts(): ReadonlySet<Host.AidaClient.RequestFact> {
    return this.#facts;
  }

  get history(): Host.AidaClient.Content[] {
    return [...this.#history];
  }

  /**
   * Add a fact which will be sent for any subsequent requests.
   * Returns the new list of all facts.
   * Facts are never automatically removed.
   */
  addFact(fact: Host.AidaClient.RequestFact): ReadonlySet<Host.AidaClient.RequestFact> {
    this.#facts.add(fact);
    return this.#facts;
  }

  removeFact(fact: Host.AidaClient.RequestFact): boolean {
    return this.#facts.delete(fact);
  }

  clearFacts(): void {
    this.#facts.clear();
  }

  popPendingMultimodalInput(): MultimodalInput|undefined {
    return undefined;
  }

  preambleFeatures(): string[] {
    return [];
  }

  buildRequest(
      part: Host.AidaClient.Part|Host.AidaClient.Part[],
      role: Host.AidaClient.Role.USER|Host.AidaClient.Role.ROLE_UNSPECIFIED): Host.AidaClient.DoConversationRequest {
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
    const enableAidaFunctionCalling = declarations.length;
    const userTier = Host.AidaClient.convertToUserTierEnum(this.userTier);
    const preamble = userTier === Host.AidaClient.UserTier.TESTERS ? this.preamble : undefined;
    const facts = Array.from(this.#facts);
    const request: Host.AidaClient.DoConversationRequest = {
      client: Host.AidaClient.CLIENT_NAME,
      current_message: currentMessage,
      preamble,

      historical_contexts: history.length ? history : undefined,
      facts: facts.length ? facts : undefined,

      ...(enableAidaFunctionCalling ? {function_declarations: declarations} : {}),
      options: {
        temperature: validTemperature(this.options.temperature),
        model_id: this.options.modelId || undefined,
      },
      metadata: {
        disable_user_content_logging: !(this.#serverSideLoggingEnabled ?? false),
        string_session_id: this.#sessionId,
        user_tier: userTier,
        client_version:
            Root.Runtime.getChromeVersion() + this.preambleFeatures().map(feature => `+${feature}`).join(''),
      },

      functionality_type: enableAidaFunctionCalling ? Host.AidaClient.FunctionalityType.AGENTIC_CHAT :
                                                      Host.AidaClient.FunctionalityType.CHAT,

      client_feature: this.clientFeature,
    };
    return request;
  }

  get sessionId(): string {
    return this.#sessionId;
  }

  /**
   * The AI has instructions to emit structured suggestions in their response. This
   * function parses for that.
   *
   * Note: currently only StylingAgent and PerformanceAgent utilize this, but
   * eventually all agents should support this.
   */
  parseTextResponseForSuggestions(text: string): ParsedResponse {
    if (!text) {
      return {answer: ''};
    }

    const lines = text.split('\n');
    const answerLines: string[] = [];
    let suggestions: [string, ...string[]]|undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('SUGGESTIONS:')) {
        try {
          // TODO: Do basic validation this is an array with strings
          suggestions = JSON.parse(trimmed.substring('SUGGESTIONS:'.length).trim());
        } catch {
        }
      } else {
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
      } catch {
      }
      answerLines[answerLines.length - 1] = answer;
    }

    const response: ParsedResponse = {
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
  parseTextResponse(response: string): ParsedResponse {
    return this.parseTextResponseForSuggestions(response.trim());
  }

  protected async finalizeAnswer(answer: AnswerResponse): Promise<AnswerResponse> {
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
  protected declareFunction<Args extends Record<string, unknown>, ReturnType = unknown>(
      name: string,
      declaration: FunctionDeclaration<Args, ReturnType>,
      ): void {
    if (this.#functionDeclarations.has(name)) {
      throw new Error(`Duplicate function declaration ${name}`);
    }
    this.#functionDeclarations.set(name, declaration as FunctionDeclaration<Record<string, unknown>, ReturnType>);
  }

  protected clearDeclaredFunctions(): void {
    this.#functionDeclarations.clear();
  }

  protected async preRun(): Promise<void> {
  }

  async *
      run(
          initialQuery: string,
          options: {
            selected: ConversationContext<T>|null,
            signal?: AbortSignal,
          },
          multimodalInput?: MultimodalInput,
          ): AsyncGenerator<ResponseData, void, void> {
    await this.preRun();
    await options.selected?.refresh();
    if (options.selected) {
      this.context = options.selected;
    }

    const enhancedQuery = await this.enhanceQuery(initialQuery, options.selected, multimodalInput?.type);
    Host.userMetrics.freestylerQueryLength(enhancedQuery.length);

    let query: Host.AidaClient.Part|Host.AidaClient.Part[];
    query = multimodalInput ? [{text: enhancedQuery}, multimodalInput.input] : [{text: enhancedQuery}];
    // Request is built here to capture history up to this point.
    let request = this.buildRequest(query, Host.AidaClient.Role.USER);

    yield* this.handleContextDetails(options.selected);

    const breakpointAgentEnabled = Greendev.Prototypes.instance().isEnabled('breakpointDebuggerAgent');
    const isBreakpointDebuggerAgent = this.constructor.name === 'BreakpointDebuggerAgent';
    const finalMaxSteps = (isBreakpointDebuggerAgent && breakpointAgentEnabled) ? 1000 : MAX_STEPS;

    for (let i = 0; i < finalMaxSteps; i++) {
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
          type: ResponseType.ANSWER,
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
        try {
          const result = yield*
              this.#callFunction(
                  functionCall.name,
                  functionCall.args,
                  {
                    ...options,
                    explanation: textResponse,
                  },
              );

          if (options.signal?.aborted) {
            yield this.#createErrorResponse(ErrorType.ABORT);
            break;
          }

          if ('context' in result) {
            yield {
              type: ResponseType.CONTEXT_CHANGE,
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
              response: {...result, widgets: undefined},
            },
          };
          request = this.buildRequest(query, Host.AidaClient.Role.ROLE_UNSPECIFIED);
        } catch (err) {
          debugLog('Error handling function call', err);
          yield this.#createErrorResponse(ErrorType.UNKNOWN);
          break;
        }
      } else {
        yield this.#createErrorResponse(i - 1 === MAX_STEPS ? ErrorType.MAX_STEPS : ErrorType.UNKNOWN);
        break;
      }
    }

    if (isStructuredLogEnabled()) {
      window.dispatchEvent(new CustomEvent('aiassistancedone'));
    }
    return;
  }

  async *
      #callFunction(
          name: string,
          args: Record<string, unknown>,
          options?: FunctionHandlerOptions&{explanation?: string},
          ): AsyncGenerator<FunctionCallResponseData, {
        result: unknown,
        widgets?: AiWidget[],
      }|{context: ConversationContext<unknown>, description: string, widgets?: AiWidget[]}> {
    const call = this.#functionDeclarations.get(name);
    if (!call) {
      throw new Error(`Function ${name} is not found.`);
    }
    const parts: Host.AidaClient.Part[] = [];
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

    let result = await call.handler(args, options);

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
        confirm: sideEffectConfirmationPromiseWithResolvers.resolve,
        description: result.description,
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
        approved: true,
      });
    }

    if ('result' in result) {
      yield {
        type: ResponseType.ACTION,
        code,
        output: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
        widgets: result.widgets,
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

    if ('context' in result) {
      return result;
    }

    return result as {result: unknown, widgets?: AiWidget[]};
  }

  async *
      #aidaFetch(request: Host.AidaClient.DoConversationRequest, options?: {signal?: AbortSignal}):
          AsyncGenerator<AidaFetchResult, void, void> {
    let aidaResponse: Host.AidaClient.DoConversationResponse|undefined = undefined;
    let rpcId: Host.AidaClient.RpcGlobalId|undefined;

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
