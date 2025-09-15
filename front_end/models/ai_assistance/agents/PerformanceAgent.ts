// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Tracing from '../../../services/tracing/tracing.js';
import * as Trace from '../../trace/trace.js';
import type {ConversationType} from '../AiHistoryStorage.js';
import {
  PerformanceInsightFormatter,
  TraceEventFormatter,
} from '../data_formatters/PerformanceInsightFormatter.js';
import {PerformanceTraceFormatter} from '../data_formatters/PerformanceTraceFormatter.js';
import {debugLog} from '../debug.js';
import {AICallTree} from '../performance/AICallTree.js';
import {AgentFocus} from '../performance/AIContext.js';

import {
  type AgentOptions,
  AiAgent,
  type ContextResponse,
  ConversationContext,
  type ConversationSuggestion,
  type ParsedResponse,
  type RequestOptions,
  type ResponseData,
  ResponseType,
} from './AiAgent.js';

const UIStringsNotTranslated = {
  /**
   *@description Shown when the agent is investigating a trace
   */
  analyzingTrace: 'Analyzing trace',
  analyzingCallTree: 'Analyzing call tree',
  /**
   * @description Shown when the agent is investigating network activity
   */
  networkActivitySummary: 'Investigating network activity…',
  /**
   * @description Shown when the agent is investigating main thread activity
   */
  mainThreadActivity: 'Investigating main thread activity…',
} as const;
const lockedString = i18n.i18n.lockedString;

/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */

/**
 * Preamble clocks in at ~1341 tokens.
 *   The prose is around 4.5 chars per token.
 * The data can be as bad as 1.8 chars per token
 *
 * Check token length in https://aistudio.google.com/
 */
