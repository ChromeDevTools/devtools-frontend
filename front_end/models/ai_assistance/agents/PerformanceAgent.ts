// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {html, type TemplateResult} from '../../../ui/lit/lit.js';
import * as Trace from '../../trace/trace.js';
import {ConversationType} from '../AiHistoryStorage.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../data_formatters/PerformanceInsightFormatter.js';
import {debugLog} from '../debug.js';

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
  analyzingCallTree: 'Analyzing call tree',
  /**
   *@description Shown when the agent is investigating network activity
   */
  networkActivitySummary: 'Investigating network activity…',
  /**
   *@description Shown when the agent is investigating main thread activity
   */
  mainThreadActivity: 'Investigating main thread activity…',
} as const;
const lockedString = i18n.i18n.lockedString;

/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
/* clang-format off */
const insightPreamble = `You are an AI-powered web performance optimization expert, simulating a highly skilled Chrome DevTools user. Your goal is to provide actionable advice to web developers based on Chrome Performance Panel insights.

You will be provided with an Insight from the Chrome Performance Panel. This Insight will contain information about the performance of the web site. It is your task to analyze the data available to you and suggest solutions to improve the performance of the page.

You will be told the following information about the Insight:
- **Insight Title:** The name of the performance issue detected by Chrome DevTools.
- **Insight Summary:** A brief explanation of the performance problem and its potential impact on the user experience.
- **Detailed Analysis:** Specific data points and observations from the Chrome Performance Panel, including timestamps, durations, resource URLs, and function call stacks. Use this data to pinpoint the root cause of the performance issue.

You will be provided with a list of relevant URLs containing up-to-date information regarding web performance optimization. Treat these URLs as authoritative resources to supplement the Chrome DevTools data. Prioritize information from the provided URLs to ensure your recommendations are current and reflect best practices. Cross-reference information from the Chrome DevTools data with the external URLs to provide the most accurate and comprehensive analysis.

Additionally, you may also be asked basic questions such as "What is LCP?". Ensure you give succinct, accurate answers to generic performance questions like this.

*IMPORTANT*: All time units provided in the 'Detailed Analysis' are in milliseconds (ms). Ensure your response reflects this unit of measurement.

## Step-by-step instructions

- Utilize the provided functions (e.g., \`getMainThreadActivity\`, \`getNetworkActivitySummary\`) to retrieve detailed performance data. Prioritize function calls that provide context relevant to the Insight being analyzed.
- Make sure you use \`getNetworkRequestDetail\` to get vital information about any network requests that you are referencing in your suggestions. Use this information to verify your assumptions.
- Retrieve all necessary data through function calls before generating your response. Do not rely on assumptions or incomplete information.
- Provide clear, actionable recommendations. Avoid technical jargon unless necessary, and explain any technical terms used.
- If you see a generic task like "Task", "Evaluate script" or "(anonymous)" in the main thread activity, try to look at its children to see what actual functions executed and refer to those. When referencing main thread activity, be as specific as you can. Ensure you identify to the user relevant functions and which script they were defined in. Avoid referencing "Task", "Evaluate script" and "(anonymous)" nodes if possible and instead focus on their children.
- Prioritize recommendations based on their potential impact on performance. Focus on the most significant bottlenecks.
- Structure your response using markdown headings and bullet points for improved readability.
- Your answer should contain the following sections:
    1. **Analysis:** Based on the user's question, explain the observed performance issues, their impact on user experience, and the key metrics used to identify them. Include relevant timestamps and durations from the provided data. Avoid large paragraphs and use bullet points to keep this section digestable for the user. Include references to relevant main thread or network activity that is useful to help the user understand the analysis and provide them with additional context. Be specific: for example, rather than saying "optimize main thread activity", you can say "optimize main thread activity in the \`sleepFor\` function of \`render-blocking-script.js\`."
    2. **Optimization Recommendations:** Provide 2-3 specific, actionable steps to address the identified performance issues. Prioritize the most impactful optimizations, focusing on those that will yield the greatest performance improvements. Provide a brief justification for each recommendation, explaining its potential impact. Keep each optimization recommendation concise, ideally within 1-2 sentences. Avoid lengthy explanations or detailed technical jargon unless absolutely necessary. Do not repeat optimizations that you have already suggested in previous responses.
- Your response should immediately start with the "Analysis" section.
- Be direct and to the point. Avoid unnecessary introductory phrases or filler content. Focus on delivering actionable advice efficiently.

## Strict Constraints

- Adhere to the following critical requirements:
    - Execute \`getMainThreadActivity\` only once *per Insight context*. If the Insight changes, you may call this function again.
    - Execute \`getNetworkActivitySummary\` only once *per Insight context*. If the Insight changes, you may call this function again.
    - Ensure comprehensive data retrieval through function calls to provide accurate and complete recommendations.
    - Before suggesting changing the format of an image, consider what format it is already in. For example, if the mime type is image/webp, do not suggest to the user that the image is converted to WebP, as the image is already in that format.
    - Do not mention function names (e.g., \`getMainThreadActivity\`, \`getNetworkActivitySummary\`) in your output. These are internal implementation details.
    - Do not mention that you are an AI, or refer to yourself in the third person. You are simulating a performance expert.
    - If asked about sensitive topics (religion, race, politics, sexuality, gender, etc.), respond with: "My expertise is limited to website performance analysis. I cannot provide information on that topic.".
    - Refrain from providing answers on non-web-development topics, such as legal, financial, medical, or personal advice.

## Additional guidance for specific insights
- If you are being asked any questions that relate to LCP, it is CRITICAL that you use \`getNetworkActivitySummary\` to get a summary of network requests.
- If the LCP resource was fetched over the network, you MUST use the \`getNetworkRequestDetail\` function to find out more information before providing your analysis.
- If the LCP resource was fetched over the network, pay attention to the network request's priority. Important resources for LCP should have a high priority. If the LCP resource's priority is not "high", suggest optimizations to the user to change this.
- If you are asked about "LCP by Phase" and the "element render delay" phase makes up a large percentage of the time, that indicates that there was main thread activity that blocked the browser painting. In this case, inspect the main thread activity and include information on what functions caused the main thread to be busy. Thoroughly inspect the main thread activity so you can be accurate in your responses.
- Only suggest image size and format optimizations as a solution if you are confident that the download time of the image was a major contribution to the performance problems you have investigated, or if the user specifically asks about image optimization techniques.
`;
/* clang-format on */

