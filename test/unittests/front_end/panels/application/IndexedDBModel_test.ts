// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as SDK from '../../../../../front_end/core/sdk/sdk.js';
import * as Resources from '../../../../../front_end/panels/application/application.js';
import {createTarget} from '../../helpers/EnvironmentHelpers.js';
import {
  clearMockConnectionResponseHandler,
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
  const testDBId = new Resources.IndexedDBModel.DatabaseId(testKey, 'test-database');

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

  it('calls protocol method on getMetadata', async () => {
    const getMetadataSpy = sinon.stub(indexedDBAgent, 'invoke_getMetadata')
                               .resolves({entriesCount: 0, keyGeneratorValue: 0, getError: () => undefined});
    indexedDBModel.enable();

    await indexedDBModel.getMetadata(testDBId, new Resources.IndexedDBModel.ObjectStore('test-store', null, false));

    assert.isTrue(getMetadataSpy.calledOnceWithExactly(
        {storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store'}));
  });

  it('dispatches event on indexedDBContentUpdated', () => {
    const dispatcherSpy = sinon.spy(indexedDBModel, 'dispatchEventToListeners');

    indexedDBModel.indexedDBContentUpdated(
        {origin: '', storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store'});

    assert.isTrue(dispatcherSpy.calledOnceWithExactly(
        Resources.IndexedDBModel.Events.IndexedDBContentUpdated as unknown as sinon.SinonMatcher,
        {databaseId: testDBId, objectStoreName: 'test-store', model: indexedDBModel}));
  });

  it('requests database names and loads db on indexedDBListUpdated', async () => {
    const requestDBNamesSpy = sinon.spy(indexedDBAgent, 'invoke_requestDatabaseNames');
    const databaseLoadedPromise = new Promise<void>(resolve => {
      indexedDBModel.addEventListener(Resources.IndexedDBModel.Events.DatabaseLoaded, () => {
        resolve();
      });
    });
    setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: ['test-database']}));
    setMockConnectionResponseHandler(
        'IndexedDB.requestDatabase',
        () => ({databaseWithObjectStores: {name: 'test-database', version: '1', objectStores: []}}));
    indexedDBModel.enable();
    manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);

    indexedDBModel.indexedDBListUpdated({origin: '', storageKey: testKey});

    assert.isTrue(requestDBNamesSpy.calledWithExactly({storageKey: testKey}));
    await databaseLoadedPromise;
  });

  it('gets databases added for storage key', async () => {
    const dbNames = ['test-database1', 'test-database2'];
    setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: dbNames}));
    indexedDBModel.enable();
    manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
    await indexedDBModel.refreshDatabaseNames();

    const databases = indexedDBModel.databases();

    assert.deepEqual(databases.map(db => db.name), dbNames);
  });

  it('calls protocol method on deleteDatabase', () => {
    const deleteDBSpy = sinon.spy(indexedDBAgent, 'invoke_deleteDatabase');
    setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: ['test-database']}));
    indexedDBModel.enable();
    manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);

    void indexedDBModel.deleteDatabase(testDBId);

    assert.isTrue(deleteDBSpy.calledOnceWithExactly({storageKey: testKey, databaseName: 'test-database'}));
  });

  it('removes databases for storage key on clearForStorageKey', async () => {
    const dbNames = ['test-database1', 'test-database-2'];
    setMockConnectionResponseHandler('IndexedDB.requestDatabaseNames', () => ({databaseNames: dbNames}));
    indexedDBModel.enable();
    manager?.dispatchEventToListeners(SDK.StorageKeyManager.Events.StorageKeyAdded, testKey);
    await indexedDBModel.refreshDatabaseNames();
    clearMockConnectionResponseHandler('IndexedDB.requestDatabaseNames');

    indexedDBModel.clearForStorageKey(testKey);

    assert.isEmpty(indexedDBModel.databases());
  });

  it('dispatches event with storage key on indexedDBContentUpdated when both storage key and origin are set', () => {
    const dispatcherSpy = sinon.spy(indexedDBModel, 'dispatchEventToListeners');

    indexedDBModel.indexedDBContentUpdated(
        {origin: 'test-origin', storageKey: testKey, databaseName: 'test-database', objectStoreName: 'test-store'});

    assert.isTrue(dispatcherSpy.calledOnceWithExactly(
        Resources.IndexedDBModel.Events.IndexedDBContentUpdated as unknown as sinon.SinonMatcher,
        {databaseId: testDBId, objectStoreName: 'test-store', model: indexedDBModel}));
  });

});
