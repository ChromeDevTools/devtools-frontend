// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as AiUtils from '../../ai-utils/ai-utils.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import type * as Trace from '../../trace/trace.js';
import type * as Workspace from '../../workspace/workspace.js';
import type {AlwaysAllowedTools} from '../AlwaysAllowedTools.js';
import {dispatchAiAssistanceDoneEvent} from '../DOMHelpers.js';
import {
  type ContextHandlerResult,
  type DataHandlerResult,
  PermissionDecision,
  PermissionPrompt,
  type ToolName,
} from '../tools/Tool.js';

const {debugLog, isStructuredLogEnabled} = AiUtils.Debug;

type UrlString = Platform.DevToolsPath.UrlString;
const MAX_SUGGESTION_LENGTH = 200;

/**
 * The types of event in the response stream that `AiConversation#run()`
 * yields to the AI assistance panel. The same events, minus a few, are saved
 * as the conversation history and replayed when a saved conversation opens.
 *
 * ## Order of events in one run
 *
 * ```
 * USER_QUERY                    (AiConversation, first run of a query only)
 * CONTEXT*                      (agent's handleContextDetails())
 * repeated for each model request, up to MAX_STEPS:
 *   QUERYING
 *   one of:
 *     ANSWER (complete: false)*, ANSWER (complete: true)   text-only reply; the run ends
 *     ANSWER (complete: false)*, [ANSWER (complete: true)],
 *       <tool call events>+                                one or more function calls, optionally with text
 *     ERROR                                                the run ends
 * ```
 *
 * When a model response contains several function calls,
 * `AiAgent#runFunctionCalls()` runs them one after another, so each call's
 * events finish before the next call's events start. A denied call does not
 * stop the calls after it, and neither does a failed call: an unknown tool
 * name or an error thrown by the handler becomes an error result for that
 * call.
 *
 * An `ERROR` can also follow the tool call events, for example when the user
 * aborts, the page navigates cross-origin, or the run reaches `MAX_STEPS`.
 * The remaining calls in that model response do not run after an abort or a
 * cross-origin navigation.
 *
 * ## Events for one tool call
 *
 * `AiAgent#callFunction()` yields these. All events for one call carry the
 * same `callId`.
 *
 * ```
 * TITLE?, THOUGHT?              from the tool's displayInfoFromArgs()
 * if the tool needs approval:
 *   ACTION {code}               code only, shown above the approval prompt;
 *                               skipped if displayInfoFromArgs() has no action
 *   SIDE_EFFECT                 the panel shows the prompt and calls confirm()
 *   if denied: ACTION {code, output, canceled: true}, and the call ends
 * ACTION {code, output, widgets, toolName}   result or error
 * ```
 *
 * If the tool switches context instead of returning a result, there is no
 * result `ACTION`. `AiAgent#runFunctionCalls()` yields `CONTEXT_CHANGE` and
 * the run ends, and `AiConversation` starts a new run with the agent for the
 * new context. The remaining calls in that model response do not run.
 *
 * ## Model history for function calls
 *
 * This is the history sent to the model, separate from the saved history
 * below. `AiAgent#runFunctionCalls()` stores the model's explanation text and
 * every function call in a response as one `MODEL` turn. The next request
 * carries one `functionResponse` per call, in the same order. A denied call
 * gets a response that says it did not run. After a context change, each call
 * that did not run gets a "Not executed" response.
 *
 * ## Saved history
 *
 * `AiConversation` saves every event except `CONTEXT_CHANGE` and partial
 * `ANSWER`s. `AiConversation#serialize()` removes `confirm`, images and
 * widgets, and redacts the `ACTION` output of tools annotated with
 * `REDACT_FROM_HISTORY`. Saved data has no version field, so new fields must
 * be optional.
 *
 * ## How the panel renders events
 *
 * `AiAssistancePanel#consumeResponseStream()` builds one chat message per
 * `USER_QUERY` and one step per tool call:
 * - `QUERYING` starts a new step with a spinner. The panel shows the step only
 *   if it is the first part of the message. Otherwise, the step stays hidden
 *   until a tool call fills it in.
 * - `TITLE`, `THOUGHT`, `ACTION` and `SIDE_EFFECT` update the step for their
 *   `callId`. Events saved before `callId` existed update the current step.
 * - `ANSWER` adds the answer text. `ERROR` sets the message error.
 */
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
  CONTEXT_CHANGE = 'context-change',
}

