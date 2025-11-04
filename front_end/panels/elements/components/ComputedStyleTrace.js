// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import { html, render } from '../../../ui/lit/lit.js';
import computedStyleTraceStyles from './computedStyleTrace.css.js';
export class ComputedStyleTrace extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #selector = '';
    #active = false;
    #onNavigateToSource = () => { };
    #ruleOriginNode;
    set data(data) {
        this.#selector = data.selector;
        this.#active = data.active;
        this.#onNavigateToSource = data.onNavigateToSource;
        this.#ruleOriginNode = data.ruleOriginNode;
        this.#render();
    }
    #render() {
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${Buttons.textButtonStyles}</style>
      <style>${UI.inspectorCommonStyles}</style>
      <style>${computedStyleTraceStyles}</style>
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
//# sourceMappingURL=ComputedStyleTrace.js.map