// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as Common from '../../../../../front_end/core/common/common.js';
import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';
import BucketEvents = SDK.StorageBucketsModel.Events;

class StorageBucketModelListener {
  #model: SDK.StorageBucketsModel.StorageBucketsModel;
  #bucketEvents = new Map<BucketEvents, Array<SDK.StorageBucketsModel.BucketEvent>>();

  constructor(model: SDK.StorageBucketsModel.StorageBucketsModel) {
    this.#model = model;

    this.#addEventListener(BucketEvents.BucketAdded);
    this.#addEventListener(BucketEvents.BucketRemoved);
    this.#addEventListener(BucketEvents.BucketChanged);
  }

  events(eventType: BucketEvents) {
    let bucketEvents = this.#bucketEvents.get(eventType);
    if (!bucketEvents) {
      bucketEvents = new Array<SDK.StorageBucketsModel.BucketEvent>();
      this.#bucketEvents.set(eventType, bucketEvents);
    }
    return bucketEvents;
  }

  bucketInfos(eventType: BucketEvents) {
    return this.events(eventType).map(event => event.bucketInfo);
  }

  eventCount(eventType: BucketEvents) {
    return this.events(eventType).length;
  }

  async waitForBucketEvents(eventType: BucketEvents, eventCount: number) {
    while (this.eventCount(eventType) < eventCount) {
      await this.#model.once(eventType);
    }
  }

  #addEventListener(eventType: BucketEvents) {
    this.#model.addEventListener(
        eventType, (event: Common.EventTarget.EventTargetEvent<SDK.StorageBucketsModel.BucketEvent>) => {
          this.events(eventType).push(event.data);
        });
  }
}

