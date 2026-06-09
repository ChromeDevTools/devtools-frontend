// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {mockAidaClient} from '../../testing/AiAssistanceHelpers.js';
import {
  describeWithEnvironment,
} from '../../testing/EnvironmentHelpers.js';

import {ConversationSummary} from './ai_assistance.js';

describeWithEnvironment('ConversationSummary', () => {
  it('summarizes a conversation', async () => {
    const summaryRunner = new ConversationSummary.ConversationSummary({
      aidaClient: mockAidaClient([[{
        explanation: 'Summary of the conversation',
      }]]),
    });

    const summary = await summaryRunner.summarizeConversation('User: Hello\nAssistant: Hi');
    assert.isTrue(summary.startsWith('Summary of the conversation'));
    assert.isTrue(
        summary.includes('Note: The code fixes and findings above were identified on a live page in DevTools'));
  });

  it('throws an error if no response is received', async () => {
    const summaryRunner = new ConversationSummary.ConversationSummary({
      aidaClient: mockAidaClient([[{
        explanation: '',
      }]]),
    });

    try {
      await summaryRunner.summarizeConversation('User: Hello\nAssistant: Hi');
      assert.fail('Should have thrown an error');
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.strictEqual((err as Error).message, 'Failed to summarize conversation');
    }
  });
});
