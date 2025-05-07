// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Lit from '../../../ui/lit/lit.js';

import nodeTextStyles from './nodeText.css.js';

const {render, html} = Lit;

export interface NodeTextData {
  nodeTitle: string;
  nodeId?: string;
  nodeClasses?: string[];
}

export class NodeText extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #nodeTitle = '';
  #nodeId?: string = '';
  #nodeClasses?: string[] = [];

  set data(data: NodeTextData) {
    this.#nodeTitle = data.nodeTitle;
    this.#nodeId = data.nodeId;
    this.#nodeClasses = data.nodeClasses;
    this.#render();
  }

  #render(): void {
    const hasId = Boolean(this.#nodeId);
    const hasNodeClasses = Boolean(this.#nodeClasses && this.#nodeClasses.length > 0);

    const parts = [
      html`<span class="node-label-name">${this.#nodeTitle}</span>`,
    ];

    if (this.#nodeId) {
      const classes = Lit.Directives.classMap({
        'node-label-id': true,
        'node-multiple-descriptors': hasNodeClasses,
      });
      parts.push(html`<span class=${classes}>#${CSS.escape(this.#nodeId)}</span>`);
    }

    if (this.#nodeClasses && this.#nodeClasses.length > 0) {
      const text = this.#nodeClasses.map(c => `.${CSS.escape(c)}`).join('');
      const classes = Lit.Directives.classMap({
        'node-label-class': true,
        'node-multiple-descriptors': hasId,
      });
      parts.push(html`<span class=${classes}>${text}</span>`);
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${nodeTextStyles}</style>
      ${parts}
    `, this.#shadow, {
      host: this,
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
