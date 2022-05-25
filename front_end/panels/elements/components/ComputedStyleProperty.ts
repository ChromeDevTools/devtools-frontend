// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import computedStylePropertyStyles from './computedStyleProperty.css.js';

const {render, html} = LitHtml;

export interface ComputedStylePropertyData {
  propertyNameRenderer: () => Element;
  propertyValueRenderer: () => Element;
  inherited: boolean;
  traceable: boolean;
  onNavigateToSource: (event?: Event) => void;
}

export class ComputedStyleProperty extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-computed-style-property`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #propertyNameRenderer?: () => Element = undefined;
  #propertyValueRenderer?: () => Element = undefined;
  #inherited = false;
  #traceable = false;
  #onNavigateToSource: ((event?: Event) => void) = () => {};

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [computedStylePropertyStyles];
  }

  set data(data: ComputedStylePropertyData) {
    this.#propertyNameRenderer = data.propertyNameRenderer;
    this.#propertyValueRenderer = data.propertyValueRenderer;
    this.#inherited = data.inherited;
    this.#traceable = data.traceable;
    this.#onNavigateToSource = data.onNavigateToSource;
    this.#render();
  }

  #render(): void {
    const propertyNameElement = this.#propertyNameRenderer?.();
    const propertyValueElement = this.#propertyValueRenderer?.();
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class="computed-style-property ${this.#inherited ? 'inherited' : ''}">
        <div class="property-name">
          ${propertyNameElement}
        </div>
        <span class="hidden" aria-hidden="false">: </span>
        ${this.#traceable ?
            html`<span class="goto" @click=${this.#onNavigateToSource}></span>` :
            null}
        <div class="property-value">
          ${propertyValueElement}
        </div>
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
