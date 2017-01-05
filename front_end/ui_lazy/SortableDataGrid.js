// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 * @extends {UI.ViewportDataGrid<!NODE_TYPE>}
 * @template NODE_TYPE
 */
UI.SortableDataGrid = class extends UI.ViewportDataGrid {
  /**
   * @param {!Array<!UI.DataGrid.ColumnDescriptor>} columnsArray
   * @param {function(!NODE_TYPE, string, string, string)=} editCallback
   * @param {function(!NODE_TYPE)=} deleteCallback
   * @param {function()=} refreshCallback
   */
  constructor(columnsArray, editCallback, deleteCallback, refreshCallback) {
    super(columnsArray, editCallback, deleteCallback, refreshCallback);
    /** @type {function(!NODE_TYPE, !NODE_TYPE):number} */
    this._sortingFunction = UI.SortableDataGrid.TrivialComparator;
    this.setRootNode(/** @type {!UI.SortableDataGridNode<!NODE_TYPE>} */ (new UI.SortableDataGridNode()));
  }

  /**
   * @param {!UI.SortableDataGridNode} a
   * @param {!UI.SortableDataGridNode} b
   * @return {number}
   */
  static TrivialComparator(a, b) {
    return 0;
  }

  /**
   * @param {string} columnId
   * @param {!UI.SortableDataGridNode} a
   * @param {!UI.SortableDataGridNode} b
   * @return {number}
   */
  static NumericComparator(columnId, a, b) {
    var aValue = a.data[columnId];
    var bValue = b.data[columnId];
    var aNumber = Number(aValue instanceof Node ? aValue.textContent : aValue);
    var bNumber = Number(bValue instanceof Node ? bValue.textContent : bValue);
    return aNumber < bNumber ? -1 : (aNumber > bNumber ? 1 : 0);
  }

  /**
   * @param {string} columnId
   * @param {!UI.SortableDataGridNode} a
   * @param {!UI.SortableDataGridNode} b
   * @return {number}
   */
  static StringComparator(columnId, a, b) {
    var aValue = a.data[columnId];
    var bValue = b.data[columnId];
    var aString = aValue instanceof Node ? aValue.textContent : String(aValue);
    var bString = bValue instanceof Node ? bValue.textContent : String(bValue);
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
   * @return {?UI.SortableDataGrid<!UI.SortableDataGridNode>}
   */
  static create(columnNames, values) {
    var numColumns = columnNames.length;
    if (!numColumns)
      return null;

    var columns = /** @type {!Array<!UI.DataGrid.ColumnDescriptor>} */ ([]);
    for (var i = 0; i < columnNames.length; ++i)
      columns.push({id: String(i), title: columnNames[i], width: columnNames[i].length, sortable: true});

    var nodes = [];
    for (var i = 0; i < values.length / numColumns; ++i) {
      var data = {};
      for (var j = 0; j < columnNames.length; ++j)
        data[j] = values[numColumns * i + j];

      var node = new UI.SortableDataGridNode(data);
      node.selectable = false;
      nodes.push(node);
    }

    var dataGrid = new UI.SortableDataGrid(columns);
    var length = nodes.length;
    var rootNode = dataGrid.rootNode();
    for (var i = 0; i < length; ++i)
      rootNode.appendChild(nodes[i]);

    dataGrid.addEventListener(UI.DataGrid.Events.SortingChanged, sortDataGrid);

    function sortDataGrid() {
      var nodes = dataGrid.rootNode().children;
      var sortColumnId = dataGrid.sortColumnId();
      if (!sortColumnId)
        return;

      var columnIsNumeric = true;
      for (var i = 0; i < nodes.length; i++) {
        var value = nodes[i].data[sortColumnId];
        if (isNaN(value instanceof Node ? value.textContent : value)) {
          columnIsNumeric = false;
          break;
        }
      }

      var comparator = columnIsNumeric ? UI.SortableDataGrid.NumericComparator : UI.SortableDataGrid.StringComparator;
      dataGrid.sortNodes(comparator.bind(null, sortColumnId), !dataGrid.isSortOrderAscending());
    }
    return dataGrid;
  }

  /**
   * @param {!NODE_TYPE} node
   */
  insertChild(node) {
    var root = /** @type {!UI.SortableDataGridNode<!NODE_TYPE>} */ (this.rootNode());
    root.insertChildOrdered(node);
  }

  /**
   * @param {function(!NODE_TYPE, !NODE_TYPE):number} comparator
   * @param {boolean} reverseMode
   */
  sortNodes(comparator, reverseMode) {
    this._sortingFunction = UI.SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
    this.rootNode().recalculateSiblings(0);
    this.rootNode()._sortChildren(reverseMode);
    this.scheduleUpdateStructure();
  }
};

/**
 * @unrestricted
 * @extends {UI.ViewportDataGridNode<!NODE_TYPE>}
 * @template NODE_TYPE
 */
UI.SortableDataGridNode = class extends UI.ViewportDataGridNode {
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
    for (var i = 0; i < this.children.length; ++i)
      this.children[i].recalculateSiblings(i);
    for (var child of this.children)
      child._sortChildren();
  }
};
