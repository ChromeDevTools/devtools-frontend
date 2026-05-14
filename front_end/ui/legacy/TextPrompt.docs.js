// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import './legacy.js';
import * as Lit from '../lit/lit.js';
const { html } = Lit;
export function render(container) {
    const validator = (text) => {
        return text === 'invalid' ? 'This value is invalid' : null;
    };
    Lit.render(html `
    <style>
      .example {
        margin: 20px;
        padding: 20px;
        border: 1px solid var(--sys-color-divider);
      }
      .label {
        margin-bottom: 8px;
        font-weight: bold;
      }
    </style>
    <div class="example">
      <div class="label">TextPrompt with validation (type 'invalid' and press Enter):</div>
      <devtools-prompt
        editing
        .validator=${validator}
        @commit=${(e) => console.log('Committed:', e.detail)}
      ></devtools-prompt>
    </div>

    <div class="example">
      <div class="label">TextPrompt with cancel-on-blur:</div>
      <devtools-prompt
        editing
        cancel-on-blur
        @cancel=${() => console.log('Cancelled')}
      >Initial content</devtools-prompt>
    </div>
  `, container);
}
//# sourceMappingURL=TextPrompt.docs.js.map