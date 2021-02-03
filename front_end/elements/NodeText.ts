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

  private render(): void {
    const hasId = Boolean(this.nodeId);
    const hasNodeClasses = Boolean(this.nodeClasses && this.nodeClasses.length > 0);

    const parts = [
      html`<span class="node-label-name">${this.nodeTitle}</span>`,
    ];

    if (this.nodeId) {
      const classes = LitHtml.Directives.classMap({
        'node-label-id': true,
        'node-multiple-descriptors': hasNodeClasses,
      });
      parts.push(html`<span class=${classes}>#${CSS.escape(this.nodeId)}</span>`);
    }

    if (this.nodeClasses && this.nodeClasses.length > 0) {
      const text = this.nodeClasses.map(c => `.${CSS.escape(c)}`).join('');
      const classes = LitHtml.Directives.classMap({
        'node-label-class': true,
        'node-multiple-descriptors': hasId,
      });
      parts.push(html`<span class=${classes}>${text}</span>`);
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>
        .node-label-name {
          color: var(--node-text-label-color, --dom-tag-name-color); /* stylelint-disable-line plugin/use_theme_colors */
          /* See: crbug.com/1152736 for color variable migration. */
        }

        .node-label-class {
          color: var(--node-text-class-color, --dom-attribute-name-color); /* stylelint-disable-line plugin/use_theme_colors */
          /* See: crbug.com/1152736 for color variable migration. */
        }

        .node-label-id {
          color: var(--node-text-id-color); /* stylelint-disable-line plugin/use_theme_colors */
          /* See: crbug.com/1152736 for color variable migration. */
        }

        .node-label-class.node-multiple-descriptors {
          color: var(--node-text-multiple-descriptors-class, var(--node-text-class-color, --dom-attribute-name-color)); /* stylelint-disable-line plugin/use_theme_colors */
          /* See: crbug.com/1152736 for color variable migration. */
        }

        .node-label-id.node-multiple-descriptors {
          color: var(--node-text-multiple-descriptors-id, var(--node-text-id-color, --dom-attribute-name-color)); /* stylelint-disable-line plugin/use_theme_colors */
          /* See: crbug.com/1152736 for color variable migration. */
        }
      </style>
      ${parts}
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }
}

if (!customElements.get('devtools-node-text')) {
  customElements.define('devtools-node-text', NodeText);
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-node-text': NodeText;
  }
}
