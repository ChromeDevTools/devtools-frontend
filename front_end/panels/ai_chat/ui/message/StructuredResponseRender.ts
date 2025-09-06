// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';
import { MarkdownViewerUtil } from '../../common/MarkdownViewerUtil.js';
import { MarkdownRenderer, renderMarkdown } from '../markdown/MarkdownRenderers.js';

const {html} = Lit;

export interface StructuredResponseState {
  aiState: 'pending' | 'opened' | 'failed' | 'not-attempted';
  isLastMessage: boolean;
}

export interface StructuredResponseData {
  reasoning: string;
  markdownReport: string;
}

// Presentational renderer for a structured response. Does not manage state.
export function renderStructuredResponse(
  data: StructuredResponseData,
  state: StructuredResponseState,
  markdownRenderer: MarkdownRenderer,
): Lit.TemplateResult {
  const open = () => { void MarkdownViewerUtil.openInAIAssistantViewer(data.markdownReport); };
  return html`
    <div class="message model-message final">
      <div class="message-content">
        <div class="message-text">${renderMarkdown(data.reasoning, markdownRenderer, open)}</div>
        ${state.aiState === 'pending' ? html`
          <div class="message-loading">
            <svg class="loading-spinner" width="16" height="16" viewBox="0 0 16 16">
              <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" fill="none" stroke-dasharray="30 12" stroke-linecap="round">
                <animateTransform attributeName="transform" attributeType="XML" type="rotate" from="0 8 8" to="360 8 8" dur="1s" repeatCount="indefinite" />
              </circle>
            </svg>
          </div>
        ` : state.aiState === 'opened' ? html`
          <div class="deep-research-actions">
            <button class="view-document-btn" @click=${open} title="Open full report in document viewer">📄 View Full Report</button>
          </div>
        ` : html`
          <div class="inline-markdown-report">
            <div class="inline-report-header"><h3>Full Research Report</h3></div>
            <div class="inline-report-content">${renderMarkdown(data.markdownReport, markdownRenderer, open)}</div>
          </div>
          <div class="deep-research-actions">
            <button class="view-document-btn" @click=${open} title="Open full report in document viewer">📄 ${state.isLastMessage ? '' : 'View Full Report'}</button>
          </div>
        `}
      </div>
    </div>
  `;
}

