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
 *     timestamp: (number|string|undefined),
 *     displayTimestamp: string
 * }}
 */
Media.Event;

/** @enum {string} */
Media.MediaEventColumnKeys = {
  Timestamp: 'displayTimestamp',
  Event: 'event',
  Value: 'value'
};

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
    if (columnId === Media.MediaEventColumnKeys.Value) {
      const area = new SourceFrame.JSONView(new SourceFrame.ParsedJSON(JSON.parse(cellData), '', ''), true);
      area.markAsRoot();
      area.show(cell);
    } else {
      cell.classList.add('event-display-table-basic-text-table-entry');
      cell.createTextChild(cellData);
    }
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
Media.PlayerEventsView = class extends UI.VBox {
  constructor() {
    super();

    // Set up element styles.
    this.registerRequiredCSS('media/eventDisplayTable.css');
    this.contentElement.classList.add('event-display-table-contents-table-container');

    this._dataGrid = this._createDataGrid(
        [
          {
            id: Media.MediaEventColumnKeys.Timestamp,
            title: ls`Timestamp`,
            weight: 1,
            sortable: true,
            sortingFunction:
                DataGrid.SortableDataGrid.NumericComparator.bind(null, Media.MediaEventColumnKeys.Timestamp)
          },
          {id: Media.MediaEventColumnKeys.Event, title: ls`Event Name`, weight: 2, sortable: false},
          {id: Media.MediaEventColumnKeys.Value, title: ls`Value`, weight: 7, sortable: false}
        ],
        Media.MediaEventColumnKeys.Timestamp);

    this._firstEventTime = 0;
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
      gridColumnDescs.push(Media.PlayerEventsView._convertToGridDescriptor(headerDesc));
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
   * @param {string} playerID
   * @param {!Array.<!Media.Event>} changes
   * @param {!Media.MediaModel.MediaChangeTypeKeys} change_type
   */
  renderChanges(playerID, changes, change_type) {
    if (this._firstEventTime === 0 && changes.length > 0) {
      this._firstEventTime = changes[0].timestamp;
    }

    for (const event of changes) {
      this.addEvent(this._subtractFirstEventTime(event));
    }
  }

  /**
   * @param {!Media.Event} event
   */
  addEvent(event) {
    const json = JSON.parse(event.value);
    event.event = json.event;
    delete json['event'];
    event.value = JSON.stringify(json);
    const node = new Media.EventNode(event);
    this._dataGrid.rootNode().insertChildOrdered(node);
  }

  /**
   * @param {!Media.Event} event
   */
  _subtractFirstEventTime(event) {
    event.displayTimestamp = (event.timestamp - this._firstEventTime).toFixed(3);
    return event;
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
