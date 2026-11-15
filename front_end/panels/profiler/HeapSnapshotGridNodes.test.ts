// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {describe, it} from 'mocha';
import sinon from 'sinon';

import * as HeapSnapshotModel from '../../models/heap_snapshot/heap_snapshot.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';

import * as Profiler from './profiler.js';

const {DEFAULT_VIEW} = Profiler.HeapSnapshotGridNodes;

function createSnapshot(totalSize: number):
    sinon.SinonStubbedInstance<HeapSnapshotModel.HeapSnapshotProxy.HeapSnapshotProxy> {
  const snapshot = sinon.createStubInstance(HeapSnapshotModel.HeapSnapshotProxy.HeapSnapshotProxy);
  snapshot.staticData = new HeapSnapshotModel.HeapSnapshotModel.StaticData(10, 0, totalSize, 100);
  return snapshot;
}

function createDataDisplayDelegate(): Profiler.ProfileHeader.DataDisplayDelegate {
  return {showProfile: () => null, showObject: () => {}, linkifyObject: () => Promise.resolve(null)};
}

describe('HeapSnapshotGridNodes', () => {
  setupLocaleHooks();

  describe('view', () => {
    function renderSingleCell(cell: Profiler.HeapSnapshotGridNodes.CellViewInput): HTMLTableCellElement {
      const table = document.createElement('table');
      const row = table.createTBody().insertRow();
      renderElementIntoDOM(table);
      DEFAULT_VIEW({cells: [cell]}, undefined, row);
      return row.cells[0];
    }

    it('renders a value cell with a percentage', () => {
      const target = renderSingleCell(
          {type: 'value', value: '1.5 kB', percent: '25 %', tooltip: '1,536 B', accessibleName: '1.5 kB, 25 %'});

      assert.deepEqual([...target.classList], ['numeric-column']);
      assert.strictEqual(target.getAttribute('aria-label'), '1.5 kB, 25 %');
      assert.isTrue(target.hasAttribute('jslog'));
      const container = target.querySelector<HTMLElement>('.profile-multiple-values');
      assert.exists(container);
      assert.strictEqual(container.getAttribute('aria-hidden'), 'true');
      const [value, percent] = container.querySelectorAll('span');
      assert.strictEqual(value.textContent, '1.5 kB');
      assert.strictEqual(value.title, '1,536 B');
      assert.strictEqual(percent.textContent, '25 %');
      assert.isTrue(percent.classList.contains('percent-column'));
    });

    it('renders a value cell without a percentage', () => {
      const target = renderSingleCell({type: 'value', value: '7', tooltip: undefined});

      assert.isNull(target.getAttribute('aria-label'));
      assert.isNull(target.querySelector('.profile-multiple-values'));
      const value = target.querySelector<HTMLElement>('div > span');
      assert.exists(value);
      assert.strictEqual(value.textContent, '7');
      assert.isFalse(value.hasAttribute('title'));
    });

    it('leaves the value cell empty if the snapshot has no total size', () => {
      const target = renderSingleCell({type: 'value', value: null});

      assert.deepEqual([...target.classList], ['numeric-column']);
      assert.strictEqual(target.textContent, '');
      assert.strictEqual(target.childElementCount, 0);
    });

    it('renders a text cell with an objects count', () => {
      const target = renderSingleCell({
        type: 'text',
        columnId: 'object',
        text: 'Foo',
        numeric: false,
        disclosure: true,
        indent: 0,
        objectsCount: '3',
      });

      assert.deepEqual([...target.classList], ['object-column', 'disclosure']);
      assert.strictEqual(target.textContent, 'Foo×3');
      assert.strictEqual(target.querySelector('.objects-count')?.textContent, '×3');
    });

    it('renders a numeric text cell', () => {
      const target = renderSingleCell({
        type: 'text',
        columnId: 'countDelta',
        text: '+12',
        numeric: true,
        disclosure: false,
        indent: 0,
        objectsCount: null,
      });

      assert.deepEqual([...target.classList], ['countDelta-column', 'numeric-column']);
      assert.strictEqual(target.textContent, '+12');
      assert.isNull(target.querySelector('.objects-count'));
    });
  });

  describe('HeapSnapshotConstructorNode', () => {
    async function createNode(count: number): Promise<Profiler.HeapSnapshotGridNodes.HeapSnapshotConstructorNode> {
      const dataGrid =
          new Profiler.HeapSnapshotDataGrids.HeapSnapshotConstructorsDataGrid(null, createDataDisplayDelegate());
      const widget = dataGrid.asWidget();
      renderElementIntoDOM(widget);
      dataGrid.element.style.height = '150px';
      widget.element.style.height = '100%';
      dataGrid.snapshot = createSnapshot(2048);
      const node = new Profiler.HeapSnapshotGridNodes.HeapSnapshotConstructorNode(
          dataGrid, 'Foo', {count, distance: 2, self: 512, maxRet: 1024, name: 'Foo', idxs: []},
          new HeapSnapshotModel.HeapSnapshotModel.NodeFilter());
      node.populated = true;
      dataGrid.appendNode(dataGrid.rootNode(), node);
      await dataGrid.revealTreeNode([node]);
      return node;
    }

    it('renders the objects count after the constructor name', async () => {
      const node = await createNode(3);
      const row = node.element() as HTMLTableRowElement;
      const cell = row.cells[0];

      assert.isTrue(cell.classList.contains('object-column'));
      assert.strictEqual(cell.textContent, 'Foo×3');
      assert.strictEqual(cell.querySelector('.objects-count')?.textContent, '×3');
    });

    it('does not render the objects count for a single object', async () => {
      const node = await createNode(1);
      const row = node.element() as HTMLTableRowElement;
      const cell = row.cells[0];

      assert.strictEqual(cell.textContent, 'Foo');
      assert.isNull(cell.querySelector('.objects-count'));
    });

    it('renders the shallow size with its percentage and accessible name', async () => {
      const node = await createNode(3);
      const row = node.element() as HTMLTableRowElement;
      const shallowSizeIndex = node.dataGrid!.visibleColumnsArray.findIndex(col => col.id === 'shallowSize');
      const cell = row.cells[shallowSizeIndex];

      assert.deepEqual([...cell.classList], ['numeric-column']);
      assert.strictEqual(cell.querySelector('.percent-column')?.textContent, '25\xa0%');
      assert.match(cell.getAttribute('aria-label') ?? '', /, 25\xa0%$/);
      assert.strictEqual(node.cellAccessibleTextMap.get('shallowSize'), cell.getAttribute('aria-label'));
      assert.include(node.nodeAccessibleText, 'Constructor: Foo×3');
      assert.include(
          node.nodeAccessibleText,
          `Shallow size: ${cell.getAttribute('aria-label')}`,
      );
    });

    it('renders nested rows with leftPadding indentation and Level prefix in nodeAccessibleText', async () => {
      const parentNode = await createNode(2);
      const dataGrid = parentNode.dataGrid as Profiler.HeapSnapshotDataGrids.HeapSnapshotConstructorsDataGrid;
      parentNode.setHasChildren(true);
      parentNode.expand();
      const childNode = new Profiler.HeapSnapshotGridNodes.HeapSnapshotConstructorNode(
          dataGrid, 'Bar', {count: 1, distance: 3, self: 256, maxRet: 512, name: 'Bar', idxs: []},
          new HeapSnapshotModel.HeapSnapshotModel.NodeFilter());
      childNode.populated = true;
      dataGrid.appendNode(parentNode, childNode);
      await dataGrid.revealTreeNode([parentNode, childNode]);
      const childRow = childNode.element() as HTMLTableRowElement;
      const childCell = childRow.cells[0];

      assert.isAbove(childNode.leftPadding, 0);
      assert.strictEqual(childCell.style.paddingLeft, `${childNode.leftPadding}px`);
      assert.match(childNode.nodeAccessibleText, /^Level 2, Constructor: Bar/);
    });
  });
});
