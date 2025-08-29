// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import type * as TimelineUtils from '../../../panels/timeline/utils/utils.js';

import {AiAgent, type ContextResponse, type ConversationContext, type RequestOptions, ResponseType} from './AiAgent.js';
import {callTreePreamble, PerformanceTraceContext} from './PerformanceAgent.js';

const UIStringsNotTranslated = {
  analyzingCallTree: 'Analyzing call tree',
  /**
   * @description Shown when the agent is investigating network activity
   */
} as const;
const lockedString = i18n.i18n.lockedString;

export class PerformanceAnnotationsAgent extends AiAgent<TimelineUtils.AIContext.AgentFocus> {
  override preamble = callTreePreamble;

  get clientFeature(): Host.AidaClient.ClientFeature {
    return Host.AidaClient.ClientFeature.CHROME_PERFORMANCE_ANNOTATIONS_AGENT;
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

  async *
      handleContextDetails(context: ConversationContext<TimelineUtils.AIContext.AgentFocus>|null):
          AsyncGenerator<ContextResponse, void, void> {
    if (!context) {
      return;
    }

    const focus = context.getItem();
    if (focus.data.type !== 'call-tree') {
      throw new Error('unexpected context');
    }

    const callTree = focus.data.callTree;

    yield {
      type: ResponseType.CONTEXT,
      title: lockedString(UIStringsNotTranslated.analyzingCallTree),
      details: [
        {
          title: 'Selected call tree',
          text: callTree.serialize(),
        },
      ],
    };
  }

  override async enhanceQuery(query: string, context: ConversationContext<TimelineUtils.AIContext.AgentFocus>|null):
      Promise<string> {
    if (!context) {
      return query;
    }

    const focus = context.getItem();
    if (focus.data.type !== 'call-tree') {
      throw new Error('unexpected context');
    }

    const callTree = focus.data.callTree;
    const contextString = callTree.serialize();
    return `${contextString}\n\n# User request\n\n${query}`;
  }

  /**
   * Used in the Performance panel to automatically generate a label for a selected entry.
   */
  async generateAIEntryLabel(callTree: TimelineUtils.AICallTree.AICallTree): Promise<string> {
    const context = PerformanceTraceContext.fromCallTree(callTree);
    const response = await Array.fromAsync(this.run(AI_LABEL_GENERATION_PROMPT, {selected: context}));
    const lastResponse = response.at(-1);
    if (lastResponse && lastResponse.type === ResponseType.ANSWER && lastResponse.complete === true) {
      return lastResponse.text.trim();
    }
    throw new Error('Failed to generate AI entry label');
  }
}

const AI_LABEL_GENERATION_PROMPT = `## Instruction:
Generate a concise label (max 60 chars, single line) describing the *user-visible effect* of the selected call tree's activity, based solely on the provided call tree data.

## Strict Constraints:
- Output must be a single line of text.
- Maximum 60 characters.
- No full stops.
- Focus on user impact, not internal operations.
- Do not include the name of the selected event.
- Do not make assumptions about when the activity happened.
- Base the description only on the information present within the call tree data.
- Prioritize brevity.
- Only include third-party script names if their identification is highly confident.
- Very important: Only output the 60 character label text, your response will be used in full to show to the user as an annotation in the timeline.
`;
