// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import {assertScreenshot, renderElementIntoDOM, setColorScheme} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';

import * as DataGrid from './data_grid.js';

describeWithEnvironment('DataGrid', () => {
  let container!: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    renderElementIntoDOM(container);
  });

  describe('selection and focus indicators', () => {
    let widget: DataGrid.DataGrid.DataGridWidget<{key: string, value: string}>;

    afterEach(() => {
      widget?.detach();
      setColorScheme('light');
    });

    function createGrid() {
      const dataGrid = new DataGrid.DataGrid.DataGridImpl<{key: string, value: string}>({
        displayName: 'Test',
        columns: [
          {id: 'key', title: i18n.i18n.lockedString('Key'), sortable: false, editable: true, weight: 1},
          {id: 'value', title: i18n.i18n.lockedString('Value'), sortable: false, editable: true, weight: 1},
        ],
      });
      const token = {token: 'DataGridInternalToken'} as Parameters<typeof dataGrid.setEditCallback>[1];
      dataGrid.setEditCallback(sinon.stub(), token);
      widget = dataGrid.asWidget();
      widget.markAsRoot();
      container.style.width = '360px';
      dataGrid.element.style.height = '100px';
      widget.show(container);
      dataGrid.setStriped(true);
      const nodes =
          ['first', 'second', 'third'].map(key => new DataGrid.DataGrid.DataGridNode({key, value: `${key} value`}));
      for (const node of nodes) {
        dataGrid.rootNode().appendChild(node);
      }
      dataGrid.updateWidths();
      const cells = nodes[0].element().querySelectorAll('td');
      assert.isAbove(cells[0].getBoundingClientRect().width, 0);
      assert.isAbove(cells[1].getBoundingClientRect().width, 0);
      nodes[0].select();
      const outsideInput = document.createElement('input');
      container.appendChild(outsideInput);
      outsideInput.focus();
      return {dataGrid, nodes, outsideInput};
    }

    function assertSelectionIndicator(nodes: ReturnType<typeof createGrid>['nodes'], width: string) {
      const selected = nodes.find(node => node.selected);
      assert.exists(selected);
      const style = getComputedStyle(selected.element());
      assert.strictEqual(style.outlineStyle, 'solid');
      assert.strictEqual(style.outlineWidth, width);
      assert.strictEqual(style.outlineOffset, `-${width}`);
      const outline = Common.Color.parse(style.outlineColor);
      assert.exists(outline);
      for (const node of nodes) {
        const background = Common.Color.parse(getComputedStyle(node.element()).backgroundColor);
        assert.exists(background);
        assert.isAtLeast(
            Common.ColorUtils.contrastRatio(outline.asLegacyColor().rgba(), background.asLegacyColor().rgba()), 3);
        if (node !== selected) {
          assert.strictEqual(getComputedStyle(node.element()).outlineStyle, 'none');
        }
      }
    }

    const screenshots = {
      light: {
        keyboard: 'data_grid/selection-keyboard-light.png',
        blurred: 'data_grid/selection-blurred-light.png',
        'cell-focus': 'data_grid/selection-cell-focus-light.png',
      },
      dark: {
        keyboard: 'data_grid/selection-keyboard-dark.png',
        blurred: 'data_grid/selection-blurred-dark.png',
        'cell-focus': 'data_grid/selection-cell-focus-dark.png',
      },
    };

    for (const theme of ['light', 'dark'] as const) {
      it(`keeps selection distinct from keyboard focus and blur in the ${theme} theme`, () => {
        setColorScheme(theme);
        const {dataGrid, nodes, outsideInput} = createGrid();
        const selected = nodes[0].element();
        const blurredBackground = getComputedStyle(selected).backgroundColor;
        assertSelectionIndicator(nodes, '1px');

        dataGrid.element.focus();
        assert.isTrue(dataGrid.element.matches(':focus-visible'));
        assertSelectionIndicator(nodes, '2px');

        dataGrid.element.dispatchEvent(new KeyboardEvent('keydown', {key: 'ArrowDown', bubbles: true}));
        assert.strictEqual(dataGrid.selectedNode, nodes[1]);
        assert.strictEqual(getComputedStyle(selected).outlineStyle, 'none');
        assertSelectionIndicator(nodes, '2px');

        outsideInput.focus();
        assert.strictEqual(dataGrid.selectedNode, nodes[1]);
        assertSelectionIndicator(nodes, '1px');
        assert.strictEqual(getComputedStyle(nodes[1].element()).backgroundColor, blurredBackground);
      });

      it(`preserves cell focus alongside selection in the ${theme} theme`, () => {
        setColorScheme(theme);
        const {dataGrid, nodes} = createGrid();
        dataGrid.element.focus();
        const selected = nodes[0].element();
        assertSelectionIndicator(nodes, '2px');

        const cell = selected.querySelector('td');
        assert.exists(cell);
        cell.focus();
        assert.isTrue(cell.matches(':focus-visible'));
        assert.strictEqual(dataGrid.selectedNode, nodes[0]);
        assertSelectionIndicator(nodes, '1px');
        assert.strictEqual(getComputedStyle(cell).outlineStyle, 'solid');
        assert.strictEqual(getComputedStyle(cell).outlineWidth, '2px');

        dataGrid.element.focus();
        assert.strictEqual(getComputedStyle(cell).outlineStyle, 'none');
        assertSelectionIndicator(nodes, '2px');
      });

      it(`outlines mouse selection without keyboard focus in the ${theme} theme`, () => {
        setColorScheme(theme);
        const {dataGrid, nodes, outsideInput} = createGrid();
        nodes[1].element().dispatchEvent(new MouseEvent('mousedown', {bubbles: true}));
        assert.strictEqual(dataGrid.selectedNode, nodes[1]);
        assert.isFalse(dataGrid.element.matches(':focus-visible'));
        assertSelectionIndicator(nodes, '1px');

        outsideInput.focus();
        assertSelectionIndicator(nodes, '1px');
        nodes[1].deselect();
        assert.isNull(dataGrid.selectedNode);
        for (const node of nodes) {
          assert.strictEqual(getComputedStyle(node.element()).outlineStyle, 'none');
        }
      });

      for (const state of ['keyboard', 'blurred', 'cell-focus'] as const) {
        it(`renders ${state} selection in the ${theme} theme`, async () => {
          setColorScheme(theme);
          const {dataGrid, nodes, outsideInput} = createGrid();
          dataGrid.element.focus();
          if (state === 'blurred') {
            outsideInput.focus();
          } else if (state === 'cell-focus') {
            const cell = nodes[0].element().querySelector('td');
            assert.exists(cell);
            cell.focus();
          }
          await assertScreenshot(screenshots[theme][state]);
        });
      }
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

  describe('tree operations', () => {
    function dumpDataGrid<T>(
        root: DataGrid.DataGrid.DataGridNode<T>,
        descentIntoCollapsed = false,
        prefix = '',
        ): string[] {
      const lines: string[] = [];
      const suffix = root.selected ? ' <- selected' : '';
      assert.exists(root.dataGrid, 'Node is not attached to a DataGrid');
      const columnKeys = Object.keys(root.dataGrid.columns);
      const outputColumns: unknown[] = [];
      for (const key of columnKeys) {
        if (key in root.data) {
          outputColumns.push(root.data[key]);
        }
      }
      if (outputColumns.length) {
        lines.push(prefix + outputColumns.join(' | ') + suffix);
      }

      if (!descentIntoCollapsed && !root.expanded) {
        return lines;
      }
      for (const child of root.children) {
        lines.push(...dumpDataGrid(child, descentIntoCollapsed, prefix + ' '));
      }
      return lines;
    }

    function validateDataGrid<T>(root: DataGrid.DataGrid.DataGridNode<T>): void {
      const children = root.children;

      for (let i = 0; i < children.length; ++i) {
        const child = children[i];
        assert.strictEqual(child.parent, root);
        assert.strictEqual(child.nextSibling, i + 1 === children.length ? null : children[i + 1]);
        assert.strictEqual(child.previousSibling, i ? children[i - 1] : null);
        if (child.parent && !child.parent.isRoot) {
          assert.strictEqual(child.depth, root.depth + 1);
        }
        validateDataGrid(child);
      }

      const selectedNode = root.dataGrid?.selectedNode;
      if (!root.parent && selectedNode) {
        assert.isTrue(selectedNode.selectable);
        let node: DataGrid.DataGrid.DataGridNode<T>|null = selectedNode;
        while (node && node !== root) {
          node = node.parent;
        }
        assert.strictEqual(node, root);
      }
    }

    function dumpAndValidateDataGrid<T>(root: DataGrid.DataGrid.DataGridNode<T>): string[] {
      const lines = dumpDataGrid(root);
      validateDataGrid(root);
      return lines;
    }

    it('toggles the striped-data-grid class via setStriped', () => {
      const columns: DataGrid.DataGrid.ColumnDescriptor[] = [{id: 'id', sortable: false}];
      const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});

      assert.isFalse(dataGrid.element.classList.contains('striped-data-grid'));
      dataGrid.setStriped(true);
      assert.isTrue(dataGrid.element.classList.contains('striped-data-grid'));
      dataGrid.setStriped(false);
      assert.isFalse(dataGrid.element.classList.contains('striped-data-grid'));
    });

    it('maintains tree hierarchy across node mutations', () => {
      const columns: DataGrid.DataGrid.ColumnDescriptor[] = [{id: 'id', sortable: false}];
      const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
      const a = new DataGrid.DataGrid.DataGridNode({id: 'a'});
      const aa = new DataGrid.DataGrid.DataGridNode({id: 'aa'});
      const aaa = new DataGrid.DataGrid.DataGridNode({id: 'aaa'});
      const aab = new DataGrid.DataGrid.DataGridNode({id: 'aab'});
      const ab = new DataGrid.DataGrid.DataGridNode({id: 'ab'});
      const b = new DataGrid.DataGrid.DataGridNode({id: 'b'});
      const root = dataGrid.rootNode();

      // Append children to a detached node and verify attaching the subtree propagates dataGrid.
      aa.appendChild(aaa);
      aa.appendChild(aab);

      // Attach the tree to the root node.
      root.appendChild(a);
      a.appendChild(aa);
      a.appendChild(ab);
      root.appendChild(b);
      assert.strictEqual(aaa.dataGrid, dataGrid);
      assert.strictEqual(aab.dataGrid, dataGrid);

      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        ' b',
      ]);

      a.expand();
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '  ab',
        ' b',
      ]);

      aa.expand();
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '   aaa',
        '   aab',
        '  ab',
        ' b',
      ]);

      a.collapse();
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        ' b',
      ]);

      a.expand();
      aa.appendChild(aaa);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '   aab',
        '   aaa',
        '  ab',
        ' b',
      ]);

      aa.appendChild(aaa);
      aa.appendChild(aab);
      const aac = new DataGrid.DataGrid.DataGridNode({id: 'aac'});
      aa.appendChild(aac);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '   aaa',
        '   aab',
        '   aac',
        '  ab',
        ' b',
      ]);

      aa.insertChild(aac, 0);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '   aac',
        '   aaa',
        '   aab',
        '  ab',
        ' b',
      ]);

      ab.appendChild(aac);
      ab.expand();
      aac.select();
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '   aaa',
        '   aab',
        '  ab',
        '   aac <- selected',
        ' b',
      ]);

      ab.removeChild(aac);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '   aaa',
        '   aab',
        '  ab',
        ' b <- selected',
      ]);

      ab.appendChild(aac);
      aac.revealAndSelect();
      aa.removeChildren();
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  aa',
        '  ab',
        '   aac <- selected',
        ' b',
      ]);

      ab.appendChild(aac);
      aac.revealAndSelect();
      a.removeChild(aa);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        '  ab',
        '   aac <- selected',
        ' b',
      ]);

      a.removeChild(ab);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' a',
        ' b <- selected',
      ]);

      root.removeChildren();
      assert.deepEqual(dumpAndValidateDataGrid(root), []);
      assert.isNull(dataGrid.selectedNode);
    });

    it('updates rendered columns across dynamic column changes', () => {
      const columns: DataGrid.DataGrid.ColumnDescriptor[] = [{id: 'id', sortable: false}];
      const dataGrid = new DataGrid.DataGrid.DataGridImpl({displayName: 'Test', columns});
      const a = new DataGrid.DataGrid.DataGridNode({id: 'TextData', secondCol: 'a foo'});
      const b = new DataGrid.DataGrid.DataGridNode({id: 'NullData', secondCol: null});
      const root = dataGrid.rootNode();

      root.appendChild(a);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' TextData',
      ]);

      dataGrid.addColumn({id: 'secondCol', sortable: false});
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' TextData | a foo',
      ]);

      root.appendChild(b);
      dataGrid.autoSizeColumns(20, 80);
      // Max column text lengths are 8 ('TextData'/'NullData') and 5 ('a foo'): 8/13 rounds to 62%, 5/13 to 38%.
      assert.strictEqual(dataGrid.columns['id'].weight, 62);
      assert.strictEqual(dataGrid.columns['secondCol'].weight, 38);
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' TextData | a foo',
        ' NullData | ',
      ]);

      dataGrid.removeColumn('secondCol');
      assert.deepEqual(dumpAndValidateDataGrid(root), [
        ' TextData',
        ' NullData',
      ]);
    });
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