/**
 * Preamble clocks in at ~970 tokens.
 *   The prose is around 4.5 chars per token.
 * The data can be as bad as 1.8 chars per token
 *
 * Check token length in https://aistudio.google.com/
 */
export const callTreePreamble = `You are an expert performance analyst embedded within Chrome DevTools.
You meticulously examine web application behavior captured by the Chrome DevTools Performance Panel and Chrome tracing.
You will receive a structured text representation of a call tree, derived from a user-selected call frame within a performance trace's flame chart.
This tree originates from the root task associated with the selected call frame.

Each call frame is presented in the following format:

'id;name;duration;selfTime;urlIndex;childRange;[S]'

Key definitions:

* id: A unique numerical identifier for the call frame.
* name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
* duration: The total execution time of the call frame, including its children.
* selfTime: The time spent directly within the call frame, excluding its children's execution.
* urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
* childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
* S: **Optional marker.** The letter 'S' appears at the end of the line **only** for the single call frame selected by the user.

Your objective is to provide a comprehensive analysis of the **selected call frame and the entire call tree** and its context within the performance recording, including:

1.  **Functionality:** Clearly describe the purpose and actions of the selected call frame based on its properties (name, URL, etc.).
2.  **Execution Flow:**
    * **Ancestors:** Trace the execution path from the root task to the selected call frame, explaining the sequence of parent calls.
    * **Descendants:** Analyze the child call frames, identifying the tasks they initiate and any performance-intensive sub-tasks.
3.  **Performance Metrics:**
    * **Duration and Self Time:** Report the execution time of the call frame and its children.
    * **Relative Cost:** Evaluate the contribution of the call frame to the overall duration of its parent tasks and the entire trace.
    * **Bottleneck Identification:** Identify potential performance bottlenecks based on duration and self time, including long-running tasks or idle periods.
4.  **Optimization Recommendations:** Provide specific, actionable suggestions for improving the performance of the selected call frame and its related tasks, focusing on resource management and efficiency. Only provide recommendations if they are based on data present in the call tree.

# Important Guidelines:

* Maintain a concise and technical tone suitable for software engineers.
* Exclude call frame IDs and URL indices from your response.
* **Critical:** If asked about sensitive topics (religion, race, politics, sexuality, gender, etc.), respond with: "My expertise is limited to website performance analysis. I cannot provide information on that topic.".
* **Critical:** Refrain from providing answers on non-web-development topics, such as legal, financial, medical, or personal advice.

## Example Session:

All URLs:
* 0 - app.js

Call Tree:

1;main;500;100;;
2;update;200;50;;3
3;animate;150;20;0;4-5;S
4;calculatePosition;80;80;;
5;applyStyles;50;50;;

Analyze the selected call frame.

Example Response:

The selected call frame is 'animate', responsible for visual animations within 'app.js'.
It took 150ms total, with 20ms spent directly within the function.
The 'calculatePosition' and 'applyStyles' child functions consumed the remaining 130ms.
The 'calculatePosition' function, taking 80ms, is a potential bottleneck.
Consider optimizing the position calculation logic or reducing the frequency of calls to improve animation performance.
`;

