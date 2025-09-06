// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';
import type { ModelChatMessage } from '../../models/ChatTypes.js';
import { MarkdownRenderer, renderMarkdown } from '../markdown/MarkdownRenderers.js';

const {html} = Lit;

// Renders a model message final answer including optional reasoning block.
export function renderModelMessage(msg: ModelChatMessage, renderer: MarkdownRenderer): Lit.TemplateResult {
  if (msg.action === 'final') {
    return html`
      <div class="message model-message final">
        <div class="message-content">
          ${msg.answer ? html`
            <div class="message-text">${renderMarkdown(msg.answer, renderer)}</div>
          ` : Lit.nothing}
          ${msg.reasoning?.length ? html`
            <div class="reasoning-block">
              <details class="reasoning-details">
                <summary class="reasoning-summary">
                  <span class="reasoning-icon">💡</span>
                  <span>Model Reasoning</span>
                </summary>
                <div class="reasoning-content">
                  ${msg.reasoning.map(item => html`
                    <div class="reasoning-item">${renderMarkdown(item, renderer)}</div>
                  `)}
                </div>
              </details>
            </div>
          ` : Lit.nothing}
          ${msg.error ? html`<div class="message-error">${msg.error}</div>` : Lit.nothing}
        </div>
      </div>
    `;
  }
  // Tool-call messages are handled elsewhere.
  return html``;
}
