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
 *     value: *,
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
Media.EventNode = class extends DataGrid.DataGridNode {
  /**
   * @param {!Media.Event} event
   */
  constructor(event) {
    super(event, false);
    this._expandableElement = null;
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
      const enclosed = cell.createChild('div', 'event-display-table-contents-json-wrapper');
      this._expandableElement = new SourceFrame.JSONView(new SourceFrame.ParsedJSON(cellData, '', ''), true);
      this._expandableElement.markAsRoot();
      this._expandableElement.show(enclosed);
    } else {
      cell.classList.add('event-display-table-basic-text-table-entry');
      cell.createTextChild(cellData);
    }
    return cell;
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

    this._dataGrid = this._createDataGrid([
      {
        id: Media.MediaEventColumnKeys.Timestamp,
        title: ls`Timestamp`,
        weight: 1,
        sortingFunction: DataGrid.SortableDataGrid.NumericComparator.bind(null, Media.MediaEventColumnKeys.Timestamp)
      },
      {id: Media.MediaEventColumnKeys.Event, title: ls`Event Name`, weight: 2},
      {id: Media.MediaEventColumnKeys.Value, title: ls`Value`, weight: 7}
    ]);

    this._firstEventTime = 0;
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.contentElement);
  }

  /**
   * @param {!Array.<!Media.EventDisplayColumnConfig>} headers
   * @return !DataGrid.SortableDataGrid
   */
  _createDataGrid(headers) {
    const gridColumnDescs = [];
    for (const headerDesc of headers) {
      gridColumnDescs.push(Media.PlayerEventsView._convertToGridDescriptor(headerDesc));
    }

    // TODO(tmathmeyer) SortableDataGrid doesn't play nice with nested JSON
    // renderers, since they can change size, and this breaks the visible
    // element computation in ViewportDataGrid.
    const datagrid = new DataGrid.DataGrid({displayName: ls`Event Display`, columns: gridColumnDescs});
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
    if (event.type === 'triggeredEvent') {
      // New-style events have 'triggeredEvent' as their type, where older ones
      // use 'systemEvent'.
      const stringified = /** @type {string} */ (event.value);
      const json = JSON.parse(stringified);
      event.event = json.event;
      delete json['event'];
      event.value = json;
      const node = new Media.EventNode(event);
      this._dataGrid.rootNode().appendChild(node);
    }

    if (event.type === 'systemEvent') {
      // TODO(tmathmeyer) delete this block when
      // https://chromium-review.googlesource.com/c/chromium/src/+/2006249
      // is merged.
      event.event = event.name;
      const node = new Media.EventNode(event);
      this._dataGrid.rootNode().appendChild(node);
    }
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
