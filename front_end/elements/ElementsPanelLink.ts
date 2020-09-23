// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../third_party/lit-html/lit-html.js';

export interface ElementsPanelLinkData {
  onElementRevealIconClick: (event?: Event) => void;
  onElementRevealIconMouseEnter: (event?: Event) => void;
  onElementRevealIconMouseLeave: (event?: Event) => void;
}
export class ElementsPanelLink extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private onElementRevealIconClick: ((event?: Event) => void) = () => {};
  private onElementRevealIconMouseEnter: ((event?: Event) => void) = () => {};
  private onElementRevealIconMouseLeave: ((event?: Event) => void) = () => {};

  set data(data: ElementsPanelLinkData) {
    this.onElementRevealIconClick = data.onElementRevealIconClick;
    this.onElementRevealIconMouseEnter = data.onElementRevealIconMouseEnter;
    this.onElementRevealIconMouseLeave = data.onElementRevealIconMouseLeave;
    this.update();
  }

  private update() {
    this.render();
  }

  private render() {
    // clang-format off
      LitHtml.render(LitHtml.html`
      <style>
        .element-reveal-icon {
          display: inline-block;
          width: 28px;
          height: 24px;
          -webkit-mask-position:-140px 96px;
          -webkit-mask-image: url(Images/largeIcons.svg);
          background-color: rgb(110 110 110);
        }
      </style>
      <span
        class="element-reveal-icon"
        @click=${this.onElementRevealIconClick}
        @mouseenter=${this.onElementRevealIconMouseEnter}
        @mouseleave=${this.onElementRevealIconMouseLeave}></span>
      `, this.shadow);
    // clang-format on
  }
}

customElements.define('devtools-elements-panel-link', ElementsPanelLink);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-elements-panel-link': ElementsPanelLink;
  }
}
