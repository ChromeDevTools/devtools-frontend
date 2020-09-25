// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as DataGrid from '../data_grid/data_grid.js';
import * as UI from '../ui/ui.js';

import {PlayerEvent} from './MediaModel.js';  // eslint-disable-line no-unused-vars

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     sortable: boolean,
 *     weight: (number|undefined),
 *     sortingFunction: (!function(!EventNode, !EventNode):number|undefined),
 * }}
 */
export let EventDisplayColumnConfig;

/** @enum {string} */
export const MediaEventColumnKeys = {
  Timestamp: 'displayTimestamp',
  Event: 'event',
  Value: 'value'
};

/**
 * @unrestricted
 */
export class EventNode extends DataGrid.DataGrid.DataGridNode {
  /**
   * @param {!Event} event
   */
  constructor(event) {
    super(event, false);
    this._expandableElement = null;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!HTMLElement}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
    const cellData = /** @type string */ (this.data[columnId]);
    if (columnId === MediaEventColumnKeys.Value) {
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
}

/**
 * @unrestricted
 */
export class PlayerEventsView extends UI.Widget.VBox {
  constructor() {
    super();

    // Set up element styles.
    this.registerRequiredCSS('media/eventDisplayTable.css');
    this.contentElement.classList.add('event-display-table-contents-table-container');

    this._dataGrid = this._createDataGrid([
      {
        id: MediaEventColumnKeys.Timestamp,
        title: ls`Timestamp`,
        weight: 1,
        sortingFunction:
            DataGrid.SortableDataGrid.SortableDataGrid.NumericComparator.bind(null, MediaEventColumnKeys.Timestamp)
      },
      {id: MediaEventColumnKeys.Event, title: ls`Event name`, weight: 2},
      {id: MediaEventColumnKeys.Value, title: ls`Value`, weight: 7}
    ]);

    this._firstEventTime = 0;
    this._dataGrid.setStriped(true);
    this._dataGrid.asWidget().show(this.contentElement);
  }

  /**
   * @param {!Array.<!EventDisplayColumnConfig>} headers
   * @return !DataGrid.SortableDataGrid
   */
  _createDataGrid(headers) {
    const gridColumnDescs = [];
    for (const headerDesc of headers) {
      gridColumnDescs.push(PlayerEventsView._convertToGridDescriptor(headerDesc));
    }

    // TODO(tmathmeyer) SortableDataGrid doesn't play nice with nested JSON
    // renderers, since they can change size, and this breaks the visible
    // element computation in ViewportDataGrid.
    const datagrid = new DataGrid.DataGrid.DataGridImpl({displayName: ls`Event display`, columns: gridColumnDescs});
    datagrid.asWidget().contentElement.classList.add('no-border-top-datagrid');
    return datagrid;
  }

  /**
   * @param {!PlayerEvent} event
   */
  onEvent(event) {
    if (this._firstEventTime === 0) {
      this._firstEventTime = event.timestamp;
    }

    event = this._subtractFirstEventTime(event);
    const stringified = /** @type {string} */ (event.value);
    try {
      const json = JSON.parse(stringified);
      event.event = json.event;
      delete json['event'];
      event.value = json;
      const node = new EventNode(event);
      const scroll = this._dataGrid.scrollContainer;
      const isAtBottom = scroll.scrollTop === (scroll.scrollHeight - scroll.offsetHeight);
      this._dataGrid.rootNode().appendChild(node);
      if (isAtBottom) {
        scroll.scrollTop = scroll.scrollHeight;
      }
    } catch (e) {
      // If this is a legacy message event, ignore it for now until they
      // are handled.
    }
  }

  /**
   * @param {!PlayerEvent} event
   */
  _subtractFirstEventTime(event) {
    event.displayTimestamp = (event.timestamp - this._firstEventTime).toFixed(3);
    return event;
  }

  /**
   * @param {!EventDisplayColumnConfig} columnConfig
   * @return {!DataGrid.DataGrid.ColumnDescriptor}
   */
  static _convertToGridDescriptor(columnConfig) {
    return /** @type {!DataGrid.DataGrid.ColumnDescriptor} */ ({
      id: columnConfig.id,
      title: columnConfig.title,
      sortable: columnConfig.sortable,
      weight: columnConfig.weight || 0,
      sort: DataGrid.DataGrid.Order.Ascending
    });
  }
}
