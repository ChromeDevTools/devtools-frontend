// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {ColumnDescriptor, Events, Parameters} from './DataGrid.js';  // eslint-disable-line no-unused-vars
import {ViewportDataGrid, ViewportDataGridNode} from './ViewportDataGrid.js';

/**
 * @unrestricted
 * @extends {ViewportDataGrid<!NODE_TYPE>}
 * @template NODE_TYPE
 */
export class SortableDataGrid extends ViewportDataGrid {
  /**
   * @param {!Parameters} dataGridParameters
   */
  constructor(dataGridParameters) {
    super(dataGridParameters);
    /** @type {function(!NODE_TYPE, !NODE_TYPE):number} */
    this._sortingFunction = SortableDataGrid.TrivialComparator;
    this.setRootNode(/** @type {!SortableDataGridNode<!NODE_TYPE>} */ (new SortableDataGridNode()));
  }

  /**
   * @param {!SortableDataGridNode} a
   * @param {!DataGrid.SortableDataGridNode} b
   * @return {number}
   */
  static TrivialComparator(a, b) {
    return 0;
  }

  /**
   * @param {string} columnId
   * @param {!SortableDataGridNode} a
   * @param {!DataGrid.SortableDataGridNode} b
   * @return {number}
   */
  static NumericComparator(columnId, a, b) {
    const aValue = a.data[columnId];
    const bValue = b.data[columnId];
    const aNumber = Number(aValue instanceof Node ? aValue.textContent : aValue);
    const bNumber = Number(bValue instanceof Node ? bValue.textContent : bValue);
    return aNumber < bNumber ? -1 : (aNumber > bNumber ? 1 : 0);
  }

  /**
   * @param {string} columnId
   * @param {!SortableDataGridNode} a
   * @param {!DataGrid.SortableDataGridNode} b
   * @return {number}
   */
  static StringComparator(columnId, a, b) {
    const aValue = a.data[columnId];
    const bValue = b.data[columnId];
    const aString = aValue instanceof Node ? aValue.textContent : String(aValue);
    const bString = bValue instanceof Node ? bValue.textContent : String(bValue);
    return aString < bString ? -1 : (aString > bString ? 1 : 0);
  }

  /**
   * @param {function(!NODE_TYPE, !NODE_TYPE):number} comparator
   * @param {boolean} reverseMode
   * @param {!NODE_TYPE} a
   * @param {!NODE_TYPE} b
   * @return {number}
   * @template NODE_TYPE
   */
  static Comparator(comparator, reverseMode, a, b) {
    return reverseMode ? comparator(b, a) : comparator(a, b);
  }

  /**
   * @param {!Array.<string>} columnNames
   * @param {!Array.<string>} values
   * @param {string} displayName
   * @return {?SortableDataGrid<!SortableDataGridNode>}
   */
  static create(columnNames, values, displayName) {
    const numColumns = columnNames.length;
    if (!numColumns) {
      return null;
    }

    const columns = /** @type {!Array<!ColumnDescriptor>} */ ([]);
    for (let i = 0; i < columnNames.length; ++i) {
      columns.push({id: String(i), title: columnNames[i], width: columnNames[i].length, sortable: true});
    }

    const nodes = [];
    for (let i = 0; i < values.length / numColumns; ++i) {
      const data = {};
      for (let j = 0; j < columnNames.length; ++j) {
        data[j] = values[numColumns * i + j];
      }

      const node = new SortableDataGridNode(data);
      node.selectable = false;
      nodes.push(node);
    }

    const dataGrid = new SortableDataGrid({displayName, columns});
    const length = nodes.length;
    const rootNode = dataGrid.rootNode();
    for (let i = 0; i < length; ++i) {
      rootNode.appendChild(nodes[i]);
    }

    dataGrid.addEventListener(Events.SortingChanged, sortDataGrid);

    function sortDataGrid() {
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

  /**
   * @param {!NODE_TYPE} node
   */
  insertChild(node) {
    const root = /** @type {!SortableDataGridNode<!NODE_TYPE>} */ (this.rootNode());
    root.insertChildOrdered(node);
  }

  /**
   * @param {function(!NODE_TYPE, !NODE_TYPE):number} comparator
   * @param {boolean} reverseMode
   */
  sortNodes(comparator, reverseMode) {
    this._sortingFunction = SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
    this.rootNode().recalculateSiblings(0);
    this.rootNode()._sortChildren(reverseMode);
    this.scheduleUpdateStructure();
  }
}

/**
 * @unrestricted
 * @extends {ViewportDataGridNode<!NODE_TYPE>}
 * @template NODE_TYPE
 */
export class SortableDataGridNode extends ViewportDataGridNode {
  /**
   * @param {?Object.<string, *>=} data
   * @param {boolean=} hasChildren
   */
  constructor(data, hasChildren) {
    super(data, hasChildren);
  }

  /**
   * @param {!NODE_TYPE} node
   */
  insertChildOrdered(node) {
    this.insertChild(node, this.children.upperBound(node, this.dataGrid._sortingFunction));
  }

  _sortChildren() {
    this.children.sort(this.dataGrid._sortingFunction);
    for (let i = 0; i < this.children.length; ++i) {
      this.children[i].recalculateSiblings(i);
    }
    for (const child of this.children) {
      child._sortChildren();
    }
  }
}
