// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as LitHtml from '../../third_party/lit-html/lit-html.js';

import {calculateColumnWidthPercentageFromWeighting, calculateFirstFocusableCell, CellPosition, Column, getRowEntryForColumnId, handleArrowKeyNavigation, keyIsArrowKey, renderCellValue, Row, SortDirection, SortState, stringValueForCell} from './DataGridUtils.js';

export interface DataGridData {
  columns: Column[];
  rows: Row[];
  activeSort: SortState|null;
}

export class ColumnHeaderClickEvent extends Event {
  data: {
    column: Column,
    columnIndex: number,
  }

  constructor(column: Column, columnIndex: number) {
    super('column-header-click');
    this.data = {
      column,
      columnIndex,
    };
  }
}

const KEYS_TREATED_AS_CLICKS = new Set([' ', 'Enter']);

export class DataGrid extends HTMLElement {
  private readonly shadow = this.attachShadow({mode: 'open'});
  private columns: ReadonlyArray<Column> = [];
  private rows: ReadonlyArray<Row> = [];
  private sortState: Readonly<SortState>|null = null;
  /**
   * Following guidance from
   * https://www.w3.org/TR/wai-aria-practices/examples/grid/dataGrids.html, we
   * allow a single cell inside the table to be focusable, such that when a user
   * tabs in they select that cell. IMPORTANT: if the data-grid has sortable
   * columns, the user has to be able to navigate to the headers to toggle the
   * sort. [0,0] is considered the first cell INCLUDING the column header
   * Therefore if a user is on the first header cell, the position is considered [0, 0],
   * and if a user is on the first body cell, the position is considered [0, 1].
   *
   * We set the selectable cell to the first tbody value by default, but then on the
   * first render if any of the columns are sortable we'll set the active cell
   * to [0, 0].
   */
  private focusableCell: CellPosition = [0, 1];
  private hasRenderedAtLeastOnce = false;

  get data(): DataGridData {
    return {
      columns: this.columns as Column[],
      rows: this.rows as Row[],
      activeSort: this.sortState,
    };
  }

  set data(data: DataGridData) {
    this.columns = data.columns;
    this.rows = data.rows;
    this.sortState = data.activeSort;

    /**
     * On first render, now we have data, we can figure out which cell is the
     * focusable cell for the table.
     *
     * If any columns are sortable, we pick [0, 0], which is the first cell of
     * the columns row. However, if any columns are hidden, we adjust
     * accordingly. e.g., if the first column is hidden, we'll set the starting
     * index as [1, 0].
     *
     * If the columns aren't sortable, we pick the first visible body row as the
     * index.
     *
     * We only do this on the first render; otherwise if we re-render and the
     * user has focused a cell, this logic will reset it.
     */
    if (!this.hasRenderedAtLeastOnce) {
      this.focusableCell = calculateFirstFocusableCell({columns: this.columns, rows: this.rows});
    }

    if (this.hasRenderedAtLeastOnce) {
      const [selectedColIndex, selectedRowIndex] = this.focusableCell;
      const columnOutOfBounds = selectedColIndex > this.columns.length;
      const rowOutOfBounds = selectedRowIndex > this.rows.length;

      /** If the row or column was removed, so the user is out of bounds, we
       * move them to the last focusable cell, which should be close to where
       * they were. */
      if (columnOutOfBounds || rowOutOfBounds) {
        this.focusableCell = [
          columnOutOfBounds ? this.columns.length : selectedColIndex,
          rowOutOfBounds ? this.rows.length : selectedRowIndex,
        ];
      } else {
        /** If the user was on some cell that is now hidden, the logic to figure out the best cell to move them to is complex. We're deferring this for now and instead reset them back to the first focusable cell. */
        this.focusableCell = calculateFirstFocusableCell({columns: this.columns, rows: this.rows});
      }
    }

    this.render();
  }

  private scrollToBottomIfRequired() {
    if (this.hasRenderedAtLeastOnce === false) {
      // On the first render we don't want to assume the user wants to scroll to the bottom;
      return;
    }

    const focusableCell = this.getCurrentlyFocusableCell();
    if (focusableCell && focusableCell === this.shadow.activeElement) {
      // The user has a cell (and indirectly, a row) selected so we don't want
      // to mess with their scroll
      return;
    }

    // Scroll to the bottom, but pick the last visible row, not the last entry
    // of this.rows, which might be hidden.
    const lastVisibleRow = this.shadow.querySelector('tbody tr:not(.hidden):last-child');
    if (lastVisibleRow) {
      lastVisibleRow.scrollIntoView();
    }
  }