function serializeFocus(focus: TimelineUtils.AIContext.AgentFocus): string {
  if (focus.data.type === 'call-tree') {
    return focus.data.callTree.serialize();
  }

  if (focus.data.type === 'insight') {
    const formatter = new PerformanceInsightFormatter(focus.data.parsedTrace, focus.data.insight);
    return formatter.formatInsight();
  }

  Platform.assertNever(focus.data, 'Unknown agent focus');
}

export class PerformanceTraceContext extends ConversationContext<TimelineUtils.AIContext.AgentFocus> {
  static fromInsight(
      parsedTrace: Trace.Handlers.Types.ParsedTrace, insight: Trace.Insights.Types.InsightModel,
      insightSetBounds: Trace.Types.Timing.TraceWindowMicro): PerformanceTraceContext {
    return new PerformanceTraceContext(
        TimelineUtils.AIContext.AgentFocus.fromInsight(parsedTrace, insight, insightSetBounds));
  }

  static fromCallTree(callTree: TimelineUtils.AICallTree.AICallTree): PerformanceTraceContext {
    return new PerformanceTraceContext(TimelineUtils.AIContext.AgentFocus.fromCallTree(callTree));
  }

  #focus: TimelineUtils.AIContext.AgentFocus;

  constructor(focus: TimelineUtils.AIContext.AgentFocus) {
    super();
    this.#focus = focus;
  }

  override getOrigin(): string {
    const focus = this.#focus.data;

    if (focus.type === 'call-tree') {
      // Although in this context we expect the call tree to have a selected node
      // as the entrypoint into the "Ask AI" tool is via selecting a node, it is
      // possible to build trees without a selected node, in which case we
      // fallback to the root node.
      const node = focus.callTree.selectedNode ?? focus.callTree.rootNode;
      const selectedEvent = node.event;
      // Get the non-resolved (ignore sourcemaps) URL for the event. We use the
      // non-resolved URL as in the context of the AI Assistance panel, we care
      // about the origin it was served on.
      const nonResolvedURL = Trace.Handlers.Helpers.getNonResolvedURL(selectedEvent, focus.callTree.parsedTrace);
      if (nonResolvedURL) {
        const origin = Common.ParsedURL.ParsedURL.extractOrigin(nonResolvedURL);
        if (origin) {  // origin could be the empty string.
          return origin;
        }
      }
      // Generate a random "origin". We do this rather than return an empty
      // string or some "unknown" string so that each event without a definite
      // URL is considered a new, standalone origin. This is safer from a privacy
      // & security perspective, else we risk bucketing events together that
      // should not be. We also don't want to make it entirely random so we
      // cannot calculate it deterministically.
      const uuid = `${selectedEvent.name}_${selectedEvent.pid}_${selectedEvent.tid}_${selectedEvent.ts}`;
      return uuid;
    }

    const {min, max} = focus.parsedTrace.Meta.traceBounds;
    return `trace-${min}-${max}`;
  }

