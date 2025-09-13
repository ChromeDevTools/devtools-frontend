// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import {html, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import elementsPanelLinkStyles from './elementsPanelLink.css.js';

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

  #render(): void {
    // clang-format off
    render(html`
      <style>${elementsPanelLinkStyles}</style>
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
