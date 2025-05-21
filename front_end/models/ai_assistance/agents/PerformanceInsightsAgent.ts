// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import {html, type TemplateResult} from '../../../ui/lit/lit.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../data_formatters/PerformanceInsightFormatter.js';
import {debugLog} from '../debug.js';

import {
  type AgentOptions as BaseAgentOptions,
  AiAgent,
  type ContextDetail,
  type ContextResponse,
  ConversationContext,
  type ConversationSuggestion,
  type ParsedResponse,
  type RequestOptions,
  type ResponseData,
  ResponseType
} from './AiAgent.js';

const UIStringsNotTranslated = {
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
const preamble = `You are an AI-powered web performance optimization expert, simulating a highly skilled Chrome DevTools user. Your goal is to provide actionable advice to web developers based on Chrome Performance Panel insights.

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

export class InsightContext extends ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight> {
  readonly #insight: TimelineUtils.InsightAIContext.ActiveInsight;

  constructor(insight: TimelineUtils.InsightAIContext.ActiveInsight) {
    super();
    this.#insight = insight;
  }

  getOrigin(): string {
    /**
     * We want to force a new conversation when the user imports / records a
     * new trace. There is no concept of a "trace ID" in the trace events, and
     * we can't use something like the main frame ID or main process ID as those
     * can be the same if you record the same site / in the same session. We
     * also can't use something like a URL, as people might record once, fix
     * something, and re-record the same domain. So, we take the min & max time
     * bounds and use that. It's not perfect but the chances of someone
     * recording two traces with the exact same microsec start & end time are
     * pretty small...
     */
    const {min, max} = this.#insight.parsedTrace.Meta.traceBounds;
    return `trace-${min}-${max}`;
  }

  getItem(): TimelineUtils.InsightAIContext.ActiveInsight {
    return this.#insight;
  }

  override getIcon(): TemplateResult {
    return html`<devtools-icon name="performance" title="Performance"
        style="color: var(--sys-color-on-surface-subtle);"></devtools-icon>`;
  }

  override getTitle(): string {
    return `Insight: ${this.#insight.title()}`;
  }

  /**
   * Presents the default suggestions that are shown when the user first clicks
   * "Ask AI" on an Insight.
   */
  override async getSuggestions(): Promise<[ConversationSuggestion, ...ConversationSuggestion[]]> {
    switch (this.#insight.insight.insightKey) {
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
      case 'InteractionToNextPaint':
        return [
          {title: 'Suggest fixes for my longest interaction'}, {title: 'Why is a large INP score problematic?'},
          {title: 'What\'s the biggest contributor to my longest interaction?'}
        ];
      case 'LCPDiscovery':
        return [
          {title: 'Suggest fixes to reduce my LCP'}, {title: 'What can I do to reduce my LCP discovery time?'},
          {title: 'Why is LCP discovery time important?'}
        ];
      case 'LCPPhases':
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
        return [{title: 'Is my site being served using the recommended HTTP best practices?'}];
      case 'LegacyJavaScript':
        return [{title: 'Is my site polyfilling modern JavaScript features?'}];
      default:
        Platform.assertNever(this.#insight.insight.insightKey, 'Unknown insight key');
    }
  }
}

// 16k Tokens * ~4 char per token.
const MAX_FUNCTION_RESULT_BYTE_LENGTH = 16384 * 4;

export class PerformanceInsightsAgent extends AiAgent<TimelineUtils.InsightAIContext.ActiveInsight> {
  #insight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|undefined;

  #lastContextForEnhancedQuery: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|undefined;

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
  #functionCallCache = new Map<TimelineUtils.InsightAIContext.ActiveInsight, {
    getNetworkActivitySummary?: Host.AidaClient.RequestFact,
    getMainThreadActivity?: Host.AidaClient.RequestFact,
  }>();

  override async *
      handleContextDetails(activeContext: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!activeContext) {
      return;
    }

    const activeInsight = activeContext.getItem();
    const insightTitle = activeInsight.title();
    const title = `Analyzing insight: ${insightTitle}`;
    // The details are the exact text sent to the LLM to allow the user to inspect it.
    const formatter = new PerformanceInsightFormatter(activeInsight);
    const titleDetail: ContextDetail = {
      // Purposefully use the raw title in the details view, we don't need to repeat "Analyzing insight"
      title: insightTitle,
      // Important: this must reflect what data is sent to the LLM.
      text: formatter.formatInsight()
    };
    yield {type: ResponseType.CONTEXT, title, details: [titleDetail]};
  }

  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_INSIGHTS_AGENT;

  // Note: for both userTier and options we purposefully reuse the flags from
  // the Performance Agent, rather than define new ones as we didn't think that
  // was necessary.

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

  constructor(opts: BaseAgentOptions) {
    super(opts);

    this.declareFunction<Record<never, unknown>, {
      requests: string[],
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
        if (!this.#insight) {
          return {error: 'No insight available'};
        }
        const activeInsight = this.#insight.getItem();
        const requests = TimelineUtils.InsightAIContext.AIQueries.networkRequests(
            activeInsight.insight,
            activeInsight.parsedTrace,
        );
        const formatted =
            requests.map(r => TraceEventFormatter.networkRequest(r, activeInsight.parsedTrace, {verbose: false}));

        const byteCount = Platform.StringUtilities.countWtf8Bytes(formatted.join('\n'));
        Host.userMetrics.performanceAINetworkSummaryResponseSize(byteCount);

        if (this.#isFunctionResponseTooLarge(formatted.join('\n'))) {
          return {
            error: 'getNetworkActivitySummary response is too large. Try investigating using other functions',
          };
        }
        const summaryFact: Host.AidaClient.RequestFact = {
          text:
              `This is the network summary for this insight. You can use this and not call getNetworkActivitySummary again:\n${
                  formatted.join('\n')}`,
          metadata: {source: 'getNetworkActivitySummary()'}
        };
        const cacheForInsight = this.#functionCallCache.get(activeInsight) ?? {};
        cacheForInsight.getNetworkActivitySummary = summaryFact;
        this.#functionCallCache.set(activeInsight, cacheForInsight);

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
        if (!this.#insight) {
          return {error: 'No insight available'};
        }
        const activeInsight = this.#insight.getItem();
        const request = TimelineUtils.InsightAIContext.AIQueries.networkRequest(activeInsight.parsedTrace, params.url);
        if (!request) {
          return {error: 'Request not found'};
        }
        const formatted = TraceEventFormatter.networkRequest(request, activeInsight.parsedTrace, {verbose: true});
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

    Node: $id – $name
    Selected: true
    dur: $duration
    self: $self
    URL #: $url_number
    Children:
      * $child.id – $child.name

The fields are:

* name:  A short string naming the callframe (e.g. 'Evaluate Script' or the JS function name 'InitializeApp')
* id:  A numerical identifier for the callframe
* Selected:  Set to true if this callframe is the one the user selected.
* url_number:  The number of the URL referenced in the "All URLs" list
* dur:  The total duration of the callframe (includes time spent in its descendants), in milliseconds.
* self:  The self duration of the callframe (excludes time spent in its descendants), in milliseconds. If omitted, assume the value is 0.
* children:  An list of child callframes, each denoted by their id and name`,
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
        if (!this.#insight) {
          return {error: 'No insight available'};
        }
        const activeInsight = this.#insight.getItem();
        const tree = TimelineUtils.InsightAIContext.AIQueries.mainThreadActivity(
            activeInsight.insight,
            activeInsight.parsedTrace,
        );
        if (!tree) {
          return {error: 'No main thread activity found'};
        }
        const activity = tree.serialize();
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
        const cacheForInsight = this.#functionCallCache.get(activeInsight) ?? {};
        cacheForInsight.getMainThreadActivity = activityFact;
        this.#functionCallCache.set(activeInsight, cacheForInsight);

        return {result: {activity}};
      },

    });
  }

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

  override async enhanceQuery(
      query: string,
      selectedInsight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null): Promise<string> {
    if (!selectedInsight) {
      return query;
    }
    const formatter = new PerformanceInsightFormatter(selectedInsight.getItem());

    // We only need to add Insight info to a prompt when the context changes. For example:
    // User clicks Insight A. We need to send info on Insight A with the prompt.
    // User asks follow up question. We do not need to resend Insight A with the prompt.
    // User clicks Insight B. We now need to send info on Insight B with the prompt.
    // User clicks Insight A. We should resend the Insight info with the prompt.
    const includeInsightInfo = selectedInsight !== this.#lastContextForEnhancedQuery;
    const extraQuery =
        `${includeInsightInfo ? formatter.formatInsight() + '\n\n' : ''}# User question for you to answer:\n`;

    const finalQuery = `${extraQuery}${query}`;
    this.#lastContextForEnhancedQuery = selectedInsight;
    return finalQuery;
  }

  override async * run(initialQuery: string, options: {
    selected: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null,
    signal?: AbortSignal,
  }): AsyncGenerator<ResponseData, void, void> {
    this.#insight = options.selected ?? undefined;

    // Clear any previous facts in case the user changed the active context.
    this.clearFacts();
    const cachedFunctionCalls = this.#insight ? this.#functionCallCache.get(this.#insight.getItem()) : null;
    if (cachedFunctionCalls) {
      for (const fact of Object.values(cachedFunctionCalls)) {
        this.addFact(fact);
      }
    }

    return yield* super.run(initialQuery, options);
  }
}
