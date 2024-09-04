// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';
import {
  getInitializedResourceTreeModel,
  getMainFrame,
  MAIN_FRAME_ID,
  navigate,
} from '../../testing/ResourceTreeHelpers.js';

import * as Resources from './application.js';

class SharedStorageListener {
  #model: Resources.SharedStorageModel.SharedStorageModel;
  #storagesWatched: Array<Resources.SharedStorageModel.SharedStorageForOrigin>;
  #accessEvents: Array<Protocol.Storage.SharedStorageAccessedEvent>;
  #changeEvents:
      Map<Resources.SharedStorageModel.SharedStorageForOrigin,
          Array<Resources.SharedStorageModel.SharedStorageForOrigin.SharedStorageChangedEvent>>;

  constructor(model: Resources.SharedStorageModel.SharedStorageModel) {
    this.#model = model;
    this.#storagesWatched = new Array<Resources.SharedStorageModel.SharedStorageForOrigin>();
    this.#accessEvents = new Array<Protocol.Storage.SharedStorageAccessedEvent>();
    this.#changeEvents = new Map<
        Resources.SharedStorageModel.SharedStorageForOrigin,
        Array<Resources.SharedStorageModel.SharedStorageForOrigin.SharedStorageChangedEvent>>();

    this.#model.addEventListener(
        Resources.SharedStorageModel.Events.SHARED_STORAGE_ADDED, this.#sharedStorageAdded, this);
    this.#model.addEventListener(
        Resources.SharedStorageModel.Events.SHARED_STORAGE_REMOVED, this.#sharedStorageRemoved, this);
    this.#model.addEventListener(
        Resources.SharedStorageModel.Events.SHARED_STORAGE_ACCESS, this.#sharedStorageAccess, this);
  }

  dispose(): void {
    this.#model.removeEventListener(
        Resources.SharedStorageModel.Events.SHARED_STORAGE_ADDED, this.#sharedStorageAdded, this);
    this.#model.removeEventListener(
        Resources.SharedStorageModel.Events.SHARED_STORAGE_REMOVED, this.#sharedStorageRemoved, this);
    this.#model.removeEventListener(
        Resources.SharedStorageModel.Events.SHARED_STORAGE_ACCESS, this.#sharedStorageAccess, this);

    for (const storage of this.#storagesWatched) {
      storage.removeEventListener(
          Resources.SharedStorageModel.SharedStorageForOrigin.Events.SHARED_STORAGE_CHANGED,
          this.#sharedStorageChanged.bind(this, storage), this);
    }
  }

  get accessEvents(): Array<Protocol.Storage.SharedStorageAccessedEvent> {
    return this.#accessEvents;
  }

  changeEventsForStorage(storage: Resources.SharedStorageModel.SharedStorageForOrigin):
      Array<Resources.SharedStorageModel.SharedStorageForOrigin.SharedStorageChangedEvent>|null {
    return this.#changeEvents.get(storage) || null;
  }

  changeEventsEmpty(): boolean {
    return this.#changeEvents.size === 0;
  }

  #sharedStorageAdded(event: Common.EventTarget.EventTargetEvent<Resources.SharedStorageModel.SharedStorageForOrigin>):
      void {
    const storage = (event.data as Resources.SharedStorageModel.SharedStorageForOrigin);
    this.#storagesWatched.push(storage);
    storage.addEventListener(
        Resources.SharedStorageModel.SharedStorageForOrigin.Events.SHARED_STORAGE_CHANGED,
        this.#sharedStorageChanged.bind(this, storage), this);
  }

  #sharedStorageRemoved(
      event: Common.EventTarget.EventTargetEvent<Resources.SharedStorageModel.SharedStorageForOrigin>): void {
    const storage = (event.data as Resources.SharedStorageModel.SharedStorageForOrigin);
    storage.removeEventListener(
        Resources.SharedStorageModel.SharedStorageForOrigin.Events.SHARED_STORAGE_CHANGED,
        this.#sharedStorageChanged.bind(this, storage), this);
    const index = this.#storagesWatched.indexOf(storage);
    if (index === -1) {
      return;
    }
    this.#storagesWatched = this.#storagesWatched.splice(index, 1);
  }

  #sharedStorageAccess(event: Common.EventTarget.EventTargetEvent<Protocol.Storage.SharedStorageAccessedEvent>): void {
    this.#accessEvents.push(event.data as Protocol.Storage.SharedStorageAccessedEvent);
  }

  #sharedStorageChanged(
      storage: Resources.SharedStorageModel.SharedStorageForOrigin,
      event: Common.EventTarget
          .EventTargetEvent<Resources.SharedStorageModel.SharedStorageForOrigin.SharedStorageChangedEvent>): void {
    if (!this.#changeEvents.has(storage)) {
      this.#changeEvents.set(
          storage, new Array<Resources.SharedStorageModel.SharedStorageForOrigin.SharedStorageChangedEvent>());
    }
    this.#changeEvents.get(storage)?.push(
        event.data as Resources.SharedStorageModel.SharedStorageForOrigin.SharedStorageChangedEvent);
  }

  async waitForStoragesAdded(expectedCount: number): Promise<void> {
    while (this.#storagesWatched.length < expectedCount) {
      await this.#model.once(Resources.SharedStorageModel.Events.SHARED_STORAGE_ADDED);
    }
  }
}