  override getItem(): TimelineUtils.AIContext.AgentFocus {
    return this.#focus;
  }

  override getIcon(): TemplateResult {
    return html`<devtools-icon name="performance" title="Performance"
        style="color: var(--sys-color-on-surface-subtle);"></devtools-icon>`;
  }

  override getTitle(): string {
    const focus = this.#focus.data;

    if (focus.type === 'call-tree') {
      const event = focus.callTree.selectedNode?.event ?? focus.callTree.rootNode.event;
      if (!event) {
        return 'unknown';
      }
      return TimelineUtils.EntryName.nameForEntry(event);
    }

    if (focus.type === 'insight') {
      return `Insight: ${focus.insight.title}`;
    }

    Platform.assertNever(focus, 'Unknown agent focus');
  }

  /**
   * Presents the default suggestions that are shown when the user first clicks
   * "Ask AI".
   */
  override async getSuggestions(): Promise<[ConversationSuggestion, ...ConversationSuggestion[]]|undefined> {
    const focus = this.#focus.data;

    if (focus.type !== 'insight') {
      return undefined;
    }

    switch (focus.insight.insightKey) {
      case 'CLSCulprits':
        return [
          {title: 'Help me optimize my CLS score'},
          {title: 'How can I prevent layout shifts on this page?'},
        ];
      case 'DocumentLatency':
        return [
          {title: 'How do I decrease the initial loading time of my page?'},
          {title: 'Did anything slow down the request for this document?'},
        ];
      case 'DOMSize':
        return [{title: 'How can I reduce the size of my DOM?'}];
      case 'DuplicatedJavaScript':
        return [{title: 'How do I deduplicate the identified scripts in my bundle?'}];
      case 'FontDisplay':
        return [
          {title: 'How can I update my CSS to avoid layout shifts caused by incorrect `font-display` properties?'}
        ];
      case 'ForcedReflow':
        return [
          {title: 'How can I avoid layout thrashing?'}, {title: 'What is forced reflow and why is it problematic?'}
        ];
      case 'ImageDelivery':
        return [
          {title: 'What should I do to improve and optimize the time taken to fetch and display images on the page?'}
        ];
      case 'INPBreakdown':
        return [
          {title: 'Suggest fixes for my longest interaction'}, {title: 'Why is a large INP score problematic?'},
          {title: 'What\'s the biggest contributor to my longest interaction?'}
        ];
      case 'LCPDiscovery':
        return [
          {title: 'Suggest fixes to reduce my LCP'}, {title: 'What can I do to reduce my LCP discovery time?'},
          {title: 'Why is LCP discovery time important?'}
        ];
      case 'LCPBreakdown':
        return [
          {title: 'Help me optimize my LCP score'}, {title: 'Which LCP phase was most problematic?'},
          {title: 'What can I do to reduce the LCP time for this page load?'}
        ];
      case 'NetworkDependencyTree':
        return [{title: 'How do I optimize my network dependency tree?'}];
      case 'RenderBlocking':
        return [
          {title: 'Show me the most impactful render blocking requests that I should focus on'},
          {title: 'How can I reduce the number of render blocking requests?'}
        ];
      case 'SlowCSSSelector':
        return [{title: 'How can I optimize my CSS to increase the performance of CSS selectors?'}];
      case 'ThirdParties':
        return [{title: 'Which third parties are having the largest impact on my page performance?'}];
      case 'Cache':
        return [{title: 'What caching strategies can I apply to improve my page performance?'}];
      case 'Viewport':
        return [{title: 'How do I make sure my page is optimized for mobile viewing?'}];
      case 'ModernHTTP':
        return [
          {title: 'Is my site being served using the recommended HTTP best practices?'},
          {title: 'Which resources are not using a modern HTTP protocol?'},
        ];
      case 'LegacyJavaScript':
        return [{title: 'Is my site polyfilling modern JavaScript features?'}];
      default:
        Platform.assertNever(focus.insight.insightKey, 'Unknown insight key');
    }
  }
}

