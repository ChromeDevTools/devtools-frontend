// Copyright 2025 The Chromium Authors.

import '../ChatView.js';
import {raf} from '../../../../testing/DOMHelpers.js';

// Local enums/types to avoid TS enum imports in strip mode
const ChatMessageEntity = {
  USER: 'user',
  AGENT_SESSION: 'agent_session',
  MODEL: 'model',
  TOOL_RESULT: 'tool_result',
} as const;

type AgentMsg = {
  id: string;
  timestamp: Date;
  type: 'reasoning'|'tool_call'|'tool_result'|'handoff'|'final_answer';
  content: any;
};

function makeToolCall(id: string, toolName: string, toolArgs: Record<string, any> = {}): AgentMsg {
  return {id, timestamp: new Date(), type: 'tool_call', content: {type: 'tool_call', toolName, toolArgs, toolCallId: id}};
}

function makeToolResult(id: string, toolName: string, success = true, result: any = {ok: true}): AgentMsg {
  return {id: `${id}-result`, timestamp: new Date(), type: 'tool_result', content: {type: 'tool_result', toolCallId: id, toolName, success, result}};
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

function makeUser(text: string): any {
  return { entity: ChatMessageEntity.USER, text } as any;
}

function queryLive(view: HTMLElement): HTMLElement[] {
  const shadow = (view.shadowRoot!);
  return Array.from(shadow.querySelectorAll('live-agent-session')) as HTMLElement[];
}

describe('ChatView Agent Sessions: nesting & handoffs', () => {
  it('renders nested child session inside parent timeline', async () => {
    const parent = makeSession('p1', {nestedSessions: [makeSession('c1')]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const lives = queryLive(view);
    assert.strictEqual(lives.length, 1);
    const shadow = lives[0].shadowRoot!;
    const nestedContainer = shadow.querySelector('.nested-sessions');
    assert.isNotNull(nestedContainer);
    assert.isAtLeast((nestedContainer as HTMLElement).querySelectorAll('live-agent-session').length, 1);
    document.body.removeChild(view);
  });

  it('renders two-level nested sessions (parent→child→grandchild)', async () => {
    const grandchild = makeSession('g1');
    const child = makeSession('c1', {nestedSessions: [grandchild]});
    const parent = makeSession('p1', {nestedSessions: [child]});

    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const shadow = queryLive(view)[0].shadowRoot!;
    const nestedContainer = shadow.querySelector('.nested-sessions') as HTMLElement;
    // There should be a nested live-agent-session for child; and inside it, another for grandchild
    const firstLevel = nestedContainer.querySelector('live-agent-session') as HTMLElement;
    assert.isNotNull(firstLevel);
    const secondShadow = firstLevel.shadowRoot!;
    const secondLevel = secondShadow.querySelector('.nested-sessions') as HTMLElement;
    assert.isNotNull(secondLevel);
    document.body.removeChild(view);
  });

  it('promotes child to top-level; top-level child is suppressed (shown inline under parent)', async () => {
    const child = makeSession('c1');
    const parent = makeSession('p1', {nestedSessions: [child]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 1);

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent), makeAgentSessionMessage(child)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    // New behavior: suppress duplicate top-level child when also nested
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 1);
    document.body.removeChild(view);
  });

  it('suppresses inline nested child when child also appears as top-level session', async () => {
    const child = makeSession('c-suppress');
    const parent = makeSession('p-suppress', {nestedSessions: [child]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    // Render both parent and child as top-level messages
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent), makeAgentSessionMessage(child)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    // The parent component should not render inline child timeline
    const lives = queryLive(view);
    assert.strictEqual(lives.length, 2);
    const parentShadow = lives[0].shadowRoot!;
    const nestedContainer = parentShadow.querySelector('.nested-sessions') as HTMLElement;
    if (nestedContainer) {
      assert.strictEqual(nestedContainer.querySelectorAll('live-agent-session').length, 0);
    }
    document.body.removeChild(view);
  });

  it('parent removed, child persists', async () => {
    const child = makeSession('c1');
    const parent = makeSession('p1', {nestedSessions: [child]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent), makeAgentSessionMessage(child)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 2);

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(child)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 1);
    document.body.removeChild(view);
  });

  it('suppresses top-level child when handoff anchor is pending for the target agent', async () => {
    // Create a parent session with a pending handoff anchor to child agent by name
    const childAgentName = 'child_agent';
    const parent = makeSession('parent-pending', { agentName: 'parent_agent', messages: [
      {
        id: 'handoff-1',
        timestamp: new Date(),
        type: 'handoff',
        content: {
          type: 'handoff',
          targetAgent: childAgentName,
          reason: 'Handing off to child temporarily',
          context: { note: 'pending handoff anchor' },
          nestedSessionId: 'pending-abc',
        }
      }
    ]});
    const child = makeSession('child-real', { agentName: childAgentName });

    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    // Render both parent and child as top-level messages
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent), makeAgentSessionMessage(child)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    // The top-level child should be suppressed due to the pending handoff anchor
    const lives = queryLive(view);
    assert.strictEqual(lives.length, 1, 'only parent session should render as top-level');
    document.body.removeChild(view);
  });

  it('inlines child agent timeline at handoff and updates in real time', async () => {
    // Create child session with stable id and no messages yet
    const childId = 'child-stable-1';
    const child = makeSession(childId, { agentName: 'child_agent', messages: [] });
    // Parent session includes a handoff anchor pointing to the child id
    const parent = makeSession('parent-rt', {
      agentName: 'parent_agent',
      messages: [
        {
          id: 'handoff-rt',
          timestamp: new Date(),
          type: 'handoff',
          content: {
            type: 'handoff',
            targetAgent: 'child_agent',
            reason: 'Handing off to child',
            context: { note: 'rt' },
            nestedSessionId: childId,
          }
        }
      ],
      nestedSessions: [child],
    });

    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    // Verify nested child is inlined inside the parent's timeline (headerless nested component)
    const parentEl = queryLive(view)[0];
    const parentShadow = parentEl.shadowRoot!;
    // The nested child live-agent-session should be present via the inlined anchor replacement
    const nestedChildEl = parentShadow.querySelector('live-agent-session') as HTMLElement;
    assert.isNotNull(nestedChildEl, 'expected nested child session element inlined at anchor');

    // Now simulate real-time update: append a tool_call to the child session and re-render parent
    const updatedChild = makeSession(childId, {
      agentName: 'child_agent',
      messages: [
        { id: 'tc1', timestamp: new Date(), type: 'tool_call', content: { type: 'tool_call', toolName: 'fetch', toolArgs: { url: 'https://example.com' }, toolCallId: 'tc1' } },
      ],
    });
    const updatedParent = makeSession('parent-rt', {
      agentName: 'parent_agent',
      messages: parent.messages,
      nestedSessions: [updatedChild],
    });

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(updatedParent)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    // Check the nested child timeline shows the new tool call inline without waiting for completion
    const parentShadow2 = queryLive(view)[0].shadowRoot!;
    const nestedChild2 = parentShadow2.querySelector('live-agent-session') as HTMLElement;
    assert.isNotNull(nestedChild2, 'nested child should remain present after update');
    const childShadow = (nestedChild2.shadowRoot!) as ShadowRoot;
    assert.include((childShadow.innerHTML || '').toLowerCase(), 'fetch', 'child timeline shows running tool call');

    document.body.removeChild(view);
  });

  it('agent tool call inside agent tool call via nested session shows both timelines', async () => {
    // Parent has a tool call; child nested session also has a tool call
    const parent = makeSession('p-tool', {messages: [makeToolCall('pa', 'analyze', {target: 'doc'})]});
    const child = makeSession('c-tool', {messages: [makeToolCall('cb', 'fetch', {url: 'https://example.com'})]});
    parent.nestedSessions = [child];

    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(parent)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const live = queryLive(view)[0];
    const sroot = live.shadowRoot!;
    // Parent timeline item present
    const parentItems = sroot.querySelectorAll('.timeline-item');
    assert.isAtLeast(parentItems.length, 1);
    // Nested child timeline HTML is inlined; ensure child tool name appears
    assert.include(sroot.innerHTML, 'fetch');
    document.body.removeChild(view);
  });

  it('concurrent sessions with handoff A→B (B top-level), removing A prunes only A', async () => {
    const b = makeSession('b');
    const a = makeSession('a', {nestedSessions: [b]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(a), makeAgentSessionMessage(b)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 2);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(b)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 1);
    document.body.removeChild(view);
  });
});

describe('ChatView Agent Sessions: pruning and resilience', () => {
  it('reorder does not recreate or prune', async () => {
    const s1 = makeSession('s1');
    const s2 = makeSession('s2');
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);

    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(s1), makeAgentSessionMessage(s2)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 2);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(s2), makeAgentSessionMessage(s1)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 2);
    document.body.removeChild(view);
  });

  it('minimal agent session (agentName + sessionId) renders without error', async () => {
    const minimal = {entity: ChatMessageEntity.AGENT_SESSION, agentSession: {agentName: 'TestAgent', sessionId: 's-min', status: 'running', startTime: new Date(), messages: [], nestedSessions: []}} as any;
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), minimal], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    assert.strictEqual(view.getLiveAgentSessionCountForTesting(), 1);
    document.body.removeChild(view);
  });
});

