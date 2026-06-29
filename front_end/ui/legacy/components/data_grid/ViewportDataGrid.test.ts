// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as DataGrid from './data_grid.js';

describeWithEnvironment('ViewportDataGrid', () => {
  function setupViewportDataGrid() {
    const columns = [
      {id: 'id', title: 'ID column', width: '250px', sortable: false},
    ] as DataGrid.DataGrid.ColumnDescriptor[];
    const dataGrid = new DataGrid.ViewportDataGrid.ViewportDataGrid({
      displayName: 'Test',
      columns,
    });
    const widget = dataGrid.asWidget();

    renderElementIntoDOM(widget);

    dataGrid.element.style.width = '100%';
    dataGrid.element.style.height = '150px';
    widget.element.style.width = '100%';
    widget.element.style.height = '100%';

    return {dataGrid, widget};
  }
  function getVisibleNodeIds(
      nodes: Array<DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>>,
      dataGrid: DataGrid.ViewportDataGrid.ViewportDataGrid<{id: string}>,
      ): string[] {
    const visibleIds: string[] = [];
    const widget = dataGrid.asWidget();
    for (const node of nodes) {
      const element = node.existingElement();
      if (element && widget.element.contains(element)) {
        visibleIds.push(node.data.id as string);
      }
    }
    return visibleIds;
  }

  it('attaches only visible nodes to DOM', async () => {
    const {dataGrid} = setupViewportDataGrid();

    const rootNode = dataGrid.rootNode();
    const nodes: Array<DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>> = [];

    for (let i = 0; i < 30; i++) {
      const node = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'a' + i});
      rootNode.appendChild(node);
      nodes.push(node);
    }

    dataGrid.updateInstantly();

    const initialVisibleIds = getVisibleNodeIds(nodes, dataGrid);
    assert.isTrue(initialVisibleIds.length < 30, 'Should not render all nodes');
    assert.include(initialVisibleIds, 'a0', 'Should render first node');

    dataGrid.scrollContainer.scrollTop = 133;
    dataGrid.scrollContainer.dispatchEvent(new Event('scroll'));
    dataGrid.updateInstantly();

    const scrolledVisibleIds = getVisibleNodeIds(nodes, dataGrid);
    assert.notDeepEqual(scrolledVisibleIds, initialVisibleIds, 'Visible nodes should change after scroll');

    dataGrid.scrollContainer.scrollTop = 0;
    dataGrid.scrollContainer.dispatchEvent(new Event('scroll'));
    dataGrid.updateInstantly();

    const nodeToRemove = nodes[0];
    nodeToRemove.remove();
    dataGrid.updateInstantly();

    assert.notInclude(getVisibleNodeIds(nodes, dataGrid), 'a0', 'Removed node should not be visible');

    // Test node addition
    const newNode = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'new-node'});
    rootNode.insertChild(newNode, 0);
    nodes.push(newNode);
    dataGrid.updateInstantly();

    assert.include(getVisibleNodeIds(nodes, dataGrid), 'new-node', 'Inserted node should be visible');

    const endNode = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'end-node'});
    rootNode.appendChild(endNode);
    nodes.push(endNode);
    dataGrid.updateInstantly();
    assert.notInclude(getVisibleNodeIds(nodes, dataGrid), 'end-node',
                      'Node added at the end should not be visible initially');

    // Scroll to end to make it visible
    dataGrid.scrollContainer.scrollTop = dataGrid.scrollContainer.scrollHeight;
    dataGrid.scrollContainer.dispatchEvent(new Event('scroll'));
    dataGrid.updateInstantly();
    assert.include(getVisibleNodeIds(nodes, dataGrid), 'end-node',
                   'Node added at the end should be visible after scroll');
  });

  it('handles expandable nodes correctly', async () => {
    const {dataGrid} = setupViewportDataGrid();

    const rootNode = dataGrid.rootNode();
    const nodes: Array<DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>> = [];

    for (let i = 0; i <= 25; i++) {
      const node = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'a' + i});
      rootNode.appendChild(node);
      nodes.push(node);
    }

    const node3 = nodes[3];
    for (let i = 0; i < 3; i++) {
      const child = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'a3.' + i});
      node3.appendChild(child);
      nodes.push(child);
    }

    dataGrid.updateInstantly();

    assert.include(getVisibleNodeIds(nodes, dataGrid), 'a3');
    assert.notInclude(getVisibleNodeIds(nodes, dataGrid), 'a3.0');

    node3.expand();
    dataGrid.updateInstantly();

    assert.include(getVisibleNodeIds(nodes, dataGrid), 'a3.0');
  });
});
