// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import { createToolExecutorNode } from './AgentNodes.js';
import { ConfigurableAgentTool } from '../agent_framework/ConfigurableAgentTool.js';
import { ChatMessageEntity } from '../ui/ChatView.js';
import type { AgentState } from './State.js';
import type { ConfigurableAgentResult } from '../agent_framework/ConfigurableAgentTool.js';

declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function afterEach(fn: () => void): void;
  namespace assert {
    function strictEqual(actual: unknown, expected: unknown): void;
    function deepEqual(actual: unknown, expected: unknown): void;
    function isTrue(value: unknown): void;
    function isFalse(value: unknown): void;
    function doesNotMatch(actual: string, regexp: RegExp): void;
  }
}

describe('AgentNodes ToolExecutorNode', () => {
  describe('ConfigurableAgentTool result filtering', () => {
    it('should filter out agentSession data from error results', async () => {
      // Create a mock ConfigurableAgentTool that returns error with intermediateSteps
      const mockAgentSession = {
        sessionId: 'test-session-123',
        agentName: 'test-agent',
        status: 'error',
        messages: [
          { id: '1', type: 'tool_call', content: { toolName: 'test_tool' } },
          { id: '2', type: 'tool_result', content: { result: 'test result' } }
        ],
        // This contains sensitive data that should not leak to LLM
        nestedSessions: [],
        tools: [],
        startTime: new Date(),
        endTime: new Date(),
        terminationReason: 'max_iterations'
      };

      const errorResultWithSession: ConfigurableAgentResult & { agentSession: any } = {
        success: false,
        error: 'Agent reached maximum iterations',
        terminationReason: 'max_iterations',
        // This is the problematic field that contains session data
        intermediateSteps: [
          { entity: ChatMessageEntity.USER, text: 'test query' },
          { entity: ChatMessageEntity.AGENT_SESSION, agentSession: mockAgentSession, summary: 'test' }
        ],
        agentSession: mockAgentSession
      };

      // Create mock ConfigurableAgentTool
      class MockConfigurableAgentTool extends ConfigurableAgentTool {
        constructor() {
          super({
            name: 'mock_agent',
            description: 'Mock agent for testing',
            systemPrompt: 'Test prompt',
            tools: [],
            schema: { type: 'object', properties: {}, required: [] }
          });
        }

        async execute(): Promise<ConfigurableAgentResult & { agentSession: any }> {
          return errorResultWithSession;
        }
      }

      const mockTool = new MockConfigurableAgentTool();

      // Create initial state with a tool call message
      const initialState: AgentState = {
        messages: [
          {
            entity: ChatMessageEntity.MODEL,
            action: 'tool',
            toolName: 'mock_agent',
            toolArgs: { query: 'test' },
            toolCallId: 'test-call-id',
            isFinalAnswer: false
          }
        ],
        agentType: 'web_task',
        context: {}
      };

      // Create modified state with mock tool in registry
      const stateWithMockTool = {
        ...initialState,
        // We need to mock the tool registry or provide tools directly
        tools: [mockTool]
      };

      // Create ToolExecutorNode
      const toolExecutorNode = createToolExecutorNode(stateWithMockTool);

      // Execute the node
      const result = await toolExecutorNode.invoke(stateWithMockTool);

      // Verify the result
      assert.isTrue(result.messages.length > initialState.messages.length, 'Should add tool result message');
      
      const toolResultMessage = result.messages[result.messages.length - 1];
      assert.strictEqual(toolResultMessage.entity, ChatMessageEntity.TOOL_RESULT);
      
      // The critical test: resultText should NOT contain agentSession data
      const resultText = (toolResultMessage as any).resultText;
      assert.strictEqual(resultText, 'Error: Agent reached maximum iterations');
      
      // Verify that the resultText does not contain session data
      assert.doesNotMatch(resultText, /sessionId/);
      assert.doesNotMatch(resultText, /test-session-123/);
      assert.doesNotMatch(resultText, /intermediateSteps/);
      assert.doesNotMatch(resultText, /agentSession/);
      assert.doesNotMatch(resultText, /nestedSessions/);
      
      // The resultText should be clean and only contain the error message
      assert.strictEqual(resultText.includes('test-session-123'), false);
    });

    it('should filter out agentSession data from success results', async () => {
      // Create a success result with intermediateSteps containing session data
      const mockAgentSession = {
        sessionId: 'success-session-456',
        agentName: 'success-agent',
        status: 'completed',
        messages: [],
        nestedSessions: [],
        tools: [],
        startTime: new Date(),
        endTime: new Date(),
        terminationReason: 'final_answer'
      };

      const successResultWithSession: ConfigurableAgentResult & { agentSession: any } = {
        success: true,
        output: 'Task completed successfully',
        terminationReason: 'final_answer',
        // This should not leak to LLM
        intermediateSteps: [
          { entity: ChatMessageEntity.AGENT_SESSION, agentSession: mockAgentSession, summary: 'test' }
        ],
        agentSession: mockAgentSession
      };

      class MockSuccessAgentTool extends ConfigurableAgentTool {
        constructor() {
          super({
            name: 'mock_success_agent',
            description: 'Mock success agent for testing',
            systemPrompt: 'Test prompt',
            tools: [],
            schema: { type: 'object', properties: {}, required: [] }
          });
        }

        async execute(): Promise<ConfigurableAgentResult & { agentSession: any }> {
          return successResultWithSession;
        }
      }

      const mockTool = new MockSuccessAgentTool();

      const initialState: AgentState = {
        messages: [
          {
            entity: ChatMessageEntity.MODEL,
            action: 'tool',
            toolName: 'mock_success_agent',
            toolArgs: { query: 'test' },
            toolCallId: 'test-call-id-2',
            isFinalAnswer: false
          }
        ],
        agentType: 'web_task',
        context: {}
      };

      const stateWithMockTool = {
        ...initialState,
        tools: [mockTool]
      };

      const toolExecutorNode = createToolExecutorNode(stateWithMockTool);
      const result = await toolExecutorNode.invoke(stateWithMockTool);

      const toolResultMessage = result.messages[result.messages.length - 1];
      const resultText = (toolResultMessage as any).resultText;
      
      // Should contain only the clean output
      assert.strictEqual(resultText, 'Task completed successfully');
      
      // Should NOT contain session data
      assert.doesNotMatch(resultText, /success-session-456/);
      assert.doesNotMatch(resultText, /intermediateSteps/);
      assert.doesNotMatch(resultText, /agentSession/);
    });
  });
});