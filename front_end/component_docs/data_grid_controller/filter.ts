// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import * as Components from '../../ui/components/components.js';

await ComponentHelpers.ComponentServerSetup.setup();

const component = new Components.DataGridController.DataGridController();

const filterParser = new TextUtils.TextUtils.FilterParser(['key', 'value']);

component.data = {
  columns: [
    {id: 'key', title: 'Method', sortable: true, widthWeighting: 1, visible: true, hideable: false},
    {id: 'value', title: 'Value', sortable: false, widthWeighting: 1, visible: true, hideable: false},
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
