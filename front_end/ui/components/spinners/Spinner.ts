// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Lit from '../../lit/lit.js';

import spinnerStylesRaw from './spinner.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const spinnerStyles = new CSSStyleSheet();
spinnerStyles.replaceSync(spinnerStylesRaw.cssContent);

const {html} = Lit;

export class Spinner extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [spinnerStyles];
    this.#render();
  }

  #render(): void {
    // The radius of the circles are set to 2.75rem as per implementation
    // of indeterminate progress indicator in
    // https://github.com/material-components/material-components-web/tree/master/packages/mdc-circular-progress.
    // Changing the value of the radius will cause errors in animation.
    // clang-format off
    Lit.render(html`
      <div class="indeterminate-spinner">
        <div class="left-circle-graphic-container">
          <svg class="left-circle-graphic" viewBox="0 0 100 100">
            <circle cx="50%" cy="50%" r="2.75rem"></circle></svg>
        </div>
        <div class="center-circle-graphic-container">
          <svg class="center-circle-graphic" viewBox="0 0 100 100">
            <circle cx="50%" cy="50%" r="2.75rem"></circle></svg>
        </div>
        <div class="right-circle-graphic-container">
          <svg class="right-circle-graphic" viewBox="0 0 100 100">
            <circle cx="50%" cy="50%" r="2.75rem"></circle></svg>
        </div>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-spinner', Spinner);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-spinner': Spinner;
  }
}
