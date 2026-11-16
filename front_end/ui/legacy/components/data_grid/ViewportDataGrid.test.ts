// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';

import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as RenderCoordinator from '../../../components/render_coordinator/render_coordinator.js';

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

  type TestGridNode = DataGrid.DataGrid.DataGridNode<DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>>;

  function setup300x300ViewportDataGrid() {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] = [{id: 'id', width: '250px', sortable: false}];
    const dataGrid = new DataGrid.ViewportDataGrid.ViewportDataGrid<{id: string}>({
      displayName: 'Test',
      columns,
    });
    const root = dataGrid.rootNode();
    assert.instanceOf(root, DataGrid.ViewportDataGrid.ViewportDataGridNode);
    const widget = dataGrid.asWidget();
    renderElementIntoDOM(widget, {width: 300, height: 300, includeCommonStyles: true});
    dataGrid.element.style.width = '100%';
    dataGrid.element.style.height = '100%';
    widget.element.style.width = '100%';
    widget.element.style.height = '100%';
    return {dataGrid, root};
  }

  function validateDataGrid(root: TestGridNode): void {
    const children = root.children;
    for (let i = 0; i < children.length; ++i) {
      const child = children[i];
      assert.strictEqual(child.parent, root);
      assert.strictEqual(child.nextSibling, i + 1 === children.length ? null : children[i + 1]);
      assert.strictEqual(child.previousSibling, i ? children[i - 1] : null);
      assert.strictEqual(child.depth, root.isRoot ? 0 : root.depth + 1);
      validateDataGrid(child);
    }

    const selectedNode = root.dataGrid?.selectedNode;
    if (!root.parent && selectedNode) {
      assert.isTrue(selectedNode.selectable);
      let node: TestGridNode|null = selectedNode;
      while (node && node !== root) {
        node = node.parent;
      }
      assert.strictEqual(node, root);
    }
  }

  function dumpDataGrid(root: TestGridNode, prefix = ''): string[] {
    const lines: string[] = [];
    const suffix = root.selected ? ' <- selected' : '';
    const columnKeys = root.dataGrid ? root.dataGrid.visibleColumnsArray.map(column => column.id) : [];
    const outputColumns: string[] = [];
    for (const key of columnKeys) {
      if (key in root.data) {
        outputColumns.push(String(root.data[key]));
      }
    }
    if (outputColumns.length) {
      lines.push(prefix + outputColumns.join(' | ') + suffix);
    }
    if (!root.expanded) {
      return lines;
    }
    for (const child of root.children) {
      lines.push(...dumpDataGrid(child, prefix + ' '));
    }
    return lines;
  }

  function dumpAndValidateTree(root: TestGridNode): string[] {
    const lines = dumpDataGrid(root);
    validateDataGrid(root);
    return lines;
  }

  function getFlatChildIds(root: DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>): string[] {
    return root.flatChildren().map(node => String(node.data.id));
  }

  function getRenderedVisibleNodeIds(dataGrid: DataGrid.ViewportDataGrid.ViewportDataGrid<{id: string}>): string[] {
    const rows = dataGrid.dataTableBody.querySelectorAll('tr.data-grid-data-grid-node');
    return Array.from(rows, row => {
      const node = dataGrid.dataGridNodeFromNode(row);
      assert.exists(node);
      return String(node.data.id);
    });
  }

  describe('hierarchy mutations and viewport scrolling', () => {
    it('maintains tree hierarchy across node mutations', async () => {
      const {dataGrid, root} = setup300x300ViewportDataGrid();
      const a = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'a'});
      const aa = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'aa'});
      const aaa = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'aaa'});
      const aab = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'aab'});
      const ab = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'ab'});
      const b = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'b'});

      // Appending to detached node.
      aa.appendChild(aaa);
      aaa.dataGrid = dataGrid;
      aa.appendChild(aab);
      aab.dataGrid = dataGrid;

      // Appending to tree (a is collapsed).
      root.appendChild(a);
      a.appendChild(aa);
      a.expand();
      assert.deepEqual(getFlatChildIds(root), ['a', 'aa']);

      a.appendChild(ab);
      assert.deepEqual(getFlatChildIds(root), ['a', 'aa', 'ab']);

      root.appendChild(b);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '  ab', ' b']);

      a.expand();
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '  ab', ' b']);

      aa.expand();
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '   aaa', '   aab', '  ab', ' b']);

      a.collapse();
      assert.deepEqual(dumpAndValidateTree(root), [' a', ' b']);

      a.expand();
      aa.appendChild(aaa);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '   aab', '   aaa', '  ab', ' b']);

      aa.appendChild(aaa);
      aa.appendChild(aab);
      const aac = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'aac'});
      aa.appendChild(aac);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '   aaa', '   aab', '   aac', '  ab', ' b']);

      aa.insertChild(aac, 0);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '   aac', '   aaa', '   aab', '  ab', ' b']);

      ab.appendChild(aac);
      ab.expand();
      aac.select();
      assert.deepEqual(dumpAndValidateTree(root),
                       [' a', '  aa', '   aaa', '   aab', '  ab', '   aac <- selected', ' b']);

      ab.removeChild(aac);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '   aaa', '   aab', '  ab', ' b <- selected']);

      ab.appendChild(aac);
      aac.revealAndSelect();
      assert.deepEqual(getFlatChildIds(root), ['a', 'aa', 'aaa', 'aab', 'ab', 'aac', 'b']);

      aa.removeChildren();
      assert.deepEqual(getFlatChildIds(root), ['a', 'aa', 'ab', 'aac', 'b']);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  aa', '  ab', '   aac <- selected', ' b']);

      ab.appendChild(aac);
      aac.revealAndSelect();
      assert.deepEqual(getFlatChildIds(root), ['a', 'aa', 'ab', 'aac', 'b']);

      a.removeChild(aa);
      assert.deepEqual(getFlatChildIds(root), ['a', 'ab', 'aac', 'b']);
      assert.deepEqual(dumpAndValidateTree(root), [' a', '  ab', '   aac <- selected', ' b']);

      a.removeChild(ab);
      assert.deepEqual(dumpAndValidateTree(root), [' a', ' b <- selected']);

      root.removeChildren();
      assert.deepEqual(dumpAndValidateTree(root), []);
      await RenderCoordinator.done();
    });

    it('updates visible viewport rows across scrolling modes', async () => {
      const {dataGrid, root} = setup300x300ViewportDataGrid();

      // Auto-scroll to bottom across 500 appended nodes without throwing (crbug.com/542553).
      dataGrid.setEnableAutoScrollToBottom(true);
      let lastNode: DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>|undefined;
      for (let i = 0; i < 500; ++i) {
        const xn = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'x' + i});
        root.appendChild(xn);
        if (i + 1 === 500) {
          dataGrid.updateInstantly();
          xn.revealAndSelect();
          xn.refresh();
          lastNode = xn;
        }
      }
      assert.strictEqual(dataGrid.selectedNode, lastNode);
      root.removeChildren();
      dataGrid.updateInstantly();
      assert.deepEqual(getRenderedVisibleNodeIds(dataGrid), []);

      // With auto-scroll still active from above, populate 40 nodes so the viewport starts at the bottom,
      // then disable auto-scroll and refresh detached nodes before re-attaching them.
      for (let i = 0; i < 40; ++i) {
        const xn = new DataGrid.ViewportDataGrid.ViewportDataGridNode<{id: string}>({id: 'x' + i});
        root.appendChild(xn);
      }
      dataGrid.updateInstantly();
      dataGrid.setEnableAutoScrollToBottom(false);
      const children = root.children.slice();
      root.removeChildren();
      for (let i = 0; i < 40; ++i) {
        children[i].refresh();
        root.appendChild(children[i]);
      }
      dataGrid.updateInstantly();

      dataGrid.setStriped(true);
      // Scrolling to the top.
      root.children[0].revealAndSelect();
      dataGrid.updateInstantly();
      assert.strictEqual(dataGrid.element.classList.value, 'data-grid no-selection striped-data-grid');
      const topVisibleIds = getRenderedVisibleNodeIds(dataGrid);
      assert.deepEqual(topVisibleIds,
                       ['x0', 'x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'x11', 'x12', 'x13']);

      // Scrolling 1 node down.
      root.children[topVisibleIds.length].revealAndSelect();
      dataGrid.updateInstantly();
      assert.strictEqual(dataGrid.element.classList.value, 'data-grid striped-data-grid-starts-with-odd');
      assert.deepEqual(getRenderedVisibleNodeIds(dataGrid),
                       ['x1', 'x2', 'x3', 'x4', 'x5', 'x6', 'x7', 'x8', 'x9', 'x10', 'x11', 'x12', 'x13', 'x14']);

      // Disabling the stripes.
      dataGrid.setStriped(false);
      assert.strictEqual(dataGrid.element.classList.value, 'data-grid');
      await RenderCoordinator.done();
    });
  });
});
