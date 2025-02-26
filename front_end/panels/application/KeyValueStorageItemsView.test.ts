// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  raf,
  renderElementIntoDOM,
} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCalled} from '../../testing/ExpectStubCall.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Application from './application.js';

describeWithEnvironment('KeyValueStorageItemsView', () => {
  let keyValueStorageItemsView: Application.KeyValueStorageItemsView.KeyValueStorageItemsView;
  let viewFunction: sinon.SinonStub;

  const MOCK_ITEMS = [
    {key: 'foo', value: 'value1'},
    {key: 'bar', value: 'value2'},
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

  class TestKeyValueStorageItemsView extends Application.KeyValueStorageItemsView.KeyValueStorageItemsView {
    override setItem(_key: string, _value: string): void {
      // Do nothing.
    }
    override removeItem(_key: string): void {
      // Do nothing.
    }
    override createPreview(key: string, value: string): Promise<UI.Widget.Widget|null> {
      return createPreviewFunc(key, value);
    }
  }

  beforeEach(() => {
    const container = new UI.Widget.VBox();
    const div = document.createElement('div');
    renderElementIntoDOM(div);
    container.markAsRoot();
    container.show(div);

    viewFunction = sinon.stub();
    viewFunction.callsFake((_input, output, _target) => {
      output.splitWidget = sinon.createStubInstance(UI.SplitWidget.SplitWidget);
      output.preview = new UI.Widget.VBox();
      output.resizer = sinon.createStubInstance(HTMLElement);
    });
    keyValueStorageItemsView =
        new TestKeyValueStorageItemsView('Items', 'key-value-storage-items-view', true, viewFunction);

    keyValueStorageItemsView.showItems(MOCK_ITEMS);
  });

  afterEach(() => {
    keyValueStorageItemsView.detach();
  });

  it('updates preview when key selected', async () => {
    const {key, value} = MOCK_ITEMS[0];

    const createPreviewPromise = expectCreatePreviewCalled(key, value);

    // Select the first item by key.
    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: {dataset: {key, value}}}));

    // Check createPreview function was called.
    await createPreviewPromise;
    assert.include(viewFunction.lastCall.firstArg.preview.element.innerText, `${key}:${value}`);
  });

  it('shows empty preview when no row is selected', async () => {
    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: {dataset: {key: MOCK_ITEMS[0].key}}}));
    await raf();
    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: null}));
    // Check preview was updated.
    assert.include(
        viewFunction.lastCall.firstArg.preview.element.innerText, 'No value selectedSelect a value to preview');
  });

  it('preview changed when value changes', async () => {
    const {key, value} = MOCK_ITEMS[0];

    let createPreviewPromise = expectCreatePreviewCalled(key, value);

    // Select the first item.
    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: {dataset: {key, value}}}));

    // Check createPreview function was called.
    await createPreviewPromise;

    // Update the item data (in reality, this would happen since a user edit
    // would trigger the refreshItems callback - which would fetch new data and
    // call showItems again).
    const updatedItems = structuredClone(MOCK_ITEMS);
    updatedItems[0].value = 'newValue';

    createPreviewPromise = expectCreatePreviewCalled(key, 'newValue');
    keyValueStorageItemsView.showItems(updatedItems);

    // Check createPreview function was called.
    await createPreviewPromise;

    // Check preview was updated.
    await raf();
    assert.include(viewFunction.lastCall.firstArg.preview.element.innerText, `${key}:newValue`);
  });
});