export const enum ErrorType {
  UNKNOWN = 'unknown',
  ABORT = 'abort',
  MAX_STEPS = 'max-steps',
  BLOCK = 'block',
  CROSS_ORIGIN = 'cross-origin',
  QUOTA = 'quota',
  PAYLOAD_TOO_LARGE = 'payload-too-large',
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

/**
 * No agent yields this event. The panel still handles it by attaching the
 * suggestions to the last answer.
 */
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

/**
 * Describes the context sent with the user's query, such as the selected
 * element. The agent's `handleContextDetails()` yields it before the first
 * model request. The panel shows it as a completed "Analyzing data" step.
 */
export interface ContextResponse {
  type: ResponseType.CONTEXT;
  details: [ContextDetail, ...ContextDetail[]];
  widgets?: AiWidget[];
}

/**
 * Identifies the tool call that an event belongs to. `AiAgent#callFunction()`
 * generates one per call and sets it on every event for that call. Only the
 * UI reads it; the agent never sends it to the model.
 *
 * Conversations saved before this field existed do not have it. The panel
 * applies events without a `callId` to the current step.
 */
interface ToolCallEvent {
  callId?: string;
}

/**
 * The heading of a tool call's step, from `displayInfoFromArgs().title`.
 */
export interface TitleResponse extends ToolCallEvent {
  type: ResponseType.TITLE;
  title: string;
  /**
   * No agent sets this field.
   */
  rpcId?: Host.AidaClient.RpcGlobalId;
}

/**
 * Explanation text for a tool call's step, from
 * `displayInfoFromArgs().thought`. The panel marks the step as completed when
 * it receives a thought, even though the tool has not run yet.
 */
export interface ThoughtResponse extends ToolCallEvent {
  type: ResponseType.THOUGHT;
  thought: string;
  /**
   * No agent sets this field.
   */
  rpcId?: Host.AidaClient.RpcGlobalId;
}

/**
 * Asks the user to approve a tool call that has side effects. The agent waits
 * until `confirm()` is called. If `displayInfoFromArgs()` returns an
 * `action`, the agent yields it in a code-only `ACTION` just before this
 * event.
 */
export interface SideEffectResponse extends ToolCallEvent {
  type: ResponseType.SIDE_EFFECT;
  description: string|null;
  javascriptCode?: string;
  confirm: (decision: PermissionDecision) => void;
  permissionPrompt?: PermissionPrompt;
  permissionTitle?: string;
}

/**
 * Yielded when a tool selects a new context, for example a network request.
 * `AiConversation` switches to the agent for that context and starts a new
 * run. `AiConversation` does not save this event in the history.
 */
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
  /**
   * The name of the tool that triggered this context change. Used by the panel
   * to emit UI telemetry.
   */
  toolName?: string;
}

interface SerializedSideEffectResponse extends Omit<SideEffectResponse, 'confirm'> {}

/**
 * The code and result of a tool call. A call yields one or two:
 * - Calls that need approval and have code first yield a code-only `ACTION`
 *   (no `output`), so the panel can show the code above the approval prompt.
 * - Every call that runs, fails or is denied ends with an `ACTION` that has
 *   an `output`.
 */
export interface ActionResponse extends ToolCallEvent {
  type: ResponseType.ACTION;
  /**
   * The text shown in the step's code box, from
   * `displayInfoFromArgs().action`. It is real code only for tools that run
   * code, such as `executeJavaScript`. For other tools it is a readable form of
   * the call.
   */
  action?: string;
  /**
   * The tool's result, error message, or the denial message. Missing on the
   * code-only `ACTION` that precedes an approval prompt.
   */
  output?: string;
  /**
   * True if the user denied the call, so the tool did not run.
   */
  canceled: boolean;
  widgets?: AiWidget[];
  /**
   * The name of the tool. Set on the result `ACTION` but not on the code-only
   * or denied `ACTION`. `AiConversation#serialize()` uses it to redact the
   * output of tools annotated with `REDACT_FROM_HISTORY`.
   */
  toolName?: string;
  /**
   * Skills newly loaded by a `learnSkills` call. Used by the panel to emit
   * `ai-v2-learn-skill` visual logging events.
   */
  loadedSkills?: string[];
}

/**
 * Yielded before each model request. The panel starts a new step for it.
 */
export interface QueryingResponse {
  type: ResponseType.QUERYING;
}

/**
 * The user's query. Yielded by `AiConversation`, not by the agent, before
 * the first run for the query. The panel starts a new chat message for it.
 */
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

export type AllowedOriginResult = {
  origin: SDK.SecurityOrigin.SecurityOrigin|undefined,
}|{
  blocked: true,
};

