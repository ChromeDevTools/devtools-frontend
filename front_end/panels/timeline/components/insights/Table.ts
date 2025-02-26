// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Trace from '../../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../../ui/components/helpers/helpers.js';
import * as UI from '../../../../ui/legacy/legacy.js';
import * as Lit from '../../../../ui/lit/lit.js';
import type * as Overlays from '../../overlays/overlays.js';

import type * as BaseInsightComponent from './BaseInsightComponent.js';
import {EventReferenceClick} from './EventRef.js';
import tableStylesRaw from './table.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const tableStyles = new CSSStyleSheet();
tableStyles.replaceSync(tableStylesRaw.cssContent);

const {html} = Lit;

type BaseInsightComponent = BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel<{}, {}>>;

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
  overlays?: Overlays.Overlays.TimelineOverlay[];
}

export class Table extends HTMLElement {

  readonly #shadow = this.attachShadow({mode: 'open'});
  readonly #boundRender = this.#render.bind(this);
  #insight?: BaseInsightComponent;
  #state?: TableState;
  #headers?: string[];
  #rows?: TableDataRow[];
  #interactive = false;
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
    UI.UIUtils.injectCoreStyles(this.#shadow);

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#boundRender);
  }

  #onHoverRow(e: MouseEvent): void {
    if (!(e.target instanceof HTMLElement)) {
      return;
    }

    const rowEl = e.target.closest('tr');
    if (!rowEl?.parentElement) {
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
    if (!rowEl?.parentElement) {
      return;
    }

    const index = [...rowEl.parentElement.children].indexOf(rowEl);
    if (index === -1) {
      return;
    }

    // If the desired overlays consist of just a single ENTRY_OUTLINE, then
    // it is more intuitive to just select the target event.
    const overlays = this.#rows?.[index]?.overlays;
    if (overlays?.length === 1 && overlays[0].type === 'ENTRY_OUTLINE') {
      this.dispatchEvent(new EventReferenceClick(overlays[0].entry));
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

    Lit.render(
        html`<table
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
