// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {
  dispatchClickEvent,
  getCleanTextContentFromElements,
  raf,
} from '../../testing/DOMHelpers.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../testing/MockConnection.js';
import * as RenderCoordinator from '../../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as Resources from './application.js';

import View = Resources.SharedStorageItemsView;

class SharedStorageItemsListener {
  #dispatcher: Common.ObjectWrapper.ObjectWrapper<View.SharedStorageItemsDispatcher.EventTypes>;
  #cleared: boolean = false;
  #filteredCleared: boolean = false;
  #refreshed: boolean = false;
  #deletedKeys: String[] = [];
  #numEditedEvents = 0;

  constructor(dispatcher: Common.ObjectWrapper.ObjectWrapper<View.SharedStorageItemsDispatcher.EventTypes>) {
    this.#dispatcher = dispatcher;
    this.#dispatcher.addEventListener(View.SharedStorageItemsDispatcher.Events.ITEMS_CLEARED, this.#itemsCleared, this);
    this.#dispatcher.addEventListener(
        View.SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED, this.#filteredItemsCleared, this);
    this.#dispatcher.addEventListener(
        View.SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED, this.#itemsRefreshed, this);
    this.#dispatcher.addEventListener(View.SharedStorageItemsDispatcher.Events.ITEM_DELETED, this.#itemDeleted, this);
    this.#dispatcher.addEventListener(View.SharedStorageItemsDispatcher.Events.ITEM_EDITED, this.#itemEdited, this);
  }

  dispose(): void {
    this.#dispatcher.removeEventListener(
        View.SharedStorageItemsDispatcher.Events.ITEMS_CLEARED, this.#itemsCleared, this);
    this.#dispatcher.removeEventListener(
        View.SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED, this.#filteredItemsCleared, this);
    this.#dispatcher.removeEventListener(
        View.SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED, this.#itemsRefreshed, this);
    this.#dispatcher.removeEventListener(
        View.SharedStorageItemsDispatcher.Events.ITEM_DELETED, this.#itemDeleted, this);
    this.#dispatcher.removeEventListener(View.SharedStorageItemsDispatcher.Events.ITEM_EDITED, this.#itemEdited, this);
  }

  get deletedKeys(): String[] {
    return this.#deletedKeys;
  }

  get numEditedEvents(): number {
    return this.#numEditedEvents;
  }

  resetRefreshed(): void {
    this.#refreshed = false;
  }

  #itemsCleared(): void {
    this.#cleared = true;
  }

  #filteredItemsCleared(): void {
    this.#filteredCleared = true;
  }

  #itemsRefreshed(): void {
    this.#refreshed = true;
  }

  #itemDeleted(event: Common.EventTarget.EventTargetEvent<View.SharedStorageItemsDispatcher.ItemDeletedEvent>): void {
    this.#deletedKeys.push(event.data.key);
  }

  #itemEdited(): void {
    ++this.#numEditedEvents;
  }

  async waitForItemsCleared(): Promise<void> {
    if (!this.#cleared) {
      await this.#dispatcher.once(View.SharedStorageItemsDispatcher.Events.ITEMS_CLEARED);
    }
    this.#cleared = true;
  }

  async waitForFilteredItemsCleared(): Promise<void> {
    if (!this.#filteredCleared) {
      await this.#dispatcher.once(View.SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED);
    }
    this.#filteredCleared = true;
  }

  async waitForItemsRefreshed(): Promise<void> {
    if (!this.#refreshed) {
      await this.#dispatcher.once(View.SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED);
    }
    this.#refreshed = true;
  }

  async waitForItemsDeletedTotal(total: number): Promise<void> {
    while (this.#deletedKeys.length < total) {
      await this.#dispatcher.once(View.SharedStorageItemsDispatcher.Events.ITEM_DELETED);
    }
  }

  async waitForItemsEditedTotal(total: number): Promise<void> {
    while (this.#numEditedEvents < total) {
      await this.#dispatcher.once(View.SharedStorageItemsDispatcher.Events.ITEM_EDITED);
    }
  }
}