export interface AgentOptions {
  aidaClient: Host.AidaClient.AidaClient;
  serverSideLoggingAllowed?: boolean;
  sessionId?: string;
  confirmSideEffectForTest?: typeof Promise.withResolvers;
  onInspectElement?: () => Promise<SDK.DOMModel.DOMNode|null>;
  history?: Host.AidaClient.Content[];
  allowedOrigin?: () => AllowedOriginResult;
  lighthouseRecording?: (overrides?: LHModel.RunTypes.RunOverrides) => Promise<LHModel.RunTypes.RunResult>;
  targetManager?: SDK.TargetManager.TargetManager;
  alwaysAllowedTools?: AlwaysAllowedTools;
}

export interface ParsedAnswer {
  answer: string;
  suggestions?: [string, ...string[]];
}

export type ParsedResponse = ParsedAnswer;

export const MAX_STEPS = 20;

/**
 * The response sent for each function call that did not run because an
 * earlier call in the same model response switched the context. Every
 * `functionCall` in the history needs a matching `functionResponse`.
 */
const NOT_EXECUTED_AFTER_CONTEXT_CHANGE =
    'Not executed: the conversation switched to a new context before this call ran.';

/**
 * The response sent to the model for a call that the user denied. The other
 * calls in the same model response still run after a denial, so the message
 * points the model to their responses to see what did run.
 */
const USER_DENIED_CALL =
    'Error: The user denied this call, so it did not run. Other calls in the same response were handled separately; check their responses.';

export interface ConversationSuggestion {
  title: string;
  jslogContext?: string;
}

/** At least one. */
export type ConversationSuggestions = [ConversationSuggestion, ...ConversationSuggestion[]];

export type ConversationContextJslog = 'ai-context-dom-node'|'ai-context-network-request'|'ai-context-file'|
    'ai-context-performance-trace'|'ai-context-accessibility'|'ai-context-storage';

export abstract class ConversationContext<T> {
  abstract readonly jslogContext: ConversationContextJslog;
  abstract getItem(): T;
  abstract getTitle(): string;

  /**
   * Returns true if the server-side logging is enabled when this context is active.
   * Currently only used for AI v2.
   */
  isLoggingEnabled(): boolean {
    return true;
  }

