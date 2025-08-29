// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as Lit from '../../../../ui/lit/lit.js';

import type * as BaseInsightComponent from './BaseInsightComponent.js';
import {EventReferenceClick} from './EventRef.js';
import tableStyles from './table.css.js';

const UIStrings = {
  /**
   * @description Table row value representing the remaining items not shown in the table due to size constraints. This row will always represent at least 2 items.
   * @example {5} PH1
   */
  others: '{PH1} others',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/insights/Table.ts', UIStrings);
export const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {html} = Lit;

type BaseInsightComponent = BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel>;

/**
 * @file An interactive table component.
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

export interface TableState {
  selectedRowEl: HTMLElement|null;
  selectionIsSticky: boolean;
}

export interface TableData {
  insight: BaseInsightComponent;
  headers: string[];
  rows: TableDataRow[];
}

export interface TableDataRow {
  values: Array<number|string|Lit.LitTemplate>;
  overlays?: Trace.Types.Overlays.Overlay[];
  subRows?: TableDataRow[];
}

export function renderOthersLabel(numOthers: number): string {
  return i18nString(UIStrings.others, {PH1: numOthers});
}

export interface RowLimitAggregator<T> {
  mapToRow: (item: T) => TableDataRow;
  createAggregatedTableRow: (remaining: T[]) => TableDataRow;
}

/**
 * Maps `arr` to a list of `TableDataRow`s  using `aggregator.mapToRow`, but limits the number of `TableDataRow`s to `limit`.
 * If the length of `arr` is larger than `limit`, any excess rows will be aggregated into the final `TableDataRow` using `aggregator.createAggregatedTableRow`.
 *
 * Useful for creating a "N others" row in a data table.
 *
 * Example: `arr` is a list of 15 items & `limit` is 10. The first 9 items in `arr` would be mapped to `TableDataRow`s using `aggregator.mapToRow` and
 * the 10th `TableDataRow` would be created by using `aggregator.createAggregatedTableRow` on the 6 items that were not sent through `aggregator.mapToRow`.
 */
export function createLimitedRows<T>(arr: T[], aggregator: RowLimitAggregator<T>, limit = 10): TableDataRow[] {
  if (arr.length === 0 || limit === 0) {
    return [];
  }

  const aggregateStartIndex = limit - 1;
  const items = arr.slice(0, aggregateStartIndex).map(aggregator.mapToRow.bind(aggregator));
  if (arr.length > limit) {
    items.push(aggregator.createAggregatedTableRow(arr.slice(aggregateStartIndex)));
  } else if (arr.length === limit) {
    items.push(aggregator.mapToRow(arr[aggregateStartIndex]));
  }

  return items;
}

export class Table extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #insight?: BaseInsightComponent;
  #state?: TableState;
  #headers?: string[];
  /** The rows as given as by the user, which may include recursive rows via subRows. */
  #rows?: TableDataRow[];
  /** All rows/subRows, in the order that they appear visually. This is the result of traversing `#rows` and any subRows found. */
  #flattenedRows?: TableDataRow[];
  #rowToParentRow = new Map<TableDataRow, TableDataRow>();
  #interactive = false;
  #currentHoverIndex: number|null = null;

  set data(data: TableData) {
    this.#insight = data.insight;
    this.#state = data.insight.sharedTableState;
    this.#headers = data.headers;
    this.#rows = data.rows;
    // If this table isn't interactive, don't attach mouse listeners or use CSS :hover.
    this.#interactive = this.#rows.some(row => row.overlays || row.subRows?.length);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onHoverRow(e: MouseEvent): void {
    if (!this.#flattenedRows) {
      return;
    }

    if (!(e.target instanceof HTMLElement)) {
      return;
    }

    const rowEl = e.target.closest('tr');
    if (!rowEl?.parentElement) {
      return;
    }

    const rowEls = [...rowEl.parentElement.children];
    const index = rowEl.sectionRowIndex;
    if (index === this.#currentHoverIndex) {
      return;
    }

    for (const el of rowEl.parentElement.querySelectorAll('.hover')) {
      el.classList.remove('hover');
    }

    // Add 'hover' class to all parent rows.
    let row: TableDataRow|undefined = this.#rowToParentRow.get(this.#flattenedRows[index]);
    while (row) {
      const index = this.#flattenedRows.indexOf(row);
      const rowEl = rowEls[index];
      rowEl.classList.add('hover');
      row = this.#rowToParentRow.get(row);
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
    if (!rowEl?.parentElement) {
      return;
    }

    const index = [...rowEl.parentElement.children].indexOf(rowEl);
    if (index === -1) {
      return;
    }

    // If the desired overlays consist of just a single ENTRY_OUTLINE, then
    // it is more intuitive to just select the target event.
    const overlays = this.#flattenedRows?.[index]?.overlays;
    if (overlays?.length === 1 && overlays[0].type === 'ENTRY_OUTLINE') {
      this.dispatchEvent(new EventReferenceClick(overlays[0].entry));
      return;
    }

    // Select the row and make it sticky.
    this.#onSelectedRowChanged(rowEl, index, {sticky: true});
  }

  #onMouseLeave(): void {
    for (const el of this.shadowRoot?.querySelectorAll('.hover') ?? []) {
      el.classList.remove('hover');
    }

    this.#currentHoverIndex = null;
    // Unselect the row, unless it's sticky.
    this.#onSelectedRowChanged(null, null);
  }

  #onSelectedRowChanged(rowEl: HTMLElement|null, rowIndex: number|null, opts: {
    sticky?: boolean,
    isHover?: boolean,
  } = {}): void {
    if (!this.#flattenedRows || !this.#state || !this.#insight) {
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
      const overlays = this.#flattenedRows[rowIndex].overlays;
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

    const rowToParentRow = this.#rowToParentRow;
    rowToParentRow.clear();

    const numColumns = this.#headers.length;
    const flattenedRows: TableDataRow[] = [];
    const rowEls: Lit.TemplateResult[] = [];
    function traverse(parent: TableDataRow|null, row: TableDataRow, depth = 0): void {
      if (parent) {
        rowToParentRow.set(row, parent);
      }

      const thStyles = Lit.Directives.styleMap({
        paddingLeft: `calc(${depth} * var(--sys-size-5))`,
        backgroundImage: `repeating-linear-gradient(
              to right,
              var(--sys-color-tonal-outline) 0 var(--sys-size-1),
              transparent var(--sys-size-1) var(--sys-size-5)
            )`,
        backgroundPosition: '0 0',
        backgroundRepeat: 'no-repeat',
        backgroundSize: `calc(${depth} * var(--sys-size-5))`,
      });
      const trStyles = Lit.Directives.styleMap({
        color: depth ? 'var(--sys-color-on-surface-subtle)' : '',
      });
      const columnEls = row.values.map(
          (value, i) => i === 0 ? html`<th
                scope="row"
                colspan=${i === row.values.length - 1 ? numColumns - i : 1}
                style=${thStyles}>${value}
              </th>` :
                                  html`<td>${value}</td>`);
      rowEls.push(html`<tr style=${trStyles}>${columnEls}</tr>`);

      flattenedRows.push(row);

      for (const subRow of row.subRows ?? []) {
        traverse(row, subRow, depth + 1);
      }
    }

    for (const row of this.#rows) {
      traverse(null, row);
    }

    this.#flattenedRows = flattenedRows;

    Lit.render(
        html`<style>${tableStyles}</style>
      <table
          class=${Lit.Directives.classMap({
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
        >${rowEls}</tbody>
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
