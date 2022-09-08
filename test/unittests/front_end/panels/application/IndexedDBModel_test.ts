// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  describeWithMockConnection,
  setMockConnectionResponseHandler,
} from '../../helpers/MockConnection.js';
import type * as ProtocolProxyApi from '../../../../../front_end/generated/protocol-proxy-api.js';

describeWithMockConnection('IndexedDBModel', () => {
  let indexedDBModel: Resources.IndexedDBModel.IndexedDBModel;
  let target: SDK.Target.Target;
  let indexedDBAgent: ProtocolProxyApi.IndexedDBApi;
  let manager: SDK.StorageKeyManager.StorageKeyManager|null;
  const testKey = 'test-storage-key/';
  const testDBId = new Resources.IndexedDBModel.DatabaseId(undefined, testKey, 'test-database');

  beforeEach(async () => {
    target = createTarget();
    indexedDBModel = new Resources.IndexedDBModel.IndexedDBModel(target);
    indexedDBAgent = target.indexedDBAgent();
    manager = target.model(SDK.StorageKeyManager.StorageKeyManager);
  });

  describe('StorageKeyAdded', () => {
    it('registers database only when the model is enabled', async () => {
      const databaseAdeddSpy = sinon.spy(indexedDBModel, 'dispatchEventToListeners');
      const dbNamePromise = new Promise<string>(resolve => {
        indexedDBModel.addEventListener(Resources.IndexedDBModel.Events.DatabaseAdded, event => {
          resolve(event.data.databaseId.name);
        });
      });
      setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: ['test-database']}));

      manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
      assert.isFalse(databaseAdeddSpy.calledWithExactly(
          Resources.IndexedDBModel.Events.DatabaseAdded as unknown as sinon.SinonMatcher,
          {model: indexedDBModel, databaseId: testDBId}));

      indexedDBModel.enable();
      manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
      assert.strictEqual(await dbNamePromise, 'test-database');
    });

    it('starts tracking database', () => {
      const trackIndexedDBSpy = sinon.spy(target.storageAgent(), 'invoke_trackIndexedDBForStorageKey' as never);

      indexedDBModel.enable();
      manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);

      assert.isTrue(trackIndexedDBSpy.calledOnceWithExactly({storageKey: testKey}));
    });
  });

  describe('StorageKeyRemoved', () => {
    it('stops tracking database', () => {
      const untrackIndexedDBSpy = sinon.spy(target.storageAgent(), 'invoke_untrackIndexedDBForStorageKey' as never);

      indexedDBModel.enable();
      manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
      manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyRemoved, testKey);

      assert.isTrue(untrackIndexedDBSpy.calledOnceWithExactly({storageKey: testKey}));
    });
  });

  it('calls protocol method on clearObjectStore', () => {
    const clearObjectStoreSpy = sinon.spy(indexedDBAgent, 'invoke_clearObjectStore');

    indexedDBModel.enable();
    void indexedDBModel.clearObjectStore(testDBId, 'test-store');
    assert.isTrue(clearObjectStoreSpy.calledOnceWithExactly(
        {storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store'}));
  });

  it('calls protocol method on deleteEntries', () => {
    const testKeyRange = {lower: undefined, lowerOpen: false, upper: undefined, upperOpen: true} as IDBKeyRange;
    const deleteEntriesSpy = sinon.spy(indexedDBAgent, 'invoke_deleteObjectStoreEntries');

    indexedDBModel.enable();
    void indexedDBModel.deleteEntries(testDBId, 'test-store', testKeyRange);
    assert.isTrue(deleteEntriesSpy.calledOnceWithExactly(
        {storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store', keyRange: testKeyRange}));
  });

  it('calls protocol method on refreshDatabaseNames and dispatches event', async () => {
    const requestDBNamesSpy = sinon.spy(indexedDBAgent, 'invoke_requestDatabaseNames');
    const dbRefreshedPromise = new Promise<void>(resolve => {
      indexedDBModel.addEventListener(Resources.IndexedDBModel.Events.DatabaseNamesRefreshed, () => {
        resolve();
      });
    });
    setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: ['test-database']}));
    indexedDBModel.enable();
    manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);

    void indexedDBModel.refreshDatabaseNames();

    assert.isTrue(requestDBNamesSpy.calledWithExactly({storageKey: testKey}));
    await dbRefreshedPromise;
  });

  it('doesn\'t add duplicate database for storage key if one already exists for security origin', async () => {
    const testSecurityOrigin = testKey.slice(0, -1);
    const testDBIDWithSecurityOrigin =
        new Resources.IndexedDBModel.DatabaseId(testSecurityOrigin, undefined, 'test-database');
    const securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    const databaseAddedSpy = sinon.spy(indexedDBModel, 'dispatchEventToListeners');
    setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: ['test-database']}));
    indexedDBModel.enable();

    // add security origin and refresh db names
    securityOriginManager?.dispatchEventToListeners(
        SDK.SecurityOriginManager.Events.SecurityOriginAdded, testSecurityOrigin);
    await indexedDBModel.refreshDatabaseNames();

    assert.isTrue(databaseAddedSpy.calledWithExactly(
        Resources.IndexedDBModel.Events.DatabaseAdded as unknown as sinon.SinonMatcher,
        {model: indexedDBModel, databaseId: testDBIDWithSecurityOrigin}));

    // add storage key supposed to be deduplicated and refresh db names
    manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
    await indexedDBModel.refreshDatabaseNames();

    assert.isFalse(databaseAddedSpy.calledWith(
        Resources.IndexedDBModel.Events.DatabaseAdded as unknown as sinon.SinonMatcher,
        {model: indexedDBModel, databaseId: testDBId}));
  });

  it('requests database with storage key on refreshDatabase', async () => {
    const requestDatabaseSpy = sinon.spy(indexedDBAgent, 'invoke_requestDatabase');
    indexedDBModel.enable();

    void indexedDBModel.refreshDatabase(testDBId);

    assert.isTrue(requestDatabaseSpy.calledOnceWithExactly({storageKey: testKey, databaseName: 'test-database'}));
  });

  it('requests data with storage key on loadObjectStoreData', () => {
    const requestDataSpy = sinon.spy(indexedDBAgent, 'invoke_requestData');
    indexedDBModel.enable();

    indexedDBModel.loadObjectStoreData(testDBId, 'test-store', null, 0, 50, () => {});

    assert.isTrue(requestDataSpy.calledOnceWithExactly({
      storageKey: testKey,
      databaseName: 'test-database',
      objectStoreName: 'test-store',
      indexName: '',
      skipCount: 0,
      pageSize: 50,
      keyRange: undefined,
    }));
  });

  it('calls protocol method on getMetadata', () => {
    const getMetadataSpy = sinon.spy(indexedDBAgent, 'invoke_getMetadata');
    indexedDBModel.enable();

    void indexedDBModel.getMetadata(testDBId, new Resources.IndexedDBModel.ObjectStore('test-store', null, false));

    assert.isTrue(getMetadataSpy.calledOnceWithExactly(
        {storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store'}));
  });
});
