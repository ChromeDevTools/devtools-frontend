// Copyright 2025 The Chromium Authors.

import {combineMessages} from '../MessageCombiner.js';
// Local minimal enum to avoid importing TypeScript enums from ChatTypes in strip-only mode
const ChatMessageEntity = {
  USER: 'user',
  MODEL: 'model',
  TOOL_RESULT: 'tool_result',
  AGENT_SESSION: 'agent_session',
} as const;
type ChatMessage = any;

describe('MessageCombiner', () => {
  it('combines adjacent tool call and result by toolCallId', () => {
    const messages: ChatMessage[] = [
      { entity: ChatMessageEntity.USER, text: 'Go' } as any,
      { entity: ChatMessageEntity.MODEL, action: 'tool', toolName: 'fetch', toolCallId: 'id-1', isFinalAnswer: false } as any,
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'fetch', toolCallId: 'id-1', resultText: '{"ok":true}', isError: false } as any,
      { entity: ChatMessageEntity.MODEL, action: 'final', answer: 'Done', isFinalAnswer: true } as any,
    ];

    const combined = combineMessages(messages);
    assert.lengthOf(combined, 3);
    assert.strictEqual((combined[1] as any).combined, true);
    assert.strictEqual((combined[1] as any).resultText, '{"ok":true}');
  });

  it('marks orphaned tool results', () => {
    const messages: ChatMessage[] = [
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'scan', resultText: 'x', isError: false } as any,
    ];
    const combined = combineMessages(messages);
    assert.lengthOf(combined, 1);
    assert.isTrue((combined[0] as any).orphaned);
  });

  it('hides model tool-call and its result when agent session manages same toolCallId', () => {
    const toolCallId = 'tc-123';
    const messages: ChatMessage[] = [
      { entity: ChatMessageEntity.USER, text: 'run agent' } as any,
      // Model tool call that will be managed by the agent session
      { entity: ChatMessageEntity.MODEL, action: 'tool', toolName: 'fetch', toolCallId, isFinalAnswer: false } as any,
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'fetch', toolCallId, resultText: '{"ok":true}', isError: false } as any,
      // Agent session includes the same tool call/result in its timeline
      { entity: ChatMessageEntity.AGENT_SESSION, agentSession: {
          sessionId: 's1',
          agentName: 'agent',
          status: 'running',
          startTime: new Date(),
          messages: [
            { id: 'tc', timestamp: new Date(), type: 'tool_call', content: { type: 'tool_call', toolName: 'fetch', toolArgs: { url: 'x' }, toolCallId } },
            { id: 'tr', timestamp: new Date(), type: 'tool_result', content: { type: 'tool_result', toolName: 'fetch', toolCallId, success: true, result: { ok: true } } },
          ],
          nestedSessions: [],
        }} as any,
    ];

    const combined = combineMessages(messages);
    // Expect: user + agent_session only (model tool+result removed)
    assert.lengthOf(combined, 2);
    assert.strictEqual((combined[0] as any).entity, 'user');
    assert.strictEqual((combined[1] as any).entity, 'agent_session');
  });

  it('hides agent-managed tool_result even if it arrives before model tool-call', () => {
    const toolCallId = 'tc-outoforder';
    const messages: ChatMessage[] = [
      { entity: ChatMessageEntity.USER, text: 'go' } as any,
      // Agent-managed tool result first
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'fetch', toolCallId, resultText: '{"ok":1}', isError: false, isFromConfigurableAgent: true } as any,
      // Model tool call later
      { entity: ChatMessageEntity.MODEL, action: 'tool', toolName: 'fetch', toolCallId, isFinalAnswer: false } as any,
    ];

    const combined = combineMessages(messages);
    // Expect: user only (both the agent-managed result and matching model call removed)
    assert.lengthOf(combined, 1);
    assert.strictEqual((combined[0] as any).entity, 'user');
  });
});