const fullTracePreamble = `You are an assistant, expert in web performance and highly skilled with Chrome DevTools.

Your primary goal is to provide actionable advice to web developers about their web page by using the Chrome Performance Panel and analyzing a trace. You may need to diagnose problems yourself, or you may be given direction for what to focus on by the user.

You will be provided a summary of a trace: some performance metrics; the most critical network requests; a bottom-up call graph summary; and a brief overview of available insights. Each insight has information about potential performance issues with the page.

Don't mention anything about an insight without first getting more data about it by calling \`getInsightDetails\`.

You have many functions available to learn more about the trace. Use these to confirm hypotheses, or to further explore the trace when diagnosing performance issues.

You will be given bounds representing a time range within the trace. Bounds include a min and a max time in microseconds. max is always bigger than min in a bounds.

The 3 main performance metrics are:
- LCP: "Largest Contentful Paint"
- INP: "Interaction to Next Paint"
- CLS: "Cumulative Layout Shift"

Trace events referenced in the information given to you will be marked with an \`eventKey\`. For example: \`LCP element: <img src="..."> (eventKey: r-123, ts: 123456)\`
You can use this key with \`getEventByKey\` to get more information about that trace event. For example: \`getEventByKey('r-123')\`

## Step-by-step instructions for debugging performance issues

Note: if the user asks a specific question about the trace (such as "What is my LCP?", or "How many requests were render-blocking?", directly answer their question and skip starting a performance investigation. Otherwise, your task is to collaborate with the user to discover and resolve real performance issues.

### Step 1: Determine a performance problem to investigate

- With help from the user, determine what performance problem to focus on.
- If the user is not specific about what problem to investigate, help them by doing a high-level investigation yourself. Present to the user a few options with 1-sentence summaries. Mention what performance metrics each option impacts. Call as many functions and confirm the data thoroughly: never present an option without being certain it is a real performance issue. Don't suggest solutions yet.
- Rank the options from most impactful to least impactful, and present them to the user in that order.
- Don't present more than 5 options.
- Once a performance problem has been identified for investigation, move on to step 2.

### Step 2: Suggest solutions

- Suggest possible solutions to remedy the identified performance problem. Be as specific as possible, using data from the trace via the provided functions to back up everything you say. You should prefer specific solutions, but absent any specific solution you may suggest general solutions (such as from an insight's documentation links).
- A good first step to discover solutions is to consider the insights, but you should also validate all potential advice by analyzing the trace until you are confident about the root cause of a performance issue.

## Guidelines

- Use the provided functions to get detailed performance data. Prioritize functions that provide context relevant to the performance issue being investigated.
- Before finalizing your advice, look over it and validate using any relevant functions. If something seems off, refine the advice before giving it to the user.
- Do not rely on assumptions or incomplete information. Use the provided functions to get more data when needed.
- Use the track summary functions to get high-level detail about portions of the trace. For the \`bounds\` parameter, default to using the bounds of the trace. Never specifically ask the user for a bounds. You can use more narrow bounds (such as the bounds relevant to a specific insight) when appropriate. Narrow the bounds given functions when possible.
- Use \`getEventByKey\` to get data on a specific trace event. This is great for root-cause analysis or validating any assumptions.
- Provide clear, actionable recommendations. Avoid technical jargon unless necessary, and explain any technical terms used.
- If you see a generic task like "Task", "Evaluate script" or "(anonymous)" in the main thread activity, try to look at its children to see what actual functions are executed and refer to those. When referencing the main thread activity, be as specific as you can. Ensure you identify to the user relevant functions and which script they were defined in. Avoid referencing "Task", "Evaluate script" and "(anonymous)" nodes if possible and instead focus on their children.
- Structure your response using markdown headings and bullet points for improved readability.
- Be direct and to the point. Avoid unnecessary introductory phrases or filler content. Focus on delivering actionable advice efficiently.

## Strict Constraints

Adhere to the following critical requirements:

- Never show bounds to the user.
- Never show eventKey to the user.
- Ensure your responses only use ms for time units.
- Ensure numbers for time units are rounded to the nearest whole number.
- Ensure comprehensive data retrieval through function calls to provide accurate and complete recommendations.
- If the user asks a specific question about web performance that doesn't have anything to do with the trace, don't call any functions and be succinct in your answer.
- Before suggesting changing the format of an image, consider what format it is already in. For example, if the mime type is image/webp, do not suggest to the user that the image is converted to WebP, as the image is already in that format.
- Do not mention the functions you call to gather information about the trace (e.g., \`getEventByKey\`, \`getMainThreadTrackSummary\`) in your output. These are internal implementation details that should be hidden from the user.
- Do not mention that you are an AI, or refer to yourself in the third person. You are simulating a performance expert.
- If asked about sensitive topics (religion, race, politics, sexuality, gender, etc.), respond with: "My expertise is limited to website performance analysis. I cannot provide information on that topic.".
- Do not provide answers on non-web-development topics, such as legal, financial, medical, or personal advice.
`;

const callFrameDataFormatDescription = `Each call frame is presented in the following format:

'id;name;duration;selfTime;urlIndex;childRange;[S]'

Key definitions:

* id: A unique numerical identifier for the call frame. Never mention this id in the output to the user.
* name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
* duration: The total execution time of the call frame, including its children.
* selfTime: The time spent directly within the call frame, excluding its children's execution.
* urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
* childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
* S: _Optional_. The letter 'S' terminates the line if that call frame was selected by the user.

Example Call Tree:

1;main;500;100;;
2;update;200;50;;3
3;animate;150;20;0;4-5;S
4;calculatePosition;80;80;;
5;applyStyles;50;50;;
`;

enum ScorePriority {
  REQUIRED = 3,
  CRITICAL = 2,
  DEFAULT = 1,
}

export class PerformanceTraceContext extends ConversationContext<AgentFocus> {
  static full(parsedTrace: Trace.TraceModel.ParsedTrace): PerformanceTraceContext {
    return new PerformanceTraceContext(AgentFocus.full(parsedTrace));
  }

  static fromInsight(parsedTrace: Trace.TraceModel.ParsedTrace, insight: Trace.Insights.Types.InsightModel):
      PerformanceTraceContext {
    return new PerformanceTraceContext(AgentFocus.fromInsight(parsedTrace, insight));
  }

