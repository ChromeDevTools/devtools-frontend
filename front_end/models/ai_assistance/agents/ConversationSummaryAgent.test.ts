// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {mockAidaClient} from '../../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
} from '../../../testing/EnvironmentHelpers.js';
import {type AiAgent, ConversationSummaryAgent} from '../ai_assistance.js';

describeWithEnvironment('ConversationSummaryAgent', () => {
  it('summarizes a conversation', async () => {
    const agent = new ConversationSummaryAgent.ConversationSummaryAgent({
      aidaClient: mockAidaClient([[{
        explanation: 'Summary of the conversation',
      }]]),
    });

    const summary = await agent.summarizeConversation('User: Hello\nAssistant: Hi');
    assert.isTrue(summary.startsWith('Summary of the conversation'));
    assert.isTrue(
        summary.includes('Note: The code fixes and findings above were identified on a live page in DevTools'));
  });

  it('summarizes a conversation using a context', async () => {
    const agent = new ConversationSummaryAgent.ConversationSummaryAgent({
      aidaClient: mockAidaClient([[{
        explanation: 'Summary from context',
      }]]),
    });

    const context = new ConversationSummaryAgent.ConversationSummaryContext('User: Hello\nAssistant: Hi');
    const response = await Array.fromAsync(agent.run('', {selected: context}));
    const lastResponse = response.at(-1);
    assert.exists(lastResponse);
    assert.strictEqual(lastResponse.type, 'answer');
    assert.strictEqual((lastResponse as AiAgent.AnswerResponse).text, 'Summary from context');
  });

  it('throws an error if no response is received', async () => {
    const agent = new ConversationSummaryAgent.ConversationSummaryAgent({
      aidaClient: mockAidaClient([[{
        explanation: '',
      }]]),
    });

    try {
      await agent.summarizeConversation('User: Hello\nAssistant: Hi');
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.strictEqual((err as Error).message, 'Failed to summarize conversation');
    }
  });
});
