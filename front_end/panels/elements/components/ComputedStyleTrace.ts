// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../../../ui/legacy/legacy.js';
import {html, render} from '../../../ui/lit/lit.js';

import computedStyleTraceStylesRaw from './computedStyleTrace.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const computedStyleTraceStyles = new CSSStyleSheet();
computedStyleTraceStyles.replaceSync(computedStyleTraceStylesRaw.cssContent);

export interface ComputedStyleTraceData {
  selector: string;
  active: boolean;
  onNavigateToSource: (event?: Event) => void;
  ruleOriginNode?: Node;
}

export class ComputedStyleTrace extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #selector = '';
  #active = false;
  #onNavigateToSource: ((event?: Event) => void) = () => {};
  #ruleOriginNode?: Node;

  connectedCallback(): void {
    UI.UIUtils.injectCoreStyles(this.#shadow);
    this.#shadow.adoptedStyleSheets.push(computedStyleTraceStyles);
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

customElements.define('devtools-computed-style-trace', ComputedStyleTrace);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-computed-style-trace': ComputedStyleTrace;
  }
}