describe('ChatView visibility rules: agent-managed tool calls/results are hidden', () => {
  it('hides model tool call + result for configurable agent; live timeline shows instead', async () => {
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    const toolCallId = 'id-1';
    const agent = makeSession('s1');
    // Include model tool + agent-managed tool result
    view.data = {messages: [
      makeUser('start'),
      { entity: ChatMessageEntity.MODEL, action: 'tool', toolName: 'fetch', toolCallId, isFinalAnswer: false } as any,
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'fetch', toolCallId, resultText: 'ok', isError: false, isFromConfigurableAgent: true } as any,
      makeAgentSessionMessage(agent),
    ], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const shadow = view.shadowRoot!;
    // No standalone tool result message should be rendered
    assert.strictEqual(shadow.querySelectorAll('.tool-result-message').length, 0);
    // Live session should be present
    assert.isAtLeast(queryLive(view).length, 1);
    document.body.removeChild(view);
  });

  it('shows non-agent tool result as standalone message', async () => {
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [
      makeUser('start'),
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'scan', resultText: 'x', isError: false } as any,
    ], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    const shadow = view.shadowRoot!;
    assert.strictEqual(shadow.querySelectorAll('.tool-result-message').length, 1);
    document.body.removeChild(view);
  });

  it('mixed: agent-managed tool hidden; regular tool visible', async () => {
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    const toolCallId = 't1';
    view.data = {messages: [
      makeUser('start'),
      { entity: ChatMessageEntity.MODEL, action: 'tool', toolName: 'fetch', toolCallId, isFinalAnswer: false } as any,
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'fetch', toolCallId, resultText: 'ok', isError: false, isFromConfigurableAgent: true } as any,
      { entity: ChatMessageEntity.TOOL_RESULT, toolName: 'other', resultText: 'y', isError: false } as any,
      makeAgentSessionMessage(makeSession('s1')),
    ], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    const shadow = view.shadowRoot!;
    assert.strictEqual(shadow.querySelectorAll('.tool-result-message').length, 1);
    document.body.removeChild(view);
  });
});

