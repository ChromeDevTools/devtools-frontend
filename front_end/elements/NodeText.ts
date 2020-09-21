// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

const {render, html} = LitHtml;

export interface NodeTextData {
  nodeTitle: string, nodeId?: string, nodeClasses?: string[]
}

export class NodeText extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private nodeTitle: string = '';
  private nodeId?: string = '';
  private nodeClasses?: string[] = [];

  set data(data: NodeTextData) {
    this.nodeTitle = data.nodeTitle;
    this.nodeId = data.nodeId;
    this.nodeClasses = data.nodeClasses;
    this.render();
  }

  private render() {
    const parts = [
      html`<span class="node-label-name">${this.nodeTitle}</span>`,
    ];

    if (this.nodeId) {
      parts.push(html`<span class="node-label-id">#${CSS.escape(this.nodeId)}</span>`);
    }

    if (this.nodeClasses && this.nodeClasses.length > 0) {
      const text = this.nodeClasses.map(c => `.${CSS.escape(c)}`).join('');
      parts.push(html`<span class="node-label-class">${text}</span>`);
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .node-label-name {
          color: var(--dom-tag-name-color);
        }

        .node-label-class {
          color: var(--dom-attribute-name-color);
        }
      </style>
      ${parts}
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-node-text', NodeText);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-node-text': NodeText;
  }
}
