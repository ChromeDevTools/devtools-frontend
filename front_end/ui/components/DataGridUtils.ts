// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as LitHtml from '../../third_party/lit-html/lit-html.js';
import * as DataGridRenderers from './DataGridRenderers.js';

/**
  * A column is an object with the following properties:
  *
  * - `id`: a unique ID for that column.
  * - `title`: the user visible title.
  * - `hidden`: an optional flag to mark the column as hidden, so it won't
  *   render.
  * - `width`: a number that denotes the width of the column. This is percentage
  *   based, out of 100.
  * - `sortable`: an optional property to denote if the  column is sortable.
  *   Note, if you're rendering a data-grid yourself you likely  shouldn't set
  *   this. It's set by the `data-grid-controller`, which is the component you
  *   want if your table needs to be sortable.
*/
export interface Column {
  id: string;
  title: string;
  sortable?: boolean;
  widthWeighting: number;
  hidden?: boolean;
}

/**
 * A cell contains a `columnId`, which is the ID of the column the cell
 * reprsents, and the `value`, which is a string value for that cell.
 *
 * Note that currently cells cannot render complex data (e.g. nested HTML) but
 * in future we may extend the DataGrid to support this.
 */
export interface Cell {
  columnId: string;
  value: unknown;
  // The renderer function actually returns LitHtml.TemplateResult but it's a
  // lot of work to teach the bridges generator about that.
  // TODO (crbug.com/1011811): Fix types once TypeScriptification is complete.
  renderer?: (value: unknown) => unknown
}

export type Row = {
  cells: Cell[];
  hidden?: boolean;
}

export const enum SortDirection {
  ASC = 'ASC',
  DESC = 'DESC',
}

export interface SortState {
  columnId: string;
  direction: SortDirection;
}

export type CellPosition = readonly [columnIndex: number, rowIndex: number];

export const enum ArrowKey {
  UP = 'ArrowUp',
  DOWN = 'ArrowDown',
  LEFT = 'ArrowLeft',
  RIGHT = 'ArrowRight',
}
export const ARROW_KEYS = new Set<ArrowKey>([
  ArrowKey.UP,
  ArrowKey.DOWN,
  ArrowKey.LEFT,
  ArrowKey.RIGHT,
]);

export function keyIsArrowKey(key: string): key is ArrowKey {
  return ARROW_KEYS.has(key as ArrowKey);
}

export function getRowEntryForColumnId(row: Row, id: string): Cell {
  const rowEntry = row.cells.find(r => r.columnId === id);
  if (rowEntry === undefined) {
    throw new Error(`Found a row that was missing an entry for column ${id}.`);
  }

  return rowEntry;
}

export function renderCellValue(cell: Cell): LitHtml.TemplateResult {
  const output = cell.renderer ? cell.renderer(cell.value) as LitHtml.TemplateResult :
                                 DataGridRenderers.stringRenderer(cell.value);
  return output;
}

export function stringValueForCell(cell: Cell): string {
  if (typeof cell.value === 'string') {
    return cell.value;
  }

  const output = renderCellValue(cell);
  const div = document.createElement('div');
  LitHtml.render(output, div);
  return div.innerText;
}

/**
 * When the user passes in columns we want to know how wide each one should be.
 * We don't work in exact percentages, or pixel values, because it's then
 * unclear what to do in the event that one column is hidden. How do we
 * distribute up the extra space?
 *
 * Instead, each column has a weighting, which is its width proportionate to the
 * total weighting of all columns. For example:
 *
 * -> two columns both with widthWeighting: 1, will be 50% each, because the
 * total weight = 2, and each column is 1
 *
 * -> if you have two columns, the first width a weight of 2, and the second
 * with a weight of 1, the first will take up 66% and the other 33%.
 *
 * This way, when you are calculating the %, it's easy to do because if a
 * particular column becomes hidden, you ignore it / give it a weighting of 0,
 * and the space is evenly distributed amongst the remaining visible columns.
 *
 * @param allColumns
 * @param columnId
 */
export function calculateColumnWidthPercentageFromWeighting(
    allColumns: ReadonlyArray<Column>, columnId: string): number {
  const totalWeights =
      allColumns.filter(c => !c.hidden).reduce((sumOfWeights, col) => sumOfWeights + col.widthWeighting, 0);
  const matchingColumn = allColumns.find(c => c.id === columnId);
  if (!matchingColumn) {
    throw new Error(`Could not find column with ID ${columnId}`);
  }
  if (matchingColumn.widthWeighting < 1) {
    throw new Error(`Error with column ${columnId}: width weightings must be >= 1.`);
  }
  if (matchingColumn.hidden) {
    return 0;
  }

  return Math.round((matchingColumn.widthWeighting / totalWeights) * 100);
}

