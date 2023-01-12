// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import {assertNotNullOrUndefined} from '../../../../../front_end/core/platform/platform.js';
import type * as Protocol from '../../../../../front_end/generated/protocol.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {describeWithMockConnection} from '../../helpers/MockConnection.js';

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
    assertNotNullOrUndefined(manager);

    assert.isEmpty(domStorageModel.storages());
    manager.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
    assertNotNullOrUndefined(domStorageModel.storageForId(testId));

    assertNotNullOrUndefined(domStorageModel.storageForId(testId));
    manager.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyRemoved, testKey);
    assert.isUndefined(domStorageModel.storageForId(testId));
  });
});