  /**
   * Returns the security origin that owns this context data.
   *
   * The AI Assistance panel locks each conversation to the origin of the initial
   * context. If the user selects a context with a different origin, DevTools
   * blocks access to prevent unauthorized cross-origin data exposure.
   *
   * Subclasses must implement this method. If a context is detached, invalid,
   * or anonymous, the method must return a unique opaque origin
   * (`SDK.SecurityOrigin.SecurityOrigin.createUniqueOpaque()`).
   *
   * @returns The {@link SDK.SecurityOrigin.SecurityOrigin} that owns this context.
   */
  abstract getOrigin(): SDK.SecurityOrigin.SecurityOrigin;

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
  isOriginAllowed(establishedOrigin: SDK.SecurityOrigin.SecurityOrigin|undefined): boolean {
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
  async refresh(): Promise<void> {
    return;
  }

  async getSuggestions(): Promise<ConversationSuggestions|undefined> {
    return;
  }

  /**
   * Returns a detailed description of the context item for inclusion in the AI model prompt.
   * Currently only used by AiAgent2.
   */
  async getPromptDetails(): Promise<string|null> {
    return null;
  }

  /**
   * Returns a list of context details to display to the user in the UI.
   * Currently only used by AiAgent2.
   */
  async getUserFacingDetails(): Promise<[ContextDetail, ...ContextDetail[]]|null> {
    return null;
  }

  /**
   * Returns initial UI widgets to display in the conversation context header
   * when this context is active (e.g. Core Web Vitals summary for a performance trace).
   * Used by PerformanceAgent and AiAgent2.
   */
  async getWidgets(): Promise<AiWidget[]> {
    return [];
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
    title: Platform.UIString.LocalizedString,
    accessibleRevealLabel: Platform.UIString.LocalizedString,
    networkRequest?: {
      url: string,
      size: number,
      resourceType: Protocol.Network.ResourceType,
      mimeType: string,
      imageContent?: TextUtils.ContentData.ContentData,
    },
  };
}

export interface PerformanceTraceAiWidget {
  name: 'PERFORMANCE_TRACE';
  data: {
    parsedTrace: Trace.TraceModel.ParsedTrace,
  };
}

export interface PerfInsightAiWidget {
  name: 'PERF_INSIGHT';
  data: {
    insight: Trace.Insights.Types.InsightKeys,
    insightData: Trace.Insights.Types.InsightModel,
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

export interface SourceFileAiWidget {
  name: 'SOURCE_FILE';
  data: {
    uiSourceCode: Workspace.UISourceCode.UISourceCode,
  };
}

export interface SourceFilesListAiWidget {
  name: 'SOURCE_FILES_LIST';
  data: {
    uiSourceCodes: Workspace.UISourceCode.UISourceCode[],
  };
}

export interface NetworkRequestsListAiWidget {
  name: 'NETWORK_REQUESTS_LIST';
  data: {
    requests: SDK.NetworkRequest.NetworkRequest[],
  };
}
export interface NetworkTrackAiWidget {
  name: 'NETWORK_TRACK';
  data: {
    parsedTrace: Trace.TraceModel.ParsedTrace,
    bounds: Trace.Types.Timing.TraceWindowMicro,
  };
}

export interface LighthouseReportAiWidget {
  name: 'LIGHTHOUSE_REPORT';
  data: {
    report: LHModel.ReporterTypes.ReportJSON,
    snapshotReport?: boolean,
  };
}

export interface TimelineEventSummaryAiWidget {
  name: 'TIMELINE_EVENT_SUMMARY';
  data: {
    event: Trace.Types.Events.Event,
    parsedTrace: Trace.TraceModel.ParsedTrace,
  };
}

export interface NetworkRequestGeneralHeadersAiWidget {
  name: 'NETWORK_REQUEST_GENERAL_HEADERS';
  data: {
    request: SDK.NetworkRequest.NetworkRequest,
  };
}

// If the line and column are not provided, we assume the whole file was sent to the agent.s
export interface SourceCodeAiWidget {
  name: 'SOURCE_CODE';
  data: {
    url: UrlString,
    code: string,
    line?: number,
    column?: number,
  };
}

export interface StorageBreakdownAiWidget {
  name: 'STORAGE_BREAKDOWN';
  data: {
    totalUsageBytes: number,
    totalQuotaBytes: number,
    usageBreakdown: Array<{
      storageType: string,
      bytes: number,
    }>,
  };
}

export type AiWidget = ComputedStyleAiWidget|CoreVitalsAiWidget|StylePropertiesAiWidget|DomTreeAiWidget|
    PerformanceTraceAiWidget|PerfInsightAiWidget|TimelineRangeSummaryAiWidget|BottomUpTreeAiWidget|SourceFileAiWidget|
    LighthouseReportAiWidget|TimelineEventSummaryAiWidget|NetworkRequestGeneralHeadersAiWidget|SourceCodeAiWidget|
    SourceFilesListAiWidget|NetworkRequestsListAiWidget|NetworkTrackAiWidget|StorageBreakdownAiWidget;

/**
 * @deprecated Used for v1 agents. Once v2 is shipped, this can be removed.
 * Use `DataHandlerResult` or `ContextHandlerResult` from `Tool.js` instead.
 */
export type ToolResult<ResultType> = DataHandlerResult<ResultType>|ContextHandlerResult;

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
  description: string|(() => string);
  /**
   * JSON schema like representation of the parameters
   * the function needs to be called with.
   * Provide description to all parameters as this is
   * send to the LLM.
   */
  parameters: Host.AidaClient.FunctionObjectParam<keyof Args>;
  /**
   * Returns the text the UI shows for a call to this function. The agent
   * calls it before the handler runs.
   *
   * - `title`: the step heading, sent as `TITLE`.
   * - `thought`: optional explanation shown in the step, sent as `THOUGHT`.
   * - `action`: the text shown in the step's code box, sent as
   *   `ACTION.action`. It is a readable form of the call, for example
   *   `getInsightDetails('NAVIGATION_0', 'LCPBreakdown')`, and is never
   *   executed.
   * - `javascriptCode`: the exact JavaScript the tool runs in the page, sent
   *   as `SIDE_EFFECT.javascriptCode` and shown in the permission prompt.
   *   Only set by tools that execute JavaScript, such as `executeJavaScript`.
   * - `suggestions`: `AiAgent` does not use this field.
   */
  displayInfoFromArgs?: (
      args: Args,
      ) => {
    title?: string, thought?: string, action?: string, javascriptCode?: string, suggestions?: [string, ...string[]],
  };
  /**
   * Choices the permission prompt offers when the handler returns
   * `requiresApproval`. Behaves as `ALLOW_ONCE` when unset.
   */
  permissionPrompt?: PermissionPrompt;
  /**
   * Title of the permission prompt, e.g. "Allow reading cookie values?".
   */
  permissionTitle?: string;
  /**
   * Function implementation that the LLM will try to execute,
   */
  handler(args: Args, options?: FunctionHandlerOptions): Promise<ToolResult<ReturnType>>;
}

/**
 * The function calls in one model response. A response that has function
 * calls has at least one.
 */
type FunctionCalls = [Host.AidaClient.AidaFunctionCall, ...Host.AidaClient.AidaFunctionCall[]];

/**
 * What happened after `AiAgent#runFunctionCalls()` ran the calls in one model
 * response:
 * - `responses`: every call ran. `functionResponses` go to the model in the
 *   next request.
 * - `contextChanged`: a call switched the context. The run ends, and
 *   `AiConversation` starts a new run in the new context.
 * - `stopped`: an abort, a cross-origin navigation or an unexpected error
 *   stopped the run. The ERROR response has already been yielded.
 */
type FunctionCallsOutcome = {
  type: 'responses',
  functionResponses: Host.AidaClient.Part[],
}|{
  type: 'contextChanged',
}|{
  type: 'stopped',
};

interface AidaFetchResult {
  text?: string;
  functionCalls?: FunctionCalls;
  completed: boolean;
  rpcId?: Host.AidaClient.RpcGlobalId;
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
  /**
   * Tracks the dynamic runtime state of logging. Even if logging is allowed
   * by policy, tools or sensitive contexts can deactivate this to avoid logging sensitive data.
   */
  #serverSideLoggingActive: boolean;
  readonly confirmSideEffect: typeof Promise.withResolvers;
  readonly #functionDeclarations = new Map<string, FunctionDeclaration<Record<string, unknown>, unknown>>();
  readonly #allowedOrigin?: () => AllowedOriginResult;
  readonly #targetManager: SDK.TargetManager.TargetManager;
  readonly #alwaysAllowedTools?: AlwaysAllowedTools;

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
    this.#alwaysAllowedTools = opts.alwaysAllowedTools;
  }

