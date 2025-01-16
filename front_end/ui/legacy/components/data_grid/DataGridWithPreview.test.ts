// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  raf,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../../../testing/ExpectStubCall.js';
import {
  selectNodeByKey,
} from '../../../../testing/StorageItemsViewHelpers.js';
import * as UI from '../../legacy.js';

import * as DataGrid from './data_grid.js';

describeWithEnvironment('DataGridWithPreview', () => {
  let dataGridWithPreview: DataGrid.DataGridWithPreview.DataGridWithPreview;

  const COLUMNS = [
    {id: 'key', title: 'Key', sortable: true},
    {id: 'value', title: 'Value', sortable: true},
  ] as DataGrid.DataGrid.ColumnDescriptor[];

  const MOCK_ITEMS = [
    ['foo', 'value1'],
    ['bar', 'value2'],
  ];

  const createPreviewFunc = sinon.stub<[string, string]>();

  const expectCreatePreviewCalled = async (expectedKey: string, expectedValue: string) => {
    createPreviewFunc.resetHistory();
    await expectCalled(createPreviewFunc, {
      fakeFn: async (key: string, value: string) => {
        assert.strictEqual(key, expectedKey);
        assert.strictEqual(value, expectedValue);
        return new UI.EmptyWidget.EmptyWidget(`${key}:${value}`, '');
      },
    });
  };

  beforeEach(() => {
    const container = new UI.Widget.VBox();
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    container.markAsRoot();
    container.show(div);

    dataGridWithPreview = new DataGrid.DataGridWithPreview.DataGridWithPreview(
        '', container.element, COLUMNS, {
          refreshItems: () => {},
          edit: {
            removeItem: () => {},
            setItem: () => {},
          },
          createPreview: createPreviewFunc,
          setCanDeleteSelected: () => {},
        },
        {
          title: 'Items',
          itemDeleted: 'Item deleted',
          itemsCleared: 'Items cleared',
        });

    dataGridWithPreview.showItems(MOCK_ITEMS);
  });

  afterEach(() => {
    dataGridWithPreview.detach();
  });

  it('updates preview when key selected', async () => {
    const [key, value] = MOCK_ITEMS[0];

    const createPreviewPromise = expectCreatePreviewCalled(key, value);

    // Select the first item by key.
    const node = selectNodeByKey(dataGridWithPreview.dataGridForTesting, key);
    assert.isNotNull(node);

    // Check createPreview function was called.
    await createPreviewPromise;

    // Check preview was updated.
    await raf();
    assert.strictEqual(dataGridWithPreview.previewPanelForTesting.element.innerText, `${key}:${value}`);
  });

  it('shows empty preview when no row is selected', async () => {
    // Select the first item by key.
    const node = selectNodeByKey(dataGridWithPreview.dataGridForTesting, MOCK_ITEMS[0][0]);
    assert.isNotNull(node);

    await raf();

    // Deselect node.
    node.deselect();

    await raf();

    // Check preview was updated.
    assert.strictEqual(
        dataGridWithPreview.previewPanelForTesting.element.innerText, 'No value selected\nSelect a value to preview');
  });

  it('preview changed when value changes', async () => {
    const [key, value] = MOCK_ITEMS[0];

    let createPreviewPromise = expectCreatePreviewCalled(key, value);

    // Select the first item.
    const node = selectNodeByKey(dataGridWithPreview.dataGridForTesting, key);
    assert.isNotNull(node);

    // Check createPreview function was called.
    await createPreviewPromise;

    // Update the item data (in reality, this would happen since a user edit
    // would trigger the refreshItems callback - which would fetch new data and
    // call showItems again).
    const updatedItems = structuredClone(MOCK_ITEMS);
    updatedItems[0][1] = 'newValue';

    createPreviewPromise = expectCreatePreviewCalled(key, 'newValue');
    dataGridWithPreview.showItems(updatedItems);

    // Check createPreview function was called.
    await createPreviewPromise;

    // Check preview was updated.
    await raf();
    assert.strictEqual(dataGridWithPreview.previewPanelForTesting.element.innerText, `${key}:newValue`);
  });
});
