// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as DataGrid from './data_grid.js';
import type {DataGridInternalToken} from './DataGridElement.js';

describeWithEnvironment('DataGrid', () => {
  let container!: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  it('tests long text in datagrid', () => {
    const columns = [
      {id: 'key', title: 'Key column', editable: true, longText: false, sortable: false},
      {id: 'value', title: 'Value column', editable: true, longText: true, sortable: false}
    ] as DataGrid.DataGrid.ColumnDescriptor[];

    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});

    const token = {token: 'DataGridInternalToken'} as DataGridInternalToken;
    const editCallback = sinon.stub();
    dataGrid.setEditCallback(editCallback, token);

    container.appendChild(dataGrid.element);

    const rootNode = dataGrid.rootNode();
    const node = new DataGrid.DataGrid.DataGridNode({key: 'k'.repeat(1500), value: 'v'.repeat(1500)});
    rootNode.appendChild(node);

    const keyElement = dataGrid.element.querySelector('tbody .key-column') as HTMLElement;
    const valueElement = dataGrid.element.querySelector('tbody .value-column') as HTMLElement;

    assert.exists(keyElement);
    assert.exists(valueElement);

    // Original lengths
    // Key column has longText: false, so it should not be trimmed.
    assert.lengthOf(keyElement.textContent!, 1500);
    // Value column has longText: true, so it should be trimmed to 1000.
    assert.lengthOf(valueElement.textContent!, 1000);

    // Test committing a long key
    // Simulate double click to start editing
    keyElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    assert.isTrue(keyElement.classList.contains('being-edited'));
    keyElement.textContent = 'k'.repeat(3000);

    // Blurring the key
    keyElement.blur();
    // Since longText is false, it should be 3000.
    assert.lengthOf(keyElement.textContent!, 3000);

    // Test committing a long value
    valueElement.dispatchEvent(new MouseEvent('dblclick', {bubbles: true}));
    assert.isTrue(valueElement.classList.contains('being-edited'));
    valueElement.textContent = 'v'.repeat(3000);

    // Blurring the value
    valueElement.blur();
    // Since longText is true, it should be trimmed to 1000.
    assert.lengthOf(valueElement.textContent!, 1000);

    sinon.assert.called(editCallback);
  });
});