describeWithMockConnection('SharedStorageModel', () => {
  let sharedStorageModel: Resources.SharedStorageModel.SharedStorageModel;
  let target: SDK.Target.Target;
  let listener: SharedStorageListener;

  const TEST_ORIGIN_A = 'http://a.test';
  const TEST_ORIGIN_B = 'http://b.test';
  const TEST_ORIGIN_C = 'http://c.test';

  const METADATA = {
    creationTime: 100 as Protocol.Network.TimeSinceEpoch,
    length: 3,
    remainingBudget: 2.5,
    bytesUsed: 30,
  } as unknown as Protocol.Storage.SharedStorageMetadata;

  const ENTRIES = [
    {
      key: 'key1',
      value: 'a',
    } as unknown as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key2',
      value: 'b',
    } as unknown as Protocol.Storage.SharedStorageEntry,
    {
      key: 'key3',
      value: 'c',
    } as unknown as Protocol.Storage.SharedStorageEntry,
  ];

  const EVENTS = [
    {
      accessTime: 0,
      type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 10,
      type: Protocol.Storage.SharedStorageAccessType.WorkletGet,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_A,
      params: {key: 'key0'} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 15,
      type: Protocol.Storage.SharedStorageAccessType.WorkletLength,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 20,
      type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_B,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 100,
      type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_C,
      params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
    },
    {
      accessTime: 150,
      type: Protocol.Storage.SharedStorageAccessType.WorkletRemainingBudget,
      mainFrameId: MAIN_FRAME_ID,
      ownerOrigin: TEST_ORIGIN_C,
      params: {} as Protocol.Storage.SharedStorageAccessParams,
    },
  ];

  beforeEach(async () => {
    target = createTarget();
    await getInitializedResourceTreeModel(target);
    sharedStorageModel = target.model(Resources.SharedStorageModel.SharedStorageModel) as
        Resources.SharedStorageModel.SharedStorageModel;
    listener = new SharedStorageListener(sharedStorageModel);
  });

  it('invokes storageAgent via SharedStorageForOrigin', async () => {
    const getMetadataSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageMetadata').resolves({
      metadata: METADATA,
      getError: () => undefined,
    });
    const getEntriesSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_getSharedStorageEntries').resolves({
      entries: ENTRIES,
      getError: () => undefined,
    });
    const setEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const deleteEntrySpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_deleteSharedStorageEntry').resolves({
      getError: () => undefined,
    });
    const clearSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_clearSharedStorageEntries').resolves({
      getError: () => undefined,
    });

    const sharedStorage = new Resources.SharedStorageModel.SharedStorageForOrigin(sharedStorageModel, TEST_ORIGIN_A);
    assert.strictEqual(sharedStorage.securityOrigin, TEST_ORIGIN_A);

    const metadata = await sharedStorage.getMetadata();
    assert.isTrue(getMetadataSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN_A}));
    assert.deepEqual(METADATA, metadata);

    const entries = await sharedStorage.getEntries();
    assert.isTrue(getEntriesSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN_A}));
    assert.deepEqual(ENTRIES, entries);

    await sharedStorage.setEntry('new-key1', 'new-value1', true);
    assert.isTrue(setEntrySpy.calledOnceWithExactly(
        {ownerOrigin: TEST_ORIGIN_A, key: 'new-key1', value: 'new-value1', ignoreIfPresent: true}));

    await sharedStorage.deleteEntry('new-key1');
    assert.isTrue(deleteEntrySpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN_A, key: 'new-key1'}));

    await sharedStorage.clear();
    assert.isTrue(clearSpy.calledOnceWithExactly({ownerOrigin: TEST_ORIGIN_A}));
  });

  it('adds/removes SharedStorageForOrigin on SecurityOrigin events', async () => {
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    await sharedStorageModel.enable();
    assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

    assert.isEmpty(sharedStorageModel.storages());

    const manager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(manager);

    const addedPromise = listener.waitForStoragesAdded(1);

    manager.dispatchEventToListeners(SDK.SecurityOriginManager.Events.SecurityOriginAdded, TEST_ORIGIN_A);
    await addedPromise;

    assert.exists(sharedStorageModel.storageForOrigin(TEST_ORIGIN_A));

    manager.dispatchEventToListeners(SDK.SecurityOriginManager.Events.SecurityOriginRemoved, TEST_ORIGIN_A);
    assert.isEmpty(sharedStorageModel.storages());
  });

  it('does not add SharedStorageForOrigin if origin invalid', async () => {
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    await sharedStorageModel.enable();
    assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

    assert.isEmpty(sharedStorageModel.storages());

    const manager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(manager);

    manager.dispatchEventToListeners(SDK.SecurityOriginManager.Events.SecurityOriginAdded, 'invalid');
    assert.isEmpty(sharedStorageModel.storages());
  });

  it('does not add SharedStorageForOrigin if origin already added', async () => {
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    await sharedStorageModel.enable();
    assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

    assert.isEmpty(sharedStorageModel.storages());

    const addedPromise = listener.waitForStoragesAdded(1);

    navigate(getMainFrame(target), {url: TEST_ORIGIN_A});
    await addedPromise;

    assert.exists(sharedStorageModel.storageForOrigin(TEST_ORIGIN_A));
    assert.strictEqual(1, sharedStorageModel.numStoragesForTesting());

    navigate(getMainFrame(target), {url: TEST_ORIGIN_A});
    assert.strictEqual(1, sharedStorageModel.numStoragesForTesting());
  });

  it('adds/removes SecurityOrigins when model is enabled/disabled', async () => {
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    const manager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(manager);

    const originSet = new Set([TEST_ORIGIN_A, TEST_ORIGIN_B, TEST_ORIGIN_C]);
    manager.updateSecurityOrigins(originSet);
    assert.strictEqual(3, manager.securityOrigins().length);

    const addedPromise = listener.waitForStoragesAdded(3);

    await sharedStorageModel.enable();
    assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

    await addedPromise;
    assert.strictEqual(3, sharedStorageModel.numStoragesForTesting());

    assert.exists(sharedStorageModel.storageForOrigin(TEST_ORIGIN_A));
    assert.exists(sharedStorageModel.storageForOrigin(TEST_ORIGIN_B));
    assert.exists(sharedStorageModel.storageForOrigin(TEST_ORIGIN_C));

    sharedStorageModel.disable();
    assert.isEmpty(sharedStorageModel.storages());
  });

  it('dispatches SharedStorageAccess events to listeners', async () => {
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    const manager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(manager);

    await sharedStorageModel.enable();
    assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

    for (const event of EVENTS) {
      sharedStorageModel.sharedStorageAccessed(event);
    }

    assert.deepEqual(EVENTS, listener.accessEvents);
  });

  it('dispatches SharedStorageChanged events to listeners', async () => {
    const setTrackingSpy = sinon.stub(sharedStorageModel.storageAgent, 'invoke_setSharedStorageTracking').resolves({
      getError: () => undefined,
    });

    const manager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    assert.exists(manager);

    await sharedStorageModel.enable();
    assert.isTrue(setTrackingSpy.calledOnceWithExactly({enable: true}));

    // For change events whose origins aren't yet in the model, the origin is added
    // to the model, with the `SharedStorageAdded` event being subsequently dispatched
    // instead of the `SharedStorageChanged` event.
    const addedPromise = listener.waitForStoragesAdded(3);
    for (const event of EVENTS) {
      sharedStorageModel.sharedStorageAccessed(event);
    }
    await addedPromise;

    assert.strictEqual(4, sharedStorageModel.numStoragesForTesting());
    assert.deepEqual(EVENTS, listener.accessEvents);
    assert.isTrue(listener.changeEventsEmpty());

    // All events will be dispatched as `SharedStorageAccess` events, but only change
    // events for existing origins will be forwarded as `SharedStorageChanged` events.
    for (const event of EVENTS) {
      sharedStorageModel.sharedStorageAccessed(event);
    }

    assert.deepEqual(EVENTS.concat(EVENTS), listener.accessEvents);

    const storageA = sharedStorageModel.storageForOrigin(TEST_ORIGIN_A);
    assert.exists(storageA);
    assert.deepEqual(listener.changeEventsForStorage(storageA), [
      {
        accessTime: 0,
        type: Protocol.Storage.SharedStorageAccessType.DocumentAppend,
        mainFrameId: MAIN_FRAME_ID,
        params: {key: 'key0', value: 'value0'} as Protocol.Storage.SharedStorageAccessParams,
      },
    ]);

    const storageB = sharedStorageModel.storageForOrigin(TEST_ORIGIN_B);
    assert.exists(storageB);
    assert.deepEqual(listener.changeEventsForStorage(storageB), [
      {
        accessTime: 20,
        type: Protocol.Storage.SharedStorageAccessType.DocumentClear,
        mainFrameId: MAIN_FRAME_ID,
        params: {} as Protocol.Storage.SharedStorageAccessParams,
      },
    ]);

    const storageC = sharedStorageModel.storageForOrigin(TEST_ORIGIN_C);
    assert.exists(storageC);
    assert.deepEqual(listener.changeEventsForStorage(storageC), [
      {
        accessTime: 100,
        type: Protocol.Storage.SharedStorageAccessType.WorkletSet,
        mainFrameId: MAIN_FRAME_ID,
        params: {key: 'key0', value: 'value1', ignoreIfPresent: true} as Protocol.Storage.SharedStorageAccessParams,
      },
    ]);
  });
});
