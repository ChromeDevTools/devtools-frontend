// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createAgentNode, createToolExecutorNode } from './AgentNodes.js';
import type { AgentState } from './State.js';
import type { Tool } from '../tools/Tools.js';
import { ChatMessageEntity } from '../models/ChatTypes.js';
import { ToolSurfaceProvider } from './ToolSurfaceProvider.js';
import '../agent_framework/ConfigurableAgentTool.js';
import { LLMClient } from '../LLM/LLMClient.js';

/* eslint-env mocha */

class RecordingTool implements Tool<Record<string, unknown>, unknown> {
  public calls = 0;
  constructor(public name: string) {}
  description = 'records calls';
  schema = { type: 'object', properties: {} };
  async execute(_args: Record<string, unknown>): Promise<unknown> {
    this.calls += 1;
    return { ok: true, executed: this.name };
  }
}

describe('AgentNodes sanitized tool name mapping', () => {
  let mockLocalStorage: Map<string, string>;

  beforeEach(() => {
    // Mock localStorage in case anything touches it
    mockLocalStorage = new Map();
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: (key: string) => mockLocalStorage.get(key) || null,
        setItem: (key: string, value: string) => mockLocalStorage.set(key, value),
        removeItem: (key: string) => mockLocalStorage.delete(key),
        clear: () => mockLocalStorage.clear(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it('sanitizes function names for LLM and maps back to original tool for execution', async () => {
    // Arrange tool and stubs
    const originalName = 'mcp:default:alpha';
    const tool = new RecordingTool(originalName);

    const originalSelect = ToolSurfaceProvider.select;
    (ToolSurfaceProvider as any).select = async () => ({ tools: [tool], selectedNames: [tool.name] });

    let capturedFnName = '';
    const originalGetInstance = (LLMClient as any).getInstance;
    (LLMClient as any).getInstance = () => ({
      call: async (opts: any) => {
        capturedFnName = opts.tools?.[0]?.function?.name || '';
        return { rawResponse: {} };
      },
      parseResponse: () => ({ type: 'tool_call', name: capturedFnName, args: { x: 1 } }),
    });

    const initial: AgentState = {
      messages: [ { entity: ChatMessageEntity.USER, text: 'go' } as any ],
      agentType: 'deep-research' as any,
      context: {},
    } as any;

    try {
      // Agent node should produce a MODEL tool message with original name even if provider returns sanitized
      const agent = createAgentNode('gpt-4', 'openai' as any, 0);
      const afterAgent = await agent.invoke(initial);
      const toolMsg = afterAgent.messages[afterAgent.messages.length - 1] as any;
      assert.strictEqual(toolMsg.entity, ChatMessageEntity.MODEL);
      assert.strictEqual(toolMsg.action, 'tool');
      assert.strictEqual(toolMsg.toolName, originalName);
    } finally {
      (ToolSurfaceProvider as any).select = originalSelect;
      (LLMClient as any).getInstance = originalGetInstance;
    }
  });
});
