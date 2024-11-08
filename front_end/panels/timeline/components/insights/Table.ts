// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import type {BaseInsightComponent} from './Helpers.js';
import tableStyles from './table.css.js';

const {html} = LitHtml;

/**
 * @fileoverview An interactive table component.
 *
 * On hover:
 *           desaturates the relevant events (in both the minimap and the flamegraph), and
 *           replaces the current insight's overlays with the overlays attached to that row.
 *           The currently selected trace bounds does not change.
 *
 *           Removing the mouse from the table without clicking on any row restores the original
 *           overlays.
 *
 * On click:
 *           "sticks" the selection, replaces overlays like hover does, and additionally updates
 *           the current trace bounds to fit the bounds of the row's overlays.
 */

export type TableState = {
  selectedRowEl: HTMLElement|null,
  selectionIsSticky: boolean,
};

export interface TableData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  insight: BaseInsightComponent<any>;
  headers: string[];
  rows: TableDataRow[];
}

export type TableDataRow = {
  values: Array<string|LitHtml.LitTemplate>,
  overlays?: Overlays.Overlays.TimelineOverlay[],
};

export class Table extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  #insight?: BaseInsightComponent<any>;
  #state?: TableState;
  #headers?: string[];
  #rows?: TableDataRow[];
  #interactive: boolean = false;
  #currentHoverIndex: number|null = null;

  set data(data: TableData) {
    this.#insight = data.insight;
    this.#state = data.insight.sharedTableState;
    this.#headers = data.headers;
    this.#rows = data.rows;
    // If this table isn't interactive, don't attach mouse listeners or use CSS :hover.
    this.#interactive = this.#rows.some(row => row.overlays);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets.push(tableStyles);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #onHoverRow(e: MouseEvent): void {
    if (!(e.target instanceof HTMLElement)) {
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
    // Temporarily selects the row, but only if there is not already a sticky selection.
    this.#onSelectedRowChanged(rowEl, index, {isHover: true});
  }

  #onClickRow(e: MouseEvent): void {
    if (!(e.target instanceof HTMLElement)) {
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

    // Select the row and make it sticky.
    this.#onSelectedRowChanged(rowEl, index, {sticky: true});
  }

  #onMouseLeave(): void {
    this.#currentHoverIndex = null;
    // Unselect the row, unless it's sticky.
    this.#onSelectedRowChanged(null, null);
  }

  #onSelectedRowChanged(rowEl: HTMLElement|null, rowIndex: number|null, opts: {
    sticky?: boolean,
    isHover?: boolean,
  } = {}): void {
    if (!this.#rows || !this.#state || !this.#insight) {
      return;
    }

    if (this.#state.selectionIsSticky && !opts.sticky) {
      return;
    }

    // Unselect a sticky-selection when clicking it for a second time.
    if (this.#state.selectionIsSticky && rowEl === this.#state.selectedRowEl) {
      rowEl = null;
      opts.sticky = false;
    }

    if (rowEl && rowIndex !== null) {
      const overlays = this.#rows[rowIndex].overlays;
      if (overlays) {
        this.#insight.toggleTemporaryOverlays(overlays, {updateTraceWindow: !opts.isHover});
      }
    } else {
      this.#insight.toggleTemporaryOverlays(null, {updateTraceWindow: false});
    }

    this.#state.selectedRowEl?.classList.remove('selected');
    rowEl?.classList.add('selected');
    this.#state.selectedRowEl = rowEl;
    this.#state.selectionIsSticky = opts.sticky ?? false;
  }

  async #render(): Promise<void> {
    if (!this.#headers || !this.#rows) {
      return;
    }

    LitHtml.render(
        html`<table
          class=${LitHtml.Directives.classMap({
          interactive: this.#interactive,
        })}
          @mouseleave=${this.#interactive ? this.#onMouseLeave : null}>
        <thead>
          <tr>
          ${this.#headers.map(h => html`<th scope="col">${h}</th>`)}
          </tr>
        </thead>
        <tbody
          @mouseover=${this.#interactive ? this.#onHoverRow : null}
          @click=${this.#interactive ? this.#onClickRow : null}
        >
          ${this.#rows.map(row => {
          const rowsEls =
              row.values.map((value, i) => i === 0 ? html`<th scope="row">${value}</th>` : html`<td>${value}</td>`);
          return html`<tr>${rowsEls}</tr>`;
        })}
        </tbody>
      </table>`,
        this.#shadow, {host: this});
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-table': Table;
  }
}

customElements.define('devtools-performance-table', Table);