  async enhanceQuery(query: string, selected: ConversationContext<T>|null,
                     multimodalInputType?: MultimodalInputType): Promise<string>;
  async enhanceQuery(query: string): Promise<string> {
    return query;
  }

  currentFacts(): ReadonlySet<Host.AidaClient.RequestFact> {
    return this.#facts;
  }

  get history(): Host.AidaClient.Content[] {
    return [...this.#history];
  }

  get targetManager(): SDK.TargetManager.TargetManager {
    return this.#targetManager;
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

  /**
   * Clears any subclass-specific caches. This is called when a run encounters
   * an error (e.g., cross-origin navigation, abort, or execution error) to
   * prevent unvalidated cached data from being replayed in subsequent runs.
   */
  clearCache(): void {
  }

  /**
   * Disables server-side logging for the remainder of this agent instance's lifetime.
   *
   * Logging deactivation is irreversible for the session. Conversation history
   * accumulates across turns; re-enabling logging later would leak sensitive
   * data from prior turns to AIDA.
   */
  protected disableServerSideLogging(): void {
    this.#serverSideLoggingActive = false;
  }

  /**
   * Preamble features appended to the `client_version` in metadata.
   * This is required ONLY for the Styling Agent for legacy reasons to serve
   * different server-side preambles based on the Chrome version.
   * Other agents should NOT set or override this.
   * If you are curious about this, look for `do_conversation_handler.cc` in
   * Google3 or chat to @jacktfranklin.
   */
  preambleFeatures(): string[] {
    return [];
  }

  buildRequest(part: Host.AidaClient.Part|Host.AidaClient.Part[],
               role: Host.AidaClient.Role.USER|
               Host.AidaClient.Role.ROLE_UNSPECIFIED): Host.AidaClient.DoConversationRequest {
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
        description: typeof definition.description === 'function' ? definition.description() : definition.description,
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
        disable_user_content_logging: !(this.#serverSideLoggingActive ?? false),
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
          suggestions = sanitizeSuggestions(trimmed.substring('SUGGESTIONS:'.length).trim());
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
        suggestions = sanitizeSuggestions(suggestionsText.trim());
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

  /**
   * Parses the text of a response that is still streaming. Only the `answer`
   * of the result is shown, as a partial answer. By default, partial answers
   * use the same parsing as completed answers.
   *
   * This hook exists so that `AiAgent2` (AI V2) can parse follow-up
   * suggestions differently without changing the V1 agents. Remove it once
   * AI V2 ships and the V1 agents are removed. b/568697679 explores getting
   * suggestions from a function call instead of parsing them from text,
   * which would remove the need for this parsing.
   */
  protected parsePartialTextResponse(response: string): ParsedResponse {
    return this.parseTextResponse(response);
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

  /**
   * Executed immediately after the current context is populated with the selected
   * context and before the request is built.
   */
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

    const query: Host.AidaClient.Part[] =
        multimodalInput ? [{text: enhancedQuery}, multimodalInput.input] : [{text: enhancedQuery}];
    // Request is built here to capture history up to this point.
    let request = this.buildRequest(query, Host.AidaClient.Role.USER);

    const clientFeatureName = Host.AidaClient.getClientFeatureName(this.clientFeature);
    debugLog(`[AiAgent] Starting conversation with client ${clientFeatureName}, userTier ${this.userTier}`);

    yield* this.handleContextDetails(options.selected);

    for (let i = 0; i < MAX_STEPS; i++) {
      yield {
        type: ResponseType.QUERYING,
      };

      if (i === 0) {
        debugLog('[AiAgent] Step 1: Sending user prompt to model:', enhancedQuery);
      } else {
        debugLog(`[AiAgent] Step ${i + 1}: Sending request to model:`, request.current_message);
      }

      let rpcId: Host.AidaClient.RpcGlobalId|undefined;
      let textResponse = '';
      let functionCalls: FunctionCalls|undefined;
      try {
        for await (const fetchResult of this.#aidaFetch(request, {signal: options.signal})) {
          rpcId = fetchResult.rpcId;
          textResponse = fetchResult.text ?? '';
          functionCalls = fetchResult.functionCalls;

          if (!functionCalls && !fetchResult.completed) {
            const parsed = this.parsePartialTextResponse(textResponse);
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
        if (!functionCalls) {
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
          type: ResponseType.ANSWER,
          text: parsedResponse.answer,
          suggestions: parsedResponse.suggestions,
          complete: true,
          rpcId,
        });
        if (!functionCalls) {
          break;
        }
      }

      if (!functionCalls) {
        yield this.#createErrorResponse(ErrorType.UNKNOWN);
        break;
      }

      debugLog(`[AiAgent] Step ${i + 1}: Model requested function calls:`, functionCalls);
      const outcome = yield* this.#runFunctionCalls(functionCalls, textResponse, options);
      if (outcome.type === 'contextChanged') {
        return;
      }
      if (outcome.type === 'stopped') {
        break;
      }

      if (i === MAX_STEPS - 1) {
        // Normally, the functionResponses are pushed at the start of the next
        // iteration. Since no further iteration will run, push them here so the
        // last functionCalls are not left unpaired in history.
        this.#history.push({
          parts: outcome.functionResponses,
          role: Host.AidaClient.Role.ROLE_UNSPECIFIED,
        });
        yield this.#createErrorResponse(ErrorType.MAX_STEPS);
        break;
      }

      request = this.buildRequest(outcome.functionResponses, Host.AidaClient.Role.ROLE_UNSPECIFIED);
    }

    if (isStructuredLogEnabled()) {
      dispatchAiAssistanceDoneEvent();
    }
    return;
  }

  /**
   * Runs every function call in one model response, one after another, in the
   * order the model returned them.
   *
   * The model's text and all calls are stored in history as one MODEL turn.
   * Every `functionCall` in history gets a matching `functionResponse`: in the
   * returned `functionResponses`, or, after a context change, in history
   * directly. When the run stops, the ERROR response removes the run from
   * history instead.
   */
  async *
      #runFunctionCalls(functionCalls: FunctionCalls, textResponse: string, options: {signal?: AbortSignal}):
          AsyncGenerator<ResponseData, FunctionCallsOutcome, void> {
    // Each call keeps its own `thoughtSignature`, if it has one.
    const modelParts: Host.AidaClient.Part[] = textResponse ? [{text: textResponse}] : [];
    modelParts.push(...functionCalls.map(functionCall => ({functionCall})));
    this.#history.push({
      parts: modelParts,
      role: Host.AidaClient.Role.MODEL,
    });

    const functionResponses: Host.AidaClient.Part[] = [];
    try {
      for (const [index, functionCall] of functionCalls.entries()) {
        const allowedOriginResult = this.#allowedOrigin?.();
        if (allowedOriginResult && 'blocked' in allowedOriginResult) {
          // Stop if the page navigated before the origin was locked.
          // This prevents the AI from accessing data from the new page.
          throw new CrossOriginError();
        }

        const result = yield* this.#callFunction(functionCall.name, functionCall.args, options);

        if (options.signal?.aborted) {
          // The remaining calls do not run. The ABORT response removes the run
          // from history.
          yield this.#createErrorResponse(ErrorType.ABORT);
          return {type: 'stopped'};
        }

        if ('context' in result) {
          functionResponses.push(
              ...this.#contextChangeResponses(functionCall, functionCalls.slice(index + 1), result.description));
          this.#history.push({
            parts: functionResponses,
            role: Host.AidaClient.Role.ROLE_UNSPECIFIED,
          });
          yield {
            type: ResponseType.CONTEXT_CHANGE,
            description: result.description,
            context: result.context,
            widgets: result.widgets,
            toolName: functionCall.name,
          };
          return {type: 'contextChanged'};
        }

        functionResponses.push({
          functionResponse: {
            name: functionCall.name,
            // Widgets and UI telemetry metadata are not sent back to the LLM.
            response: {
              ...result,
              widgets: undefined,
              ...('loadedSkills' in result ? {loadedSkills: undefined} : {}),
            },
          },
        });
      }
    } catch (err) {
      if (err instanceof CrossOriginError) {
        yield this.#createErrorResponse(ErrorType.CROSS_ORIGIN);
        return {type: 'stopped'};
      }
      debugLog('Error handling function call', err);
      yield this.#createErrorResponse(ErrorType.UNKNOWN);
      return {type: 'stopped'};
    }

    return {type: 'responses', functionResponses};
  }

