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
