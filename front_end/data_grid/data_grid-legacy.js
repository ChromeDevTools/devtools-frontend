// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as DataGridModule from './data_grid.js';

self.DataGrid = self.DataGrid || {};
DataGrid = DataGrid || {};

DataGrid._preferredWidthSymbol = Symbol('preferredWidth');
DataGrid._columnIdSymbol = Symbol('columnId');
DataGrid._sortIconSymbol = Symbol('sortIcon');
DataGrid._longTextSymbol = Symbol('longText');

/**
 * @unrestricted
 * @constructor
 */
DataGrid.DataGrid = DataGridModule.DataGrid.DataGridImpl;

/**
 * @unrestricted
 * @constructor
 */
DataGrid.CreationDataGridNode = DataGridModule.DataGrid.CreationDataGridNode;

/**
 * @unrestricted
 * @constructor
 */
DataGrid.DataGridNode = DataGridModule.DataGrid.DataGridNode;
DataGrid.DataGridWidget = DataGridModule.DataGrid.DataGridWidget;

/** @enum {symbol} */
DataGrid.DataGrid.Events = DataGridModule.DataGrid.Events;

/** @enum {string} */
DataGrid.DataGrid.Order = DataGridModule.DataGrid.Order;

/** @enum {string} */
DataGrid.DataGrid.Align = DataGridModule.DataGrid.Align;

/** @enum {string} */
DataGrid.DataGrid.ResizeMethod = DataGridModule.DataGrid.ResizeMethod;

/**
 * @typedef {{
  *   displayName: string,
  *   columns: !Array.<!DataGrid.ColumnDescriptor>,
  *   editCallback: (function(!Object, string, string, string)|undefined),
  *   deleteCallback: (function(!Object)|undefined|function(string)),
  *   refreshCallback: (function()|undefined)
  * }}
  */
DataGrid.Parameters = DataGridModule.Parameters;

/**
 * @typedef {{
  *   id: string,
  *   title: (string|undefined),
  *   titleDOMFragment: (?DocumentFragment|undefined),
  *   sortable: boolean,
  *   sort: (?DataGrid.DataGrid.Order|undefined),
  *   align: (?DataGrid.DataGrid.Align|undefined),
  *   fixedWidth: (boolean|undefined),
  *   editable: (boolean|undefined),
  *   nonSelectable: (boolean|undefined),
  *   longText: (boolean|undefined),
  *   disclosure: (boolean|undefined),
  *   weight: (number|undefined),
  *   allowInSortByEvenWhenHidden: (boolean|undefined)
  * }}
  */
DataGrid.ColumnDescriptor = DataGridModule.ColumnDescriptor;

/**
 * @constructor
 */
DataGrid.ShowMoreDataGridNode = DataGridModule.ShowMoreDataGridNode.ShowMoreDataGridNode;

/**
 * @unrestricted
 * @constructor
 */
DataGrid.SortableDataGrid = DataGridModule.SortableDataGrid.SortableDataGrid;

/**
 * @unrestricted
 * @constructor
 * @extends {DataGrid.ViewportDataGridNode<!NODE_TYPE>}
 */
DataGrid.SortableDataGridNode = DataGridModule.SortableDataGrid.SortableDataGridNode;

/**
 * @unrestricted
 * @extends {DataGrid.DataGrid<!NODE_TYPE>}
 * @constructor
 */
DataGrid.ViewportDataGrid = DataGridModule.ViewportDataGrid.ViewportDataGrid;

/**
 * @override @suppress {checkPrototypalTypes} @enum {symbol}
 */
DataGrid.ViewportDataGrid.Events = DataGridModule.ViewportDataGrid.Events;

/**
 * @unrestricted
 * @extends {DataGrid.DataGridNode<!NODE_TYPE>}
 * @constructor
 */
DataGrid.ViewportDataGridNode = DataGridModule.ViewportDataGrid.ViewportDataGridNode;