  /**
   * Returns the function responses for `switchingCall`, which switched the
   * context, and for `skippedCalls`, which come after it and do not run.
   *
   * Pairing every `functionCall` with a `functionResponse` keeps the history
   * valid if this agent instance runs again after the context change
   * (`AiAgent2`). The new context reaches the model through the next USER
   * query.
   */
  #contextChangeResponses(switchingCall: Host.AidaClient.AidaFunctionCall,
                          skippedCalls: Host.AidaClient.AidaFunctionCall[],
                          description: string): Host.AidaClient.Part[] {
    return [
      {
        functionResponse: {
          name: switchingCall.name,
          response: {result: description},
        },
      },
      ...skippedCalls.map(skippedCall => ({
                            functionResponse: {
                              name: skippedCall.name,
                              response: {result: NOT_EXECUTED_AFTER_CONTEXT_CHANGE},
                            },
                          })),
    ];
  }

  async *
      #callFunction(
          name: string,
          args: Record<string, unknown>,
          options?: FunctionHandlerOptions,
          ): AsyncGenerator<FunctionCallResponseData, {
        result: unknown,
        widgets?: AiWidget[],
        loadedSkills?: string[],
      }|{error: string}|{context: ConversationContext<unknown>, description: string, widgets?: AiWidget[]}> {
    const callId = crypto.randomUUID();
    const call = this.#functionDeclarations.get(name);
    if (!call) {
      // Answer with an error instead of throwing, so the other calls in the
      // same model response still run and the history keeps their results.
      const error = `Error: Function ${name} is not found.`;
      debugLog(`[AiAgent] Tool '${name}' is not declared.`);
      yield {
        type: ResponseType.ACTION,
        callId,
        output: error,
        canceled: false,
        toolName: name,
      };
      return {error};
    }
    debugLog(`[AiAgent] Executing tool '${name}' with args:`, args);

    let action;
    let javascriptCode;
    if (call.displayInfoFromArgs) {
      const {title, thought, action: callAction, javascriptCode: callJavascriptCode} = call.displayInfoFromArgs(args);
      action = callAction;
      javascriptCode = callJavascriptCode;
      if (title) {
        yield {
          type: ResponseType.TITLE,
          callId,
          title,
        };
      }

      if (thought) {
        yield {
          type: ResponseType.THOUGHT,
          callId,
          thought,
        };
      }
    }

    const isOriginBlocked = (): boolean => {
      const allowedOriginResult = this.#allowedOrigin?.();
      return Boolean(allowedOriginResult && 'blocked' in allowedOriginResult);
    };

    // Turns an error thrown by the handler into an error result, so the other
    // calls in the same model response still run and the history keeps their
    // results.
    const runHandler = async(handlerOptions?: FunctionHandlerOptions): Promise<ToolResult<unknown>> => {
      try {
        const isAlwaysAllowed = call.permissionPrompt === PermissionPrompt.ALLOW_ONCE_OR_ALWAYS &&
            this.#alwaysAllowedTools?.isAllowed(name as ToolName);
        return await call.handler(args, isAlwaysAllowed ? {...handlerOptions, approved: true} : handlerOptions);
      } catch (err) {
        debugLog(`[AiAgent] Tool '${name}' threw:`, err);
        return {error: `Error: ${err instanceof Error ? err.message : String(err)}`};
      }
    };

    let result = await runHandler(options);

    // Check 1: After first handler execution.
    // Navigation could have occurred during the async handler execution.
    if (isOriginBlocked()) {
      throw new CrossOriginError();
    }

    if ('requiresApproval' in result) {
      if (action) {
        yield {
          type: ResponseType.ACTION,
          callId,
          action,
          canceled: false,
        };
      }

      const sideEffectConfirmationPromiseWithResolvers = this.confirmSideEffect<PermissionDecision>();

      void sideEffectConfirmationPromiseWithResolvers.promise.then(decision => {
        Host.userMetrics.actionTaken(
            decision === PermissionDecision.REJECT ? Host.UserMetrics.Action.AiAssistanceSideEffectRejected :
                                                     Host.UserMetrics.Action.AiAssistanceSideEffectConfirmed,
        );
      });

      if (options?.signal?.aborted) {
        sideEffectConfirmationPromiseWithResolvers.resolve(PermissionDecision.REJECT);
      }

      const onAbort = (): void => {
        sideEffectConfirmationPromiseWithResolvers.resolve(PermissionDecision.REJECT);
      };

      options?.signal?.addEventListener('abort', onAbort, {once: true});

      yield {
        type: ResponseType.SIDE_EFFECT,
        callId,
        confirm: sideEffectConfirmationPromiseWithResolvers.resolve,
        description: result.description,
        javascriptCode,
        permissionPrompt: call.permissionPrompt,
        permissionTitle: call.permissionTitle,
      };

      let decision = PermissionDecision.REJECT;
      try {
        decision = await sideEffectConfirmationPromiseWithResolvers.promise;
      } finally {
        options?.signal?.removeEventListener('abort', onAbort);
      }
      if (decision === PermissionDecision.ALLOW_ALWAYS) {
        this.#alwaysAllowedTools?.allow(name as ToolName);
      }
      if (decision === PermissionDecision.REJECT) {
        yield {
          type: ResponseType.ACTION,
          callId,
          action,
          output: 'Error: User denied code execution with side effects.',
          canceled: true,
        };
        debugLog(`[AiAgent] Tool '${name}' denied by user.`);
        return {
          result: USER_DENIED_CALL,
        };
      }

      // Re-check allowed origin after the approval await to prevent a TOCTOU (Time-of-Check
      // to Time-of-Use) race condition where the page might have navigated cross-origin
      // while the user was confirming the action.
      // Check 2: After waiting for user approval.
      if (isOriginBlocked()) {
        throw new CrossOriginError();
      }

      result = await runHandler({
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
        type: ResponseType.ACTION,
        callId,
        action,
        output: typeof result.result === 'string' ? result.result : JSON.stringify(result.result),
        widgets: result.widgets,
        canceled: false,
        toolName: name,
        ...(result.loadedSkills ? {loadedSkills: result.loadedSkills} : {}),
      };
    }

    if ('error' in result) {
      yield {
        type: ResponseType.ACTION,
        callId,
        action,
        output: result.error,
        canceled: false,
        toolName: name,
      };
    }

    debugLog(`[AiAgent] Tool '${name}' result:`, result);

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
        yield {
          rpcId,
          functionCalls: aidaResponse.functionCalls,
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
      } catch (err) {
        console.warn('Failed to write to local storage "aiAssistanceStructuredLog":', err);
      }
    }
  }

  #removeLastRunParts(): void {
    this.#history.splice(this.#history.findLastIndex(item => {
      return item.role === Host.AidaClient.Role.USER;
    }));
  }

  #createErrorResponse(error: ErrorType): ResponseData {
    // If we hit MAX_STEPS, we still want to keep the call history as this may be relevant for follow-up requests.
    if (error !== ErrorType.MAX_STEPS) {
      this.#removeLastRunParts();
      this.clearCache();
    }
    if (error !== ErrorType.ABORT) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.AiAssistanceError);
    }

    return {
      type: ResponseType.ERROR,
      error,
    };
  }
}

