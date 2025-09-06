// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../ui/lit/lit.js';
import type { AgentMessage } from '../agent_framework/AgentSessionTypes.js';
import { ToolDescriptionFormatter } from './ToolDescriptionFormatter.js';

const {html, Decorators} = Lit;
const {customElement} = Decorators;

@customElement('tool-result')
export class ToolResultComponent extends HTMLElement {
  static readonly litTagName = Lit.StaticHtml.literal`tool-result`;
  private readonly shadow = this.attachShadow({mode: 'open'});
  
  private toolResult: AgentMessage | null = null;
  private isExpanded = false;

  connectedCallback(): void {
    this.render();
  }

  setResult(toolResult: AgentMessage): void {
    this.toolResult = toolResult;
    this.render();
  }

  private toggleExpanded(): void {
    this.isExpanded = !this.isExpanded;
    this.render();
  }

  private render(): void {
    if (!this.toolResult) return;

    const content = this.toolResult.content as any;
    const toolName = content.toolName || 'unknown_tool';
    const success = content.success !== false; // Default to true if not specified
    const statusClass = success ? 'success' : 'error';
    const statusIcon = success ? '✓' : '❌';
    const result = content.result;
    const error = content.error;

    const resultText = this.formatResult(result);
    const isLongResult = resultText && resultText.length > 200;

    Lit.render(html`
      <style>
        :host {
          display: block;
          margin: 8px 0;
        }

        .tool-result {
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          border-left: 3px solid;
          line-height: 1.4;
          margin-top: 8px;
        }

        .tool-result.success {
          background: var(--sys-color-primary-container);
          color: var(--sys-color-on-primary-container);
          border-color: var(--sys-color-primary);
        }

        .tool-result.error {
          background: var(--sys-color-error-container);
          color: var(--sys-color-on-error-container);
          border-color: var(--sys-color-error);
        }

        .tool-result-header {
          font-weight: 500;
          margin-bottom: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          cursor: ${isLongResult ? 'pointer' : 'default'};
        }

        .tool-result-header:hover {
          opacity: ${isLongResult ? '0.8' : '1'};
        }

        .result-title {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .expand-toggle {
          font-size: 10px;
          transition: transform 0.2s;
          opacity: 0.7;
        }

        .expand-toggle.expanded {
          transform: rotate(180deg);
        }

        .tool-result-content {
          background: var(--sys-color-surface);
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 11px;
          white-space: pre-wrap;
          color: var(--sys-color-on-surface);
          border: 1px solid var(--sys-color-outline-variant);
          font-family: monospace;
          overflow-x: auto;
        }

        .tool-result-content.collapsed {
          max-height: 60px;
          overflow: hidden;
          position: relative;
        }

        .tool-result-content.collapsed::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 20px;
          background: linear-gradient(transparent, var(--sys-color-surface));
          pointer-events: none;
        }

        .error-text {
          color: var(--sys-color-error);
          font-weight: 500;
          margin-top: 4px;
        }

        .result-preview {
          font-family: monospace;
          font-size: 11px;
          color: var(--sys-color-on-surface-variant);
          margin-top: 4px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 300px;
        }

        .json-syntax {
          color: var(--sys-color-on-surface);
        }

        .json-key {
          color: var(--sys-color-primary);
        }

        .json-string {
          color: var(--sys-color-tertiary);
        }

        .json-number {
          color: var(--sys-color-secondary);
        }

        .json-boolean {
          color: var(--sys-color-error);
        }
      </style>

      <div class="tool-result ${statusClass}">
        <div class="tool-result-header" @click=${isLongResult ? () => this.toggleExpanded() : null}>
          <div class="result-title">
            ${statusIcon} ${ToolDescriptionFormatter.formatToolName(toolName)} result
          </div>
          ${isLongResult ? html`
            <span class="expand-toggle ${this.isExpanded ? 'expanded' : ''}">▼</span>
          ` : Lit.nothing}
        </div>

        ${result ? html`
          ${isLongResult && !this.isExpanded ? html`
            <div class="result-preview">${this.getPreview(resultText)}</div>
          ` : html`
            <div class="tool-result-content ${isLongResult && !this.isExpanded ? 'collapsed' : ''}">
              ${this.renderFormattedResult(result)}
            </div>
          `}
        ` : Lit.nothing}

        ${error ? html`
          <div class="error-text">${error}</div>
        ` : Lit.nothing}
      </div>
    `, this.shadow);
  }

  private formatResult(result: any): string {
    if (result === null || result === undefined) {
      return '';
    }
    
    if (typeof result === 'string') {
      return result;
    }
    
    return JSON.stringify(result, null, 2);
  }

  private getPreview(text: string): string {
    if (!text) return '';
    
    // Get first line or first 100 characters, whichever is shorter
    const firstLine = text.split('\n')[0];
    return firstLine.length > 100 ? firstLine.substring(0, 97) + '...' : firstLine;
  }

  private renderFormattedResult(result: any): Lit.TemplateResult {
    if (typeof result === 'string') {
      return html`${result}`;
    }
    
    // For objects, render as formatted JSON
    const jsonString = JSON.stringify(result, null, 2);
    return html`<span class="json-syntax">${jsonString}</span>`;
  }
}