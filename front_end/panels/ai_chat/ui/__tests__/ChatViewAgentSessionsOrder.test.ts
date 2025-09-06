// Copyright 2025 The Chromium Authors.

import '../ChatView.js';
import {raf} from '../../../../testing/DOMHelpers.js';

// Minimal local constants to avoid importing enums in strip mode
const ChatMessageEntity = {
  USER: 'user',
  AGENT_SESSION: 'agent_session',
} as const;

function makeUser(text: string): any {
  return { entity: ChatMessageEntity.USER, text } as any;
}

function makeSession(sessionId: string, opts: Partial<any> = {}): any {
  return {
    agentName: opts.agentName || 'test_agent',
    sessionId,
    status: opts.status || 'running',
    startTime: new Date(),
    messages: opts.messages || [],
    nestedSessions: opts.nestedSessions || [],
    agentQuery: opts.agentQuery,
    agentReasoning: opts.agentReasoning,
    config: opts.config || {},
    tools: [],
  };
}

function makeAgentSessionMessage(session: any): any {
  return { entity: ChatMessageEntity.AGENT_SESSION, agentSession: session } as any;
}

function queryLive(view: HTMLElement): HTMLElement[] {
  const shadow = view.shadowRoot!;
  return Array.from(shadow.querySelectorAll('live-agent-session')) as HTMLElement[];
}

describe('ChatView Agent Sessions: sequential top-level sessions', () => {
  it('renders two top-level agent sessions in order with first completed and second running', async () => {
    // First session has a completed tool (call + result)
    const s1 = makeSession('s1', {
      agentReasoning: 'First agent session',
      status: 'completed',
      messages: [
        { id: 'tc1', timestamp: new Date(), type: 'tool_call', content: { type: 'tool_call', toolName: 'fetch', toolArgs: { url: 'x' }, toolCallId: 'tc1' } },
        { id: 'tc1-result', timestamp: new Date(), type: 'tool_result', content: { type: 'tool_result', toolName: 'fetch', toolCallId: 'tc1', success: true, result: { ok: true } } },
      ],
    });
    // Second session is still running (only tool call)
    const s2 = makeSession('s2', {
      agentReasoning: 'Second agent session',
      status: 'running',
      messages: [
        { id: 'tc2', timestamp: new Date(), type: 'tool_call', content: { type: 'tool_call', toolName: 'scan', toolArgs: { sel: '#id' }, toolCallId: 'tc2' } },
      ],
    });

    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    view.data = {
      messages: [
        makeUser('start'),
        makeAgentSessionMessage(s1),
        makeAgentSessionMessage(s2),
      ],
      state: 'idle',
      isTextInputEmpty: true,
      onSendMessage: () => {},
      onPromptSelected: () => {},
    } as any;

    await raf();

    const lives = queryLive(view);
    assert.strictEqual(lives.length, 2);

    // Verify ordering by checking the agentReasoning text in each live component
    const firstShadow = lives[0].shadowRoot!;
    const secondShadow = lives[1].shadowRoot!;
    const firstReason = firstShadow.querySelector('.message')?.textContent || '';
    const secondReason = secondShadow.querySelector('.message')?.textContent || '';
    assert.include(firstReason, 'First agent session');
    assert.include(secondReason, 'Second agent session');

    // Verify status markers in timelines: first has a completed marker, second has running
    const firstCompleted = firstShadow.querySelector('.tool-status-marker.completed');
    const secondRunning = secondShadow.querySelector('.tool-status-marker.running');
    assert.isNotNull(firstCompleted, 'first session should show completed tool status');
    assert.isNotNull(secondRunning, 'second session should show running tool status');

    document.body.removeChild(view);
  });
});
