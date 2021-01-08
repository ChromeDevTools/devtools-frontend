// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();

const component = new Components.DataGrid.DataGrid();

component.data = {
  columns: [
    {id: 'key', title: 'Key', widthWeighting: 1, visible: true, hideable: false},
    {id: 'value', title: 'Value', widthWeighting: 1, visible: true, hideable: false},
    {id: 'number', title: 'Number', widthWeighting: 1, visible: true, hideable: false},
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
