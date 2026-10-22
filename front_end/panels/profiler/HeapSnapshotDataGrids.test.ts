// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as Profiler from './profiler.js';

describe('HeapSnapshotViewportDataGrid', () => {
  setupLocaleHooks();

  function createDataGrid(): Profiler.HeapSnapshotDataGrids.HeapSnapshotConstructorsDataGrid {
    const dataDisplayDelegate: Profiler.ProfileHeader.DataDisplayDelegate = {
      showProfile: () => null,
      showObject: () => {},
      linkifyObject: () => Promise.resolve(null),
    };

    const dataGrid = new Profiler.HeapSnapshotDataGrids.HeapSnapshotConstructorsDataGrid(null, dataDisplayDelegate);
    const widget = dataGrid.asWidget();
    renderElementIntoDOM(widget);
    dataGrid.element.style.width = '100%';
    dataGrid.element.style.height = '150px';
    widget.element.style.width = '100%';
    widget.element.style.height = '100%';
    return dataGrid;
  }

  it('attaches node to grid in revealTreeNode when within viewport', async () => {
    const dataGrid = createDataGrid();
    const rootNode = dataGrid.rootNode();
    const node1 = new Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode(dataGrid, true);
    node1.populated = true;
    const node2 = new Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode(dataGrid, false);

    dataGrid.appendNode(rootNode, node1);
    node1.expand();
    dataGrid.appendNode(node1, node2);

    assert.isNull(node2.dataGrid);

    const resultNode = await dataGrid.revealTreeNode([node1, node2]);

    assert.strictEqual(resultNode, node2);
    assert.strictEqual(resultNode.dataGrid, dataGrid);
  });

  it('attaches node to grid in revealTreeNode when scrolling is required', async () => {
    const dataGrid = createDataGrid();
    const rootNode = dataGrid.rootNode();
    const node1 = new Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode(dataGrid, true);
    node1.populated = true;

    dataGrid.appendNode(rootNode, node1);
    node1.expand();

    const children: Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode[] = [];
    for (let i = 0; i < 50; i++) {
      const child = new Profiler.HeapSnapshotGridNodes.HeapSnapshotGridNode(dataGrid, false);
      dataGrid.appendNode(node1, child);
      children.push(child);
    }

    const targetNode = children[49];
    assert.isNull(targetNode.dataGrid);

    const resultNode = await dataGrid.revealTreeNode([node1, targetNode]);

    assert.strictEqual(resultNode, targetNode);
    assert.strictEqual(resultNode.dataGrid, dataGrid);
  });
});
