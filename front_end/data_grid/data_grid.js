// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import './DataGrid.js';
import './ViewportDataGrid.js';
import './SortableDataGrid.js';
import './ShowMoreDataGridNode.js';

import * as DataGrid from './DataGrid.js';
import * as ShowMoreDataGridNode from './ShowMoreDataGridNode.js';
import * as SortableDataGrid from './SortableDataGrid.js';
import * as ViewportDataGrid from './ViewportDataGrid.js';

/**
 * @typedef {{
  *   displayName: string,
  *   columns: !Array.<!ColumnDescriptor>,
  *   editCallback: (function(!Object, string, *, *)|undefined),
  *   deleteCallback: (function(!Object)|undefined|function(string)),
  *   refreshCallback: (function()|undefined)
  * }}
  */
export let Parameters;

/**
  * @typedef {{
  *   id: string,
  *   title: (string|undefined),
  *   titleDOMFragment: (?DocumentFragment|undefined),
  *   sortable: boolean,
  *   sort: (?DataGrid.Order|undefined),
  *   align: (?DataGrid.Align|undefined),
  *   fixedWidth: (boolean|undefined),
  *   editable: (boolean|undefined),
  *   nonSelectable: (boolean|undefined),
  *   longText: (boolean|undefined),
  *   disclosure: (boolean|undefined),
  *   weight: (number|undefined),
  *   allowInSortByEvenWhenHidden: (boolean|undefined),
  *   dataType: (?DataGrid.DataType|undefined)
  * }}
  */
export let ColumnDescriptor;

export {DataGrid, ShowMoreDataGridNode, SortableDataGrid, ViewportDataGrid};
