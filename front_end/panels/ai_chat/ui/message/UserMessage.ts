// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';
import type { UserChatMessage } from '../../models/ChatTypes.js';
import { MarkdownRenderer, renderMarkdown } from '../markdown/MarkdownRenderers.js';

const {html} = Lit;

export function renderUserMessage(msg: UserChatMessage, renderer: MarkdownRenderer): Lit.TemplateResult {
  return html`
    <div class="message user-message">
      <div class="message-content">
        <div class="message-text">${renderMarkdown(msg.text || '', renderer)}</div>
        ${msg.error ? html`<div class="message-error">${msg.error}</div>` : Lit.nothing}
      </div>
    </div>
  `;
}