describeWithMockConnection('SharedStorageItemsView', function() {
  let target: SDK.Target.Target;
  let sharedStorageModel: Resources.SharedStorageModel.SharedStorageModel|null;
  let sharedStorage: Resources.SharedStorageModel.SharedStorageForOrigin;

  const TEST_ORIGIN = 'http://a.test';

  const METADATA = {
    creationTime: 100 as Protocol.Network.TimeSinceEpoch,
    length: 3,
    remainingBudget: 2.5,
    bytesUsed: 30,
  } as Protocol.Storage.SharedStorageMetadata;

  const METADATA_NO_ENTRIES = {
    creationTime: 100 as Protocol.Network.TimeSinceEpoch,
    length: 0,
    remainingBudget: 2.5,
    bytesUsed: 0,
  } as Protocol.Storage.SharedStorageMetadata;

  const METADATA_2_ENTRIES = {
    creationTime: 100 as Protocol.Network.TimeSinceEpoch,
    length: 2,
    remainingBudget: 2.5,
    bytesUsed: 20,
  } as Protocol.Storage.SharedStorageMetadata;

  const METADATA_4_ENTRIES = {
    creationTime: 100 as Protocol.Network.TimeSinceEpoch,
    length: 4,
    remainingBudget: 2.5,
    bytesUsed: 38,
  } as Protocol.Storage.SharedStorageMetadata;

  const ENTRIES = [
    {
      key: 'key1',
      value: 'a',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key2',
      value: 'b',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  const ENTRIES_1 = [
    {
      key: 'key2',
      value: 'b',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  const ENTRIES_2 = [
    {
      key: 'key1',
      value: 'a',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  const ENTRIES_KEY_EDITED_1 = [
    {
      key: 'key0',
      value: 'b',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key1',
      value: 'a',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  const ENTRIES_KEY_EDITED_2 = [
    {
      key: 'key1',
      value: 'b',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  const ENTRIES_VALUE_EDITED = [
    {
      key: 'key1',
      value: 'a',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key2',
      value: 'd',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  const ENTRIES_NEW_KEY = [
    {
      key: 'key1',
      value: 'a',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key2',
      value: 'b',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key4',
      value: 'e',
    } as Protocol.Storage.SharedStorageEntry,
  ];

  beforeEach(() => {
    target = createTarget();
    sharedStorageModel = target.model(Resources.SharedStorageModel.SharedStorageModel);
    assert.exists(sharedStorageModel);
    sharedStorage = new Resources.SharedStorageModel.SharedStorageForOrigin(sharedStorageModel, TEST_ORIGIN);
    assert.strictEqual(sharedStorage.securityOrigin, TEST_ORIGIN);
  });

  async function createView(): Promise<
      {view: View.SharedStorageItemsView, itemsListener: SharedStorageItemsListener, viewFunction: sinon.SinonStub}> {
    const viewFunction = sinon.stub();
    const view = await View.SharedStorageItemsView.createView(sharedStorage, viewFunction);
    const itemsListener = new SharedStorageItemsListener(view.sharedStorageItemsDispatcher);
    await RenderCoordinator.done({waitForWork: true});
    return {view, itemsListener, viewFunction};
  }

  it('displays metadata and entries', async () => {
    assert.exists(sharedStorageModel);
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          metadata: METADATA,
          getError: () => undefined,
        });
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          entries: ENTRIES,
          getError: () => undefined,
        });

    const {view, viewFunction} = await createView();

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    const metadataView = view.metadataView;
    assert.isNotNull(metadataView.shadowRoot);

    const keys = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Creation Time',
      'Number of Entries',
      'Number of Bytes Used',
      'Entropy Budget for Fenced Frames',
    ]);

    const values = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      TEST_ORIGIN,
      (new Date(100 * 1e3)).toLocaleString(),
      '3',
      '30',
      '2.5',
    ]);
  });

  it('displays metadata with placeholder message if origin is not using API', async () => {
    assert.exists(sharedStorageModel);
    sinon.stub(sharedStorage, 'getMetadata').resolves(null);
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          entries: [],
          getError: () => undefined,
        });

    const {view, viewFunction} = await createView();

    assert.lengthOf(viewFunction.lastCall.firstArg.items, 0);

    const metadataView = view.metadataView;
    assert.isNotNull(metadataView.shadowRoot);

    const keys = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-key');
    assert.deepEqual(keys, [
      'Origin',
      'Creation Time',
      'Number of Entries',
      'Number of Bytes Used',
      'Entropy Budget for Fenced Frames',
    ]);

    const values = getCleanTextContentFromElements(metadataView.shadowRoot, 'devtools-report-value');
    assert.deepEqual(values, [
      TEST_ORIGIN,
      'Not yet created',
      '0',
      '0',
      '0',
    ]);
  });

  it('has placeholder sidebar when there are no entries', async () => {
    assert.exists(sharedStorageModel);
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          metadata: METADATA_NO_ENTRIES,
          getError: () => undefined,
        });
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          entries: [],
          getError: () => undefined,
        });

    const {viewFunction} = await createView();

    assert.instanceOf(viewFunction.lastCall.firstArg.preview, UI.EmptyWidget.EmptyWidget);
  });

  it('updates sidebarWidget upon receiving SelectedNode Event', async () => {
    assert.exists(sharedStorageModel);
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          metadata: METADATA,
          getError: () => undefined,
        });
    sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries')
        .withArgs({ownerOrigin: TEST_ORIGIN})
        .resolves({
          entries: ENTRIES,
          getError: () => undefined,
        });

    const {viewFunction} = await createView();

    // Select the second row.
    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: {dataset: {key: 'key2', value: 'b'}}}));
    await raf();

    assert.instanceOf(viewFunction.lastCall.firstArg.preview, UI.SearchableView.SearchableView);
  });

  it('refreshes when "Refresh" is clicked', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata').resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries').resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });

    const {view, itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    // Clicking "Refresh" will cause `getMetadata()` and `getEntries()` to be called.
    itemsListener.resetRefreshed();
    const refreshedPromise2 = itemsListener.waitForItemsRefreshed();
    dispatchClickEvent(view.refreshButton.element);
    await refreshedPromise2;

    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);
  });

  it('clears entries when "Delete All" is clicked', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA_NO_ENTRIES,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: [],
      getError: () => undefined,
    });
    const clearSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_clearSharedStorageEntries').resolves({
      getError: () => undefined,
    });

    const {view, itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    // Clicking "Delete All" will cause `clear()`, `getMetadata()`, and `getEntries()` to be called.
    const clearedPromise = itemsListener.waitForItemsCleared();
    dispatchClickEvent(view.deleteAllButton.element);
    await clearedPromise;

    assert.isTrue(clearSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, []);
  });

  it('clears filtered entries when "Delete All" is clicked with a filter set', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(3).resolves({
      metadata: METADATA_2_ENTRIES,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(4).resolves({
      metadata: METADATA_2_ENTRIES,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(2).resolves({
      entries: ENTRIES_2,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(3).resolves({
      entries: ENTRIES_2,
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {view, itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    // Adding a filter to the text box will cause `getMetadata()`, and `getEntries()` to be called.
    itemsListener.resetRefreshed();
    const refreshedPromise2 = itemsListener.waitForItemsRefreshed();
    view.filterItem.dispatchEventToListeners(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, 'b');
    await refreshedPromise2;

    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    // Only the filtered entries are displayed.
    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES_1);

    // Clicking "Delete All" will cause `deleteEntry()`, `getMetadata()`, and `getEntries()` to be called.
    const clearedPromise = itemsListener.waitForFilteredItemsCleared();
    dispatchClickEvent(view.deleteAllButton.element);
    await clearedPromise;

    assert.isTrue(deleteEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key2'}));
    assert.strictEqual(getMetadataSpy.callCount, 3);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledThrice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    // The filtered entries are cleared.
    assert.deepEqual(viewFunction.lastCall.firstArg.items, []);

    // Changing the filter in the text box will cause `getMetadata()`, and `getEntries()` to be called.
    itemsListener.resetRefreshed();
    const refreshedPromise3 = itemsListener.waitForItemsRefreshed();
    view.filterItem.dispatchEventToListeners(UI.Toolbar.ToolbarInput.Event.TEXT_CHANGED, '');
    await refreshedPromise3;

    assert.strictEqual(getMetadataSpy.callCount, 4);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.strictEqual(getEntriesSpy.callCount, 4);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES_2);
  });

  it('deletes selected entry when "Delete Selected" is clicked', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA_2_ENTRIES,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: [],
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {view, itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    // Select the second row.
    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: {dataset: {key: 'key2', value: 'b'}}}));

    // Clicking "Delete Selected" will cause `deleteEntry()`, `getMetadata()`, and `getEntries()` to be called.
    const deletedPromise = itemsListener.waitForItemsDeletedTotal(1);
    dispatchClickEvent(view.deleteSelectedButton.element);
    await deletedPromise;

    assert.isTrue(deleteEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key2'}));
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, []);
    assert.deepEqual(itemsListener.deletedKeys, ['key2']);
  });

  it('edits key of selected entry to a non-preexisting key', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: ENTRIES_2,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(2).resolves({
      entries: ENTRIES_KEY_EDITED_1,
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const setEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    viewFunction.lastCall.firstArg.onEdit(new CustomEvent('edit', {
      detail: {
        node: {dataset: {key: 'key2', value: 'b'}},
        columnId: 'key',
        valueBeforeEditing: 'key2',
        newText: 'key0',
      },
    }));

    //  Editing a key will cause `deleteEntry()`, `setEntry()`, `getMetadata()`, and `getEntries()` to be called.
    await itemsListener.waitForItemsEditedTotal(1);

    assert.isTrue(deleteEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key2'}));
    assert.isTrue(
        setEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key0', value: 'b', ignoreIfPresent: false}));
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledThrice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES_KEY_EDITED_1);
  });

  it('edits key of selected entry to a preexisting key', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA_2_ENTRIES,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: ENTRIES_2,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(2).resolves({
      entries: ENTRIES_KEY_EDITED_2,
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const setEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    viewFunction.lastCall.firstArg.onEdit(new CustomEvent('edit', {
      detail: {
        node: {dataset: {key: 'key2', value: 'b'}},
        columnId: 'key',
        valueBeforeEditing: 'key2',
        newText: 'key1',
      },
    }));
    await itemsListener.waitForItemsEditedTotal(1);

    assert.isTrue(deleteEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key2'}));
    assert.isTrue(
        setEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key1', value: 'b', ignoreIfPresent: false}));
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledThrice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES_KEY_EDITED_2);

    // Verify that the preview loads.
    assert.instanceOf(viewFunction.lastCall.firstArg.preview, UI.SearchableView.SearchableView);
  });

  it('edits value of selected entry to a new value', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: ENTRIES_VALUE_EDITED,
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const setEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    viewFunction.lastCall.firstArg.onEdit(new CustomEvent('edit', {
      detail: {
        node: {dataset: {key: 'key2', value: 'b'}},
        columnId: 'value',
        valueBeforeEditing: 'b',
        newText: 'd',
      },
    }));
    await itemsListener.waitForItemsEditedTotal(1);

    assert.isTrue(deleteEntrySpy.notCalled);
    assert.isTrue(
        setEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key2', value: 'd', ignoreIfPresent: false}));
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES_VALUE_EDITED);

    // Verify that the preview loads.
    assert.instanceOf(viewFunction.lastCall.firstArg.preview, UI.SearchableView.SearchableView);
  });

  it('adds an entry when the key cell of the empty data row is edited', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata');
    getMetadataSpy.onCall(0).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(1).resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    getMetadataSpy.onCall(2).resolves({
      metadata: METADATA_4_ENTRIES,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries');
    getEntriesSpy.onCall(0).resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    getEntriesSpy.onCall(1).resolves({
      entries: ENTRIES_NEW_KEY,
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const setEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    viewFunction.lastCall.firstArg.onCreate(new CustomEvent('edit', {
      detail: {
        key: 'key4',
        value: 'e',
      },
    }));
    await itemsListener.waitForItemsEditedTotal(1);

    assert.isTrue(deleteEntrySpy.notCalled);
    assert.isTrue(
        setEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN, key: 'key4', value: 'e', ignoreIfPresent: false}));
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES_NEW_KEY);

    // Verify that the preview loads.
    assert.instanceOf(viewFunction.lastCall.firstArg.preview, UI.SearchableView.SearchableView);
  });

  it('attempting to edit key of selected entry to an empty key cancels the edit', async () => {
    assert.exists(sharedStorageModel);
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata').resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries').resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const setEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageEntry').resolves({
      getError: () => undefined,
    });

    const {itemsListener, viewFunction} = await createView();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    viewFunction.lastCall.firstArg.onSelect(new CustomEvent('select', {detail: {dataset: {key: 'key2', value: 'b'}}}));
    viewFunction.lastCall.firstArg.onEdit(new CustomEvent('edit', {
      detail: {
        node: {dataset: {key: 'key2', value: 'b'}},
        columnId: 'key',
        valueBeforeEditing: 'key2',
        newText: '',
      },
    }));
    await itemsListener.waitForItemsRefreshed();

    assert.isTrue(deleteEntrySpy.notCalled);
    assert.isTrue(setEntrySpy.notCalled);
    assert.isTrue(getMetadataSpy.calledTwice);
    assert.isTrue(getMetadataSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));
    assert.isTrue(getEntriesSpy.calledTwice);
    assert.isTrue(getEntriesSpy.alwaysCalledWithExactly({ownerOrigin: TEST_ORIGIN}));

    assert.deepEqual(viewFunction.lastCall.firstArg.items, ENTRIES);

    // Verify that the preview loads.
    assert.instanceOf(viewFunction.lastCall.firstArg.preview, UI.SearchableView.SearchableView);
  });
});
