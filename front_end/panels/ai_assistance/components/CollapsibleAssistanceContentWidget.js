// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Lit from '../../../ui/lit/lit.js';
import styles from './collapsibleAssistanceContentWidget.css.js';
const { render, html } = Lit;
export class CollapsibleAssistanceContentWidget extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #isCollapsed = true;
    #headerText = 'Details';
    set data(data) {
        this.#headerText = data.headerText;
        this.#render();
    }
    connectedCallback() {
        this.#render();
    }
    #toggleCollapse() {
        this.#isCollapsed = !this.#isCollapsed;
        this.#render();
    }
    #render() {
        // clang-format off
        const output = html `
      <style>${styles}</style>
      <details ?open=${!this.#isCollapsed}>
        <summary class="header" @click=${(event) => {
            event.preventDefault();
            this.#toggleCollapse();
        }}>
          <devtools-button .data=${{
            variant: "icon" /* Buttons.Button.Variant.ICON */,
            iconName: this.#isCollapsed ? 'triangle-right' : 'triangle-down',
            color: 'var(--sys-color-on-surface)',
            width: '14px',
            height: '14px',
        }}
          >
          </devtools-button>
          ${this.#headerText}
        </summary>
        <div class="content">
          <slot></slot>
        </div>
      </details>
    `;
        render(output, this.#shadow, { host: this });
    }
}
customElements.define('devtools-collapsible-assistance-content-widget', CollapsibleAssistanceContentWidget);
//# sourceMappingURL=CollapsibleAssistanceContentWidget.js.map