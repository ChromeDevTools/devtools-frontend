// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as SDK from './sdk.js';

describeWithMockConnection('DOMStorageModel', () => {
  let domStorageModel: SDK.DOMStorageModel.DOMStorageModel;
  let domStorage: SDK.DOMStorageModel.DOMStorage;
  let target: SDK.Target.Target;
  const initKey = 'storageKey1';

  beforeEach(() => {
    target = createTarget();
    domStorageModel = new SDK.DOMStorageModel.DOMStorageModel(target);
    domStorage = new SDK.DOMStorageModel.DOMStorage(domStorageModel, initKey, true);
  });

  it('DOMStorage is instantiated correctly', () => {
    assert.strictEqual(domStorage.storageKey, initKey);
    assert.deepEqual(domStorage.id, {storageKey: initKey, isLocalStorage: true} as Protocol.DOMStorage.StorageId);
  });

  it('StorageKey events trigger addition/removal of DOMStorage', () => {
    const testKey = 'storageKey';
    const testId = {storageKey: testKey, isLocalStorage: true} as Protocol.DOMStorage.StorageId;

    domStorageModel.enable();
    const manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    assert.exists(manager);

    assert.isEmpty(domStorageModel.storages());
    manager.dispatchEventToListeners(SDK.StorageKeyManager.Events.STORAGE_KEY_ADDED, testKey);
    assert.exists(domStorageModel.storageForId(testId));

    assert.exists(domStorageModel.storageForId(testId));
    manager.dispatchEventToListeners(SDK.StorageKeyManager.Events.STORAGE_KEY_REMOVED, testKey);
    assert.isUndefined(domStorageModel.storageForId(testId));
  });
});
