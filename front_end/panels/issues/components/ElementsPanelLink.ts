// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import elementsPanelLinkStylesRaw from './elementsPanelLink.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const elementsPanelLinkStyles = new CSSStyleSheet();
elementsPanelLinkStyles.replaceSync(elementsPanelLinkStylesRaw.cssContent);

export interface ElementsPanelLinkData {
  onElementRevealIconClick: (event?: Event) => void;
  onElementRevealIconMouseEnter: (event?: Event) => void;
  onElementRevealIconMouseLeave: (event?: Event) => void;
}
export class ElementsPanelLink extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #onElementRevealIconClick: ((event?: Event) => void) = () => {};
  #onElementRevealIconMouseEnter: ((event?: Event) => void) = () => {};
  #onElementRevealIconMouseLeave: ((event?: Event) => void) = () => {};

  set data(data: ElementsPanelLinkData) {
    this.#onElementRevealIconClick = data.onElementRevealIconClick;
    this.#onElementRevealIconMouseEnter = data.onElementRevealIconMouseEnter;
    this.#onElementRevealIconMouseLeave = data.onElementRevealIconMouseLeave;
    this.#update();
  }

  #update(): void {
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [elementsPanelLinkStyles];
  }

  #render(): void {
    // clang-format off
    render(html`
      <span
        class="element-reveal-icon"
        jslog=${VisualLogging.link('elements-panel').track({click: true})}
        @click=${this.#onElementRevealIconClick}
        @mouseenter=${this.#onElementRevealIconMouseEnter}
        @mouseleave=${this.#onElementRevealIconMouseLeave}></span>
      `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-elements-panel-link', ElementsPanelLink);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-elements-panel-link': ElementsPanelLink;
  }
}