  private getCurrentlyFocusableCell() {
    const [columnIndex, rowIndex] = this.focusableCell;
    const cell = this.shadow.querySelector<HTMLTableCellElement>(
        `[data-row-index="${rowIndex}"][data-col-index="${columnIndex}"]`);
    return cell;
  }

  private focusCell([newColumnIndex, newRowIndex]: CellPosition) {
    const [currentColumnIndex, currentRowIndex] = this.focusableCell;
    const newCellIsCurrentlyFocusedCell = (currentColumnIndex === newColumnIndex && currentRowIndex === newRowIndex);

    if (!newCellIsCurrentlyFocusedCell) {
      this.focusableCell = [newColumnIndex, newRowIndex];
      this.render();
    }

    const cellElement = this.getCurrentlyFocusableCell();
    if (!cellElement) {
      throw new Error('Unexpected error: could not find cell marked as focusable');
    }
    /* The cell may already be focused if the user clicked into it, but we also
     * add arrow key support, so in the case where we're programatically moving the
     * focus, ensure we actually focus the cell.
     */
    if (cellElement !== this.shadow.activeElement) {
      cellElement.focus();
    }
  }

  private onTableKeyDown(event: KeyboardEvent) {
    const key = event.key;

    if (KEYS_TREATED_AS_CLICKS.has(key)) {
      const focusedCell = this.getCurrentlyFocusableCell();
      const [focusedColumnIndex, focusedRowIndex] = this.focusableCell;
      const activeColumn = this.columns[focusedColumnIndex];
      if (focusedCell && focusedRowIndex === 0 && activeColumn && activeColumn.sortable) {
        this.onColumnHeaderClick(activeColumn, focusedColumnIndex);
      }
    }

    if (!keyIsArrowKey(key)) {
      return;
    }

    const nextFocusedCell = handleArrowKeyNavigation({
      key: key,
      currentFocusedCell: this.focusableCell,
      columns: this.columns,
      rows: this.rows,
    });
    this.focusCell(nextFocusedCell);
  }

  private onColumnHeaderClick(col: Column, index: number) {
    this.dispatchEvent(new ColumnHeaderClickEvent(col, index));
  }

  /**
   * Applies the aria-sort label to a column's th.
   * Guidance on values of attribute taken from
   * https://www.w3.org/TR/wai-aria-practices/examples/grid/dataGrids.html.
   */
  private ariaSortForHeader(col: Column) {
    if (col.sortable && (!this.sortState || this.sortState.columnId !== col.id)) {
      // Column is sortable but is not currently sorted
      return 'none';
    }

    if (this.sortState && this.sortState.columnId === col.id) {
      return this.sortState.direction === SortDirection.ASC ? 'ascending' : 'descending';
    }

    // Column is not sortable, so don't apply any label
    return undefined;
  }

  private renderEmptyRow() {
    const visibleColumns = this.columns.filter(col => !col.hidden);
    const emptyCells = visibleColumns.map((col, colIndex) => {
      const emptyCellClasses = LitHtml.Directives.classMap({
        firstVisibleColumn: colIndex === 0,
      });
      return LitHtml.html`<td class=${emptyCellClasses}></td>`;
    });
    return LitHtml.html`<tr>${emptyCells}</tr>`;
  }

