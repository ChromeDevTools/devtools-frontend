// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import elementsTreeExpandButtonStyles from './elementsTreeExpandButton.css.js';

export interface ElementsTreeExpandButtonData {
  clickHandler: (event?: Event) => void;
}
export class ElementsTreeExpandButton extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-elements-tree-expand-button`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #clickHandler: ((event?: Event) => void) = () => {};

  set data(data: ElementsTreeExpandButtonData) {
    this.#clickHandler = data.clickHandler;
    this.#update();
  }

  #update(): void {
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [elementsTreeExpandButtonStyles];
  }

  #render(): void {
    // clang-format off
    // This button's innerText will be tested by e2e test and blink layout tests.
    // It can't have any other characters like '\n' or space, otherwise it will break tests.
    LitHtml.render(LitHtml.html`<span
        class="expand-button"
        @click=${this.#clickHandler}><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>`,
      this.#shadow, {host: this});
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-elements-tree-expand-button', ElementsTreeExpandButton);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-elements-tree-expand-button': ElementsTreeExpandButton;
  }
}
