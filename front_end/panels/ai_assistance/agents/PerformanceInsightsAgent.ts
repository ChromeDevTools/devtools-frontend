// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as Lit from '../../../ui/lit/lit.js';
import * as TimelineUtils from '../../timeline/utils/utils.js';
import * as PanelUtils from '../../utils/utils.js';
import {PerformanceInsightFormatter, TraceEventFormatter} from '../data_formatters/PerformanceInsightFormatter.js';

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
- Make suggestions that you are confident will improve the performance of the page.

## General considerations

- *CRITICAL* never make the same function call twice.
- *CRITICAL* make sure you are thorough and call the functions you have access to to give yourself the most information possible to make accurate recommendations.
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

    const title = activeContext.getItem().title();
    // TODO: Provide proper text with useful context details.
    const titleDetail: ContextDetail = {title, text: title};
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
    }>('getNetworkActivity', {
      description: 'Returns relevant network requests for the selected insight',
      parameters: {
        type: Host.AidaClient.ParametersTypes.OBJECT,
        description: '',
        nullable: true,
        properties: {},
      },
      handler: async () => {
        if (!this.#insight) {
          return {error: 'No insight available'};
        }
        const activeInsight = this.#insight.getItem();
        const requests = TimelineUtils.InsightAIContext.AIQueries.networkRequests(
            activeInsight.insight,
            activeInsight.parsedTrace,
        );
        const formatted = requests.map(r => TraceEventFormatter.networkRequest(r, activeInsight.parsedTrace));
        return {result: {requests: formatted}};
      },
    });
  }

  override async enhanceQuery(
      query: string,
      selectedInsight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null): Promise<string> {
    if (!selectedInsight) {
      return query;
    }
    const formatter = new PerformanceInsightFormatter(selectedInsight.getItem().insight);
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
