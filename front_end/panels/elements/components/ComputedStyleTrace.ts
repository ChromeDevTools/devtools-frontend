// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import computedStyleTraceStyles from './computedStyleTrace.css.js';

const {render, html} = LitHtml;

export interface ComputedStyleTraceData {
  selector: string;
  active: boolean;
  onNavigateToSource: (event?: Event) => void;
  ruleOriginNode?: Node;
}

export class ComputedStyleTrace extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-computed-style-trace`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #selector = '';
  #active = false;
  #onNavigateToSource: ((event?: Event) => void) = () => {};
  #ruleOriginNode?: Node;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [computedStyleTraceStyles];
  }

  set data(data: ComputedStyleTraceData) {
    this.#selector = data.selector;
    this.#active = data.active;
    this.#onNavigateToSource = data.onNavigateToSource;
    this.#ruleOriginNode = data.ruleOriginNode;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="computed-style-trace ${this.#active ? 'active' : 'inactive'}">
        <span class="goto" @click=${this.#onNavigateToSource}></span>
        <slot name="trace-value" @click=${this.#onNavigateToSource}></slot>
        <span class="trace-selector">${this.#selector}</span>
        <span class="trace-link">${this.#ruleOriginNode}</span>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-computed-style-trace', ComputedStyleTrace);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-computed-style-trace': ComputedStyleTrace;
  }
}
