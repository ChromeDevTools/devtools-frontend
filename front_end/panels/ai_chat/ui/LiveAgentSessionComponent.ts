// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';
import { createLogger } from '../core/Logger.js';
import type { AgentSession, AgentMessage } from '../agent_framework/AgentSessionTypes.js';
import { getAgentUIConfig } from '../agent_framework/AgentSessionTypes.js';
import { ToolCallComponent } from './ToolCallComponent.js';
import { AgentSessionHeaderComponent } from './AgentSessionHeaderComponent.js';
import { ToolDescriptionFormatter } from './ToolDescriptionFormatter.js';

const {Decorators} = Lit;
const {customElement} = Decorators;

@customElement('live-agent-session')
export class LiveAgentSessionComponent extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`live-agent-session`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  
  private _session: AgentSession | null = null;
  private _variant: 'full'|'nested' = 'full';
  private headerComponent: AgentSessionHeaderComponent | null = null;
  private toolComponents = new Map<string, ToolCallComponent>();
  private childComponents = new Map<string, LiveAgentSessionComponent>();
  private isExpanded = true;
  private suppressInlineChildIds: Set<string> = new Set();
  readonly #log = createLogger('LiveAgentSession');

  connectedCallback(): void {
    this.render();
  }

  // Allow declarative property binding from templates
  set session(session: AgentSession) { this.setSession(session); }
  get session(): AgentSession | null { return this._session; }

  // Control whether to render with header (full) or compact nested variant
  setVariant(variant: 'full'|'nested'): void {
    this._variant = variant;
    if (variant === 'nested') {
      this.isExpanded = true; // nested timelines are always expanded
    }
    this.render();
  }

  setSuppressInlineChildIds(ids: Set<string>): void {
    this.suppressInlineChildIds = ids;
    try { this.#log.info('setSuppressInlineChildIds', { ids: Array.from(ids) }); } catch {}
    this.render();
  }

  setSession(session: AgentSession): void {
    this._session = session;
    try {
      this.#log.info('setSession', {
        sessionId: session.sessionId,
        agentName: session.agentName,
        status: session.status,
        nestedCount: session.nestedSessions?.length || 0,
        messageCount: session.messages?.length || 0,
      });
    } catch {}
    
    // Update header component
    if (!this.headerComponent) {
      this.headerComponent = new AgentSessionHeaderComponent();
      this.headerComponent.addEventListener('toggle-expanded', (e: Event) => {
        const customEvent = e as CustomEvent;
        this.isExpanded = customEvent.detail.isExpanded;
        this.render();
      });
    }
    
    this.headerComponent.setSession(session);
    this.render();
  }

  addToolCall(toolCall: AgentMessage): void {
    if (!this._session) return;
    
    // Store the tool call (no longer using separate components)
    this.toolComponents.set(toolCall.id, null as any);
    
    // Re-render to show the updated timeline
    this.render();
  }

  updateToolResult(toolResult: AgentMessage): void {
    if (!this._session) return;
    
    // Re-render to show the updated status
    this.render();
  }

  addChildSession(sessionId: string, childComponent: LiveAgentSessionComponent): void {
    this.childComponents.set(sessionId, childComponent);
    
    // Re-render to show nested sessions
    this.render();
  }

  private render(): void {
    if (!this._session) return;

    // Get agent UI configuration for proper display name
    const uiConfig = getAgentUIConfig(this._session.agentName, this._session.config);
    
    // Generate timeline items HTML
    const timelineItemsHtml = this.generateTimelineItemsHtml();
    
    // Determine if this is a single tool execution
    const toolMessages = this._session.messages.filter(msg => msg.type === 'tool_call');
    const isSingleTool = toolMessages.length === 1;
    
    const timelineId = `timeline-${this._session.sessionId}`;

    const isFull = this._variant === 'full';
    const reasoningHtml = isFull && this._session.agentReasoning ? `<div class="message">${this._session.agentReasoning}</div>` : '';
    const timelineDisplay = isFull ? (this.isExpanded ? 'block' : 'none') : 'block';

    this.shadow.innerHTML = `
      <style>
        /* Import timeline styles from chatView.css */
        :host {
          --sys-color-surface-variant-rgb: 128, 128, 128;
        }
        .agent-execution-timeline {
          position: relative;
          margin: 16px 0;
          font-size: 13px;
          line-height: 1.4;
          padding: 0;
        }
        
        .agent-session-container { position: relative; }
        .agent-session-container.nested { margin-left: 16px; }
        
        .agent-header {
          position: relative;
          display: flex;
          align-items: center;
          margin-bottom: 8px;
          font-weight: 500;
          color: var(--sys-color-on-surface);
        }
        
        .agent-marker {
          flex-shrink: 0;
          width: auto;
          height: auto;
          margin-right: 8px;
          font-size: 14px;
          color: #00a4fe;
        }
        
        .agent-marker::before {
          content: '●';
        }
        
        .agent-title {
          font-size: 14px;
          font-weight: 500;
          color: var(--sys-color-on-surface);
          margin-right: 8px;
          white-space: nowrap;
        }
        
        .agent-divider {
          flex: 1;
          height: 1px;
          background-color: var(--sys-color-divider);
          position: relative;
          top: 1px;
        }
        
        .tool-toggle {
          background: none;
          border: none;
          color: var(--sys-color-on-surface-variant);
          font-size: 12px;
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
          transition: background-color 0.2s ease;
        }
        
        .tool-toggle:hover {
          background-color: var(--sys-color-state-hover-on-subtle);
        }
        
        .toggle-icon { font-size: 10px; }
        
        .timeline-items {
          position: relative;
          padding: 0;
          margin: 0;
          margin-left: 0;
        }
        
        .timeline-items::before {
          content: '';
          position: absolute;
          left: 7px;
          top: 0;
          bottom: 0;
          width: 1px;
          background-color: var(--sys-color-divider);
          z-index: 0; /* place behind content */
        }
        
        .agent-execution-timeline.single-tool .timeline-vertical-connector::before {
          content: '│';
          color: var(--sys-color-divider);
        }
        
        .timeline-items:empty::after {
          content: 'No tools executed yet...';
          color: var(--sys-color-on-surface-variant);
          font-style: italic;
          font-size: 12px;
          display: block;
          text-align: center;
          padding: 20px;
        }
        
        .timeline-item {
          position: relative;
          display: block;
          margin: 2px 0;
          border-radius: 4px;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        
        .tool-line {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          font-size: 13px;
          line-height: 1.4;
          padding: 2px 4px;
          overflow: visible;
          position: relative;
          z-index: 1; /* above the spine */
        }
        
        .timeline-item-line {
          position: relative;
          display: flex;
          align-items: center;
          z-index: 2;
          margin-left: 0;
        }
        
        .timeline-vertical-connector {
          flex-shrink: 0;
          width: 14px;
        }
        
        .tool-left {
          flex: 1;
          color: var(--sys-color-on-surface);
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
        }
        
        .tool-description-indicator {
          color: var(--sys-color-divider);
          padding: 0 4px;
          white-space: nowrap;
        }
        
        .tool-name-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-left: 8px;
          padding: 1px 6px;
          border-radius: 999px;
          font-size: 11px;
          background: var(--sys-color-surface-variant);
          color: var(--sys-color-on-surface-variant);
        }
        
        .tool-arg {
          display: flex;
          margin-bottom: 1px;
          padding-left: 16px;
        }
        
        .tool-arg-key {
          color: var(--sys-color-on-surface);
          font-weight: 500;
          flex-shrink: 0;
          margin-right: 8px;
        }
        
        .tool-arg-value {
          color: var(--sys-color-on-surface-variant);
          word-break: break-word;
        }

        /* Inline reasoning on the same line as the tool */
        .tool-reasoning-inline {
          color: var(--sys-color-on-surface-variant);
          font-size: 12px;
          margin-left: 0;
          padding-left: 4px;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
          white-space: normal;
          max-width: 100%;
        }
        /* Ensure the indicator sticks to the first character of reasoning */
        .tool-reasoning-inline::before {
          content: '─';
          color: var(--sys-color-divider);
          margin-right: 4px;
        }
        /* No expand/collapse UI for reasoning; keep clamped for scannability */
        
        .tool-status-marker {
          flex-shrink: 0;
          margin-left: 8px;
          font-size: 13px;
          z-index: 9999;
        }
        
        .tool-status-marker.completed { color: var(--sys-color-green-bright); }
        .tool-status-marker.error { color: var(--sys-color-error); }
        .tool-status-marker.running {
          color: var(--sys-color-on-surface-variant);
          animation: dotPulse 1.5s ease-in-out infinite;
        }
        
        .tool-status-marker:hover {
          transform: scale(1.2);
        }
        
        
        
        @keyframes dotPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }

        .timeline-item:hover {
          transform: translateX(2px);
        }
        
        .timeline-items:empty {
          min-height: 40px;
        }
        
        .nested-sessions {
          margin-left: 20px;
          border-left: 2px solid var(--sys-color-outline-variant);
          padding-left: 16px;
          margin-top: 12px;
        }
        
        .handoff-indicator {
          color: var(--sys-color-on-surface-variant);
          font-size: 12px;
          margin-bottom: 8px;
          font-weight: 500;
        }
        
        .handoff-arrow {
          margin-right: 6px;
          color: var(--sys-color-primary);
        }
        .handoff-anchor {
          margin: 4px 0 0 0;
          padding-left: 16px;
        }
        
        .message {
          margin-bottom: 8px;
          color: var(--sys-color-on-surface);
        }
      </style>
      <div class="agent-execution-timeline${isSingleTool ? ' single-tool' : ''}">
        ${reasoningHtml}
        <div class="agent-session-container${isFull ? '' : ' nested'}">
          ${isFull ? `
          <div class=\"agent-header\">
            <div class=\"agent-marker\"></div>
            <div class=\"agent-title\">${uiConfig.displayName}</div>
            <div class=\"agent-divider\"></div>
            <button class=\"tool-toggle\" aria-expanded=\"${this.isExpanded}\" aria-controls=\"${timelineId}\" title=\"${this.isExpanded ? 'Collapse' : 'Expand'}\">\n              <span class=\"toggle-icon\">${this.isExpanded ? '▲' : '▼'}</span>\n            </button>
          </div>` : ''}
          <div class="timeline-items" id="${timelineId}" role="list" aria-live="polite" style="display: ${timelineDisplay};">
            ${timelineItemsHtml}
            <div class="nested-sessions" style="display: ${timelineDisplay};"></div>
          </div>
        </div>
      </div>
    `;
    
    // Add event listener for the toggle button (full variant only)
    const toggleButton = isFull ? this.shadow.querySelector('.tool-toggle') : null;
    if (toggleButton) {
      toggleButton.addEventListener('click', () => {
        this.isExpanded = !this.isExpanded;
        this.render();
      });
    }

    // No expand/collapse listeners for reasoning (simplified)

    // Render nested sessions as real elements with live interactivity
    const nestedContainer = this.shadow.querySelector('.nested-sessions');
    const nestedSessions = this._session?.nestedSessions || [];
    if (nestedSessions.length) {
      // First, try to inline children at handoff anchors
      const anchors = Array.from(this.shadow.querySelectorAll<HTMLElement>('.handoff-anchor'));
      const inlined = new Set<string>();
      for (const anchor of anchors) {
        const nid = anchor.getAttribute('data-nested-id');
        if (!nid) continue;
        const nested = nestedSessions.find(s => s.sessionId === nid);
        if (!nested) continue;
        const nestedEl = new LiveAgentSessionComponent();
        try { this.#log.info('inlining nested session at anchor', { childSessionId: nested.sessionId, agentName: nested.agentName }); } catch {}
        nestedEl.setVariant('nested');
        nestedEl.setSession(nested);
        nestedEl.setSuppressInlineChildIds(this.suppressInlineChildIds);
        anchor.replaceWith(nestedEl);
        inlined.add(nid);
      }
      // Fallback: append any remaining nested sessions (without anchors) at the bottom container
      if (nestedContainer) {
        (nestedContainer as HTMLElement).innerHTML = '';
        for (const nested of nestedSessions) {
          if (inlined.has(nested.sessionId)) continue;
          // Always show fallback nested sessions; ChatView suppresses top-level duplicates
          const nestedEl = new LiveAgentSessionComponent();
          try { this.#log.info('appending nested session (fallback)', { childSessionId: nested.sessionId, agentName: nested.agentName }); } catch {}
          nestedEl.setVariant('nested');
          nestedEl.setSession(nested);
          nestedEl.setSuppressInlineChildIds(this.suppressInlineChildIds);
          nestedContainer.appendChild(nestedEl);
        }
      }
    }
  }

  private generateTimelineItemsHtml(): string {
    if (!this.session) return '';
    
    const toolMessages = this._session?.messages.filter(msg => msg.type === 'tool_call') || [];
    const toolResults = this._session?.messages.filter(msg => msg.type === 'tool_result') || [];
    
    let html = '';
    
    // Add agent query if present (matching ChatView)
    if (this._session && this._session.agentQuery) {
      html += `
        <div class="timeline-item" role="listitem">
          <div class="tool-line">
            <div class="tool-left">
              <span class="tool-reasoning-inline">${this.session.agentQuery}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    // Build result map for quick lookup
    const resultMap = new Map<string, any>();
    for (const r of toolResults) {
      const rc = (r.content as any);
      if (rc?.toolCallId) resultMap.set(rc.toolCallId, rc);
    }

    // Walk messages in order and render tool calls and inline handoff anchors
    for (const m of (this._session?.messages || [])) {
      if (m.type === 'tool_call') {
        const toolContent = m.content as any;
        const toolName = toolContent.toolName;
        const toolArgs = toolContent.toolArgs || {};
        const reasonFromArgs = toolArgs?.reasoning ?? toolArgs?.reason ?? toolArgs?.why;
        const toolReasoning: string | undefined = (toolContent.reasoning ?? (reasonFromArgs !== undefined ? String(reasonFromArgs) : undefined));
        const toolId: string = toolContent.toolCallId || m.id;
        const resultContent = resultMap.get(toolContent.toolCallId);
        const status = resultContent ? (resultContent.success ? 'completed' : 'error') : 'running';
        const statusText = status === 'running' ? 'Running' : (status === 'completed' ? 'Success' : 'Error');
        const icon = ToolDescriptionFormatter.getToolIcon(toolName);
        const toolNameDisplay = ToolDescriptionFormatter.formatToolName(toolName);
        const aria = toolReasoning ? `${toolReasoning} — ${toolNameDisplay} — ${statusText}` : `${toolNameDisplay} — ${statusText}`;
        html += `
          <div class="timeline-item" role="listitem" data-tool-id="${toolId}" aria-label="${aria}">
            <div class="tool-line">
              <div class="tool-left">
                ${toolReasoning ? `<span class=\"tool-reasoning-inline\">${toolReasoning}</span>` : `<span class=\"tool-description-indicator\">─</span>`}
                <span class="tool-name-badge">${icon} ${toolNameDisplay}</span>
              </div>
              <span class="tool-status-marker ${status}" title="${status === 'running' ? 'Running' : status === 'completed' ? 'Completed' : 'Error'}">●</span>
            </div>
          </div>
        `;
      } else if (m.type === 'handoff') {
        const c = (m.content as any) || {};
        const nestedId = c.nestedSessionId as string | undefined;
        if (nestedId && !nestedId.startsWith('pending-')) {
          html += `
            <div class="handoff-anchor" role="listitem" data-nested-id="${nestedId}"></div>
          `;
        }
      }
    }
    
    return html;
  }
  // No additional helpers needed for the simplified view
}
