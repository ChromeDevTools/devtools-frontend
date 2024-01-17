// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as DataGrid from '../../data_grid/data_grid.js';
import * as ComponentHelpers from '../../helpers/helpers.js';

await ComponentHelpers.ComponentServerSetup.setup();

const component = new DataGrid.DataGridController.DataGridController();
const k = Platform.StringUtilities.kebab;

const filterParser = new TextUtils.TextUtils.FilterParser(['key', 'value']);

component.data = {
  columns: [
    {id: k('key'), title: 'Method', sortable: true, widthWeighting: 1, visible: true, hideable: false},
    {id: k('value'), title: 'Value', sortable: false, widthWeighting: 1, visible: true, hideable: false},
  ],
  rows: [
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.showOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
    {
      cells: [
        {columnId: 'key', value: 'Overlay.hideOverlay', title: 'Bravo'},
        {columnId: 'value', value: 'foobar', title: 'foobar'},
      ],
    },
  ],
};

document.getElementById('container')?.appendChild(component);

const filterTextInput = document.querySelector('input');
filterTextInput?.addEventListener('input', event => {
  const newText = (event.target as HTMLInputElement).value;
  const filters = filterParser.parse(newText);
  component.data = {
    ...component.data,
    filters: filters,
  };
});
