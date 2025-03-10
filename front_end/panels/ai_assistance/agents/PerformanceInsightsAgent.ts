// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Lit from '../../../ui/lit/lit.js';
import * as TimelineUtils from '../../timeline/utils/utils.js';
import * as PanelUtils from '../../utils/utils.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../data_formatters/PerformanceInsightFormatter.js';
import {debugLog} from '../debug.js';

import {
  type AgentOptions as BaseAgentOptions,
  AgentType,
  AiAgent,
  type ContextDetail,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
  type ResponseData,
  ResponseType,
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

// Sync with the server-side.
/* clang-format off */
const preamble = `You are a performance expert deeply integrated within Chrome DevTools. You specialize in analyzing web application behaviour captured by Chrome DevTools Performance Panel.

You will be provided with an Insight from the Chrome Performance Panel. This Insight will contain information about part of the performance of the web site. It is your task to analyze the data available to you and suggest solutions to improve the performance of the page.

You will be told the following information about the Insight:
- The 'Insight name' which is the title of the Insight
- The 'Insight description' which helps you understand what the insight is for and what the user is hoping to understand.
- 'Insight details' which will be additional context and information to help you understand what the insight is showing the user. Use this information to suggest opportunities to improve the performance.

You will also be provided with external resources. Use these to ensure you give correct, accurate and up to date answers.

## Step-by-step instructions

- Think about what the user wants.
- Call any of the available functions to help you gather more information to inform your suggestions.
- Ensure that you call all relevant functions to receive full information about relevant network requests.
- Make suggestions that you are confident will improve the performance of the page.

## General considerations

- *CRITICAL* never make the same function call twice.
- *CRITICAL* make sure you are thorough and call the functions you have access to to give yourself the most information possible to make accurate recommendations.
- *CRITICAL* your text output should NEVER mention the functions that you called. These are an implementation detail and not important for the user to be aware of.
`;
/* clang-format on */

export class InsightContext extends ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight> {
  readonly #insight: TimelineUtils.InsightAIContext.ActiveInsight;

  constructor(insight: TimelineUtils.InsightAIContext.ActiveInsight) {
    super();
    this.#insight = insight;
  }

  getOrigin(): string {
    // TODO: probably use the origin of the navigation the insight is
    // associated with? We can put that into the context.
    return '';
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
    return this.#insight.title();
  }
}

export class PerformanceInsightsAgent extends AiAgent<TimelineUtils.InsightAIContext.ActiveInsight> {
  #insight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|undefined;

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
    const formatter = new PerformanceInsightFormatter(activeInsight.insight);
    const titleDetail: ContextDetail = {
      // Purposefully use the raw title in the details view, we don't need to repeat "Analyzing insight"
      title: insightTitle,
      // Important: this must reflect what data is sent to the LLM.
      text: formatter.formatInsight()
    };
    yield {type: ResponseType.CONTEXT, title, details: [titleDetail]};
  }

  override readonly type = AgentType.PERFORMANCE_INSIGHT;
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

  override async enhanceQuery(
      query: string,
      selectedInsight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null): Promise<string> {
    if (!selectedInsight) {
      return query;
    }
    const {insight} = selectedInsight.getItem();
    const formatter = new PerformanceInsightFormatter(insight);
    const extraQuery = `${formatter.formatInsight()}\n\n# User request:\n`;

    const finalQuery = `${extraQuery}${query}`;
    return finalQuery;
  }

  override async * run(initialQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    this.#insight = options.selected ?? undefined;

    return yield* super.run(initialQuery, options);
  }
}
