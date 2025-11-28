// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../kit.js';
import * as Lit from '../../lit/lit.js';
const { html } = Lit;
export function render(container) {
    Lit.render(html `
        <style>
          devtools-card {
            margin: 1em;
          }
          .content {
            padding: 1em;
          }
          span {
            align-self: center;
          }
        </style>
        <h2>Basic card with heading</h2>
        <devtools-card heading="Simple card">
          <div class="content">This is a simple card.</div>
        </devtools-card>

        <h2>Card without a heading</h2>
        <devtools-card>
          <div class="content">This is a card without a heading.</div>
        </devtools-card>

        <h2>Card with rich heading</h2>
        <devtools-card heading="Card with rich heading">
          <span slot="heading-prefix">Slotted heading prefix</span>
          <span slot="heading-suffix">Slotted heading suffix</span>
          <div class="content">This is a card with a rich heading.</div>
        </devtools-card>
        `, container);
}
//# sourceMappingURL=Card.docs.js.map