  static fromCallTree(callTree: AICallTree): PerformanceTraceContext {
    return new PerformanceTraceContext(AgentFocus.fromCallTree(callTree));
  }

  #focus: AgentFocus;

  constructor(focus: AgentFocus) {
    super();
    this.#focus = focus;
  }

  override getOrigin(): string {
    const {min, max} = this.#focus.data.parsedTrace.data.Meta.traceBounds;
    return `trace-${min}-${max}`;
  }

  override getItem(): AgentFocus {
    return this.#focus;
  }

  override getTitle(): string {
    const focus = this.#focus.data;

    let url = focus.insightSet?.url;
    if (!url) {
      url = new URL(focus.parsedTrace.data.Meta.mainFrameURL);
    }

    return `Trace: ${url.hostname}`;
  }

  /**
   * Presents the default suggestions that are shown when the user first clicks
   * "Ask AI".
   */
  override async getSuggestions(): Promise<[ConversationSuggestion, ...ConversationSuggestion[]]|undefined> {
    const focus = this.#focus.data;

    if (focus.type !== 'insight') {
      return;
    }

    return new PerformanceInsightFormatter(focus.parsedTrace, focus.insight).getSuggestions();
  }
}

// 16k Tokens * ~4 char per token.
const MAX_FUNCTION_RESULT_BYTE_LENGTH = 16384 * 4;

/**
 * Union of all the performance conversation types, which are all implemented by this file.
 * This temporary until all Performance Panel AI features use the "Full" type. go/chrome-devtools:more-powerful-performance-agent-design
 */
