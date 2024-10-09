// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../../core/common/common.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import cardStyles from './card.css.js';

declare global {
  interface HTMLElementTagNameMap {
    'devtools-card': Card;
  }
}

export interface CardData {
  heading?: Common.UIString.LocalizedString;
  content: HTMLElement[];
}
export class Card extends HTMLElement {
  #heading?: string;
  #content: HTMLElement[] = [];
  readonly #shadow = this.attachShadow({mode: 'open'});

  set data(data: CardData) {
    this.#heading = data.heading;
    this.#content.forEach(content => content.remove());
    data.content.forEach(content => {
      content.slot = 'content';
      this.append(content);
    });
    this.#content = data.content;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [cardStyles];
    this.#render();
  }

  #render(): void {
    // clang-format off
    LitHtml.render(LitHtml.html`
    <div class="card">
      <div role="heading" class="heading">${this.#heading}</div>
      <slot name="content" class='content-container'></slot>
    </div>
    `, this.#shadow, {
    host: this,
  });
    // clang-format on
  }
}

customElements.define('devtools-card', Card);
