// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../icon_button/icon_button.js';

import * as LitHtml from '../../lit-html/lit-html.js';

import floatingButtonStyles from './floatingButton.css.js';

const {html} = LitHtml;

interface FloatingButtonData {
  iconName: string;
  disabled?: boolean;
}

export class FloatingButton extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #data: FloatingButtonData;

  constructor(data: FloatingButtonData) {
    super();
    this.#data = data;
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [floatingButtonStyles];
    this.#render();
  }

  set data(floatingButtonData: FloatingButtonData) {
    this.#data = floatingButtonData;
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(html`<button class="floating-button" .disabled=${Boolean(this.#data.disabled)}><devtools-icon class="icon" name=${this.#data.iconName}></devtools-icon></button>`, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-floating-button', FloatingButton);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-floating-button': FloatingButton;
  }
}
