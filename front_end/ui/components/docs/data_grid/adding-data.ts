// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as DataGrid from '../../data_grid/data_grid.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();

const component = new DataGrid.DataGrid.DataGrid();

component.data = {
  columns: [
    {id: 'key', title: 'Key', widthWeighting: 1, visible: true, hideable: false},
    {id: 'value', title: 'Value', widthWeighting: 1, visible: true, hideable: false},
  ],
  rows: [{cells: [{columnId: 'key', value: 'foo', title: 'foo'}, {columnId: 'value', value: 'bar', title: 'bar'}]}],
  activeSort: null,
};

document.getElementById('container')?.appendChild(component);

document.querySelector('#add')?.addEventListener('click', (event: Event) => {
  event.preventDefault();

  const key = Math.floor(Math.random() * 10);
  const value = Math.floor(Math.random() * 10);
  const randomDataRow = {
    cells: [
      {columnId: 'key', value: `Key: ${key}`, title: `Key: ${key}`},
      {columnId: 'value', value: `Value: ${value}`, title: `Value: ${value}`},
    ],
  };

  component.data = {
    ...component.data,
    rows: [...component.data.rows, randomDataRow],
  };
});
