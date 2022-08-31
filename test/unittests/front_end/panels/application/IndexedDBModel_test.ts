// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import type * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
} from '../../helpers/MockConnection.js';
import type * as ProtocolProxyApi from '../../../../../front_end/generated/protocol-proxy-api.js';

describeWithMockConnection('IndexedDBModel', () => {
  let indexedDBModel: Resources.IndexedDBModel.IndexedDBModel;
  let target: SDK.Target.Target;
  let indexedDBAgent: ProtocolProxyApi.IndexedDBApi;
  const testKey = 'test-storage-key';
  const testDBId = new Resources.IndexedDBModel.DatabaseId(undefined, testKey, 'test-database');

  beforeEach(async () => {
    target = createTarget();
    indexedDBModel = new Resources.IndexedDBModel.IndexedDBModel(target);
    indexedDBAgent = target.indexedDBAgent();
  });

  it('calls protocol method on clearObjectStore', async () => {
    const clearObjectStoreSpy = sinon.spy(indexedDBAgent, 'invoke_clearObjectStore');

    indexedDBModel.enable();
    void indexedDBModel.clearObjectStore(testDBId, 'test-store');
    assert.isTrue(clearObjectStoreSpy.calledOnceWithExactly(
        {storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store'}));
  });

  it('calls protocol method on deleteEntries', async () => {
    const testKeyRange = {lower: undefined, lowerOpen: false, upper: undefined, upperOpen: true} as IDBKeyRange;
    const deleteEntriesSpy = sinon.spy(indexedDBAgent, 'invoke_deleteObjectStoreEntries');

    indexedDBModel.enable();
    void indexedDBModel.deleteEntries(testDBId, 'test-store', testKeyRange);
    assert.isTrue(deleteEntriesSpy.calledOnceWithExactly(
        {storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store', keyRange: testKeyRange}));
  });
});
