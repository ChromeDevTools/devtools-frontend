// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import {renderElementIntoDOM, setColorScheme} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as DataGrid from './data_grid.js';

describeWithEnvironment('DataGrid', () => {
  let container!: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  describe('focus indicator', () => {
    afterEach(() => setColorScheme('light'));

    function createGrid() {
      const dataGrid = new DataGrid.DataGrid.DataGridImpl({
        displayName: 'Test',
        columns: [{id: 'key', title: i18n.i18n.lockedString('Key'), sortable: false, editable: true}],
      });
      const token = {token: 'DataGridInternalToken'} as Parameters<typeof dataGrid.setEditCallback>[1];
      dataGrid.setEditCallback(sinon.stub(), token);
      const widget = dataGrid.asWidget();
      widget.markAsRoot();
      widget.show(container);
      dataGrid.element.style.height = '100px';
      dataGrid.setStriped(true);
      const nodes = ['first', 'second', 'third'].map(key => new DataGrid.DataGrid.DataGridNode({key}));
      for (const node of nodes) {
        dataGrid.rootNode().appendChild(node);
      }
      nodes[0].select();
      const outsideInput = document.createElement('input');
      container.appendChild(outsideInput);
      outsideInput.focus();
      return {dataGrid, nodes, outsideInput};
    }

    for (const theme of ['light', 'dark'] as const) {
      it(`outlines the selected row only during keyboard focus in the ${theme} theme`, () => {
        setColorScheme(theme);
        const {dataGrid, nodes, outsideInput} = createGrid();
        const selected = nodes[0].element();
        const blurredBackground = getComputedStyle(selected).backgroundColor;
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'none');

        dataGrid.element.focus();
        assert.isTrue(dataGrid.element.matches(':focus-visible'));
        const style = getComputedStyle(selected);
        assert.strictEqual(style.outlineStyle, 'solid');
        assert.strictEqual(style.outlineWidth, '2px');
        assert.strictEqual(style.outlineOffset, '-2px');
        const outline = Common.Color.parse(style.outlineColor);
        assert.exists(outline);
        for (const node of nodes) {
          const background = Common.Color.parse(getComputedStyle(node.element()).backgroundColor);
          assert.exists(background);
          assert.isAtLeast(
              Common.ColorUtils.contrastRatio(outline.asLegacyColor().rgba(), background.asLegacyColor().rgba()), 3);
        }

        dataGrid.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
        assert.strictEqual(dataGrid.selectedNode, nodes[1]);
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'none');
        assert.strictEqual(getComputedStyle(nodes[1].element()).outlineStyle, 'solid');

        outsideInput.focus();
        assert.strictEqual(dataGrid.selectedNode, nodes[1]);
        assert.strictEqual(getComputedStyle(nodes[1].element()).outlineStyle, 'none');
        assert.strictEqual(getComputedStyle(nodes[1].element()).backgroundColor, blurredBackground);
      });

      it(`preserves cell focus without a row outline in the ${theme} theme`, () => {
        setColorScheme(theme);
        const {dataGrid, nodes} = createGrid();
        dataGrid.element.focus();
        const selected = nodes[0].element();
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'solid');

        const cell = selected.querySelector('td');
        assert.exists(cell);
        cell.focus();
        assert.isTrue(cell.matches(':focus-visible'));
        assert.strictEqual(dataGrid.selectedNode, nodes[0]);
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'none');
        assert.strictEqual(getComputedStyle(cell).outlineStyle, 'solid');
        assert.strictEqual(getComputedStyle(cell).outlineWidth, '2px');

        dataGrid.element.focus();
        assert.strictEqual(getComputedStyle(cell).outlineStyle, 'none');
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'solid');
      });
    }
  });

  it('tests long text in datagrid', () => {
    const columns = [
      {id: 'key', title: 'Key column', editable: true, longText: false, sortable: false},
      {id: 'value', title: 'Value column', editable: true, longText: true, sortable: false},
    ] as DataGrid.DataGrid.ColumnDescriptor[];

    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});

    const token = {token: 'DataGridInternalToken'} as Parameters<typeof dataGrid.setEditCallback>[1];
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

  it('triggers tableContextMenuCallback when context menu is triggered on a row', () => {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] =
        [{id: 'key', title: i18n.i18n.lockedString('Key'), sortable: false}];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
    const node = new DataGrid.DataGrid.DataGridNode({key: 'value'});
    dataGrid.rootNode().appendChild(node);
    container.appendChild(dataGrid.element);

    const tableContextMenuCallback = sinon.stub();
    dataGrid.setTableContextMenuCallback(tableContextMenuCallback);

    const rowElement = node.existingElement();
    assert.exists(rowElement);

    rowElement.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, button: 2}));
    sinon.assert.calledOnce(tableContextMenuCallback);
  });

  it('triggers tableContextMenuCallback when context menu is triggered on the header', () => {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] =
        [{id: 'key', title: i18n.i18n.lockedString('Key'), sortable: false}];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
    container.appendChild(dataGrid.element);

    const tableContextMenuCallback = sinon.stub();
    dataGrid.setTableContextMenuCallback(tableContextMenuCallback);

    const headerElement = dataGrid.element.querySelector('th');
    assert.exists(headerElement);

    headerElement.dispatchEvent(new MouseEvent('contextmenu', {bubbles: true, button: 2}));
    sinon.assert.calledOnce(tableContextMenuCallback);
  });

  it('keeps focus on data grid when removing a selected node with a focused editable cell', () => {
    const columns: DataGrid.DataGrid.ColumnDescriptor[] = [
      {id: 'key', title: i18n.i18n.lockedString('Key'), editable: true, sortable: false},
    ];
    const dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: 'Test',
      columns,
      deleteCallback: (node: DataGrid.DataGrid.DataGridNode<{key: string}>) => {
        node.remove();
      },
    });
    const token = {token: 'DataGridInternalToken'} as Parameters<typeof dataGrid.setEditCallback>[1];
    dataGrid.setEditCallback(sinon.stub(), token);
    container.appendChild(dataGrid.element);

    const node1 = new DataGrid.DataGrid.DataGridNode({key: 'item1'});
    const node2 = new DataGrid.DataGrid.DataGridNode({key: 'item2'});
    dataGrid.rootNode().appendChild(node1);
    dataGrid.rootNode().appendChild(node2);

    node1.select();
    const cell1 = node1.existingElement()?.querySelector('td');
    assert.exists(cell1);
    cell1.focus();
    assert.strictEqual(document.activeElement, cell1);

    node1.remove();
    assert.strictEqual(dataGrid.selectedNode, node2);
    assert.strictEqual(document.activeElement, dataGrid.element);
  });
});

