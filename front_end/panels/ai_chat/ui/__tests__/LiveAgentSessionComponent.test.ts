// Copyright 2025 The Chromium Authors.

import '../LiveAgentSessionComponent.js';
import {raf} from '../../../../testing/DOMHelpers.js';

type AgentMsg = {
  id: string;
  timestamp: Date;
  type: 'reasoning'|'tool_call'|'tool_result'|'handoff'|'final_answer';
  content: any;
};

type AgentSession = {
  agentName: string;
  sessionId: string;
  status: 'running'|'completed'|'error';
  startTime: Date;
  endTime?: Date;
  messages: AgentMsg[];
  nestedSessions: AgentSession[];
  agentQuery?: string;
  agentReasoning?: string;
  parentSessionId?: string;
  config?: any;
};

function makeToolCall(id: string, toolName: string, toolArgs: Record<string, any> = {}): AgentMsg {
  return {id, timestamp: new Date(), type: 'tool_call', content: {type: 'tool_call', toolName, toolArgs, toolCallId: id}};
}

function makeToolResult(id: string, toolName: string, success = true, result: any = {ok: true}): AgentMsg {
  return {id: `${id}-result`, timestamp: new Date(), type: 'tool_result', content: {type: 'tool_result', toolCallId: id, toolName, success, result}};
}

function makeSession(sessionId: string, opts: Partial<AgentSession> = {}): AgentSession {
  return {
    agentName: opts.agentName || 'test_agent',
    sessionId,
    status: opts.status || 'running',
    startTime: opts.startTime || new Date(),
    endTime: opts.endTime,
    messages: opts.messages || [],
    nestedSessions: opts.nestedSessions || [],
    agentQuery: opts.agentQuery,
    agentReasoning: opts.agentReasoning,
    parentSessionId: opts.parentSessionId,
    config: opts.config || { ui: { displayName: 'Test Agent' } },
  };
}