describe('LiveAgentSessionComponent timeline rendering and interactions', () => {
  it('single tool session shows single-tool mode and hides spine', async () => {
    const session = makeSession('s1', {messages: [makeToolCall('tc1', 'fetch', {url: 'x'}), makeToolResult('tc1', 'fetch', true, {ok: true})]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(session)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const live = queryLive(view)[0];
    const sroot = live.shadowRoot!;
    const container = sroot.querySelector('.agent-execution-timeline') as HTMLElement;
    assert.isTrue(container.classList.contains('single-tool'));
    // In single-tool mode, vertical spine is suppressed via CSS; we ensure the class exists
    document.body.removeChild(view);
  });

  it('multiple tools show two items with status markers', async () => {
    const session = makeSession('s1', {messages: [
      makeToolCall('a', 'fetch', {url: 'x'}),
      makeToolResult('a', 'fetch', true, {ok: 1}),
      makeToolCall('b', 'scan', {q: 'q'}),
      // leave b running (no result)
    ]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(session)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const live = queryLive(view)[0];
    const sroot = live.shadowRoot!;
    const items = sroot.querySelectorAll('.timeline-item');
    assert.isAtLeast(items.length, 2);
    const markers = sroot.querySelectorAll('.tool-status-marker');
    assert.isAtLeast(markers.length, 2);
    document.body.removeChild(view);
  });

  it('expansion toggle persists across re-render', async () => {
    const session = makeSession('s1', {messages: [makeToolCall('a', 'fetch')]});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(session)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const live = queryLive(view)[0];
    const sroot = live.shadowRoot!;
    const toggle = sroot.querySelector('.tool-toggle') as HTMLButtonElement;
    toggle?.click();
    await raf();
    // Trigger re-render by adding a no-op user message
    view.data = {messages: [makeUser('start'), makeUser('again'), makeAgentSessionMessage(session)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    const sroot2 = queryLive(view)[0].shadowRoot!;
    const timeline = sroot2.querySelector('.timeline-items') as HTMLElement;
    assert.strictEqual(timeline.style.display, 'block');
    document.body.removeChild(view);
  });

  it('renders agent query and reasoning once', async () => {
    const session = makeSession('s1', {agentQuery: 'Do X', agentReasoning: 'Because Y', messages: []});
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(session)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    const sroot = queryLive(view)[0].shadowRoot!;
    const msgs = sroot.querySelectorAll('.message');
    // One for reasoning; query appears inside timeline items area as a specific block
    assert.isAtLeast(msgs.length, 1);
    assert.include(sroot.innerHTML, 'Do X');
    assert.include(sroot.innerHTML, 'Because Y');
    document.body.removeChild(view);
  });

  it('renders Research Agent session with multiple tool calls and results', async () => {
    const researchConfig = { ui: { displayName: 'Research Agent' } };
    const session = makeSession('research-1', {
      agentName: 'research_agent',
      config: researchConfig,
      agentQuery: 'Find latest web performance news',
      agentReasoning: 'Gather and summarize credible sources',
      messages: [
        makeToolCall('w1', 'web_search', {query: 'web performance news'}),
        makeToolResult('w1', 'web_search', true, {hits: 5}),
        makeToolCall('s1', 'summarize', {text: '...'}),
        {id: 's1-result', timestamp: new Date(), type: 'tool_result', content: {type: 'tool_result', toolCallId: 's1', toolName: 'summarize', success: false, error: 'too long'}},
      ],
    });
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    view.data = {messages: [makeUser('start'), makeAgentSessionMessage(session)], state: 'idle', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();

    const live = queryLive(view)[0];
    const sroot = live.shadowRoot!;
    // Header shows display name
    const headerTitle = sroot.querySelector('.agent-title') as HTMLElement;
    assert.include(headerTitle.textContent || '', 'Research Agent');
    // Two tool items present
    const items = sroot.querySelectorAll('.timeline-item');
    assert.isAtLeast(items.length, 2);
    // Has completed and error markers
    const completed = sroot.querySelectorAll('.tool-status-marker.completed');
    const errored = sroot.querySelectorAll('.tool-status-marker.error');
    assert.isAtLeast(completed.length, 1);
    assert.isAtLeast(errored.length, 1);
    // Contains tool names after formatting (underscores replaced with spaces)
    assert.include(sroot.innerHTML.toLowerCase(), 'web search');
    assert.include(sroot.innerHTML.toLowerCase(), 'summarize');

    document.body.removeChild(view);
  });

  it('hides general loader when a final error message is present', async () => {
    const view = document.createElement('devtools-chat-view') as any;
    document.body.appendChild(view);
    // Provide LOADING state but include a final error message; ChatView should not show generic loader
    const errorFinal = { entity: 'model', action: 'final', isFinalAnswer: true, error: 'Something went wrong' } as any;
    view.data = {messages: [makeUser('start'), errorFinal], state: 'loading', isTextInputEmpty: true, onSendMessage: () => {}, onPromptSelected: () => {}} as any;
    await raf();
    const shadow = view.shadowRoot!;
    const loaders = shadow.querySelectorAll('.message.model-message.loading');
    assert.strictEqual(loaders.length, 0);
    document.body.removeChild(view);
  });
});
