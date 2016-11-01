// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.SortableDataGrid = class extends WebInspector.ViewportDataGrid {
  /**
   * @param {!Array<!WebInspector.DataGrid.ColumnDescriptor>} columnsArray
   * @param {function(!WebInspector.DataGridNode, string, string, string)=} editCallback
   * @param {function(!WebInspector.DataGridNode)=} deleteCallback
   * @param {function()=} refreshCallback
   */
  constructor(columnsArray, editCallback, deleteCallback, refreshCallback) {
    super(columnsArray, editCallback, deleteCallback, refreshCallback);
    /** @type {!WebInspector.SortableDataGrid.NodeComparator} */
    this._sortingFunction = WebInspector.SortableDataGrid.TrivialComparator;
    this.setRootNode(new WebInspector.SortableDataGridNode());
  }

  /**
   * @param {!WebInspector.DataGridNode} a
   * @param {!WebInspector.DataGridNode} b
   * @return {number}
   */
  static TrivialComparator(a, b) {
    return 0;
  }

  /**
   * @param {string} columnId
   * @param {!WebInspector.DataGridNode} a
   * @param {!WebInspector.DataGridNode} b
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
   * @param {!WebInspector.DataGridNode} a
   * @param {!WebInspector.DataGridNode} b
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
   * @param {!WebInspector.SortableDataGrid.NodeComparator} comparator
   * @param {boolean} reverseMode
   * @param {!WebInspector.DataGridNode} a
   * @param {!WebInspector.DataGridNode} b
   * @return {number}
   */
  static Comparator(comparator, reverseMode, a, b) {
    return reverseMode ? comparator(b, a) : comparator(a, b);
  }

  /**
   * @param {!Array.<string>} columnNames
   * @param {!Array.<string>} values
   * @return {?WebInspector.SortableDataGrid}
   */
  static create(columnNames, values) {
    var numColumns = columnNames.length;
    if (!numColumns)
      return null;

    var columns = /** @type {!Array<!WebInspector.DataGrid.ColumnDescriptor>} */ ([]);
    for (var i = 0; i < columnNames.length; ++i)
      columns.push({id: String(i), title: columnNames[i], width: columnNames[i].length, sortable: true});

    var nodes = [];
    for (var i = 0; i < values.length / numColumns; ++i) {
      var data = {};
      for (var j = 0; j < columnNames.length; ++j)
        data[j] = values[numColumns * i + j];

      var node = new WebInspector.SortableDataGridNode(data);
      node.selectable = false;
      nodes.push(node);
    }

    var dataGrid = new WebInspector.SortableDataGrid(columns);
    var length = nodes.length;
    var rootNode = dataGrid.rootNode();
    for (var i = 0; i < length; ++i)
      rootNode.appendChild(nodes[i]);

    dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, sortDataGrid);

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

      var comparator = columnIsNumeric ? WebInspector.SortableDataGrid.NumericComparator :
                                         WebInspector.SortableDataGrid.StringComparator;
      dataGrid.sortNodes(comparator.bind(null, sortColumnId), !dataGrid.isSortOrderAscending());
    }
    return dataGrid;
  }

  /**
   * @param {!WebInspector.DataGridNode} node
   */
  insertChild(node) {
    var root = /** @type {!WebInspector.SortableDataGridNode} */ (this.rootNode());
    root.insertChildOrdered(node);
  }

  /**
   * @param {!WebInspector.SortableDataGrid.NodeComparator} comparator
   * @param {boolean} reverseMode
   */
  sortNodes(comparator, reverseMode) {
    this._sortingFunction = WebInspector.SortableDataGrid.Comparator.bind(null, comparator, reverseMode);
    this._rootNode._sortChildren(reverseMode);
    this.scheduleUpdateStructure();
  }
};

/** @typedef {function(!WebInspector.DataGridNode, !WebInspector.DataGridNode):number} */
WebInspector.SortableDataGrid.NodeComparator;


/**
 * @unrestricted
 */
WebInspector.SortableDataGridNode = class extends WebInspector.ViewportDataGridNode {
  /**
   * @param {?Object.<string, *>=} data
   * @param {boolean=} hasChildren
   */
  constructor(data, hasChildren) {
    super(data, hasChildren);
  }

  /**
   * @param {!WebInspector.DataGridNode} node
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
