// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as DataGrid from '../../data_grid/data_grid.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();

const component = new DataGrid.DataGrid.DataGrid();
const k = Platform.StringUtilities.kebab;

component.data = {
  columns: [
    {id: k('key'), title: 'Key', widthWeighting: 1, visible: true, hideable: false},
    {id: k('value'), title: 'Value', widthWeighting: 1, visible: true, hideable: false},
    {id: k('number'), title: 'Number', widthWeighting: 1, visible: true, hideable: false},
  ],
  rows: [
    {
      cells: [
        {columnId: 'key', value: 'Bravo', title: 'Bravo'},
        {columnId: 'value', value: 'Letter B'},
        {columnId: 'number', value: '1'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Alpha', title: 'Alpha'},
        {columnId: 'value', value: 'Letter A'},
        {columnId: 'number', value: '2'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Charlie', title: 'Charlie'},
        {columnId: 'value', value: 'Letter C'},
        {columnId: 'number', value: '3'},
      ],
    },
  ],
  activeSort: null,
};

document.getElementById('container')?.appendChild(component);
