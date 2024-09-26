// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import type * as Overlays from '../../overlays/overlays.js';

import * as SidebarInsight from './SidebarInsight.js';
import tableStyles from './table.css.js';

/**
 * @fileoverview An interactive table component.
 *
 * On hover:
 *           desaturates the relevant time range (in both the minimap and the flamegraph), and
 *           replaces the current insight's overlays with the overlays attached to that row.
 *           The currently selected trace bounds does not change.
 *           TODO(crbug.com/369102516): make the "desaturates the flamegraph" part true
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
  /**
   * Higher components pass the current selection state to this component.
   * This allow components to have a common source of truth for what is currently selected.
   *
   * Only needed if the table is interactive.
   */
  state?: TableState;
  headers: string[];
  rows: TableDataRow[];
}

export type TableDataRow = {
  values: string[],
  overlays?: Overlays.Overlays.TimelineOverlay[],
};

export class Table extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-performance-table`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #state?: TableState;
  #headers?: string[];
  #rows?: TableDataRow[];
  #currentHoverIndex: number|null = null;

  set data(data: TableData) {
    this.#state = data.state;
    this.#headers = data.headers;
    this.#rows = data.rows;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets.push(tableStyles);
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
    if (!this.#rows || !this.#state) {
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
        this.#onOverlayOverride(overlays, {updateTraceWindow: !opts.isHover});
      }
    } else {
      this.#onOverlayOverride(null);
    }

    this.#state.selectedRowEl?.classList.remove('selected');
    rowEl?.classList.add('selected');
    this.#state.selectedRowEl = rowEl;
    this.#state.selectionIsSticky = opts.sticky ?? false;
  }

  #onOverlayOverride(
      overlays: Overlays.Overlays.TimelineOverlay[]|null, options?: Overlays.Overlays.TimelineOverlaySetOptions): void {
    this.dispatchEvent(new SidebarInsight.InsightOverlayOverride(overlays, options));
  }

  async #render(): Promise<void> {
    if (!this.#headers || !this.#rows) {
      return;
    }

    // If this table isn't interactive, don't attach mouse listeners or use CSS :hover.
    const interactive = Boolean(this.#state);

    LitHtml.render(
        LitHtml.html`<table
          class=${LitHtml.Directives.classMap({
          hoverable: interactive,
        })}
          @mouseleave=${interactive ? this.#onMouseLeave : null}>
        <thead>
          <tr>
          ${this.#headers.map(h => LitHtml.html`<th scope="col">${h}</th>`)}
          </tr>
        </thead>
        <tbody
          @mouseover=${interactive ? this.#onHoverRow : null}
          @click=${interactive ? this.#onClickRow : null}
        >
          ${this.#rows.map(row => {
          const rowsEls = row.values.map(
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
