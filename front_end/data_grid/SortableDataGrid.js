// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import {ColumnDescriptor, Events, Parameters} from './DataGrid.js';  // eslint-disable-line no-unused-vars
import {ViewportDataGrid, ViewportDataGridNode} from './ViewportDataGrid.js';

/**
 * @unrestricted
 * @extends {ViewportDataGrid<!SortableDataGridNode<NODE_TYPE>>}
 * @template NODE_TYPE
 */
export class SortableDataGrid extends ViewportDataGrid {
  /**
   * @param {!Parameters} dataGridParameters
   */
  constructor(dataGridParameters) {
    super(dataGridParameters);
    this._sortingFunction = SortableDataGrid.TrivialComparator;
    this.setRootNode(/** @type {!SortableDataGridNode<!NODE_TYPE>} */ (new SortableDataGridNode()));
  }

  /**
   * @param {!SortableDataGridNode<!NODE_TYPE>} a
   * @param {!SortableDataGridNode<!NODE_TYPE>} b
   * @return {number}
   * @template NODE_TYPE
   */
  static TrivialComparator(a, b) {
    return 0;
  }

  /**
   * @param {string} columnId
   * @param {!SortableDataGridNode<!NODE_TYPE>} a
   * @param {!SortableDataGridNode<!NODE_TYPE>} b
   * @return {number}
   * @template NODE_TYPE
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
   * @param {!SortableDataGridNode<!NODE_TYPE>} a
   * @param {!SortableDataGridNode<!NODE_TYPE>} b
   * @return {number}
   * @template NODE_TYPE
   */
  static StringComparator(columnId, a, b) {
    const aValue = a.data[columnId];
    const bValue = b.data[columnId];
    const aString = aValue instanceof Node ? aValue.textContent : String(aValue);
    const bString = bValue instanceof Node ? bValue.textContent : String(bValue);
    if (!aString || !bString) {
      return 0;
    }
    return aString < bString ? -1 : (aString > bString ? 1 : 0);
  }

  /**
   * @param {function(!SortableDataGridNode<!NODE_TYPE>, !SortableDataGridNode<!NODE_TYPE>):number} comparator
   * @param {boolean} reverseMode
   * @param {!SortableDataGridNode<!NODE_TYPE>} a
   * @param {!SortableDataGridNode<!NODE_TYPE>} b
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
   * @return {?SortableDataGrid<!SortableDataGridNode<!NODE_TYPE>>}
   * @template NODE_TYPE
   */
  static create(columnNames, values, displayName) {
    const numColumns = columnNames.length;
    if (!numColumns) {
      return null;
    }

    const columns = /** @type {!Array<!ColumnDescriptor>} */ ([]);
    for (let i = 0; i < columnNames.length; ++i) {
      const id = String(i);
      columns.push(/** @type {!ColumnDescriptor} */ ({id, title: columnNames[i], sortable: true}));
    }

    const nodes = [];
    for (let i = 0; i < values.length / numColumns; ++i) {
      /** @type {!Object<number, string>} */
      const data = {};
      for (let j = 0; j < columnNames.length; ++j) {
        data[j] = values[numColumns * i + j];
      }

      const node = new SortableDataGridNode(data);
      node.selectable = false;
      nodes.push(node);
    }

    const dataGrid = new SortableDataGrid(/** @type {!Parameters} */ ({displayName, columns}));
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
   * @param {!SortableDataGridNode<!NODE_TYPE>} node
   */
  insertChild(node) {
    const root = /** @type {!SortableDataGridNode<!NODE_TYPE>} */ (this.rootNode());
    root.insertChildOrdered(node);
  }

  /**
   * @param {function(!SortableDataGridNode<!NODE_TYPE>, !SortableDataGridNode<!NODE_TYPE>):number} comparator
   * @param {boolean} reverseMode
   */
  sortNodes(comparator, reverseMode) {
    this._sortingFunction = SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
    this.rootNode().recalculateSiblings(0);
    this.rootNode()._sortChildren();
    this.scheduleUpdateStructure();
  }
}

/**
 * @unrestricted
 * @extends {ViewportDataGridNode<SortableDataGridNode<NODE_TYPE>>}
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
   * @param {!SortableDataGridNode<!NODE_TYPE>} node
   */
  insertChildOrdered(node) {
    const dataGrid = /** @type {?SortableDataGrid<!NODE_TYPE>} */ (this.dataGrid);
    if (dataGrid) {
      this.insertChild(node, this.children.upperBound(node, dataGrid._sortingFunction));
    }
  }

  _sortChildren() {
    const dataGrid = /** @type {?SortableDataGrid<!NODE_TYPE>} */ (this.dataGrid);
    if (!dataGrid) {
      return;
    }
    this.children.sort(dataGrid._sortingFunction);
    for (let i = 0; i < this.children.length; ++i) {
      const child = /** @type {!SortableDataGridNode<!NODE_TYPE>} */ (this.children[i]);
      child.recalculateSiblings(i);
    }
    for (let i = 0; i < this.children.length; ++i) {
      const child = /** @type {!SortableDataGridNode<!NODE_TYPE>} */ (this.children[i]);
      child._sortChildren();
    }
  }
}
