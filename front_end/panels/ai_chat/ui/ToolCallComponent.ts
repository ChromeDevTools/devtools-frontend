// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';
import type { AgentMessage } from '../agent_framework/AgentSessionTypes.js';
import { ToolDescriptionFormatter } from './ToolDescriptionFormatter.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators;

export type ToolStatus = 'running' | 'completed' | 'error';

@customElement('tool-call')
export class ToolCallComponent extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`tool-call`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  
  private toolCall: AgentMessage | null = null;
  private status: ToolStatus = 'running';
  private isExpanded = true;

  connectedCallback(): void {
    this.render();
  }

  setToolCall(toolCall: AgentMessage): void {
    this.toolCall = toolCall;
    this.status = 'running';
    this.render();
  }

  updateStatus(status: ToolStatus): void {
    this.status = status;
    this.render();
  }

  private toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  private render(): void {
    if (!this.toolCall) return;

    const content = this.toolCall.content as any;
    const toolName = content.toolName || 'unknown_tool';
    const toolArgs = content.toolArgs || content.arguments || {};
    
    const icon = ToolDescriptionFormatter.getToolIcon(toolName);
    const description = ToolDescriptionFormatter.getToolDescription(toolName, toolArgs);
    const statusIcon = this.getStatusIcon();
    const statusClass = this.getStatusClass();

    Lit.render(html`
      <style>
        :host {
          display: block;
          margin: 4px 0;
        }

        .enterprise-tool {
          background: var(--sys-color-surface1);
          border: 1px solid var(--sys-color-outline-variant);
          border-radius: 8px;
          padding: 12px 16px;
          transition: all var(--transition-fast);
        }

        .enterprise-tool:hover {
          background: var(--sys-color-surface2);
          border-color: var(--sys-color-outline);
        }

        .enterprise-tool.running {
          border-left: 4px solid var(--sys-color-secondary);
        }

        .enterprise-tool.completed {
          border-left: 4px solid var(--sys-color-primary);
        }

        .enterprise-tool.error {
          border-left: 4px solid var(--sys-color-error);
        }

        .tool-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
          cursor: pointer;
        }

        .tool-name {
          font-size: 13px;
          font-weight: 600;
          color: var(--sys-color-on-surface);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .tool-status {
          font-size: 12px;
          font-weight: 500;
          padding: 2px 8px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .tool-status.running {
          background: var(--sys-color-secondary-container);
          color: var(--sys-color-on-secondary-container);
        }

        .tool-status.completed {
          background: var(--sys-color-primary-container);
          color: var(--sys-color-on-primary-container);
        }

        .tool-status.error {
          background: var(--sys-color-error-container);
          color: var(--sys-color-on-error-container);
        }

        .tool-description {
          font-size: 12px;
          color: var(--sys-color-on-surface-variant);
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .tool-description.multiline {
          white-space: pre-line;
        }

        .tool-args {
          margin-top: 8px;
        }

        .tool-arg {
          margin: 4px 0;
          margin-left: 16px;
          font-size: 11px;
          color: var(--sys-color-on-surface-variant);
        }

        .tool-arg-key {
          font-weight: 500;
          color: var(--sys-color-primary);
        }

        .tool-arg-value {
          margin-left: 8px;
          font-family: monospace;
        }

        .tool-details {
          background: var(--sys-color-surface);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 11px;
          white-space: pre-wrap;
          color: var(--sys-color-on-surface);
          border: 1px solid var(--sys-color-outline-variant);
          margin-top: 8px;
          font-family: monospace;
          max-height: 200px;
          overflow-y: auto;
        }

        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      </style>

      <div class="enterprise-tool ${statusClass}">
        <div class="tool-header" @click=${() => this.toggleExpanded()}>
          <div class="tool-name">
            ${icon} ${ToolDescriptionFormatter.formatToolName(toolName)}
          </div>
          <div class="tool-status ${statusClass}">
            ${statusIcon} ${this.getStatusText()}
            <span class="expand-icon ${this.isExpanded ? 'expanded' : ''}">▼</span>
          </div>
        </div>

        <div class="tool-description ${description.isMultiLine ? 'multiline' : ''}">
          ${description.isMultiLine ? 
            html`${(description.content as Array<{key: string; value: string}>).map(arg => html`
              <div class="tool-arg">
                <span class="tool-arg-key">${arg.key}:</span>
                <span class="tool-arg-value">${arg.value}</span>
              </div>
            `)}` :
            html`${description.content}`
          }
        </div>

        ${this.isExpanded ? html`
          <div class="tool-details">
            ${JSON.stringify(ToolDescriptionFormatter.filterMetadataFields(toolArgs), null, 2)}
          </div>
        ` : Lit.nothing}
      </div>
    `, this.shadow);
  }

  private getStatusIcon(): string {
    switch (this.status) {
      case 'running': return '⏳';
      case 'completed': return '✓';
      case 'error': return '❌';
      default: return '●';
    }
  }

  private getStatusClass(): string {
    return this.status;
  }

  private getStatusText(): string {
    switch (this.status) {
      case 'running': return 'Running';
      case 'completed': return 'Success';
      case 'error': return 'Error';
      default: return 'Unknown';
    }
  }
}
