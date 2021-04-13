// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as DataGrid from '../../ui/components/data_grid/data_grid.js';

await ComponentHelpers.ComponentServerSetup.setup();

const component = new DataGrid.DataGrid.DataGrid();

component.data = {
  columns: [
    {id: 'key', title: 'Key', widthWeighting: 1, visible: true, hideable: false},
    {id: 'value', title: 'Value', widthWeighting: 1, visible: true, hideable: false},
  ],
  rows: [],
  activeSort: null,
};

document.getElementById('container')?.appendChild(component);
