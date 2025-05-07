// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import expandableListStyles from './expandableList.css.js';

const {html, Directives: {ifDefined}} = Lit;

export interface ExpandableListData {
  rows: Lit.TemplateResult[];
  title?: string;
}

export class ExpandableList extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  #expanded = false;
  #rows: Lit.TemplateResult[] = [];
  #title?: string;

  set data(data: ExpandableListData) {
    this.#rows = data.rows;
    this.#title = data.title;
    this.#render();
  }

  #onArrowClick(): void {
    this.#expanded = !this.#expanded;
    this.#render();
  }

  #render(): void {
    if (this.#rows.length < 1) {
      return;
    }

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    Lit.render(
        html`
      <style>${expandableListStyles}</style>
      <div class="expandable-list-container">
        <div>
          ${this.#rows.length > 1 ?
            html`
              <button title='${ifDefined(this.#title)}' aria-label='${ifDefined(this.#title)}' aria-expanded=${this.#expanded ? 'true' : 'false'} @click=${() => this.#onArrowClick()} class="arrow-icon-button">
                <span class="arrow-icon ${this.#expanded ? 'expanded' : ''}"
                jslog=${VisualLogging.expand().track({click: true})}></span>
              </button>
            `
          : Lit.nothing}
        </div>
        <div class="expandable-list-items">
          ${this.#rows.filter((_, index) => (this.#expanded || index === 0)).map(row => html`
            ${row}
          `)}
        </div>
      </div>
    `,
        this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-expandable-list', ExpandableList);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-expandable-list': ExpandableList;
  }
}
