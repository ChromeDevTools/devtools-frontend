// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import computedStylePropertyStyles from './computedStyleProperty.css.js';

const {render, html} = LitHtml;

export interface ComputedStylePropertyData {
  inherited: boolean;
  traceable: boolean;
  onNavigateToSource: (event?: Event) => void;
}

export class ComputedStyleProperty extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-computed-style-property`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #inherited = false;
  #traceable = false;
  #onNavigateToSource: ((event?: Event) => void) = () => {};

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [computedStylePropertyStyles];
  }

  set data(data: ComputedStylePropertyData) {
    this.#inherited = data.inherited;
    this.#traceable = data.traceable;
    this.#onNavigateToSource = data.onNavigateToSource;
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="computed-style-property ${this.#inherited ? 'inherited' : ''}">
        <slot name="property-name"></slot>
        <span class="hidden" aria-hidden="false">: </span>
        ${this.#traceable ?
            html`<span class="goto" @click=${this.#onNavigateToSource}></span>` :
            null}
        <slot name="property-value"></slot>
        <span class="hidden" aria-hidden="false">;</span>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-computed-style-property', ComputedStyleProperty);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-computed-style-property': ComputedStyleProperty;
  }
}