  private render() {
    const indexOfFirstVisibleColumn = this.columns.findIndex(col => !col.hidden);
    const anyColumnsSortable = this.columns.some(col => col.sortable === true);
    const visibleRowsCount = this.rows.filter(row => !row.hidden).length;
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
    <style>
      :host {
        --table-divider-color: #aaa;
        --toolbar-bg-color: #f3f3f3;
        --selected-row-color: rgb(212, 212, 212);
        --selection-bg-color: #1a73e8;

        height: 100%;
        display: block;
      }
      /* Ensure that vertically we don't overflow */
      .wrapping-container {
        overflow-y: scroll;
        /* Use max-height instead of height to ensure that the
           table does not use more space than necessary. */
        height: 100%;
        position: relative;
      }

      table {
        border-spacing: 0;
        width: 100%;
        height: 100%;
        /* To make sure that we properly hide overflowing text
           when horizontal space is too narrow. */
        table-layout: fixed;
      }

      tr {
        outline: none;
      }


      tbody tr.selected {
        background-color: var(--selected-row-color);
      }

      table:focus tr.selected {
        background-color: var(--selection-bg-color)
      }

      td, th {
        padding: 1px 4px;
        /* Divider between each cell, except the first one (see below) */
        border-left: 1px solid var(--table-divider-color);
        line-height: 18px;
        height: 18px;
        user-select: text;
        /* Ensure that text properly cuts off if horizontal space is too narrow */
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
      }
      /* There is no divider before the first cell */
      td.firstVisibleColumn, th.firstVisibleColumn {
        border-left: none;
      }

      th {
        font-weight: normal;
        text-align: left;
        border-bottom: 1px solid var(--table-divider-color);
        position: sticky;
        top: 0;
        z-index: 2;
        background-color: var(--toolbar-bg-color);
      }

      .hidden {
        display: none;
      }

      [aria-sort]:hover {
        cursor: pointer;
      }

      [aria-sort="descending"]::after {
        content: " ";
        border-left: 0.3em solid transparent;
        border-right: 0.3em solid transparent;
        border-top: 0.3em solid black;
        position: absolute;
        right: 0.5em;
        top: 0.6em;
      }
      [aria-sort="ascending"]::after {
        content: " ";
        border-bottom: 0.3em solid black;
        border-left: 0.3em solid transparent;
        border-right: 0.3em solid transparent;
        position: absolute;
        right: 0.5em;
        top: 0.6em;
      }
    </style>
    <div class="wrapping-container">
      <table
        aria-rowcount=${this.rows.length}
        aria-colcount=${this.columns.length}
        @keydown=${this.onTableKeyDown}
      >
        <colgroup>
          ${this.columns.filter(col => !col.hidden).map(col => {
            const width = calculateColumnWidthPercentageFromWeighting(this.columns, col.id);
            const style = `width: ${width}%`;
            return LitHtml.html`<col style=${style}>`;
          })}
        </colgroup>
        <thead>
          <tr>
            ${this.columns.map((col, columnIndex) => {
              const thClasses = LitHtml.Directives.classMap({
                hidden: col.hidden === true,
                firstVisibleColumn: columnIndex === indexOfFirstVisibleColumn,
              });
              const cellIsFocusableCell = anyColumnsSortable && columnIndex === this.focusableCell[0] && this.focusableCell[1] === 0;

              return LitHtml.html`<th class=${thClasses}
                data-grid-header-cell=${col.id}
                @click=${() => {
                  this.focusCell([columnIndex, 0]);
                  this.onColumnHeaderClick(col, columnIndex);
                }}
                title=${col.title}
                aria-sort=${LitHtml.Directives.ifDefined(this.ariaSortForHeader(col))}
                aria-colindex=${columnIndex + 1}
                data-row-index='0'
                data-col-index=${columnIndex}
                tabindex=${LitHtml.Directives.ifDefined(anyColumnsSortable ? (cellIsFocusableCell ? '0' : '-1') : undefined)}
              >${col.title}</th>`;
            })}
          </tr>
        </thead>
        <tbody>
          ${visibleRowsCount === 0 ? this.renderEmptyRow() : this.rows.map((row, rowIndex) => {
            const focusableCell = this.getCurrentlyFocusableCell();
            const [,focusableCellRowIndex] = this.focusableCell;

            // Remember that row 0 is considered the header row, so the first tbody row is row 1.
            const tableRowIndex = rowIndex + 1;

            // Have to check for focusableCell existing as this runs on the
            // first render before it's ever been created.
            const rowIsSelected = focusableCell ? focusableCell === document.activeElement && tableRowIndex === focusableCellRowIndex : false;

            const rowClasses = LitHtml.Directives.classMap({
              selected: rowIsSelected,
              hidden: row.hidden === true,
            });
            return LitHtml.html`
              <tr
                aria-rowindex=${rowIndex + 1}
                class=${rowClasses}
              >${this.columns.map((col, columnIndex) => {
                const entryForRow = getRowEntryForColumnId(row, col.id);
                const cellClasses = LitHtml.Directives.classMap({
                  hidden: col.hidden === true,
                  firstVisibleColumn: columnIndex === indexOfFirstVisibleColumn,
                });
                const cellIsFocusableCell = columnIndex === this.focusableCell[0] && tableRowIndex === this.focusableCell[1];
                const cellTextValue = stringValueForCell(entryForRow);
                const cellOutput = renderCellValue(entryForRow);
                return LitHtml.html`<td
                  class=${cellClasses}
                  title=${cellTextValue}
                  tabindex=${cellIsFocusableCell ? '0' : '-1'}
                  aria-colindex=${columnIndex + 1}
                  data-row-index=${tableRowIndex}
                  data-col-index=${columnIndex}
                  data-grid-value-cell-for-column=${col.id}
                  @click=${() => {
                    this.focusCell([columnIndex, tableRowIndex]);
                  }}
                >${cellOutput}</td>`;
              })}
            `;
          })}
        </tbody>
      </table>
    </div>
    `, this.shadow, {
      eventContext: this,
    });
    // clang-format on

    this.scrollToBottomIfRequired();
    this.hasRenderedAtLeastOnce = true;
  }
}

customElements.define('devtools-data-grid', DataGrid);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-data-grid': DataGrid;
  }
}
