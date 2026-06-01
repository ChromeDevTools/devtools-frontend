// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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

  it('tests nodes attached to dom', () => {
    const columns = [{id: 'id', width: '250px', sortable: false}] as DataGrid.DataGrid.ColumnDescriptor[];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
    container.appendChild(dataGrid.element);
    dataGrid.element.style.height = '150px';

    const rootNode = dataGrid.rootNode();
    const nodes: Array<DataGrid.DataGrid.DataGridNode<{id: string}>> = [];

    for (let i = 0; i < 15; i++) {
      const node = new DataGrid.DataGrid.DataGridNode({id: 'a' + i});
      rootNode.appendChild(node);
      nodes.push(node);
    }

    function getVisibleNodeIds(): string[] {
      const visibleIds: string[] = [];
      for (const node of nodes) {
        const element = node.existingElement();
        if (element && dataGrid.element.contains(element)) {
          visibleIds.push(node.data.id);
        }
      }
      return visibleIds;
    }

    // Initial check
    // All nodes should be attached.
    let visibleIds = getVisibleNodeIds();
    assert.lengthOf(visibleIds, 15);

    // Testing removal of some nodes
    nodes[0].remove();
    nodes[1].remove();
    nodes[3].remove();
    nodes[5].remove();

    visibleIds = getVisibleNodeIds();
    // Should be missing node 0, 1, 3, 5
    assert.notInclude(visibleIds, 'a0');
    assert.notInclude(visibleIds, 'a1');
    assert.notInclude(visibleIds, 'a3');
    assert.notInclude(visibleIds, 'a5');
    assert.lengthOf(visibleIds, 11);

    // Testing adding of some nodes back
    rootNode.insertChild(nodes[0], 0);
    rootNode.insertChild(nodes[1], 1);
    rootNode.insertChild(nodes[3], 3);
    rootNode.insertChild(nodes[5], 5);

    visibleIds = getVisibleNodeIds();
    // Should have nodes 0, 1, 3, 5 back
    assert.include(visibleIds, 'a0');
    assert.include(visibleIds, 'a1');
    assert.include(visibleIds, 'a3');
    assert.include(visibleIds, 'a5');
    assert.lengthOf(visibleIds, 15);
  });
});
