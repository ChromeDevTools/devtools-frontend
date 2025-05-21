// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';

import * as Resources from './application.js';

import View = Resources.ExtensionStorageItemsView;

class ExtensionStorageItemsListener {
  #dispatcher: Common.ObjectWrapper.ObjectWrapper<View.ExtensionStorageItemsDispatcher.EventTypes>;
  #edited = false;
  #refreshed = false;

  constructor(dispatcher: Common.ObjectWrapper.ObjectWrapper<View.ExtensionStorageItemsDispatcher.EventTypes>) {
    this.#dispatcher = dispatcher;
    this.#dispatcher.addEventListener(View.ExtensionStorageItemsDispatcher.Events.ITEM_EDITED, this.#itemsEdited, this);
    this.#dispatcher.addEventListener(
        View.ExtensionStorageItemsDispatcher.Events.ITEMS_REFRESHED, this.#itemsRefreshed, this);
  }

  dispose(): void {
    this.#dispatcher.removeEventListener(
        View.ExtensionStorageItemsDispatcher.Events.ITEM_EDITED, this.#itemsEdited, this);
    this.#dispatcher.removeEventListener(
        View.ExtensionStorageItemsDispatcher.Events.ITEMS_REFRESHED, this.#itemsRefreshed, this);
  }

  #itemsEdited(): void {
    this.#edited = true;
  }

  async waitForItemsEdited(): Promise<void> {
    if (!this.#edited) {
      await this.#dispatcher.once(View.ExtensionStorageItemsDispatcher.Events.ITEM_EDITED);
    }
    this.#edited = true;
  }

  resetRefreshed(): void {
    this.#refreshed = false;
  }

  #itemsRefreshed(): void {
    this.#refreshed = true;
  }

  async waitForItemsRefreshed(): Promise<void> {
    if (!this.#refreshed) {
      await this.#dispatcher.once(View.ExtensionStorageItemsDispatcher.Events.ITEMS_REFRESHED);
    }
    this.#refreshed = true;
  }
}

describeWithMockConnection('ExtensionStorageItemsView', function() {
  let target: SDK.Target.Target;
  let extensionStorageModel: Resources.ExtensionStorageModel.ExtensionStorageModel|null;
  let extensionStorage: Resources.ExtensionStorageModel.ExtensionStorage;

  const TEST_EXTENSION_ID = 'abc';
  const TEST_EXTENSION_NAME = 'Hello World';

  const EXAMPLE_DATA: Record<string, string> = {a: 'foo', b: 'bar'};

  beforeEach(() => {
    target = createTarget();
    extensionStorageModel = target.model(Resources.ExtensionStorageModel.ExtensionStorageModel);
    assert.exists(extensionStorageModel);
    extensionStorage = new Resources.ExtensionStorageModel.ExtensionStorage(
        extensionStorageModel, TEST_EXTENSION_ID, TEST_EXTENSION_NAME, Protocol.Extensions.StorageArea.Local);
  });

  function createView(): {
    view: View.ExtensionStorageItemsView,
    viewFunction: ViewFunctionStub<typeof View.ExtensionStorageItemsView>,
    toolbar: Resources.StorageItemsToolbar.StorageItemsToolbar,
  } {
    const toolbar = new Resources.StorageItemsToolbar.StorageItemsToolbar();
    const viewFunction = createViewFunctionStub(View.ExtensionStorageItemsView, {toolbar});
    const view = new View.ExtensionStorageItemsView(extensionStorage, viewFunction);
    return {view, viewFunction, toolbar};
  }

  it('displays items', async () => {
    assert.exists(extensionStorageModel);
    sinon.stub(extensionStorageModel.agent, 'invoke_getStorageItems')
        .withArgs({id: TEST_EXTENSION_ID, storageArea: Protocol.Extensions.StorageArea.Local})
        .resolves({
          data: EXAMPLE_DATA,
          getError: () => undefined,
        });

    const {view, viewFunction} = createView();

    const itemsListener = new ExtensionStorageItemsListener(view.extensionStorageItemsDispatcher);
    await itemsListener.waitForItemsRefreshed();

    assert.deepEqual(viewFunction.input.items, Object.keys(EXAMPLE_DATA).map(key => ({key, value: EXAMPLE_DATA[key]})));
  });

  it('correctly parses set values as JSON, with string fallback', async () => {
    assert.exists(extensionStorageModel);
    sinon.stub(extensionStorageModel.agent, 'invoke_getStorageItems')
        .withArgs({id: TEST_EXTENSION_ID, storageArea: Protocol.Extensions.StorageArea.Local})
        .resolves({
          data: EXAMPLE_DATA,
          getError: () => undefined,
        });
    const setStorageItems =
        sinon.stub(extensionStorageModel.agent, 'invoke_setStorageItems').resolves({getError: () => undefined});

    const {view, viewFunction} = createView();
    const itemsListener = new ExtensionStorageItemsListener(view.extensionStorageItemsDispatcher);
    await itemsListener.waitForItemsRefreshed();

    const expectedResults = [
      {input: '{foo: "bar"}', parsedValue: {foo: 'bar'}},
      {input: 'value', parsedValue: 'value'},
    ];

    for (const {input, parsedValue} of expectedResults) {
      const key = Object.keys(EXAMPLE_DATA)[0];
      viewFunction.input.onEdit(new CustomEvent('edit', {
        detail: {
          node: {dataset: {key}} as unknown as HTMLElement,
          columnId: 'value',
          valueBeforeEditing: EXAMPLE_DATA[key],
          newText: input
        }
      }));

      await itemsListener.waitForItemsEdited();
      setStorageItems.calledOnceWithExactly(
          {id: TEST_EXTENSION_ID, storageArea: Protocol.Extensions.StorageArea.Local, values: {[key]: parsedValue}});

      setStorageItems.reset();
    }

    await RenderCoordinator.done();
    view.detach();
  });
});