/**
 * Parses `suggestions` as a JSON array and returns its non-empty string items,
 * with whitespace collapsed and each item truncated to `MAX_SUGGESTION_LENGTH`.
 * Returns `undefined` if the value is not an array or no items remain.
 * Throws if `suggestions` is not valid JSON.
 */
export function sanitizeSuggestions(suggestions: string): [string, ...string[]]|undefined {
  const parsed = JSON.parse(suggestions);
  if (!Array.isArray(parsed)) {
    return undefined;
  }
  const sanitized: string[] = [];
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
  return sanitized as [string, ...string[]];
}

/**
 * Maps AIDA-specific client error instances to user-facing ErrorType enums.
 * This handles AIDA API failure modes such as quota exhaustion or blockages.
 * Other application-level errors (like CROSS_ORIGIN or MAX_STEPS) are handled separately.
 */
export function aidaErrorToErrorType(err: unknown): ErrorType {
  if (err instanceof Host.AidaClient.AidaAbortError) {
    return ErrorType.ABORT;
  }
  if (err instanceof Host.AidaClient.AidaBlockError) {
    return ErrorType.BLOCK;
  }
  if (err instanceof Host.AidaClient.AidaQuotaError) {
    return ErrorType.QUOTA;
  }
  if (err instanceof Host.AidaClient.AidaPayloadTooLargeError) {
    return ErrorType.PAYLOAD_TOO_LARGE;
  }
  return ErrorType.UNKNOWN;
}