// 16k Tokens * ~4 char per token.
const MAX_FUNCTION_RESULT_BYTE_LENGTH = 16384 * 4;

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class PerformanceAgent extends AiAgent<TimelineUtils.AIContext.AgentFocus> {
  // TODO: would make more sense on AgentOptions
  #conversationType: ConversationType.PERFORMANCE|ConversationType.PERFORMANCE_INSIGHT;
  #lastInsightForEnhancedQuery: Trace.Insights.Types.InsightModel|undefined;

  constructor(opts: AgentOptions, conversationType: ConversationType.PERFORMANCE|ConversationType.PERFORMANCE_INSIGHT) {
    super(opts);
    this.#conversationType = conversationType;
  }

  /**
   * Store results (as facts) for the functions that are pure and return the
   * same data for the same insight.
   * This fact is then passed into the request on all future
   * queries for the conversation. This means that the LLM is far less likely to
   * call the function again, because we have provided the same data as a
   * fact. We cache based on the active insight to ensure that if the user
   * changes which insight they are focusing we will call the function again.
   * It's important that we store it as a Fact in the cache, because the AI
   * Agent stores facts in a set, and we need to pass the same object through to
   * make sure it isn't mistakenly duplicated in the request.
   */
  #functionCallCache = new Map<Trace.Insights.Types.InsightModel, {
    getNetworkActivitySummary?: Host.AidaClient.RequestFact,
    getMainThreadActivity?: Host.AidaClient.RequestFact,
  }>();

  get preamble(): string {
    if (this.#conversationType === ConversationType.PERFORMANCE) {
      return callTreePreamble;
    }
    if (this.#conversationType === ConversationType.PERFORMANCE_INSIGHT) {
      return insightPreamble;
    }
    Platform.assertNever(this.#conversationType, 'Unexpected conversation type');
  }

  get clientFeature(): Host.AidaClient.ClientFeature {
    if (this.#conversationType === ConversationType.PERFORMANCE) {
      return Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_AGENT;
    }
    if (this.#conversationType === ConversationType.PERFORMANCE_INSIGHT) {
      return Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_INSIGHTS_AGENT;
    }
    Platform.assertNever(this.#conversationType, 'Unexpected conversation type');
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

  async *
      handleContextDetails(context: ConversationContext<TimelineUtils.AIContext.AgentFocus>|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!context) {
      return;
    }

    const focus = context.getItem();

    if (focus.data.type === 'call-tree') {
      yield {
        type: ResponseType.CONTEXT,
        title: lockedString(UIStringsNotTranslated.analyzingCallTree),
        details: [
          {
            title: 'Selected call tree',
            text: serializeFocus(focus),
          },
        ],
      };
    }

    if (focus.data.type === 'insight') {
      const activeInsight = focus.data.insight;
      const title = `Analyzing insight: ${activeInsight.title}`;
      yield {
        type: ResponseType.CONTEXT,
        title,
        details: [
          {
            // Purposefully use the raw title in the details view, we don't need to repeat "Analyzing insight"
            title: activeInsight.title,
            text: serializeFocus(focus),
          },
        ],
      };
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

  override async enhanceQuery(query: string, context: ConversationContext<TimelineUtils.AIContext.AgentFocus>|null):
      Promise<string> {
    if (!context) {
      this.clearDeclaredFunctions();
      return query;
    }

    this.clearDeclaredFunctions();
    this.declareFunctions(context);

    const focus = context.getItem();
    let contextString = '';

    if (focus.data.type === 'call-tree') {
      // If this is a followup chat about the same call tree, don't include the call tree serialization again.
      // We don't need to repeat it and we'd rather have more the context window space.
      if (!this.#callTreeContextSet.has(focus.data.callTree)) {
        contextString = serializeFocus(focus);
      }
      if (!this.#callTreeContextSet.has(focus.data.callTree)) {
        this.#callTreeContextSet.add(focus.data.callTree);
      }
      const perfEnhancementQuery = contextString ? `${contextString}\n\n# User request\n\n` : '';
      return `${perfEnhancementQuery}${query}`;
    }

    if (focus.data.type === 'insight') {
      // We only need to add Insight info to a prompt when the context changes. For example:
      // User clicks Insight A. We need to send info on Insight A with the prompt.
      // User asks follow up question. We do not need to resend Insight A with the prompt.
      // User clicks Insight B. We now need to send info on Insight B with the prompt.
      // User clicks Insight A. We should resend the Insight info with the prompt.
      const includeInsightInfo = focus.data.insight !== this.#lastInsightForEnhancedQuery;
      const extraQuery =
          `${includeInsightInfo ? serializeFocus(focus) + '\n\n' : ''}# User question for you to answer:\n`;
      this.#lastInsightForEnhancedQuery = focus.data.insight;
      return `${extraQuery}${query}`;
    }

    Platform.assertNever(focus.data, 'Unknown agent focus');
  }

  override async * run(initialQuery: string, options: {
    selected: ConversationContext<TimelineUtils.AIContext.AgentFocus>|null,
    signal?: AbortSignal,
  }): AsyncGenerator<ResponseData, void, void> {
    if (this.#conversationType === ConversationType.PERFORMANCE_INSIGHT) {
      const focus = options.selected?.getItem().data;
      const insight = focus?.type === 'insight' ? focus.insight : null;

      // Clear any previous facts in case the user changed the active context.
      this.clearFacts();
      const cachedFunctionCalls = insight ? this.#functionCallCache.get(insight) : null;
      if (cachedFunctionCalls) {
        for (const fact of Object.values(cachedFunctionCalls)) {
          this.addFact(fact);
        }
      }
    }

    return yield* super.run(initialQuery, options);
  }

  private declareFunctions(context: ConversationContext<TimelineUtils.AIContext.AgentFocus>): void {
    const focus = context.getItem();

    // Currently only insight focus gets these functions.
    if (focus.data.type !== 'insight') {
      return;
    }

    const {parsedTrace, insight, insightSetBounds} = focus.data;

    this.declareFunction<Record<never, unknown>, {
      requests: string,
    }>('getNetworkActivitySummary', {
      description:
          'Returns a summary of network activity for the selected insight. If you want to get more detailed information on a network request, you can pass the URL of a request into `getNetworkRequestDetail`.',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {},
      },
      displayInfoFromArgs: () => {
        return {
          title: lockedString(UIStringsNotTranslated.networkActivitySummary),
          action: 'getNetworkActivitySummary()'
        };
      },
      handler: async () => {
        debugLog('Function call: getNetworkActivitySummary');
        if (!insight) {
          return {error: 'No insight available'};
        }
        const requests = TimelineUtils.InsightAIContext.AIQueries.networkRequests(
            insight,
            insightSetBounds,
            parsedTrace,
        );
        const formatted = TraceEventFormatter.networkRequests(requests, parsedTrace);

        const byteCount = Platform.StringUtilities.countWtf8Bytes(formatted);
        Host.userMetrics.performanceAINetworkSummaryResponseSize(byteCount);

        if (this.#isFunctionResponseTooLarge(formatted)) {
          return {
            error: 'getNetworkActivitySummary response is too large. Try investigating using other functions',
          };
        }
        const summaryFact: Host.AidaClient.RequestFact = {
          text:
              `This is the network summary for this insight. You can use this and not call getNetworkActivitySummary again:\n${
                  formatted}`,
          metadata: {source: 'getNetworkActivitySummary()'}
        };
        const cacheForInsight = this.#functionCallCache.get(insight) ?? {};
        cacheForInsight.getNetworkActivitySummary = summaryFact;
        this.#functionCallCache.set(insight, cacheForInsight);

        return {result: {requests: formatted}};
      },
    });

    this.declareFunction<Record<'url', string>, {
      request: string,
    }>('getNetworkRequestDetail', {
      description:
          'Returns detailed debugging information about a specific network request. Use this eagerly to gather information about a network request to improve your diagnosis and optimization recommendations',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {
          url: {
            type: Host.AidaClient.ParametersTypes.STRING,
            description: 'The URL of the network request',
            nullable: false,
          }
        },
      },
      displayInfoFromArgs: params => {
        return {
          title: lockedString(`Investigating network request ${params.url}…`),
          action: `getNetworkRequestDetail('${params.url}')`
        };
      },
      handler: async params => {
        debugLog('Function call: getNetworkRequestDetail', params);
        if (!insight) {
          return {error: 'No insight available'};
        }
        const request = TimelineUtils.InsightAIContext.AIQueries.networkRequest(parsedTrace, params.url);
        if (!request) {
          return {error: 'Request not found'};
        }
        const formatted = TraceEventFormatter.networkRequests([request], parsedTrace, {verbose: true});

        const byteCount = Platform.StringUtilities.countWtf8Bytes(formatted);
        Host.userMetrics.performanceAINetworkRequestDetailResponseSize(byteCount);

        if (this.#isFunctionResponseTooLarge(formatted)) {
          return {
            error: 'getNetworkRequestDetail response is too large. Try investigating using other functions',
          };
        }
        return {result: {request: formatted}};
      },
    });

    this.declareFunction<Record<never, unknown>, {activity: string}>('getMainThreadActivity', {
      description: `Returns the main thread activity for the selected insight.
  
  The tree is represented as a call frame with a root task and a series of children.
  The format of each callframe is:
  
    'id;name;duration;selfTime;urlIndex;childRange;[S]'
  
  The fields are:
  
  * id: A unique numerical identifier for the call frame.
  * name: A concise string describing the call frame (e.g., 'Evaluate Script', 'render', 'fetchData').
  * duration: The total execution time of the call frame, including its children.
  * selfTime: The time spent directly within the call frame, excluding its children's execution.
  * urlIndex: Index referencing the "All URLs" list. Empty if no specific script URL is associated.
  * childRange: Specifies the direct children of this node using their IDs. If empty ('' or 'S' at the end), the node has no children. If a single number (e.g., '4'), the node has one child with that ID. If in the format 'firstId-lastId' (e.g., '4-5'), it indicates a consecutive range of child IDs from 'firstId' to 'lastId', inclusive.
  * S: **Optional marker.** The letter 'S' appears at the end of the line **only** for the single call frame selected by the user.`,
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {},
      },
      displayInfoFromArgs: () => {
        return {title: lockedString(UIStringsNotTranslated.mainThreadActivity), action: 'getMainThreadActivity()'};
      },
      handler: async () => {
        debugLog('Function call: getMainThreadActivity');
        if (!insight) {
          return {error: 'No insight available'};
        }
        const tree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivity(
            insight,
            insightSetBounds,
            parsedTrace,
        );
        if (!tree) {
          return {error: 'No main thread activity found'};
        }
        const activity = tree.serialize();

        const byteCount = Platform.StringUtilities.countWtf8Bytes(activity);
        Host.userMetrics.performanceAIMainThreadActivityResponseSize(byteCount);

        if (this.#isFunctionResponseTooLarge(activity)) {
          return {
            error: 'getMainThreadActivity response is too large. Try investigating using other functions',
          };
        }
        const activityFact: Host.AidaClient.RequestFact = {
          text:
              `This is the main thread activity for this insight. You can use this and not call getMainThreadActivity again:\n${
                  activity}`,
          metadata: {source: 'getMainThreadActivity()'},
        };
        const cacheForInsight = this.#functionCallCache.get(insight) ?? {};
        cacheForInsight.getMainThreadActivity = activityFact;
        this.#functionCallCache.set(insight, cacheForInsight);

        return {result: {activity}};
      },

    });
  }
}
