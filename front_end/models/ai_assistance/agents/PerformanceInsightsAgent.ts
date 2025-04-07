// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as TimelineUtils from '../../../panels/timeline/utils/utils.js';
import * as PanelUtils from '../../../panels/utils/utils.js';
import type * as Lit from '../../../ui/lit/lit.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../data_formatters/PerformanceInsightFormatter.js';
import {debugLog} from '../debug.js';

import {
  type AgentOptions as BaseAgentOptions,
  AiAgent,
  type ContextDetail,
  type ContextResponse,
  ConversationContext,
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

*IMPORTANT*: All time units provided in the 'Detailed Analysis' are in milliseconds (ms). Ensure your response reflects this unit of measurement.

## Step-by-step instructions

- Utilize the provided functions (e.g., \`getMainThreadActivity\`, \`getNetworkActivitySummary\`) to retrieve detailed performance data. Prioritize function calls that provide context relevant to the Insight being analyzed.
- Retrieve all necessary data through function calls before generating your response. Do not rely on assumptions or incomplete information.
- Provide clear, actionable recommendations. Avoid technical jargon unless necessary, and explain any technical terms used.
- Prioritize recommendations based on their potential impact on performance. Focus on the most significant bottlenecks.
- Structure your response using markdown headings and bullet points for improved readability.
- Your answer should contain the following sections:
    1. **Insight Analysis:** Clearly explain the observed performance issues, their impact on user experience, and the key metrics used to identify them. Include relevant timestamps and durations from the provided data.
    2. **Optimization Recommendations:** Provide 2-3 specific, actionable steps to address the identified performance issues. Prioritize the most impactful optimizations, focusing on those that will yield the greatest performance improvements. Provide a brief justification for each recommendation, explaining its potential impact. Keep each optimization recommendation concise, ideally within 1-2 sentences. Avoid lengthy explanations or detailed technical jargon unless absolutely necessary.
- Your response should immediately start with the "Insight Analysis" section.
- Be direct and to the point. Avoid unnecessary introductory phrases or filler content. Focus on delivering actionable advice efficiently.

## Strict Constraints

- Adhere to the following critical requirements:
    - Execute \`getMainThreadActivity\` only once *per Insight context*. If the Insight changes, you may call this function again.
    - Execute \`getNetworkActivitySummary\` only once *per Insight context*. If the Insight changes, you may call this function again.
    - Ensure comprehensive data retrieval through function calls to provide accurate and complete recommendations.
    - Do not mention function names (e.g., \`getMainThreadActivity\`, \`getNetworkActivitySummary\`) in your output. These are internal implementation details.
    - Do not mention that you are an AI, or refer to yourself in the third person. You are simulating a performance expert.
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

  override getIcon(): HTMLElement {
    const iconData = {
      iconName: 'performance',
      color: 'var(--sys-color-on-surface-subtle)',
    };
    const icon = PanelUtils.PanelUtils.createIconElement(iconData, 'Performance');
    icon.classList.add('icon');
    return icon;
  }

  override getTitle(): string|ReturnType<typeof Lit.Directives.until> {
    return `Insight: ${this.#insight.title()}`;
  }

  /**
   * Presents the default suggestions that are shown when the user first clicks
   * "Ask AI" on an Insight.
   */
  override async getSuggestions(): Promise<[string, ...string[]]> {
    switch (this.#insight.insight.insightKey) {
      case 'CLSCulprits':
        return [
          'How can I improve my CLS score',
          'How can I prevent layout shifts on this page?',
        ];
      case 'DocumentLatency':
        return [
          'How do I decrease the initial loading time of my page?',
          'Did anything slow down the request for this document?',

        ];
      case 'DOMSize':
        return ['How can I reduce the size of my DOM?'];
      case 'DuplicatedJavaScript':
        return ['How do I deduplicate the identified scripts in my bundle?'];
      case 'FontDisplay':
        return ['How can I update my CSS to avoid layout shifts caused by incorrect `font-display` properties?'];
      case 'ForcedReflow':
        return ['How can I avoid layout thrashing?', 'What is forced reflow and why is it problematic?'];
      case 'ImageDelivery':
        return ['What should I do to improve and optimize the time taken to fetch and display images on the page?'];
      case 'InteractionToNextPaint':
        return [
          'Help me optimize my INP score', 'Help me understand why a large INP score is problematic',
          'What was the biggest contributor to my longest interaction duration time?'
        ];
      case 'LCPDiscovery':
        return [
          'Help me optimize my LCP score', 'What can I do to reduce my LCP discovery time?',
          'Why is LCP discovery time important?'
        ];
      case 'LCPPhases':
        return [
          'Help me optimize my LCP score', 'Which LCP phase was most problematic?',
          'What can I do to reduce the LCP time for this page load?'
        ];
      case 'NetworkDependencyTree':
        return ['How do I optimize my network dependency tree?'];
      case 'RenderBlocking':
        return [
          'Show me the render blocking requests, listed by impact',
          'How can I reduce the number of render blocking requests?'
        ];
      case 'SlowCSSSelector':
        return ['How can I optimize my CSS to increase the performance of CSS selectors?'];
      case 'ThirdParties':
        return ['Which third parties are having the largest impact on my page performance?'];
      case 'Cache':
        return ['What caching strategies can I apply to improve my page performance?'];
      case 'Viewport':
        return ['How do I make sure my page is optimized for mobile viewing?'];
      case 'ModernHTTP':
        return ['Is my site being served using the recommended HTTP best practices?'];
      case 'LegacyJavaScript':
        return ['Is my site polyfilling modern JavaScript features?'];
      default:
        Platform.assertNever(this.#insight.insight.insightKey, 'Unknown insight key');
    }
  }
}

export class PerformanceInsightsAgent extends AiAgent<TimelineUtils.InsightAIContext.ActiveInsight> {
  #insight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|undefined;

  #lastContextForEnhancedQuery: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|undefined;

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

  get userTier(): string|undefined {
    return 'TESTERS';
  }

  get options(): RequestOptions {
    return {
      temperature: undefined,
      modelId: undefined,
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
        return {result: {requests: formatted}};
      },
    });

    this.declareFunction<Record<'url', string>, {
      request: string,
    }>('getNetworkRequestDetail', {
      description: 'Returns detailed debugging information about a specific network request',
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
        return {result: {activity: tree.serialize()}};
      },

    });
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
    const extraQuery = `${includeInsightInfo ? formatter.formatInsight() + '\n\n' : ''}# User request:\n`;

    const finalQuery = `${extraQuery}${query}`;
    this.#lastContextForEnhancedQuery = selectedInsight;
    return finalQuery;
  }

  override async * run(initialQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    this.#insight = options.selected ?? undefined;

    return yield* super.run(initialQuery, options);
  }
}
