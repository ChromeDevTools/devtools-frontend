// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {MockCDPConnection} from '../../testing/MockCDPConnection.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';

import * as Application from './application.js';

describe('ServiceWorkerCacheTreeElement', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  let universe: TestUniverse;
  let target: SDK.Target.Target;
  let model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
  let panel: Application.ResourcesPanel.ResourcesPanel;

  beforeEach(() => {
    universe = new TestUniverse();
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);
    sinon.stub(SDK.TargetManager.TargetManager, 'instance').returns(universe.targetManager);

    const connection = new MockCDPConnection();
    target = universe.createTarget({connection});
    universe.targetManager.setScopeTarget(target);
    model = target.model(SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel) as
        SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel;
    panel = sinon.createStubInstance(Application.ResourcesPanel.ResourcesPanel);
  });

  it('does not duplicate cache tree elements on re-initialization', () => {
    const cacheTreeElement = new Application.ServiceWorkerCacheTreeElement.ServiceWorkerCacheTreeElement(panel);

    const storageBucket = {
      storageKey: 'storageKey' as Protocol.Storage.SerializedStorageKey,
      name: 'bucketName',
    };
    const cache1 = new SDK.ServiceWorkerCacheModel.Cache(model, storageBucket, 'cacheName1',
                                                         'cacheId1' as Protocol.CacheStorage.CacheId);

    sinon.stub(model, 'caches').returns([cache1]);

    // Trigger adding a cache.
    model.dispatchEventToListeners(SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED, {model, cache: cache1});
    assert.strictEqual(cacheTreeElement.childCount(), 1);
    assert.strictEqual(cacheTreeElement.children()[0].title, 'cacheName1 - storageKey');

    // Re-initialize (simulating target reload/BFCache navigation).
    cacheTreeElement.initialize();
    assert.strictEqual(cacheTreeElement.childCount(), 1);
  });

  it('updates live when caches are added and removed', async () => {
    const cacheTreeElement = new Application.ServiceWorkerCacheTreeElement.ServiceWorkerCacheTreeElement(panel);
    assert.strictEqual(cacheTreeElement.childCount(), 0);

    const testStorageBucket: Protocol.Storage.StorageBucket = {
      storageKey: 'test-storage-key',
    };

    const cache1 = new SDK.ServiceWorkerCacheModel.Cache(model, testStorageBucket, 'testCache1',
                                                         'id1' as Protocol.CacheStorage.CacheId);

    const cache2 = new SDK.ServiceWorkerCacheModel.Cache(model, testStorageBucket, 'testCache2',
                                                         'id2' as Protocol.CacheStorage.CacheId);

    model.dispatchEventToListeners(SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED, {model, cache: cache1});
    assert.strictEqual(cacheTreeElement.childCount(), 1);
    assert.strictEqual(cacheTreeElement.childAt(0)?.title, 'testCache1 - test-storage-key');

    model.dispatchEventToListeners(SDK.ServiceWorkerCacheModel.Events.CACHE_ADDED, {model, cache: cache2});
    assert.strictEqual(cacheTreeElement.childCount(), 2);
    assert.strictEqual(cacheTreeElement.childAt(0)?.title, 'testCache1 - test-storage-key');
    assert.strictEqual(cacheTreeElement.childAt(1)?.title, 'testCache2 - test-storage-key');

    model.dispatchEventToListeners(SDK.ServiceWorkerCacheModel.Events.CACHE_REMOVED, {model, cache: cache1});
    assert.strictEqual(cacheTreeElement.childCount(), 1);
    assert.strictEqual(cacheTreeElement.childAt(0)?.title, 'testCache2 - test-storage-key');
  });
});