export interface HandleArrowKeyOptions {
  key: ArrowKey, currentFocusedCell: readonly[number, number], columns: readonly Column[], rows: readonly Row[],
}

export function handleArrowKeyNavigation(options: HandleArrowKeyOptions): CellPosition {
  const {key, currentFocusedCell, columns, rows} = options;
  const [selectedColIndex, selectedRowIndex] = currentFocusedCell;

  switch (key) {
    case ArrowKey.LEFT: {
      const firstVisibleColumnIndex = columns.findIndex(c => !c.hidden);
      if (selectedColIndex === firstVisibleColumnIndex) {
        // User is as far left as they can go, so don't move them.
        return [selectedColIndex, selectedRowIndex];
      }

      // Set the next index to first be the column we are already on, and then
      // iterate back through all columns to our left, breaking the loop if we
      // find one that's not hidden. If we don't find one, we'll stay where we
      // are.
      let nextColIndex = selectedColIndex;
      for (let i = nextColIndex - 1; i >= 0; i--) {
        const col = columns[i];
        if (!col.hidden) {
          nextColIndex = i;
          break;
        }
      }

      return [nextColIndex, selectedRowIndex];
    }

    case ArrowKey.RIGHT: {
      // Set the next index to first be the column we are already on, and then
      // iterate through all columns to our right, breaking the loop if we
      // find one that's not hidden. If we don't find one, we'll stay where we
      // are.
      let nextColIndex = selectedColIndex;
      for (let i = nextColIndex + 1; i < columns.length; i++) {
        const col = columns[i];
        if (!col.hidden) {
          nextColIndex = i;
          break;
        }
      }

      return [nextColIndex, selectedRowIndex];
    }

    case ArrowKey.UP: {
      const columnsSortable = columns.some(col => col.sortable === true);
      const minRowIndex = columnsSortable ? 0 : 1;
      if (selectedRowIndex === minRowIndex) {
        // If any columns are sortable the user can navigate into the column
        // header row, else they cannot. So if they are on the highest row they
        // can be, just return the current cell as they cannot move up.
        return [selectedColIndex, selectedRowIndex];
      }

      let rowIndexToMoveTo = selectedRowIndex;

      for (let i = selectedRowIndex - 1; i >= minRowIndex; i--) {
        // This means we got past all the body rows and therefore the user needs
        // to go into the column row.
        if (i === 0) {
          rowIndexToMoveTo = 0;
          break;
        }
        const matchingRow = rows[i - 1];
        if (!matchingRow.hidden) {
          rowIndexToMoveTo = i;
          break;
        }
      }

      return [selectedColIndex, rowIndexToMoveTo];
    }

    case ArrowKey.DOWN: {
      if (selectedRowIndex === 0) {
        // The user is on the column header. So find the first visible body row and take them there!
        const firstVisibleBodyRowIndex = rows.findIndex(row => !row.hidden);
        if (firstVisibleBodyRowIndex > -1) {
          return [selectedColIndex, firstVisibleBodyRowIndex + 1];
        }
        // If we didn't find a single visible row, leave the user where they are.
        return [selectedColIndex, selectedRowIndex];
      }

      let rowIndexToMoveTo = selectedRowIndex;
      // Work down from our starting position to find the next visible row to move to.
      for (let i = rowIndexToMoveTo + 1; i < rows.length + 1; i++) {
        const matchingRow = rows[i - 1];
        if (!matchingRow.hidden) {
          rowIndexToMoveTo = i;
          break;
        }
      }

      return [selectedColIndex, rowIndexToMoveTo];
    }
  }
}

export const calculateFirstFocusableCell =
    (options: {columns: readonly Column[], rows: readonly Row[]}): [colIndex: number, rowIndex: number] => {
      const {columns, rows} = options;
      const someColumnsSortable = columns.some(col => col.sortable === true);
      const focusableRowIndex = someColumnsSortable ? 0 : rows.findIndex(row => !row.hidden) + 1;
      const focusableColIndex = columns.findIndex(col => !col.hidden);

      return [focusableColIndex, focusableRowIndex];
    };
