// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';

import tableStyles from './table.css.js';

export interface TableData {
  headers: string[];
  /** Each row is a tuple of values. */
  rows: Array<string[]>;
  onHoverRow?: (index: number, rowEl: HTMLElement) => void;
  onClickRow?: (index: number, rowEl: HTMLElement) => void;
  onMouseLeave?: () => void;
}

export class Table extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-table`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #headers?: string[];
  #rows?: Array<string[]>;
  #onHoverRowCallback?: (index: number, rowEl: HTMLElement) => void;
  #onClickRowCallback?: (index: number, rowEl: HTMLElement) => void;
  #onMouseLeaveCallback?: () => void;
  #currentHoverIndex: number|null = null;

  set data(data: TableData) {
    this.#headers = data.headers;
    this.#rows = data.rows;
    this.#onHoverRowCallback = data.onHoverRow;
    this.#onClickRowCallback = data.onClickRow;
    this.#onMouseLeaveCallback = data.onMouseLeave;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets.push(tableStyles);
  }

  #onHoverRow(e: MouseEvent): void {
    if (!this.#onHoverRowCallback || !(e.target instanceof HTMLElement)) {
      return;
    }

    const rowEl = e.target.closest('tr');
    if (!rowEl || !rowEl.parentElement) {
      return;
    }

    const index = [...rowEl.parentElement.children].indexOf(rowEl);
    if (index === -1 || index === this.#currentHoverIndex) {
      return;
    }

    this.#currentHoverIndex = index;
    this.#onHoverRowCallback(index, rowEl);
  }

  #onClickRow(e: MouseEvent): void {
    if (!this.#onClickRowCallback || !(e.target instanceof HTMLElement)) {
      return;
    }

    const rowEl = e.target.closest('tr');
    if (!rowEl || !rowEl.parentElement) {
      return;
    }

    const index = [...rowEl.parentElement.children].indexOf(rowEl);
    if (index === -1) {
      return;
    }

    this.#onClickRowCallback(index, rowEl);
  }

  #onMouseLeave(): void {
    if (!this.#onMouseLeaveCallback) {
      return;
    }

    this.#currentHoverIndex = null;
    this.#onMouseLeaveCallback();
  }

  async #render(): Promise<void> {
    if (!this.#headers || !this.#rows) {
      return;
    }

    LitHtml.render(
        LitHtml.html`<table
          class=${LitHtml.Directives.classMap({
          hoverable: Boolean(this.#onHoverRowCallback),
        })}
          @mouseleave=${this.#onMouseLeaveCallback ? this.#onMouseLeave : null}>
        <thead>
          <tr>
          ${this.#headers.map(h => LitHtml.html`<th scope="col">${h}</th>`)}
          </tr>
        </thead>
        <tbody
          @mouseover=${this.#onHoverRowCallback ? this.#onHoverRow : null}
          @click=${this.#onClickRowCallback ? this.#onClickRow : null}
        >
          ${this.#rows.map(row => {
          const rowsEls = row.map(
              (value, i) => i === 0 ? LitHtml.html`<th scope="row">${value}</th>` : LitHtml.html`<td>${value}</td>`);
          return LitHtml.html`<tr>${rowsEls}</tr>`;
        })}
        </tbody>
      </div>`,
        this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-table': Table;
  }
}

customElements.define('devtools-performance-table', Table);
