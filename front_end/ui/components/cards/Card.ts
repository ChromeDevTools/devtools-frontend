// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/icon_button/icon_button.js';

import * as LitHtml from '../../lit-html/lit-html.js';

import cardStyles from './card.css.js';

const {html} = LitHtml;

declare global {
  interface HTMLElementTagNameMap {
    'devtools-card': Card;
  }
}

export interface CardData {
  heading?: string;
  headingIconName?: string;
  headingSuffix?: HTMLElement;
  content: HTMLElement[];
}
export class Card extends HTMLElement {
  #heading?: string;
  #headingIconName?: string;
  #headingSuffix?: HTMLElement;
  #content: HTMLElement[] = [];
  readonly #shadow = this.attachShadow({mode: 'open'});

  set data(data: CardData) {
    this.#heading = data.heading;
    this.#headingIconName = data.headingIconName;

    this.#content.forEach(content => content.remove());
    data.content.forEach(content => {
      content.slot = 'content';
      this.append(content);
    });
    this.#content = data.content;

    this.#headingSuffix?.remove();
    if (data.headingSuffix) {
      this.#headingSuffix = data.headingSuffix;
      data.headingSuffix.slot = 'heading-suffix';
      this.append(data.headingSuffix);
    }

    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [cardStyles];
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(html`
    <div class="card">
      <div class="heading-wrapper">
        ${this.#headingIconName ? html`<devtools-icon class="heading-icon" name=${this.#headingIconName}></devtools-icon>` : LitHtml.nothing}
        <div role="heading" aria-level="2" class="heading">${this.#heading}</div>
        <slot name="heading-suffix"></slot>
      </div>
      <slot name="content" class='content-container'></slot>
    </div>
    `, this.#shadow, {
    host: this,
  });
    // clang-format on
  }
}

customElements.define('devtools-card', Card);
