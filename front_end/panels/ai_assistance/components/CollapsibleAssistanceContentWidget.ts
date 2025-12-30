// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Lit from '../../../ui/lit/lit.js';

import styles from './collapsibleAssistanceContentWidget.css.js';

const {render, html} = Lit;

export interface CollapsibleAssistanceContentWidgetData {
  headerText: string;
  onReveal?: () => void;
}

export class CollapsibleAssistanceContentWidget extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #isCollapsed = false;
  #headerText = 'Details';
  #onReveal?: () => void;

  set data(data: CollapsibleAssistanceContentWidgetData) {
    this.#headerText = data.headerText;
    this.#onReveal = data.onReveal;
    this.#render();
  }

  connectedCallback(): void {
    this.#render();
  }

  #toggleCollapse(): void {
    this.#isCollapsed = !this.#isCollapsed;
    this.#render();
  }

  #render(): void {
    // clang-format off
    const output = html`
      <style>${styles}</style>
      <details ?open=${!this.#isCollapsed}>
        <summary class="header" @click=${(event: Event) => {
          event.preventDefault();
          this.#toggleCollapse();
        }}>
          ${this.#headerText}
          <div>
            <devtools-button .data=${{
              variant: Buttons.Button.Variant.ICON,
              iconName: 'select-element',
              color: 'var(--sys-color-on-surface)',
              width: '14px',
              height: '14px',
              title: 'reveal',
              } as Buttons.Button.ButtonData}
              @click=${(event: Event) => {
                event.stopPropagation();
                this.#onReveal?.();
              }}
            ></devtools-button>
            <devtools-button .data=${{
              variant: Buttons.Button.Variant.ICON,
              iconName: this.#isCollapsed ? 'triangle-right' : 'triangle-down',
              color: 'var(--sys-color-on-surface)',
              width: '14px',
              height: '14px',
              title: 'expand',
              } as Buttons.Button.ButtonData}
            ></devtools-button>
          </div>
        </summary>
        <div class="content">
          <slot></slot>
        </div>
      </details>
    `;
    render(output, this.#shadow, {host: this});
  }
}

customElements.define('devtools-collapsible-assistance-content-widget', CollapsibleAssistanceContentWidget);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-collapsible-assistance-content-widget': CollapsibleAssistanceContentWidget;
  }
}
