// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './DataGrid.js';

import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import type * as TextUtils from '../../text_utils/text_utils.js';
import {SortDirection, SortState, Column, Row, getRowEntryForColumnId, ContextMenuColumnSortClickEvent} from './DataGridUtils.js';
import type {DataGridData, ColumnHeaderClickEvent, DataGridContextMenusConfiguration} from './DataGrid.js';


export interface DataGridControllerData {
  columns: Column[];
  rows: Row[];
  filters?: readonly TextUtils.TextUtils.ParsedFilter[];
  /**
   * Sets an initial sort state for the data grid. Is only used if the component
   * hasn't rendered yet. If you pass this in on subsequent renders, it is
   * ignored.
   */
  initialSort?: SortState;
  contextMenus?: DataGridContextMenusConfiguration;
}

export class DataGridController extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private hasRenderedAtLeastOnce = false;
  private columns: readonly Column[] = [];
  private rows: Row[] = [];
  private contextMenus?: DataGridContextMenusConfiguration = undefined;

  /**
   * Because the controller will sort data in place (e.g. mutate it) when we get
   * new data in we store the original data separately. This is so we don't
   * mutate the data we're given, but a copy of the data. If our `get data` is
   * called, we'll return the original, not the sorted data.
   */
  private originalColumns: readonly Column[] = [];
  private originalRows: Row[] = [];

  private sortState: Readonly<SortState>|null = null;
  private filters: readonly TextUtils.TextUtils.ParsedFilter[] = [];

  get data(): DataGridControllerData {
    return {
      columns: this.originalColumns as Column[],
      rows: this.originalRows as Row[],
      filters: this.filters,
      contextMenus: this.contextMenus,
    };
  }

  set data(data: DataGridControllerData) {
    this.originalColumns = data.columns;
    this.originalRows = data.rows;
    this.contextMenus = data.contextMenus;
    this.filters = data.filters || [];
    this.contextMenus = data.contextMenus;

    this.columns = [...this.originalColumns];
    this.rows = this.cloneAndFilterRows(data.rows, this.filters);

    if (!this.hasRenderedAtLeastOnce && data.initialSort) {
      this.sortState = data.initialSort;
    }

    if (this.sortState) {
      this.sortRows(this.sortState);
    }

    this.render();
  }

  private testRowWithFilter(row: Row, filter: TextUtils.TextUtils.ParsedFilter): boolean {
    let rowMatchesFilter = false;

    const {key, text, negative, regex} = filter;

    let dataToTest;
    if (key) {
      const cell = getRowEntryForColumnId(row, key);
      dataToTest = JSON.stringify(cell.value).toLowerCase();
    } else {
      dataToTest = JSON.stringify(row.cells.map(cell => cell.value)).toLowerCase();
    }

    if (regex) {
      rowMatchesFilter = regex.test(dataToTest);
    } else if (text) {
      rowMatchesFilter = dataToTest.includes(text.toLowerCase());
    }

    // If `negative` is set to `true`, that means we have to flip the final
    // result, because the filter is matching anything that doesn't match. e.g.
    // {text: 'foo', negative: false} matches rows that contain the text `foo`
    // but {text: 'foo', negative: true} matches rows that do NOT contain the
    // text `foo` so if a filter is marked as negative, we first match against
    // that filter, and then we flip it here.
    return negative ? !rowMatchesFilter : rowMatchesFilter;
  }

  private cloneAndFilterRows(rows: Row[], filters: readonly TextUtils.TextUtils.ParsedFilter[]): Row[] {
    if (filters.length === 0) {
      return [...rows];
    }

    return rows.map(row => {
      // We assume that the row should be visible by default.
      let rowShouldBeVisible = true;
      for (const filter of filters) {
        const rowMatchesFilter = this.testRowWithFilter(row, filter);
        // If there are multiple filters, if any return false we hide the row.
        // So if we get a false from testRowWithFilter, we can break early and return false.
        if (!rowMatchesFilter) {
          rowShouldBeVisible = false;
          break;
        }
      }
      return {
        ...row,
        hidden: !rowShouldBeVisible,
      };
    });
  }

  private sortRows(state: SortState): void {
    const {columnId, direction} = state;

    this.rows.sort((row1, row2) => {
      const cell1 = getRowEntryForColumnId(row1, columnId);
      const cell2 = getRowEntryForColumnId(row2, columnId);

      const value1 = typeof cell1.value === 'number' ? cell1.value : String(cell1.value).toUpperCase();
      const value2 = typeof cell2.value === 'number' ? cell2.value : String(cell2.value).toUpperCase();
      if (value1 < value2) {
        return direction === SortDirection.ASC ? -1 : 1;
      }
      if (value1 > value2) {
        return direction === SortDirection.ASC ? 1 : -1;
      }
      return 0;
    });
    this.render();
  }

  private onColumnHeaderClick(event: ColumnHeaderClickEvent): void {
    const {column} = event.data;
    this.applySortOnColumn(column);
  }

  private applySortOnColumn(column: Column): void {
    if (this.sortState && this.sortState.columnId === column.id) {
      const {columnId, direction} = this.sortState;

      /* When users sort, we go No Sort => ASC => DESC => No sort
       * So if the current direction is DESC, we clear the state.
       */
      if (direction === SortDirection.DESC) {
        this.sortState = null;
      } else {
        /* The state is ASC, so toggle to DESC */
        this.sortState = {
          columnId,
          direction: SortDirection.DESC,
        };
      }
    } else {
      /* The column wasn't previously sorted, so we sort it in ASC order. */
      this.sortState = {
        columnId: column.id,
        direction: SortDirection.ASC,
      };
    }

    if (this.sortState) {
      this.sortRows(this.sortState);
    } else {
      // No sortstate = render the original rows.
      this.rows = [...this.originalRows];
      this.render();
    }
  }

  private onContextMenuColumnSortClick(event: ContextMenuColumnSortClickEvent): void {
    this.applySortOnColumn(event.data.column);
  }

  private onContextMenuHeaderResetClick(): void {
    this.sortState = null;
    this.rows = [...this.originalRows];
    this.render();
  }

  private render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <style>
        :host {
          display: block;
          height: 100%;
          overflow: hidden;
        }
      </style>
      <devtools-data-grid .data=${{
          columns: this.columns,
          rows: this.rows,
          activeSort: this.sortState,
          contextMenus: this.contextMenus,
        } as DataGridData}
        @column-header-click=${this.onColumnHeaderClick}
        @context-menu-column-sort-click=${this.onContextMenuColumnSortClick}
        @context-menu-header-reset-click=${this.onContextMenuHeaderResetClick}
     ></devtools-data-grid>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
    this.hasRenderedAtLeastOnce = true;
  }
}

customElements.define('devtools-data-grid-controller', DataGridController);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-data-grid-controller': DataGridController;
  }
}
