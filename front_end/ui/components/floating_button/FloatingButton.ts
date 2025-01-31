// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../icon_button/icon_button.js';

import * as Lit from '../../lit/lit.js';

import floatingButtonStylesRaw from './floatingButton.css.legacy.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const floatingButtonStyles = new CSSStyleSheet();
floatingButtonStyles.replaceSync(floatingButtonStylesRaw.cssContent);

const {html, Directives: {ifDefined}} = Lit;

interface FloatingButtonData {
  iconName: string;
  title?: string;
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
    Lit.render(html`<button class="floating-button" title=${ifDefined(this.#data.title)} .disabled=${Boolean(this.#data.disabled)}><devtools-icon class="icon" name=${this.#data.iconName}></devtools-icon></button>`, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-floating-button', FloatingButton);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-floating-button': FloatingButton;
  }
}