describe('DataGridImpl', () => {
  describe('autoSizeColumns', () => {
    /**
     * Creates a grid without rows that has one column per entry in `widths`,
     * with a title that is `widths[i]` characters long, so that
     * autoSizeColumns() measures exactly `widths`. Returns the column weights
     * after auto-sizing.
     */
    function autoSizedWeights(widths: number[], minPercent: number, maxPercent?: number): Array<number|undefined> {
      const columns: DataGrid.DataGrid.ColumnDescriptor[] = widths.map((width, index) => {
        return {id: `column${index}`, title: i18n.i18n.lockedString('x'.repeat(width)), sortable: false};
      });
      const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
      dataGrid.autoSizeColumns(minPercent, maxPercent);
      return dataGrid.visibleColumnsArray.map(column => column.weight);
    }

    it('caps minPercent at an equal share of three columns', () => {
      assert.deepEqual(autoSizedWeights([198, 2, 400], 90), [33, 33, 34]);
    });

    it('sizes a single wide column to 100 percent', () => {
      assert.deepEqual(autoSizedWeights([1000], 5), [100]);
    });

    it('sizes a single narrow column to 100 percent', () => {
      assert.deepEqual(autoSizedWeights([10], 5), [100]);
    });

    it('splits two columns of equal width evenly', () => {
      assert.deepEqual(autoSizedWeights([1000, 1000], 5), [50, 50]);
    });

    it('splits four columns of equal width evenly', () => {
      assert.deepEqual(autoSizedWeights([30, 30, 30, 30], 5), [25, 25, 25, 25]);
    });

    it('raises a narrow column to minPercent and takes the excess from the wider columns', () => {
      assert.deepEqual(autoSizedWeights([1, 100, 100, 100], 25), [25, 25, 25, 25]);
    });

    it('keeps four columns of equal width at minPercent', () => {
      assert.deepEqual(autoSizedWeights([100, 100, 100, 100], 25), [25, 25, 25, 25]);
    });

    it('raises three narrow columns to minPercent and takes the excess from the widest column', () => {
      assert.deepEqual(autoSizedWeights([1, 1, 1, 100], 25), [25, 25, 25, 25]);
    });

    it('clamps columns to minPercent and maxPercent and takes the excess from the wider columns', () => {
      assert.deepEqual(autoSizedWeights([1, 100, 100], 25, 40), [25, 37, 38]);
    });

    it('adds a rounding deficit to the columns below maxPercent', () => {
      assert.deepEqual(autoSizedWeights([100, 100, 100], 25, 40), [34, 33, 33]);
    });

    it('adds the deficit from a maxPercent clamp to the narrower columns', () => {
      assert.deepEqual(autoSizedWeights([1, 1, 100], 25, 40), [30, 30, 40]);
    });

    // https://bugs.webkit.org/show_bug.cgi?id=101363
    it('caps minPercent at an equal share of 25 columns', () => {
      assert.deepEqual(
          autoSizedWeights(
              [3, 10, 7, 7, 13, 13, 9, 10, 15, 15, 20, 20, 14, 14, 12, 12, 12, 10, 9, 14, 10, 6, 7, 10, 18], 5),
          [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    });
  });
});
