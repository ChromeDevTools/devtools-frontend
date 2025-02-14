// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as Lit from '../../../ui/lit/lit.js';
import type * as TimelineUtils from '../../timeline/utils/utils.js';
import * as PanelUtils from '../../utils/utils.js';

import {
  type AgentOptions as BaseAgentOptions,
  AgentType,
  AiAgent,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
  type ResponseData,
} from './AiAgent.js';

/* clang-format off */
const preamble = `You are a performance expert deeply integrated within Chrome DevTools. You specialize in analyzing web application behaviour captured by Chrome DevTools Performance Panel.

You will be provided with an Insight from the Chrome Performance Panel. This Insight will contain information about part of the performance of the web site. It is your task to analyze the data available to you and suggest solutions to improve the performance of the page.

You will be told the following information about the Insight:
- The 'Insight name' which is the title of the Insight
- The 'Insight description' which helps you understand what the insight is for and what the user is hoping to understand.
- 'Insight details' which will be additional context and information to help you understand what the insight is showing the user. Use this information to suggest opportunities to improve the performance.

You have a number of functions to get information about the page and its performance. Use these functions to help you gather information to perform the user's query. For every query it is important to understand the network activity and also the main thread activity.

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
  // TODO: make use of the Insight.
  // eslint-disable-next-line no-unused-private-class-members
  #insight: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|undefined;

  override handleContextDetails(_activeContext: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null):
      AsyncGenerator<ContextResponse, void, void> {
    throw new Error('not implemented');
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
    // TODO: define the set of functions for the LLM.
  }

  override async * run(initialQuery: string, options: {
    signal?: AbortSignal, selected: ConversationContext<TimelineUtils.InsightAIContext.ActiveInsight>|null,
  }): AsyncGenerator<ResponseData, void, void> {
    this.#insight = options.selected ?? undefined;

    return yield* super.run(initialQuery, options);
  }
}
