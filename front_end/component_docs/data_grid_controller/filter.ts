// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as ComponentHelpers from '../../component_helpers/component_helpers.js';
import * as TextUtils from '../../text_utils/text_utils.js';
import * as Components from '../../ui/components/components.js';

ComponentHelpers.ComponentServerSetup.setup().then(() => renderComponent());

const renderComponent = (): void => {
  const component = new Components.DataGridController.DataGridController();

  const filterParser = new TextUtils.TextUtils.FilterParser(['key', 'value']);

  component.data = {
    columns: [
      {id: 'key', title: 'Key', sortable: true, widthWeighting: 1, visible: true, hideable: false},
      {id: 'value', title: 'Value', sortable: false, widthWeighting: 1, visible: true, hideable: false},
    ],
    rows: [
      // Each key is the ID of a column, and the value is the value for that column
      {
        cells:
            [{columnId: 'key', value: 'Bravo', title: 'Bravo'}, {columnId: 'value', value: 'foobar', title: 'foobar'}],
      },
      {
        cells:
            [{columnId: 'key', value: 'Alpha', title: 'Alpha'}, {columnId: 'value', value: 'bazbar', title: 'bazbar'}],
      },
      {
        cells: [
          {columnId: 'key', value: 'Charlie', title: 'Charlie'},
          {columnId: 'value', value: 'bazbar', title: 'bazbar'},
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
};
