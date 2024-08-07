
// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import styles from './entriesLinkOverlay.css.js';

export class EntriesLinkOverlay extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-entries-link-overlay`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  /*
  The entries link overlay is an arrow connecting 2 entries.
  The Entries are drawn by Flamechart and this Overlay is only drawing the arrow between them.
  _________
  |__entry__|\
              \
               \          <-- arrow connecting the sides of entries drawn by this overlay
                \   ________________
                 ➘ |_____entry______|
  */
  #render(): void {
    // clang-format off
    LitHtml.render(
        LitHtml.html`
        <svg>
          <line/>
        </svg>`,
        this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-entries-link-overlay', EntriesLinkOverlay);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-entries-link-overlay': EntriesLinkOverlay;
  }
}
