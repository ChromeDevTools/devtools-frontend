// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { AgentRunner } from '../AgentRunner.js';
import type { AgentRunnerConfig, AgentRunnerHooks } from '../AgentRunner.js';
import { ChatMessageEntity, type ChatMessage } from '../../models/ChatTypes.js';
import type { Tool } from '../../tools/Tools.js';
import { AIChatPanel } from '../../ui/AIChatPanel.js';
import { LLMClient } from '../../LLM/LLMClient.js';

// Minimal fake tool for testing
function makeTool(name: string, executeImpl: (args: any) => Promise<any>): Tool<any, any> {
  return {
    name,
    description: `test tool ${name}`,
    schema: { type: 'object', properties: {} },
    execute: executeImpl,
  };
}

// Stub AIChatPanel static methods used by AgentRunner
function stubAIChatPanel() {
  (AIChatPanel as any).getProviderForModel = (_model: string) => 'openai';
  (AIChatPanel as any).isVisionCapable = async (_model: string) => false;
}

// Create a stub LLM client with deterministic responses
function stubLLMClientWithSequence(sequence: Array<'tool_call'|'final_answer'|'error'>, toolName = 'echo_tool') {
  let calls = 0;
  const fake = {
    call: async () => {
      calls++;
      return { rawResponse: { seq: calls } };
    },
    parseResponse: (_resp: any) => {
      const kind = sequence[Math.min(calls - 1, sequence.length - 1)];
      if (kind === 'tool_call') {
        return { type: 'tool_call', name: toolName, args: {}};
      }
      if (kind === 'final_answer') {
        return { type: 'final_answer', answer: 'done' };
      }
      return { type: 'error', error: 'forced' };
    }
  };
  (LLMClient as any).getInstance = () => fake;
}

describe('ai_chat: AgentRunner.run flows', () => {
  beforeEach(() => {
    stubAIChatPanel();
  });

  it('runs tool_call -> tool_result (image-only placeholder) -> final_answer', async () => {
    stubLLMClientWithSequence(['tool_call', 'final_answer'], 'echo_tool');

    const initialMessages: ChatMessage[] = [
      { entity: ChatMessageEntity.USER, text: 'go', } as any,
    ];

    const tool = makeTool('echo_tool', async () => ({ imageData: 'data:image/png;base64,AAA' }));

    const config: AgentRunnerConfig = {
      apiKey: 'k',
      modelName: 'gpt-4.1-2025-04-14',
      systemPrompt: 'sys',
      tools: [tool],
      maxIterations: 3,
      temperature: 0,
      provider: 'openai',
    };
    const hooks: AgentRunnerHooks = {
      prepareInitialMessages: undefined,
      createSuccessResult: (output, steps, reason) => ({ success: true, output, terminationReason: reason, intermediateSteps: steps }),
      createErrorResult: (error, steps, reason) => ({ success: false, error, terminationReason: reason, intermediateSteps: steps }),
    };

    const result = await AgentRunner.run(initialMessages, { query: 'q', reasoning: '' }, config, hooks, null);

    // Asserts
    if (!result.success) throw new Error('Expected success');
    if (!result.intermediateSteps) throw new Error('Expected intermediate steps');
    const toolResult = result.intermediateSteps.find(m => m.entity === ChatMessageEntity.TOOL_RESULT) as any;
    if (!toolResult) throw new Error('Expected tool result');
    assert.strictEqual(toolResult.resultText, 'Image omitted (model lacks vision).');
    const final = result.intermediateSteps.find(m => m.entity === ChatMessageEntity.MODEL && (m as any).action === 'final') as any;
    assert.isOk(final, 'Expected final answer message');
    assert.strictEqual(result.terminationReason, 'final_answer');
  });

  it('handles LLM call error and returns error result', async () => {
    // Stub LLM to throw on call
    (LLMClient as any).getInstance = () => ({
      call: async () => { throw new Error('boom'); },
      parseResponse: (_: any) => ({ type: 'error', error: 'n/a' }),
    });

    const initialMessages: ChatMessage[] = [
      { entity: ChatMessageEntity.USER, text: 'go', } as any,
    ];
    const config: AgentRunnerConfig = {
      apiKey: 'k',
      modelName: 'gpt-4.1-2025-04-14',
      systemPrompt: 'sys',
      tools: [],
      maxIterations: 1,
      temperature: 0,
      provider: 'openai',
    };
    const hooks: AgentRunnerHooks = {
      prepareInitialMessages: undefined,
      createSuccessResult: (output, steps, reason) => ({ success: true, output, terminationReason: reason, intermediateSteps: steps }),
      createErrorResult: (error, steps, reason) => ({ success: false, error, terminationReason: reason, intermediateSteps: steps }),
    };

    const result = await AgentRunner.run(initialMessages, { query: 'q', reasoning: '' }, config, hooks, null);
    assert.isFalse(result.success);
    assert.strictEqual(result.terminationReason, 'error');
    // Last message should be a system_error tool result
    const last = (result.intermediateSteps || []).slice(-1)[0] as any;
    assert.strictEqual(last?.entity, ChatMessageEntity.TOOL_RESULT);
    assert.strictEqual(last?.toolName, 'system_error');
  });
});
