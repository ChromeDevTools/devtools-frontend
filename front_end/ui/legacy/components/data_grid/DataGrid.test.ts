// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as LitHtml from '../../../../ui/lit-html/lit-html.js';
import * as UI from '../../legacy.js';

import * as DataGrid from './data_grid.js';

const {render, html} = LitHtml;
const widgetRef = UI.Widget.widgetRef;

describeWithEnvironment('DataGrid', () => {
  it('can be instantiated from template', async () => {
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    let widget!: DataGrid.DataGrid.DataGridWidget<unknown>;

    const dataGridOptions: DataGrid.DataGrid.DataGridWidgetOptions<unknown> = {
      implParams: {
        displayName: 'testGrid',
        columns: [{
          id: 'test',
          sortable: false,
        }],
      },
      nodes: [new DataGrid.DataGrid.DataGridNode({test: 'testNode'})],
      markAsRoot: true,
    };

    // clang-format off
        render(
            html`
        <devtools-data-grid-widget
            .options=${dataGridOptions}
            ${widgetRef(DataGrid.DataGrid.DataGridWidget, e => { widget = e; })}
        ></devtools-data-grid-widget>
        `,
        container, {host: this});
    // clang-format on

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.exists(widget);
    // There is a single test row
    assert.strictEqual(widget.dataGrid.rootNode().children.length, 1);
  });
});