describeWithMockConnection('StorageBucketsModel', () => {
  let storageKeyManager: SDK.StorageKeyManager.StorageKeyManager;
  let storageBucketsModel: SDK.StorageBucketsModel.StorageBucketsModel;
  let target: SDK.Target.Target;
  let listener: StorageBucketModelListener;

  const STORAGE_KEYS: string[] = [
    'storagekey1',
    'storagekey2',
    'storagekey3',
  ];

  const STORAGE_BUCKET_INFOS: Protocol.Storage.StorageBucketInfo[] = [
    {
      bucket: {
        storageKey: STORAGE_KEYS[0],
      },
      id: '0',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
    {
      bucket: {
        storageKey: STORAGE_KEYS[0],
        name: 'bucket1',
      },
      id: '1',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
    {
      bucket: {
        storageKey: STORAGE_KEYS[1],
        name: 'bucket2',
      },
      id: '2',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
    {
      bucket: {
        storageKey: STORAGE_KEYS[2],
        name: 'bucket3',
      },
      id: '3',
      expiration: 0,
      quota: 0,
      persistent: false,
      durability: Protocol.Storage.StorageBucketsDurability.Strict,
    },
  ];

  const getBucketsForStorageKeys = (...storageKeys: string[]) => {
    return STORAGE_BUCKET_INFOS.filter(({bucket}) => storageKeys.includes(bucket.storageKey));
  };

  const setStorageBucketTrackingStub =
      ({storageKey}: {storageKey: string}): Promise<Protocol.ProtocolResponseWithError> => {
        for (const bucketInfo of getBucketsForStorageKeys(storageKey)) {
          storageBucketsModel.storageBucketCreatedOrUpdated({bucketInfo});
        }
        return Promise.resolve({
          getError: () => undefined,
        });
      };

  beforeEach(() => {
    target = createTarget();
    storageKeyManager =
        target.model(SDK.StorageKeyManager.StorageKeyManager) as SDK.StorageKeyManager.StorageKeyManager;
    storageBucketsModel =
        target.model(SDK.StorageBucketsModel.StorageBucketsModel) as SDK.StorageBucketsModel.StorageBucketsModel;
    listener = new StorageBucketModelListener(storageBucketsModel);
  });

  describe('StorageKeyAdded', () => {
    it('starts tracking for the storage key', async () => {
      const storageKey = STORAGE_KEYS[0];

      const setStorageBucketTrackingSpy =
          sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking').resolves({
            getError: () => undefined,
          });
      storageBucketsModel.enable();

      assert.isTrue(setStorageBucketTrackingSpy.notCalled);
      storageKeyManager.updateStorageKeys(new Set([storageKey]));
      assert.isTrue(setStorageBucketTrackingSpy.calledOnceWithExactly({storageKey, enable: true}));
    });

    it('adds buckets for storage keys that already have been added', async () => {
      const storageKeys = [STORAGE_KEYS[0], STORAGE_KEYS[2]];
      const bucketsForStorageKeyCount = 3;
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageKeyManager.updateStorageKeys(new Set(storageKeys));
      storageBucketsModel.enable();

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, bucketsForStorageKeyCount);
      assert.isTrue(listener.eventCount(BucketEvents.BucketAdded) === bucketsForStorageKeyCount);
      assert.deepEqual(getBucketsForStorageKeys(...storageKeys), listener.bucketInfos(BucketEvents.BucketAdded));
    });
  });

  describe('StorageKeyRemoved', () => {
    it('stops tracking for the storage key', async () => {
      const storageKey = STORAGE_KEYS[0];

      const setStorageBucketTrackingSpy =
          sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking').resolves({
            getError: () => undefined,
          });

      storageBucketsModel.enable();
      assert.isTrue(setStorageBucketTrackingSpy.notCalled);

      storageKeyManager.updateStorageKeys(new Set([storageKey]));
      storageKeyManager.updateStorageKeys(new Set([]));
      assert.isTrue(setStorageBucketTrackingSpy.callCount === 2);
      assert.isTrue(setStorageBucketTrackingSpy.secondCall.calledWithExactly({storageKey, enable: false}));
    });

    it('removes all buckets for removed storage key', async () => {
      const storageKeys = [STORAGE_KEYS[2], STORAGE_KEYS[0]];
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(storageKeys));
      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 3);

      const removedStorageKey = storageKeys.pop() as string;
      storageKeyManager.updateStorageKeys(new Set(storageKeys));
      await listener.waitForBucketEvents(BucketEvents.BucketRemoved, 2);
      assert.isTrue(listener.eventCount(BucketEvents.BucketRemoved) === 2);
      assert.deepEqual(getBucketsForStorageKeys(removedStorageKey), listener.bucketInfos(BucketEvents.BucketRemoved));
    });
  });

  describe('CreatedUpdatedDeletedBucket', () => {
    it('notifies when a bucket is created', async () => {
      const STORAGE_BUCKET_INFO_TO_CREATE = {
        bucket: {
          storageKey: STORAGE_KEYS[0],
          name: 'bucket4',
        },
        id: '4',
        expiration: 0,
        quota: 0,
        persistent: false,
        durability: Protocol.Storage.StorageBucketsDurability.Strict,
      };
      const storageKeys = [STORAGE_KEYS[0], STORAGE_KEYS[2]];
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(storageKeys));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 3);
      assert.isTrue(listener.eventCount(BucketEvents.BucketAdded) === 3);
      const expectedBuckets = getBucketsForStorageKeys(...storageKeys);
      assert.deepEqual(expectedBuckets, listener.bucketInfos(BucketEvents.BucketAdded));

      storageBucketsModel.storageBucketCreatedOrUpdated({bucketInfo: STORAGE_BUCKET_INFO_TO_CREATE});
      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 4);
      assert.isTrue(listener.eventCount(BucketEvents.BucketAdded) === 4);
      expectedBuckets.push(STORAGE_BUCKET_INFO_TO_CREATE);
      assert.deepEqual(expectedBuckets, listener.bucketInfos(BucketEvents.BucketAdded));
    });

    it('notifies when a bucket is updated', async () => {
      const STORAGE_BUCKET_INFO_UPDATED = {...STORAGE_BUCKET_INFOS[0], expiration: 100};
      const storageKeys = [STORAGE_KEYS[0], STORAGE_KEYS[2]];
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(storageKeys));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 3);
      assert.isTrue(listener.eventCount(BucketEvents.BucketChanged) === 0);

      storageBucketsModel.storageBucketCreatedOrUpdated({bucketInfo: STORAGE_BUCKET_INFO_UPDATED});
      await listener.waitForBucketEvents(BucketEvents.BucketChanged, 1);
      assert.isTrue(listener.eventCount(BucketEvents.BucketChanged) === 1);
      assert.deepEqual(listener.bucketInfos(BucketEvents.BucketChanged)[0], STORAGE_BUCKET_INFO_UPDATED);
    });

    it('notifies when a bucket is deleted', async () => {
      const STORAGE_BUCKET_INFO_REMOVED = STORAGE_BUCKET_INFOS[0];
      const storageKeys = [STORAGE_KEYS[0], STORAGE_KEYS[2]];
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(storageKeys));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 3);
      assert.isTrue(listener.eventCount(BucketEvents.BucketRemoved) === 0);

      storageBucketsModel.storageBucketDeleted({bucketId: STORAGE_BUCKET_INFO_REMOVED.id});
      await listener.waitForBucketEvents(BucketEvents.BucketRemoved, 1);
      assert.isTrue(listener.eventCount(BucketEvents.BucketRemoved) === 1);
      assert.deepEqual(listener.bucketInfos(BucketEvents.BucketRemoved)[0], STORAGE_BUCKET_INFO_REMOVED);
    });
  });

  describe('GetBucketFunctions', () => {
    it('gets all buckets', async () => {
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(STORAGE_KEYS));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 4);
      assert.deepEqual(new Set(STORAGE_BUCKET_INFOS), storageBucketsModel.getBuckets());
    });

    it('gets buckets for storage key', async () => {
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(STORAGE_KEYS));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 4);
      assert.deepEqual(
          new Set(getBucketsForStorageKeys(STORAGE_KEYS[0])),
          storageBucketsModel.getBucketsForStorageKey(STORAGE_KEYS[0]));
      assert.deepEqual(
          new Set(getBucketsForStorageKeys(STORAGE_KEYS[1])),
          storageBucketsModel.getBucketsForStorageKey(STORAGE_KEYS[1]));
      assert.deepEqual(
          new Set(getBucketsForStorageKeys(STORAGE_KEYS[2])),
          storageBucketsModel.getBucketsForStorageKey(STORAGE_KEYS[2]));
    });

    it('gets buckets by id', async () => {
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(STORAGE_KEYS));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 4);
      assert.deepEqual(STORAGE_BUCKET_INFOS[0], storageBucketsModel.getBucketById(STORAGE_BUCKET_INFOS[0].id));
      assert.deepEqual(STORAGE_BUCKET_INFOS[1], storageBucketsModel.getBucketById(STORAGE_BUCKET_INFOS[1].id));
      assert.deepEqual(STORAGE_BUCKET_INFOS[2], storageBucketsModel.getBucketById(STORAGE_BUCKET_INFOS[2].id));
      assert.deepEqual(STORAGE_BUCKET_INFOS[3], storageBucketsModel.getBucketById(STORAGE_BUCKET_INFOS[3].id));
    });

    it('gets bucket by name', async () => {
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(STORAGE_KEYS));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 4);
      assert.deepEqual(
          STORAGE_BUCKET_INFOS[0],
          storageBucketsModel.getBucketByName(
              STORAGE_BUCKET_INFOS[0].bucket.storageKey, STORAGE_BUCKET_INFOS[0].bucket.name));
      assert.deepEqual(
          STORAGE_BUCKET_INFOS[1],
          storageBucketsModel.getBucketByName(
              STORAGE_BUCKET_INFOS[1].bucket.storageKey, STORAGE_BUCKET_INFOS[1].bucket.name));
      assert.deepEqual(
          STORAGE_BUCKET_INFOS[2],
          storageBucketsModel.getBucketByName(
              STORAGE_BUCKET_INFOS[2].bucket.storageKey, STORAGE_BUCKET_INFOS[2].bucket.name));
      assert.deepEqual(
          STORAGE_BUCKET_INFOS[3],
          storageBucketsModel.getBucketByName(
              STORAGE_BUCKET_INFOS[3].bucket.storageKey, STORAGE_BUCKET_INFOS[3].bucket.name));
    });

    it('gets default bucket when name isnt given', async () => {
      sinon.stub(storageBucketsModel.storageAgent, 'invoke_setStorageBucketTracking')
          .callsFake(setStorageBucketTrackingStub);

      storageBucketsModel.enable();
      storageKeyManager.updateStorageKeys(new Set(STORAGE_KEYS));

      await listener.waitForBucketEvents(BucketEvents.BucketAdded, 4);
      {
        const bucketInfo = STORAGE_BUCKET_INFOS[0];
        const {bucket: {storageKey, name}} = bucketInfo;
        assert.deepEqual(bucketInfo, storageBucketsModel.getBucketByName(storageKey, name));
      }
      {
        const bucketInfo = STORAGE_BUCKET_INFOS[1];
        const {bucket: {storageKey, name}} = bucketInfo;
        assert.deepEqual(bucketInfo, storageBucketsModel.getBucketByName(storageKey, name));
      }
      {
        const bucketInfo = STORAGE_BUCKET_INFOS[2];
        const {bucket: {storageKey, name}} = bucketInfo;
        assert.deepEqual(bucketInfo, storageBucketsModel.getBucketByName(storageKey, name));
      }
      {
        const bucketInfo = STORAGE_BUCKET_INFOS[3];
        const {bucket: {storageKey, name}} = bucketInfo;
        assert.deepEqual(bucketInfo, storageBucketsModel.getBucketByName(storageKey, name));
      }
    });
  });

  it('deletes the bucket', () => {
    const {bucket} = STORAGE_BUCKET_INFOS[0];
    const setStorageBucketTrackingSpy =
        sinon.stub(storageBucketsModel.storageAgent, 'invoke_deleteStorageBucket').resolves({
          getError: () => undefined,
        });

    storageBucketsModel.deleteBucket(bucket);
    assert.isTrue(setStorageBucketTrackingSpy.calledOnceWithExactly({bucket}));
  });
});
