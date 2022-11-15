// Copyright (c) 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../components/helpers/helpers.js';
import * as LitHtml from '../../../lit-html/lit-html.js';

import circularColorSwatchStyles from './circularColorSwatch.css.js';

function consumeEvent(event: Event): void {
  event.stopPropagation();
}

/**
 * For colors that we don't have support in color picker (wide gamut colors)
 * we're going to show a circular color swatch.
 *
 * After we update the color picker for those colors
 * we'll remove this and show the regular color swatch that opens
 * the color picker.
 */
export class CircularColorSwatch extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-circular-color-swatch`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #text: string|null = null;

  constructor() {
    super();
    this.#shadow.adoptedStyleSheets = [
      circularColorSwatchStyles,
    ];
  }

  renderColor(text: string): void {
    this.#text = text;
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    // Note that we use a <slot> with a default value here to display the color text. Consumers of this component are
    // free to append any content to replace what is being shown here.
    // Note also that whitespace between nodes is removed on purpose to avoid pushing these elements apart. Do not
    // re-format the HTML code.
    LitHtml.render(
      LitHtml.html`<span class="circular-color-swatch">
          <span class="circular-color-swatch-inner"
          style="background-color: ${this.#text};"
          @click=${consumeEvent}
          @mousedown=${consumeEvent}
          @dblclick=${consumeEvent}></span>
        </span><slot><span>${this.#text}</span></slot>`,
      this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-circular-color-swatch', CircularColorSwatch);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-circular-color-swatch': CircularColorSwatch;
  }
}
