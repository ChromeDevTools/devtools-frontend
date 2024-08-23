// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import {createTarget} from '../../testing/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../testing/MockConnection.js';

import * as Resources from './application.js';

describeWithMockConnection('DOMStorageModel', () => {
  let domStorageModel: Resources.DOMStorageModel.DOMStorageModel;
  let domStorage: Resources.DOMStorageModel.DOMStorage;
  let target: SDK.Target.Target;
  const initKey = 'storageKey1';

  beforeEach(() => {
    target = createTarget();
    domStorageModel = new Resources.DOMStorageModel.DOMStorageModel(target);
    domStorage = new Resources.DOMStorageModel.DOMStorage(domStorageModel, initKey, true);
  });

  it('DOMStorage is instantiated correctly', () => {
    assert.strictEqual(domStorage.storageKey, initKey);
    assert.deepStrictEqual(domStorage.id, {storageKey: initKey, isLocalStorage: true} as Protocol.DOMStorage.StorageId);
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
