// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './DataGrid.js';

import * as LitHtml from '../../third_party/lit-html/lit-html.js';

import type {DataGridData, ColumnHeaderClickEvent} from './DataGrid.js';

import {SortDirection, SortState, Column, Row, getRowEntryForColumnId, stringValueForCell} from './DataGridUtils.js';

export interface DataGridControllerData {
  columns: Column[];
  rows: Row[];
  filterText?: string;
}

export class DataGridController extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});

  private columns: ReadonlyArray<Column> = [];
  private rows: Row[] = [];

  /**
   * Because the controller will sort data in place (e.g. mutate it) when we get
   * new data in we store the original data separately. This is so we don't
   * mutate the data we're given, but a copy of the data. If our `get data` is
   * called, we'll return the original, not the sorted data.
   */
  private originalColumns: ReadonlyArray<Column> = [];
  private originalRows: Row[] = [];

  private sortState: Readonly<SortState>|null = null;
  private filterText?: string;

  get data(): DataGridControllerData {
    return {
      columns: this.originalColumns as Column[],
      rows: this.originalRows as Row[],
      filterText: this.filterText,
    };
  }

  set data(data: DataGridControllerData) {
    this.originalColumns = data.columns;
    this.originalRows = data.rows;
    this.filterText = data.filterText;

    this.columns = [...this.originalColumns];
    this.rows = this.cloneAndFilterRows(data.rows, this.filterText);
    this.render();
  }

  private cloneAndFilterRows(rows: Row[], filterText?: string): Row[] {
    if (!filterText) {
      return [...rows];
    }

    // Plain text search across all columns.
    return rows.map(row => {
      const rowHasMatchingValue = row.cells.some(cell => {
        const rowText = stringValueForCell(cell);
        return rowText.toLowerCase().includes(filterText.toLowerCase());
      });

      return {
        ...row,
        hidden: !rowHasMatchingValue,
      };
    });
  }

  private sortRows(state: SortState) {
    const {columnId, direction} = state;

    this.rows.sort((row1, row2) => {
      const cell1 = getRowEntryForColumnId(row1, columnId);
      const cell2 = getRowEntryForColumnId(row2, columnId);

      const value1 = stringValueForCell(cell1).toUpperCase();
      const value2 = stringValueForCell(cell2).toUpperCase();
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

  private onColumnHeaderClick(event: ColumnHeaderClickEvent) {
    const {column} = event.data;
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

  private render() {
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
        } as DataGridData}
        @column-header-click=${this.onColumnHeaderClick}
      ></devtools-data-grid>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on
  }
}

customElements.define('devtools-data-grid-controller', DataGridController);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-data-grid-controller': DataGridController;
  }
}
