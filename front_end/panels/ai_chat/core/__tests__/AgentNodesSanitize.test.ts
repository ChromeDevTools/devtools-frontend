// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createAgentNode } from '../AgentNodes.js';
import type { AgentState } from '../State.js';
import { ChatMessageEntity } from '../../models/ChatTypes.js';
import { ToolSurfaceProvider } from '../ToolSurfaceProvider.js';
import { LLMClient } from '../../LLM/LLMClient.js';
import '../../agent_framework/ConfigurableAgentTool.js';

describe('AgentNodes - LLM tool name sanitization', () => {
  const ORIGINAL_NAME = 'mcp:default:alpha.tool';
  let originalSelect: typeof ToolSurfaceProvider.select;
  let originalGetInstance: any;

  beforeEach(() => {
    // Stub ToolSurfaceProvider.select to surface our invalid tool name
    originalSelect = ToolSurfaceProvider.select;
    (ToolSurfaceProvider as any).select = async (_state: AgentState, _baseTools: any[]) => {
      const tool = {
        name: ORIGINAL_NAME,
        description: 'alpha tool',
        schema: { type: 'object', properties: {} },
        execute: async () => ({ ok: true }),
      };
      return { tools: [tool], selectedNames: [tool.name] };
    };

    // Stub LLMClient
    originalGetInstance = (LLMClient as any).getInstance;
  });

  afterEach(() => {
    // Restore stubs
    (ToolSurfaceProvider as any).select = originalSelect;
    (LLMClient as any).getInstance = originalGetInstance;
  });

  it('uses sanitized function names in llm.call, and maps back to original for execution', async () => {
    let capturedTools: any[] = [];
    // The model will request the first tool in parsed response using the sanitized name we expect
    let sanitizedSeenInCall = '';

    (LLMClient as any).getInstance = () => ({
      call: async (opts: any) => {
        capturedTools = (opts.tools || []) as any[];
        // Capture the sanitized name the agent sent to the provider
        const fn = (capturedTools[0] as any)?.function?.name as string;
        sanitizedSeenInCall = fn;
        // Return a minimal rawResponse
        return { rawResponse: { usage: {} } };
      },
      parseResponse: (_resp: any) => {
        // Echo back a tool_call using the same function name seen by provider
        return { type: 'tool_call', name: sanitizedSeenInCall, args: { q: 1 } };
      },
    });

    const state: AgentState = {
      messages: [ { entity: ChatMessageEntity.USER, text: 'run' } as any ],
      agentType: 'web_task',
      context: {},
    } as any;

    const agent = createAgentNode('gpt-4.1-2025-04-14', 'openai' as any, 0);
    const out = await agent.invoke(state);

    // Assert: llm.call was given sanitized function name
    assert.ok(capturedTools && capturedTools.length === 1, 'tools should be passed');
    const passedName = (capturedTools[0] as any).function.name as string;
    assert.match(passedName, /^[a-zA-Z0-9_-]{1,64}$/);

    // Assert: the model message added uses original tool name (mapped back)
    const last = out.messages[out.messages.length - 1] as any;
    assert.strictEqual(last.entity, ChatMessageEntity.MODEL);
    assert.strictEqual(last.action, 'tool');
    assert.strictEqual(last.toolName, ORIGINAL_NAME);
  });
});
