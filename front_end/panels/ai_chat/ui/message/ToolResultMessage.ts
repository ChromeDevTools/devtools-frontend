// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../../../ui/lit/lit.js';
import type { ToolResultMessage } from '../../models/ChatTypes.js';

const {html} = Lit;

export function renderToolResultMessage(msg: ToolResultMessage): Lit.TemplateResult {
  return html`
    <div class="message tool-result-message ${msg.isError ? 'error' : ''}">
      <div class="message-content">
        <div class="tool-status completed">
          <div class="tool-name-display">Result from: ${msg.toolName} ${msg.isError ? '(Error)' : ''}</div>
          <pre class="tool-result-raw">${msg.resultText}</pre>
          ${msg.error ? html`<div class="message-error">${msg.error}</div>` : Lit.nothing}
        </div>
      </div>
    </div>
  `;
}

