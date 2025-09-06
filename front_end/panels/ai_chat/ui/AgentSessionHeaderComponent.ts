// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';
import type { AgentSession } from '../agent_framework/AgentSessionTypes.js';
import { getAgentUIConfig } from '../agent_framework/AgentSessionTypes.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators;

export type SessionStatus = 'running' | 'completed' | 'error';

@customElement('agent-session-header')
export class AgentSessionHeaderComponent extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`agent-session-header`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  
  private session: AgentSession | null = null;
  private isExpanded = true;
  private startTime: Date | null = null;
  private endTime: Date | null = null;
  private durationTimer: number | null = null;

  connectedCallback(): void {
    this.startDurationTimer();
    this.render();
  }

  disconnectedCallback(): void {
    this.stopDurationTimer();
  }

  setSession(session: AgentSession): void {
    this.session = session;
    this.startTime = session.startTime || new Date();
    this.endTime = session.endTime || null;
    
    if (session.status !== 'running' && !this.endTime) {
      this.endTime = new Date();
    }
    
    this.render();
  }

  toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.render();
    
    // Dispatch event to notify parent
    this.dispatchEvent(new CustomEvent('toggle-expanded', {
      detail: { isExpanded: this.isExpanded },
      bubbles: true
    }));
  }

  private startDurationTimer(): void {
    this.durationTimer = window.setInterval(() => {
      if (this.session?.status === 'running') {
        this.render();
      }
    }, 1000);
  }

  private stopDurationTimer(): void {
    if (this.durationTimer) {
      window.clearInterval(this.durationTimer);
      this.durationTimer = null;
    }
  }

  private render(): void {
    if (!this.session) return;

    const uiConfig = getAgentUIConfig(this.session.agentName, this.session.config);
    const status = this.getSessionStatus();
    const statusClass = this.getStatusClass(status);
    const statusIcon = this.getStatusIcon(status);
    const duration = this.formatDuration();

    Lit.render(html`
      <style>
        :host {
          display: block;
        }

        .agent-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px 16px;
          background: var(--sys-color-surface-variant);
          border: 1px solid var(--sys-color-outline);
          border-radius: 8px;
          cursor: pointer;
          transition: all var(--transition-fast);
          font-weight: 500;
        }

        .agent-header:hover {
          background: var(--sys-color-surface2);
          border-color: var(--sys-color-outline-variant);
        }

        .agent-header.running {
          border-left: 4px solid var(--sys-color-secondary);
        }

        .agent-header.completed {
          border-left: 4px solid var(--sys-color-primary);
        }

        .agent-header.error {
          border-left: 4px solid var(--sys-color-error);
        }

        .agent-title {
          color: var(--sys-color-on-surface);
          font-size: 14px;
          font-weight: 600;
          flex: 1;
        }

        .status-badge {
          font-size: 11px;
          font-weight: 500;
          padding: 3px 8px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.live {
          background: var(--sys-color-error);
          color: var(--sys-color-on-error);
          animation: pulse 2s infinite;
        }

        .status-badge.completed {
          background: var(--sys-color-primary);
          color: var(--sys-color-on-primary);
        }

        .status-badge.error {
          background: var(--sys-color-error);
          color: var(--sys-color-on-error);
        }

        .level-badge {
          font-size: 10px;
          font-weight: 500;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .level-badge.nested {
          background: var(--sys-color-tertiary-container);
          color: var(--sys-color-on-tertiary-container);
        }

        .level-badge.top-level {
          background: var(--sys-color-primary-container);
          color: var(--sys-color-on-primary-container);
        }

        .duration {
          font-size: 11px;
          color: var(--sys-color-on-surface-variant);
          font-family: monospace;
          min-width: 40px;
          text-align: right;
        }

        .expand-icon {
          font-size: 12px;
          color: var(--sys-color-on-surface-variant);
          transition: transform 0.2s;
          margin-left: 4px;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .live-indicator {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--sys-color-error);
          animation: pulse 2s infinite;
        }

        .status-icon {
          font-size: 12px;
        }

        .status-icon.running {
          animation: spin 1s linear infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <div class="agent-header ${statusClass}" @click=${() => this.toggleExpanded()}>
        <div class="agent-title">${uiConfig.displayName}</div>
        
        ${status === 'running' ? html`
          <div class="status-badge live">
            <div class="live-indicator"></div>
            LIVE
          </div>
        ` : html`
          <div class="status-badge ${statusClass}">
            <span class="status-icon ${statusClass}">${statusIcon}</span>
            ${status.toUpperCase()}
          </div>
        `}
        
        <div class="level-badge ${this.session.parentSessionId ? 'nested' : 'top-level'}">
          ${this.session.parentSessionId ? 'Nested' : 'Top Level'}
        </div>
        
        <div class="duration">${duration}</div>
        
        <span class="expand-icon ${this.isExpanded ? 'expanded' : ''}">▼</span>
      </div>
    `, this.shadow);
  }

  private getSessionStatus(): SessionStatus {
    if (!this.session) return 'running';
    
    // Map session status to our component status
    switch (this.session.status) {
      case 'running': return 'running';
      case 'completed': return 'completed';
      case 'error': return 'error';
      default: return 'running';
    }
  }

  private getStatusClass(status: SessionStatus): string {
    return status;
  }

  private getStatusIcon(status: SessionStatus): string {
    switch (status) {
      case 'running': return '⏳';
      case 'completed': return '✓';
      case 'error': return '❌';
      default: return '●';
    }
  }

  private formatDuration(): string {
    if (!this.startTime) return '0s';
    
    const endTime = this.endTime || new Date();
    const durationMs = endTime.getTime() - this.startTime.getTime();
    const seconds = Math.floor(durationMs / 1000);
    
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return `${minutes}m ${remainingSeconds}s`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
}