describe('LiveAgentSessionComponent UI elements', () => {
  it('renders header with display name and toggle', async () => {
    const session = makeSession('s1', {config: {ui: {displayName: 'Research Agent'}}});
    const el = document.createElement('live-agent-session') as any;
    document.body.appendChild(el);
    el.setSession(session as any);
    await raf();

    const sroot = el.shadowRoot!;
    const header = sroot.querySelector('.agent-header') as HTMLElement;
    const title = sroot.querySelector('.agent-title') as HTMLElement;
    const toggle = sroot.querySelector('.tool-toggle') as HTMLButtonElement;
    assert.isNotNull(header);
    assert.include(title?.textContent || '', 'Research Agent');
    assert.isNotNull(toggle);

    document.body.removeChild(el);
  });

  it('expands/collapses timeline via header toggle', async () => {
    const session = makeSession('s1', {messages: [makeToolCall('a', 'fetch', {url: 'x'})]});
    const el = document.createElement('live-agent-session') as any;
    document.body.appendChild(el);
    el.setSession(session as any);
    await raf();

    const sroot = el.shadowRoot!;
    const timeline = sroot.querySelector('.timeline-items') as HTMLElement;
    // Default collapsed
    assert.strictEqual(timeline.style.display, 'none');
    // Click toggle
    (sroot.querySelector('.tool-toggle') as HTMLButtonElement).click();
    await raf();
    assert.strictEqual((el.shadowRoot!.querySelector('.timeline-items') as HTMLElement).style.display, 'block');
    // Collapse again
    (el.shadowRoot!.querySelector('.tool-toggle') as HTMLButtonElement).click();
    await raf();
    assert.strictEqual((el.shadowRoot!.querySelector('.timeline-items') as HTMLElement).style.display, 'none');

    document.body.removeChild(el);
  });

  it('renders tool items with running/completed/error markers', async () => {
    const base = makeSession('s1', {messages: [
      makeToolCall('a', 'fetch', {url: 'x'}),
      makeToolResult('a', 'fetch', true, {ok: 1}),
      makeToolCall('b', 'scan', {q: 'q'}),
    ]});

    const el = document.createElement('live-agent-session') as any;
    document.body.appendChild(el);
    el.setSession(base as any);
    await raf();

    let sroot = el.shadowRoot!;
    assert.isAtLeast(sroot.querySelectorAll('.tool-status-marker').length, 2);
    assert.isAtLeast(sroot.querySelectorAll('.tool-status-marker.completed').length, 1);
    assert.isAtLeast(sroot.querySelectorAll('.tool-status-marker.running').length, 1);

    // Now add an error result for the second call and re-render
    const updated = makeSession('s1', {
      messages: [
        makeToolCall('a', 'fetch', {url: 'x'}),
        makeToolResult('a', 'fetch', true, {ok: 1}),
        makeToolCall('b', 'scan', {q: 'q'}),
        {id: 'b-result', timestamp: new Date(), type: 'tool_result', content: {type: 'tool_result', toolCallId: 'b', toolName: 'scan', success: false, error: 'bad'}},
      ],
    });
    el.setSession(updated as any);
    await raf();

    sroot = el.shadowRoot!;
    assert.isAtLeast(sroot.querySelectorAll('.tool-status-marker.error').length, 1);

    document.body.removeChild(el);
  });

  it('renders nested session inside timeline area', async () => {
    const child = makeSession('c1', {config: {ui: {displayName: 'Child Agent'}}});
    const parent = makeSession('p1', {nestedSessions: [child], config: {ui: {displayName: 'Parent Agent'}}});
    const el = document.createElement('live-agent-session') as any;
    document.body.appendChild(el);
    el.setSession(parent as any);
    await raf();

    const sroot = el.shadowRoot!;
    const nestedContainer = sroot.querySelector('.nested-sessions') as HTMLElement;
    assert.isNotNull(nestedContainer);
    // A nested live-agent-session element should be present
    assert.isAtLeast(nestedContainer.querySelectorAll('live-agent-session').length, 1);

    document.body.removeChild(el);
  });

  it('shows per-tool reasoning inline with the tool call when provided', async () => {
    const session = makeSession('sR', {messages: [
      { id: 't1', timestamp: new Date(), type: 'tool_call', content: {type: 'tool_call', toolName: 'fetch', toolArgs: {url: 'x'}, toolCallId: 't1', reasoning: 'Need to fetch the resource first.'}},
    ]});
    const el = document.createElement('live-agent-session') as any;
    document.body.appendChild(el);
    el.setSession(session as any);
    await raf();

    const sroot = el.shadowRoot!;
    const items = Array.from(sroot.querySelectorAll('.timeline-item')) as HTMLElement[];
    assert.isAtLeast(items.length, 1);
    const first = items[0];
    const inline = first.querySelector('.tool-reasoning-inline') as HTMLElement;
    assert.isNotNull(inline);
    assert.include(inline.textContent || '', 'Need to fetch the resource first.');

    document.body.removeChild(el);
  });

  it('uses reasoning from tool args when missing on content (inline) and does not duplicate in args list', async () => {
    const session = makeSession('sArgs', {messages: [
      { id: 't2', timestamp: new Date(), type: 'tool_call', content: {type: 'tool_call', toolName: 'scan', toolArgs: {q: 'abc', reasoning: 'Scanning is needed to locate items.'}, toolCallId: 't2'}},
    ]});
    const el = document.createElement('live-agent-session') as any;
    document.body.appendChild(el);
    el.setSession(session as any);
    await raf();

    const sroot = el.shadowRoot!;
    const item = sroot.querySelector('.timeline-item') as HTMLElement;
    const inline = item.querySelector('.tool-reasoning-inline') as HTMLElement;
    assert.isNotNull(inline);
    assert.include(inline.textContent || '', 'Scanning is needed to locate items.');
    // Ensure we did not also render an arg row for the reasoning key
    assert.notInclude(item.innerHTML.toLowerCase(), 'reasoning:');

    document.body.removeChild(el);
  });
});