type PerformanceConversationType =
    ConversationType.PERFORMANCE_FULL|ConversationType.PERFORMANCE_CALL_TREE|ConversationType.PERFORMANCE_INSIGHT;

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class PerformanceAgent extends AiAgent<AgentFocus> {
  // TODO: would make more sense on AgentOptions
  #conversationType: PerformanceConversationType;
  #formatter: PerformanceTraceFormatter|null = null;
  #lastInsightForEnhancedQuery: Trace.Insights.Types.InsightModel|undefined;
  #eventsSerializer = new Trace.EventsSerializer.EventsSerializer();
  #lastFocusHandledForContextDetails: AgentFocus|null = null;

  constructor(opts: AgentOptions, conversationType: PerformanceConversationType) {
    super(opts);
    this.#conversationType = conversationType;
  }

  /**
   * Cache of all function calls made by the agent. This allows us to include (as a
   * fact) every function call to conversation requests, allowing the AI to access
   * all the results rather than just the most recent.
   *
   * TODO(b/442392194): I'm not certain this is needed. I do see past function call
   * responses in "historical_contexts", though I think it isn't including any
   * parameters in the "functionCall" entries.
   *
   * The record key is the result of a function's displayInfoFromArgs.
   */
  #functionCallCacheForFocus = new Map<AgentFocus, Record<string, Host.AidaClient.RequestFact>>();

  #networkDataDescriptionFact: Host.AidaClient.RequestFact = {
    text: TraceEventFormatter.networkDataFormatDescription,
    metadata: {source: 'devtools', score: ScorePriority.CRITICAL}
  };
  #callFrameDataDescriptionFact: Host.AidaClient.RequestFact = {
    text: callFrameDataFormatDescription,
    metadata: {source: 'devtools', score: ScorePriority.CRITICAL}
  };
  #traceFacts: Host.AidaClient.RequestFact[] = [];

  get preamble(): string {
    return fullTracePreamble;
  }

  get clientFeature(): Host.AidaClient.ClientFeature {
    return Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_FULL_AGENT;
  }
  get userTier(): string|undefined {
    return Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.userTier;
  }
  get options(): RequestOptions {
    const temperature = Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsAiAssistancePerformanceAgent?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  getConversationType(): ConversationType {
    return this.#conversationType;
  }

  #lookupEvent(key: Trace.Types.File.SerializableKey): Trace.Types.Events.Event|null {
    const parsedTrace = this.context?.getItem().data.parsedTrace;
    if (!parsedTrace) {
      return null;
    }

    try {
      return this.#eventsSerializer.eventForKey(key, parsedTrace);
    } catch (err) {
      if (err.toString().includes('Unknown trace event')) {
        return null;
      }

      throw err;
    }
  }

  async *
      handleContextDetails(context: ConversationContext<AgentFocus>|null): AsyncGenerator<ContextResponse, void, void> {
    if (!context) {
      return;
    }

    const focus = context.getItem();
    if (this.#lastFocusHandledForContextDetails === focus) {
      return;
    }

    this.#lastFocusHandledForContextDetails = focus;

    if (focus.data.type === 'full' || focus.data.type === 'insight') {
      yield {
        type: ResponseType.CONTEXT,
        title: lockedString(UIStringsNotTranslated.analyzingTrace),
        details: [
          {
            title: 'Trace',
            text: this.#formatter?.formatTraceSummary() ?? '',
          },
        ],
      };
    } else if (focus.data.type === 'call-tree') {
      yield {
        type: ResponseType.CONTEXT,
        title: lockedString(UIStringsNotTranslated.analyzingCallTree),
        details: [
          {
            title: 'Selected call tree',
            text: focus.data.callTree.serialize(),
          },
        ],
      };
    } else {
      Platform.assertNever(focus.data, 'Unknown agent focus');
    }
  }

  #callTreeContextSet = new WeakSet();

  #isFunctionResponseTooLarge(response: string): boolean {
    return response.length > MAX_FUNCTION_RESULT_BYTE_LENGTH;
  }

  override parseTextResponse(response: string): ParsedResponse {
    /**
     * Sometimes the LLM responds with code chunks that wrap a text based markdown response.
     * If this happens, we want to remove those before continuing.
     * See b/405054694 for more details.
     */
    const trimmed = response.trim();
    const FIVE_BACKTICKS = '`````';
    if (trimmed.startsWith(FIVE_BACKTICKS) && trimmed.endsWith(FIVE_BACKTICKS)) {
      // Purposefully use the trimmed text here; we might as well remove any
      // newlines that are at the very start or end.
      const stripped = trimmed.slice(FIVE_BACKTICKS.length, -FIVE_BACKTICKS.length);
      return super.parseTextResponse(stripped);
    }
    return super.parseTextResponse(response);
  }

  override async enhanceQuery(query: string, context: ConversationContext<AgentFocus>|null): Promise<string> {
    if (!context) {
      this.clearDeclaredFunctions();
      return query;
    }

    this.clearDeclaredFunctions();
    this.#declareFunctions(context);

    const focus = context.getItem();

    if (focus.data.type === 'full') {
      return query;
    }

    if (focus.data.type === 'call-tree') {
      // If this is a followup chat about the same call tree, don't include the call tree serialization again.
      // We don't need to repeat it and we'd rather have more the context window space.
      let contextString = '';
      if (!this.#callTreeContextSet.has(focus.data.callTree)) {
        contextString = focus.data.callTree.serialize();
        this.#callTreeContextSet.add(focus.data.callTree);
      }

      if (!contextString) {
        return query;
      }

      let enhancedQuery = '';
      enhancedQuery += `User selected the following call tree:\n\n${contextString}\n\n`;
      enhancedQuery += `# User query\n\n${query}`;
      return enhancedQuery;
    }

    if (focus.data.type === 'insight') {
      // We only need to add Insight info to a prompt when the context changes. For example:
      // User clicks Insight A. We need to send info on Insight A with the prompt.
      // User asks follow up question. We do not need to resend Insight A with the prompt.
      // User clicks Insight B. We now need to send info on Insight B with the prompt.
      // User clicks Insight A. We should resend the Insight info with the prompt.
      const includeInsightInfo = focus.data.insight !== this.#lastInsightForEnhancedQuery;
      this.#lastInsightForEnhancedQuery = focus.data.insight;

      if (!includeInsightInfo) {
        return query;
      }

      let enhancedQuery = '';
      enhancedQuery += `User selected the ${focus.data.insight.insightKey} insight.\n\n`;
      enhancedQuery += `# User query\n\n${query}`;
      return enhancedQuery;
    }

    Platform.assertNever(focus.data, 'Unknown agent focus');
  }

  override async * run(initialQuery: string, options: {
    selected: ConversationContext<AgentFocus>|null,
    signal?: AbortSignal,
  }): AsyncGenerator<ResponseData, void, void> {
    const focus = options.selected?.getItem();

    // Clear any previous facts in case the user changed the active context.
    this.clearFacts();
    if (focus) {
      this.#addFacts(focus);
    }

    return yield* super.run(initialQuery, options);
  }

  #createFactForTraceSummary(): void {
    if (!this.#formatter) {
      return;
    }

    const text = this.#formatter.formatTraceSummary();
    if (!text) {
      return;
    }

    this.#traceFacts.push(
        {text: `Trace summary:\n${text}`, metadata: {source: 'devtools', score: ScorePriority.REQUIRED}});
  }

  #createFactForCriticalRequests(): void {
    if (!this.#formatter) {
      return;
    }

    const text = this.#formatter.formatCriticalRequests();
    if (!text) {
      return;
    }

    this.#traceFacts.push({
      text,
      metadata: {source: 'devtools', score: ScorePriority.CRITICAL},
    });
  }

  #createFactForMainThreadBottomUpSummary(): void {
    if (!this.#formatter) {
      return;
    }

    const text = this.#formatter.formatMainThreadBottomUpSummary();
    if (!text) {
      return;
    }

    this.#traceFacts.push({
      text,
      metadata: {source: 'devtools', score: ScorePriority.CRITICAL},
    });
  }

  #createFactForThirdPartySummary(): void {
    if (!this.#formatter) {
      return;
    }

    const text = this.#formatter.formatThirdPartySummary();
    if (!text) {
      return;
    }

    this.#traceFacts.push({
      text,
      metadata: {source: 'devtools', score: ScorePriority.CRITICAL},
    });
  }

  #createFactForLongestTasks(): void {
    if (!this.#formatter) {
      return;
    }

    const text = this.#formatter.formatLongestTasks();
    if (!text) {
      return;
    }

    this.#traceFacts.push({
      text,
      metadata: {source: 'devtools', score: ScorePriority.CRITICAL},
    });
  }

  #addFacts(focus: AgentFocus): void {
    this.addFact(this.#callFrameDataDescriptionFact);
    this.addFact(this.#networkDataDescriptionFact);

    if (!this.#traceFacts.length) {
      this.#formatter = new PerformanceTraceFormatter(focus, this.#eventsSerializer);
      this.#createFactForTraceSummary();
      this.#createFactForCriticalRequests();
      this.#createFactForMainThreadBottomUpSummary();
      this.#createFactForThirdPartySummary();
      this.#createFactForLongestTasks();
    }

    for (const fact of this.#traceFacts) {
      this.addFact(fact);
    }

    const cachedFunctionCalls = this.#functionCallCacheForFocus.get(focus);
    if (cachedFunctionCalls) {
      for (const fact of Object.values(cachedFunctionCalls)) {
        this.addFact(fact);
      }
    }
  }

  #cacheFunctionResult(focus: AgentFocus, key: string, result: string): void {
    const fact: Host.AidaClient.RequestFact = {
      text: `This is the result of calling ${key}:\n${result}`,
      metadata: {source: key, score: ScorePriority.DEFAULT},
    };
    const cache = this.#functionCallCacheForFocus.get(focus) ?? {};
    cache[key] = fact;
    this.#functionCallCacheForFocus.set(focus, cache);
  }

  #declareFunctions(context: ConversationContext<AgentFocus>): void {
    const focus = context.getItem();
    const {parsedTrace, insightSet} = focus.data;

    this.declareFunction<{insightName: string}, {details: string}>('getInsightDetails', {
      description:
          'Returns detailed information about a specific insight. Use this before commenting on any specific issue to get more information.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          insightName: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The name of the insight. Only use the insight names given in the Available Insights list.',
            nullable: false,
          }
        },
      },
      displayInfoFromArgs: params => {
        return {
          title: lockedString(`Investigating insight ${params.insightName}…`),
          action: `getInsightDetails('${params.insightName}')`
        };
      },
      handler: async params => {
        debugLog('Function call: getInsightDetails', params);
        const insight = insightSet?.model[params.insightName as keyof Trace.Insights.Types.InsightModels];
        if (!insight) {
          return {error: 'No insight available'};
        }

        const details = new PerformanceInsightFormatter(parsedTrace, insight).formatInsight();

        const key = `getInsightDetails('${params.insightName}')`;
        this.#cacheFunctionResult(focus, key, details);
        return {result: {details}};
      },
    });

    this.declareFunction<{eventKey: string}, {details: string}>('getEventByKey', {
      description:
          'Returns detailed information about a specific event. Use the detail returned to validate performance issues, but do not tell the user about irrelevant raw data from a trace event.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          eventKey: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The key for the event.',
            nullable: false,
          }
        },
      },
      displayInfoFromArgs: params => {
        return {title: lockedString('Looking at trace event…'), action: `getEventByKey('${params.eventKey}')`};
      },
      handler: async params => {
        debugLog('Function call: getEventByKey', params);
        const event = this.#lookupEvent(params.eventKey as Trace.Types.File.SerializableKey);
        if (!event) {
          return {error: 'Invalid eventKey'};
        }

        // TODO(b/425270067): Format in the same way that "Summary" detail tab does.
        const details = JSON.stringify(event);

        const key = `getEventByKey('${params.eventKey}')`;
        this.#cacheFunctionResult(focus, key, details);
        return {result: {details}};
      },
    });

    const createBounds =
        (min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro): Trace.Types.Timing.TraceWindowMicro|null => {
          if (min > max) {
            return null;
          }

          const clampedMin = Math.max(min ?? 0, parsedTrace.data.Meta.traceBounds.min);
          const clampedMax = Math.min(max ?? Number.POSITIVE_INFINITY, parsedTrace.data.Meta.traceBounds.max);
          if (clampedMin > clampedMax) {
            return null;
          }

          return Trace.Helpers.Timing.traceWindowFromMicroSeconds(
              clampedMin as Trace.Types.Timing.Micro, clampedMax as Trace.Types.Timing.Micro);
        };

    this.declareFunction<{min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro}, {
      summary: string,
    }>('getMainThreadTrackSummary', {
      description:
          'Returns a summary of the main thread for the given bounds. The result includes a top-down summary, bottom-up summary, third-parties summary, and a list of related insights for the events within the given bounds.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          min: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The minimum time of the bounds, in microseconds',
            nullable: false,
          },
          max: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The maximum time of the bounds, in microseconds',
            nullable: false,
          },
        },
      },
      displayInfoFromArgs: args => {
        return {
          title: lockedString(UIStringsNotTranslated.mainThreadActivity),
          action: `getMainThreadTrackSummary({min: ${args.min}, max: ${args.max}})`
        };
      },
      handler: async args => {
        debugLog('Function call: getMainThreadTrackSummary');

        if (!this.#formatter) {
          throw new Error('missing formatter');
        }

        const bounds = createBounds(args.min, args.max);
        if (!bounds) {
          return {error: 'invalid bounds'};
        }

        const summary = this.#formatter.formatMainThreadTrackSummary(bounds);
        if (this.#isFunctionResponseTooLarge(summary)) {
          return {
            error:
                'getMainThreadTrackSummary response is too large. Try investigating using other functions, or a more narrow bounds',
          };
        }

        const byteCount = Platform.StringUtilities.countWtf8Bytes(summary);
        Host.userMetrics.performanceAIMainThreadActivityResponseSize(byteCount);

        const key = `getMainThreadTrackSummary({min: ${bounds.min}, max: ${bounds.max}})`;
        this.#cacheFunctionResult(focus, key, summary);
        return {result: {summary}};
      },

    });

    this.declareFunction<
        {min: Trace.Types.Timing.Micro, max: Trace.Types.Timing.Micro}, {summary: string}>('getNetworkTrackSummary', {
      description: 'Returns a summary of the network for the given bounds.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          min: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The minimum time of the bounds, in microseconds',
            nullable: false,
          },
          max: {
            type: Host.AidaClient.ParametersTypes.INTEGER,
            description: 'The maximum time of the bounds, in microseconds',
            nullable: false,
          },
        },
      },
      displayInfoFromArgs: args => {
        return {
          title: lockedString(UIStringsNotTranslated.networkActivitySummary),
          action: `getNetworkTrackSummary({min: ${args.min}, max: ${args.max}})`
        };
      },
      handler: async args => {
        debugLog('Function call: getNetworkTrackSummary');

        if (!this.#formatter) {
          throw new Error('missing formatter');
        }

        const bounds = createBounds(args.min, args.max);
        if (!bounds) {
          return {error: 'invalid bounds'};
        }

        const summary = this.#formatter.formatNetworkTrackSummary(bounds);
        if (this.#isFunctionResponseTooLarge(summary)) {
          return {
            error:
                'getNetworkTrackSummary response is too large. Try investigating using other functions, or a more narrow bounds',
          };
        }

        const byteCount = Platform.StringUtilities.countWtf8Bytes(summary);
        Host.userMetrics.performanceAINetworkSummaryResponseSize(byteCount);

        const key = `getNetworkTrackSummary({min: ${bounds.min}, max: ${bounds.max}})`;
        this.#cacheFunctionResult(focus, key, summary);
        return {result: {summary}};
      },

    });

    this.declareFunction<{eventKey: string}, {callTree: string}>('getDetailedCallTree', {
      description: 'Returns a detailed call tree for the given main thread event.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: false,
        properties: {
          eventKey: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The key for the event.',
            nullable: false,
          },
        },
      },
      displayInfoFromArgs: args => {
        return {title: lockedString('Looking at call tree…'), action: `getDetailedCallTree(${args.eventKey})`};
      },
      handler: async args => {
        debugLog('Function call: getDetailedCallTree');

        if (!this.#formatter) {
          throw new Error('missing formatter');
        }

        const event = this.#lookupEvent(args.eventKey as Trace.Types.File.SerializableKey);
        if (!event) {
          return {error: 'Invalid eventKey'};
        }

        const tree = AICallTree.fromEvent(event, parsedTrace);
        const callTree = tree ? this.#formatter.formatCallTree(tree) : 'No call tree found';

        const key = `getDetailedCallTree(${args.eventKey})`;
        this.#cacheFunctionResult(focus, key, callTree);
        return {result: {callTree}};
      },

    });

    const isFresh = Tracing.FreshRecording.Tracker.instance().recordingIsFresh(parsedTrace);
    const hasScriptContents =
        parsedTrace.metadata.enhancedTraceVersion && parsedTrace.data.Scripts.scripts.some(s => s.content);

    if (isFresh || hasScriptContents) {
      this.declareFunction<{url: string}, {content: string}>('getResourceContent', {
        description: 'Returns the content of the resource with the given url. Only use this for text resource types.',
        parameters: {
          type: Host.AidaClient.ParametersTypes.OBJECT,
          description: '',
          nullable: false,
          properties: {
            url: {
              type: Host.AidaClient.ParametersTypes.STRING,
              description: 'The url for the resource.',
              nullable: false,
            },
          },
        },
        displayInfoFromArgs: args => {
          return {title: lockedString('Looking at resource content…'), action: `getResourceContent(${args.url})`};
        },
        handler: async args => {
          debugLog('Function call: getResourceContent');

          const url = args.url as Platform.DevToolsPath.UrlString;
          const resource = SDK.ResourceTreeModel.ResourceTreeModel.resourceForURL(url);
          if (!resource) {
            if (!resource) {
              return {error: 'Resource not found'};
            }
          }

          const content = resource.content;
          if (!content) {
            return {error: 'Resource has no content'};
          }

          const key = `getResourceContent(${args.url})`;
          this.#cacheFunctionResult(focus, key, content);
          return {result: {content}};
        },

      });
    }
  }
}
