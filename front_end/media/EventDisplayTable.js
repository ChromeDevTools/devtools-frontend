// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     sortable: boolean,
 *     weight: (number|undefined),
 *     sortingFunction: (!function(!Media.EventNode, !Media.EventNode):number|undefined),
 * }}
 */
Media.EventDisplayColumnConfig;

/**
 * @typedef {{
 *     name: string,
 *     value: string,
 *     timestamp: (number|string|undefined)
 * }}
 */
Media.Event;

/**
 * @unrestricted
 */
Media.EventNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {!Media.Event} event
   */
  constructor(event) {
    super(event, false);
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
    const cellData = /** @type string */ (this.data[columnId]);
    cell.createTextChild(cellData);
    return cell;
  }

  /**
   * @override
   * @return {number}
   */
  nodeSelfHeight() {
    return 20;
  }
};

/**
 * @unrestricted
 */
Media.EventDisplayTable = class extends UI.VBox {
  /**
   * @param {!Array.<!Media.EventDisplayColumnConfig>} headerDescriptors
   * @param {?string=} uniqueColumn
   * @param {?string=} defaultSortingColumnId
   */
  constructor(headerDescriptors, uniqueColumn, defaultSortingColumnId) {
    super();

    // Set up element styles.
    this.registerRequiredCSS('media/eventDisplayTable.css');
    this.contentElement.classList.add('event-display-table-contents-table-container');

    this._uniqueColumnEntryKey = uniqueColumn;
    this._uniqueColumnMap = new Map();

    this._dataGrid = this._createDataGrid(headerDescriptors, defaultSortingColumnId);
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.contentElement);
  }

  /**
   * @param {!Array.<!Media.EventDisplayColumnConfig>} headers
   * @param {?string|undefined} default_sort
   * @return !DataGrid.SortableDataGrid
   */
  _createDataGrid(headers, default_sort) {
    const gridColumnDescs = [];
    const sortFunctionMap = new Map();
    for (const headerDesc of headers) {
      gridColumnDescs.push(Media.EventDisplayTable._convertToGridDescriptor(headerDesc));
      if (headerDesc.sortable) {
        sortFunctionMap.set(headerDesc.id, headerDesc.sortingFunction);
        if (!default_sort) {
          default_sort = headerDesc.id;
        }
      }
    }

    const datagrid = new DataGrid.SortableDataGrid({displayName: ls`Event Display`, columns: gridColumnDescs});
    if (default_sort) {
      datagrid.sortNodes(sortFunctionMap.get(default_sort), !datagrid.isSortOrderAscending());

      function sortGrid() {
        const comparator = sortFunctionMap.get(datagrid.sortColumnId());
        datagrid.sortNodes(comparator, !datagrid.isSortOrderAscending());
      }

      datagrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, sortGrid);
    }
    datagrid.asWidget().contentElement.classList.add('no-border-top-datagrid');
    return datagrid;
  }

  /**
   * @param {!Array.<!Media.Event>} events
   */
  addEvents(events) {
    for (const event of events) {
      this.addEvent(event);
    }
  }

  /**
   * @param {!Media.Event} event
   */
  addEvent(event) {
    if (this._uniqueColumnEntryKey) {
      const eventValue = event[this._uniqueColumnEntryKey];
      if (this._uniqueColumnMap.has(eventValue)) {
        this._uniqueColumnMap.get(eventValue).data = event;
        return;
      }
    }
    const node = new Media.EventNode(event);
    this._dataGrid.rootNode().insertChildOrdered(node);
    if (this._uniqueColumnEntryKey) {
      this._uniqueColumnMap.set(event[this._uniqueColumnEntryKey], node);
    }
  }

  /**
   * @param {!Media.EventDisplayColumnConfig} columnConfig
   * @return {!DataGrid.ColumnDescriptor}
   */
  static _convertToGridDescriptor(columnConfig) {
    return /** @type {!DataGrid.ColumnDescriptor} */ ({
      id: columnConfig.id,
      title: columnConfig.title,
      sortable: columnConfig.sortable,
      weight: columnConfig.weight || 0,
      sort: DataGrid.DataGrid.Order.Ascending
    });
  }
};
