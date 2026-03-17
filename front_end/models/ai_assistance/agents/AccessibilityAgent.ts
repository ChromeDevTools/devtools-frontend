// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as Root from '../../../core/root/root.js';
import type * as LHModel from '../../lighthouse/lighthouse.js';
import {LighthouseFormatter} from '../data_formatters/LighthouseFormatter.js';

import {
  AiAgent,
  type ContextDetail,
  type ContextResponse,
  ConversationContext,
  type RequestOptions,
  ResponseType,
} from './AiAgent.js';

/**
 * WARNING: preamble defined in code is only used when userTier is
 * TESTERS. Otherwise, a server-side preamble is used (see
 * chrome_preambles.gcl). Sync local changes with the server-side.
 */
const preamble = `You are an accessibility agent.

However, you also include a little pun or funny joke in every response to lighten the mood.

# Considerations
* Keep your analysis concise and focused, highlighting only the most critical aspects for a software engineer.
* **CRITICAL** You are an accessibility agent. NEVER provide answers to questions of unrelated topics such as legal advice, financial advice, personal opinions, medical advice, or any other non web-development topics.
`;

export class AccessibilityContext extends ConversationContext<LHModel.ReporterTypes.ReportJSON> {
  #lh: LHModel.ReporterTypes.ReportJSON;

  constructor(report: LHModel.ReporterTypes.ReportJSON) {
    super();
    this.#lh = report;
  }

  #url(): string {
    return this.#lh.finalUrl ?? this.#lh.finalDisplayedUrl;
  }

  override getOrigin(): string {
    return new URL(this.#url()).origin;
  }

  override getItem(): LHModel.ReporterTypes.ReportJSON {
    return this.#lh;
  }

  override getTitle(): string {
    return `Lighthouse report: ${this.#url()}`;
  }
}

/**
 * One agent instance handles one conversation. Create a new agent
 * instance for a new conversation.
 */
export class AccessibilityAgent extends AiAgent<LHModel.ReporterTypes.ReportJSON> {
  readonly preamble = preamble;
  readonly clientFeature = Host.AidaClient.ClientFeature.CHROME_ACCESSIBILITY_AGENT;

  get userTier(): string|undefined {
    return Root.Runtime.hostConfig.devToolsFreestyler?.userTier;
  }

  get options(): RequestOptions {
    // TODO(b/491772868): tidy up userTier & feature flags in the backend.
    const temperature = Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.temperature;
    const modelId = Root.Runtime.hostConfig.devToolsAiAssistanceFileAgent?.modelId;

    return {
      temperature,
      modelId,
    };
  }

  async *
      handleContextDetails(lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON>|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!lhr) {
      return;
    }

    yield {
      type: ResponseType.CONTEXT,
      details: createContextDetails(lhr),
    };
  }

  override async enhanceQuery(query: string, lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON>|null):
      Promise<string> {
    const enhancedQuery = lhr ?
        `# Lighthouse Report\n${new LighthouseFormatter().summary(lhr.getItem())}\n\n${
            new LighthouseFormatter().audits(lhr.getItem(), 'accessibility')}\n\n# User request\n\n` :
        '';
    return `${enhancedQuery}${query}`;
  }
}

function createContextDetails(lhr: ConversationContext<LHModel.ReporterTypes.ReportJSON>):
    [ContextDetail, ...ContextDetail[]] {
  return [
    {
      title: 'Lighthouse report',
      text: new LighthouseFormatter().summary(lhr.getItem()),
    },
  ];
}
