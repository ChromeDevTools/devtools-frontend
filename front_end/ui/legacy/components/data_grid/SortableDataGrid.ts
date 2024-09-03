// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/naming-convention */

import * as Platform from '../../../../core/platform/platform.js';

import {type ColumnDescriptor, type DataGridData, Events, type Parameters} from './DataGrid.js';
import {ViewportDataGrid, ViewportDataGridNode} from './ViewportDataGrid.js';

export class SortableDataGrid<T> extends ViewportDataGrid<SortableDataGridNode<T>> {
  sortingFunction: <T>(a: SortableDataGridNode<T>, b: SortableDataGridNode<T>) => number;
  constructor(dataGridParameters: Parameters) {
    super(dataGridParameters);
    this.sortingFunction = SortableDataGrid.TrivialComparator;
    this.setRootNode((new SortableDataGridNode() as SortableDataGridNode<T>));
  }

  static TrivialComparator<T>(_a: SortableDataGridNode<T>, _b: SortableDataGridNode<T>): number {
    return 0;
  }

  static NumericComparator<T>(columnId: string, a: SortableDataGridNode<T>, b: SortableDataGridNode<T>): number {
    const aValue = a.data[columnId];
    const bValue = b.data[columnId];
    const aNumber = Number(aValue instanceof Node ? aValue.textContent : aValue);
    const bNumber = Number(bValue instanceof Node ? bValue.textContent : bValue);
    return aNumber < bNumber ? -1 : (aNumber > bNumber ? 1 : 0);
  }

  static StringComparator<T>(columnId: string, a: SortableDataGridNode<T>, b: SortableDataGridNode<T>): number {
    const aValue = a.data[columnId];
    const bValue = b.data[columnId];
    const aString = aValue instanceof Node ? aValue.textContent : String(aValue);
    const bString = bValue instanceof Node ? bValue.textContent : String(bValue);
    if (!aString || !bString) {
      return 0;
    }
    return aString < bString ? -1 : (aString > bString ? 1 : 0);
  }

  static Comparator<T>(
      comparator: (arg0: SortableDataGridNode<T>, arg1: SortableDataGridNode<T>) => number, reverseMode: boolean,
      a: SortableDataGridNode<T>, b: SortableDataGridNode<T>): number {
    return reverseMode ? comparator(b, a) : comparator(a, b);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static create<T>(columnNames: string[], values: any[], displayName: string):
      SortableDataGrid<SortableDataGridNode<T>>|null {
    const numColumns = columnNames.length;
    if (!numColumns) {
      return null;
    }

    const columns = ([] as ColumnDescriptor[]);
    for (let i = 0; i < columnNames.length; ++i) {
      const id = String(i);
      columns.push(({id, title: columnNames[i], sortable: true} as ColumnDescriptor));
    }

    const nodes = [];
    for (let i = 0; i < values.length / numColumns; ++i) {
      const data: DataGridData = {};
      for (let j = 0; j < columnNames.length; ++j) {
        data[j] = values[numColumns * i + j];
      }

      const node = new SortableDataGridNode(data);
      node.selectable = false;
      nodes.push(node);
    }

    const dataGrid = new SortableDataGrid(({displayName, columns} as Parameters));
    const length = nodes.length;
    const rootNode = dataGrid.rootNode();
    for (let i = 0; i < length; ++i) {
      rootNode.appendChild(nodes[i]);
    }

    dataGrid.addEventListener(Events.SORTING_CHANGED, sortDataGrid);

    function sortDataGrid(): void {
      const nodes = dataGrid.rootNode().children;
      const sortColumnId = dataGrid.sortColumnId();
      if (!sortColumnId) {
        return;
      }

      let columnIsNumeric = true;
      for (let i = 0; i < nodes.length; i++) {
        const value = nodes[i].data[sortColumnId];
        if (isNaN(value instanceof Node ? value.textContent : value)) {
          columnIsNumeric = false;
          break;
        }
      }

      const comparator = columnIsNumeric ? SortableDataGrid.NumericComparator : SortableDataGrid.StringComparator;
      dataGrid.sortNodes(comparator.bind(null, sortColumnId), !dataGrid.isSortOrderAscending());
    }
    return dataGrid;
  }

  insertChild(node: SortableDataGridNode<T>): void {
    const root = (this.rootNode() as SortableDataGridNode<T>);
    root.insertChildOrdered(node);
  }

  sortNodes(comparator: (arg0: SortableDataGridNode<T>, arg1: SortableDataGridNode<T>) => number, reverseMode: boolean):
      void {
    this.sortingFunction = SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
    this.rootNode().recalculateSiblings(0);
    (this.rootNode() as SortableDataGridNode<T>).sortChildren();
    this.scheduleUpdateStructure();
  }
}

export class SortableDataGridNode<T> extends ViewportDataGridNode<SortableDataGridNode<T>> {
  constructor(data?: DataGridData|null, hasChildren?: boolean) {
    super(data, hasChildren);
  }

  insertChildOrdered(node: SortableDataGridNode<T>): void {
    const dataGrid = (this.dataGrid as SortableDataGrid<T>| null);
    if (dataGrid) {
      this.insertChild(
          node,
          Platform.ArrayUtilities.upperBound(
              (this.children as SortableDataGridNode<T>[]), node, dataGrid.sortingFunction));
    }
  }

  sortChildren(): void {
    const dataGrid = (this.dataGrid as SortableDataGrid<T>| null);
    if (!dataGrid) {
      return;
    }
    (this.children as SortableDataGridNode<T>[]).sort(dataGrid.sortingFunction);
    for (let i = 0; i < this.children.length; ++i) {
      const child = (this.children[i] as SortableDataGridNode<T>);
      child.recalculateSiblings(i);
    }
    for (let i = 0; i < this.children.length; ++i) {
      const child = (this.children[i] as SortableDataGridNode<T>);
      child.sortChildren();
    }
  }
}
