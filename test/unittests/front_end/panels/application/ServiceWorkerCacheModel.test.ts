// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../front_end/generated/protocol.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
  clearMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';
import type * as ProtocolProxyApi from '../../../../../front_end/generated/protocol-proxy-api.js';

describeWithMockConnection('ServiceWorkerCacheModel', () => {
  let cacheStorageModel: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  let cache: SDK.ServiceWorkerCacheModel.Cache;
  let target: SDK.Target.Target;
  let manager: SDK.StorageBucketsModel.StorageBucketsModel|null;
  let cacheAgent: ProtocolProxyApi.CacheStorageApi;

  const testKey = 'test-key';
  const testStorageBucket = {
    storageKey: testKey,
    name: 'inbox',
  };

  const testStorageBucketInfo = {
    id: '0',
    bucket: testStorageBucket,
    expiration: 0,
    quota: 0,
    persistent: false,
    durability: Protocol.Storage.StorageBucketsDurability.Strict,
  };

  beforeEach(() => {
    target = createTarget();
    cacheStorageModel = new SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel(target);
    cache = new SDK.ServiceWorkerCacheModel.Cache(
        cacheStorageModel, testStorageBucket, 'test-cache', 'id' as Protocol.CacheStorage.CacheId);
    manager = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
    cacheAgent = target.cacheStorageAgent();
  });

  describe('StorageKeyAdded', () => {
    it('registers cache only when the model is enabled', async () => {
      const cacheAdeddSpy = sinon.spy(cacheStorageModel, 'dispatchEventToListeners');
      const cacheNamePromise = new Promise<string>(resolve => {
        cacheStorageModel.addEventListener(SDK.ServiceWorkerCacheModel.Events.CacheAdded, event => {
          resolve(event.data.cache.cacheName);
        });
      });
      setMockConnectionResponseHandler(
          'CacheStorage.requestCacheNames',
          () => ({
            caches: [{cacheId: 'id', storageKey: testKey, storageBucket: testStorageBucket, cacheName: 'test-cache'}],
          }));

      manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
      assert.isFalse(cacheAdeddSpy.calledWithExactly(
          SDK.ServiceWorkerCacheModel.Events.CacheAdded as unknown as sinon.SinonMatcher,
          {model: cacheStorageModel, cache}));

      cacheStorageModel.enable();
      manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
      assert.strictEqual(await cacheNamePromise, 'test-cache');
    });

    it('starts tracking cache', () => {
      const trackCacheSpy = sinon.spy(target.storageAgent(), 'invoke_trackCacheStorageForStorageKey' as never);

      cacheStorageModel.enable();
      manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});

      assert.isTrue(trackCacheSpy.calledOnceWithExactly({storageKey: testKey}));
    });
  });

  it('stops tracking cache', () => {
    const untrackCacheSpy = sinon.spy(target.storageAgent(), 'invoke_untrackCacheStorageForStorageKey' as never);

    cacheStorageModel.enable();
    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    manager?.storageBucketDeleted({bucketId: testStorageBucketInfo.id});

    assert.isTrue(untrackCacheSpy.calledOnceWithExactly({storageKey: testKey}));
  });

  it('detaches storage key event listeners on dispose', () => {
    const trackCacheSpy = sinon.spy(target.storageAgent(), 'invoke_trackCacheStorageForStorageKey' as never);
    const untrackCacheSpy = sinon.spy(target.storageAgent(), 'invoke_untrackCacheStorageForStorageKey' as never);
    cacheStorageModel.enable();

    cacheStorageModel.dispose();
    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    manager?.storageBucketDeleted({bucketId: testStorageBucketInfo.id});

    assert.isTrue(trackCacheSpy.notCalled);
    assert.isTrue(untrackCacheSpy.notCalled);
  });

  it('calls protocol method and dispatches event on refreshCacheNames', async () => {
    const requestCacheNamesSpy = sinon.spy(cacheAgent, 'invoke_requestCacheNames');
    const cacheAddedPromise = new Promise<void>(resolve => {
      cacheStorageModel.addEventListener(SDK.ServiceWorkerCacheModel.Events.CacheAdded, () => {
        resolve();
      });
    });
    setMockConnectionResponseHandler(
        'CacheStorage.requestCacheNames',
        () => ({
          caches: [{cacheId: 'id', storageKey: testKey, storageBucket: testStorageBucket, cacheName: 'test-cache'}],
        }));
    cacheStorageModel.enable();
    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});

    void cacheStorageModel.refreshCacheNames();

    assert.isTrue(requestCacheNamesSpy.calledWithExactly({storageBucket: testStorageBucket}));
    await cacheAddedPromise;
  });

  it('dispatches event on cacheStorageContentUpdated', () => {
    const dispatcherSpy = sinon.spy(cacheStorageModel, 'dispatchEventToListeners');

    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    cacheStorageModel.cacheStorageContentUpdated(
        {origin: '', storageKey: testKey, bucketId: testStorageBucketInfo.id, cacheName: 'test-cache'});

    assert.isTrue(dispatcherSpy.calledOnceWithExactly(
        SDK.ServiceWorkerCacheModel.Events.CacheStorageContentUpdated as unknown as sinon.SinonMatcher,
        {storageBucket: testStorageBucket, cacheName: 'test-cache'}));
  });

  it('requests cache names on cacheStorageListUpdated', async () => {
    const requestCacheNamesSpy = sinon.spy(cacheAgent, 'invoke_requestCacheNames');
    cacheStorageModel.enable();
    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});

    cacheStorageModel.cacheStorageListUpdated({origin: '', storageKey: testKey, bucketId: testStorageBucketInfo.id});

    assert.isTrue(requestCacheNamesSpy.calledWithExactly({storageBucket: testStorageBucket}));
  });

  it('gets caches added for storage key', async () => {
    const cacheNames = ['test-cache-1', 'test-cache-2'];
    const cachesAddedPromise = new Promise<void>(resolve => {
      cacheStorageModel.addEventListener(SDK.ServiceWorkerCacheModel.Events.CacheAdded, () => {
        resolve();
      });
    });
    setMockConnectionResponseHandler(
        'CacheStorage.requestCacheNames',
        () => ({
          caches: [
            {cacheId: 'id1', storageKey: testKey, storageBucket: testStorageBucket, cacheName: 'test-cache-1'},
            {cacheId: 'id2', storageKey: testKey, storageBucket: testStorageBucket, cacheName: 'test-cache-2'},
          ],
        }));
    cacheStorageModel.enable();
    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    // make sure enough time passed for caches to populate
    await cachesAddedPromise;

    const caches = cacheStorageModel.caches();

    assert.deepEqual(caches.map(cache => cache.cacheName), cacheNames);
  });

  it('removes caches for storage key on clearForStorageKey', async () => {
    setMockConnectionResponseHandler(
        'CacheStorage.requestCacheNames',
        () => ({
          caches: [
            {cacheId: 'id1', storageKey: testKey, storageBucket: testStorageBucket, cacheName: 'test-cache-1'},
            {cacheId: 'id2', storageKey: testKey, storageBucket: testStorageBucket, cacheName: 'test-cache-2'},
          ],
        }));
    cacheStorageModel.enable();
    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    cacheStorageModel.refreshCacheNames();
    clearMockConnectionResponseHandler('CacheStorage.requestCacheNames');

    cacheStorageModel.clearForStorageKey(testKey);

    assert.isEmpty(cacheStorageModel.caches());
  });

  it('registers storage key on enable', async () => {
    const trackCacheSpy = sinon.spy(target.storageAgent(), 'invoke_trackCacheStorageForStorageKey' as never);

    manager?.storageBucketCreatedOrUpdated({bucketInfo: testStorageBucketInfo});
    cacheStorageModel.enable();

    assert.isTrue(trackCacheSpy.calledOnceWithExactly({storageKey: testKey}));
  });
});
