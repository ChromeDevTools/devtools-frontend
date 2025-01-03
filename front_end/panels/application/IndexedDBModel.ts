/*
 * Copyright (C) 2012 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

const DEFAULT_BUCKET = '';  // Empty string is not a valid bucket name

export class IndexedDBModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
  private readonly storageBucketModel: SDK.StorageBucketsModel.StorageBucketsModel|null;
  private readonly indexedDBAgent: ProtocolProxyApi.IndexedDBApi;
  private readonly storageAgent: ProtocolProxyApi.StorageApi;
  private readonly databasesInternal: Map<DatabaseId, Database>;
  private databaseNamesByStorageKeyAndBucket: Map<string, Map<string, Set<DatabaseId>>>;
  private readonly updatedStorageBuckets: Set<Protocol.Storage.StorageBucket>;
  private readonly throttler: Common.Throttler.Throttler;
  private enabled?: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.storageBucketModel = target.model(SDK.StorageBucketsModel.StorageBucketsModel);
    this.indexedDBAgent = target.indexedDBAgent();
    this.storageAgent = target.storageAgent();

    this.databasesInternal = new Map();
    this.databaseNamesByStorageKeyAndBucket = new Map();

    this.updatedStorageBuckets = new Set();
    this.throttler = new Common.Throttler.Throttler(1000);
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static keyFromIDBKey(idbKey: any): Protocol.IndexedDB.Key|undefined {
    if (typeof (idbKey) === 'undefined' || idbKey === null) {
      return undefined;
    }

    let key: Protocol.IndexedDB.Key;
    switch (typeof (idbKey)) {
      case 'number':
        key = {
          type: Protocol.IndexedDB.KeyType.Number,
          number: idbKey,
        };
        break;
      case 'string':
        key = {
          type: Protocol.IndexedDB.KeyType.String,
          string: idbKey,
        };
        break;
      case 'object':
        if (idbKey instanceof Date) {
          key = {
            type: Protocol.IndexedDB.KeyType.Date,
            date: idbKey.getTime(),
          };
        } else if (Array.isArray(idbKey)) {
          const array = [];
          for (let i = 0; i < idbKey.length; ++i) {
            const nestedKey = IndexedDBModel.keyFromIDBKey(idbKey[i]);
            if (nestedKey) {
              array.push(nestedKey);
            }
          }
          key = {
            type: Protocol.IndexedDB.KeyType.Array,
            array,
          };
        } else {
          return undefined;
        }
        break;
      default:
        return undefined;
    }
    return key;
  }

  private static keyRangeFromIDBKeyRange(idbKeyRange: IDBKeyRange): Protocol.IndexedDB.KeyRange {
    return {
      lower: IndexedDBModel.keyFromIDBKey(idbKeyRange.lower),
      upper: IndexedDBModel.keyFromIDBKey(idbKeyRange.upper),
      lowerOpen: Boolean(idbKeyRange.lowerOpen),
      upperOpen: Boolean(idbKeyRange.upperOpen),
    };
  }

  static idbKeyPathFromKeyPath(keyPath: Protocol.IndexedDB.KeyPath): string|string[]|null|undefined {
    let idbKeyPath;
    switch (keyPath.type) {
      case Protocol.IndexedDB.KeyPathType.Null:
        idbKeyPath = null;
        break;
      case Protocol.IndexedDB.KeyPathType.String:
        idbKeyPath = keyPath.string;
        break;
      case Protocol.IndexedDB.KeyPathType.Array:
        idbKeyPath = keyPath.array;
        break;
    }
    return idbKeyPath;
  }

  static keyPathStringFromIDBKeyPath(idbKeyPath: string|string[]|null|undefined): string|null {
    if (typeof idbKeyPath === 'string') {
      return '"' + idbKeyPath + '"';
    }
    if (idbKeyPath instanceof Array) {
      return '["' + idbKeyPath.join('", "') + '"]';
    }
    return null;
  }

  enable(): void {
    if (this.enabled) {
      return;
    }

    void this.indexedDBAgent.invoke_enable();
    if (this.storageBucketModel) {
      this.storageBucketModel.addEventListener(
          SDK.StorageBucketsModel.Events.BUCKET_ADDED, this.storageBucketAdded, this);
      this.storageBucketModel.addEventListener(
          SDK.StorageBucketsModel.Events.BUCKET_REMOVED, this.storageBucketRemoved, this);
      for (const {bucket} of this.storageBucketModel.getBuckets()) {
        this.addStorageBucket(bucket);
      }
    }

    this.enabled = true;
  }

  clearForStorageKey(storageKey: string): void {
    if (!this.enabled || !this.databaseNamesByStorageKeyAndBucket.has(storageKey)) {
      return;
    }

    for (const [storageBucketName] of this.databaseNamesByStorageKeyAndBucket.get(storageKey) || []) {
      const storageBucket =
          this.storageBucketModel?.getBucketByName(storageKey, storageBucketName ?? undefined)?.bucket;
      if (storageBucket) {
        this.removeStorageBucket(storageBucket);
      }
    }
    this.databaseNamesByStorageKeyAndBucket.delete(storageKey);
    const bucketInfos = this.storageBucketModel?.getBucketsForStorageKey(storageKey) || [];
    for (const {bucket} of bucketInfos) {
      this.addStorageBucket(bucket);
    }
  }

  async deleteDatabase(databaseId: DatabaseId): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.indexedDBAgent.invoke_deleteDatabase(
        {storageBucket: databaseId.storageBucket, databaseName: databaseId.name});
    void this.loadDatabaseNamesByStorageBucket(databaseId.storageBucket);
  }

  async refreshDatabaseNames(): Promise<void> {
    for (const [storageKey] of this.databaseNamesByStorageKeyAndBucket) {
      const storageBucketNames = this.databaseNamesByStorageKeyAndBucket.get(storageKey)?.keys() || [];
      for (const storageBucketName of storageBucketNames) {
        const storageBucket =
            this.storageBucketModel?.getBucketByName(storageKey, storageBucketName ?? undefined)?.bucket;
        if (storageBucket) {
          await this.loadDatabaseNamesByStorageBucket(storageBucket);
        }
      }
    }
    this.dispatchEventToListeners(Events.DatabaseNamesRefreshed);
  }

  refreshDatabase(databaseId: DatabaseId): void {
    void this.loadDatabase(databaseId, true);
  }

  async clearObjectStore(databaseId: DatabaseId, objectStoreName: string): Promise<void> {
    await this.indexedDBAgent.invoke_clearObjectStore(
        {storageBucket: databaseId.storageBucket, databaseName: databaseId.name, objectStoreName});
  }

  async deleteEntries(databaseId: DatabaseId, objectStoreName: string, idbKeyRange: IDBKeyRange): Promise<void> {
    const keyRange = IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);
    await this.indexedDBAgent.invoke_deleteObjectStoreEntries(
        {storageBucket: databaseId.storageBucket, databaseName: databaseId.name, objectStoreName, keyRange});
  }

  private storageBucketAdded({data: {bucketInfo: {bucket}}}:
                                 Common.EventTarget.EventTargetEvent<SDK.StorageBucketsModel.BucketEvent>): void {
    this.addStorageBucket(bucket);
  }

  private storageBucketRemoved({data: {bucketInfo: {bucket}}}:
                                   Common.EventTarget.EventTargetEvent<SDK.StorageBucketsModel.BucketEvent>): void {
    this.removeStorageBucket(bucket);
  }

  private addStorageBucket(storageBucket: Protocol.Storage.StorageBucket): void {
    const {storageKey} = storageBucket;
    if (!this.databaseNamesByStorageKeyAndBucket.has(storageKey)) {
      this.databaseNamesByStorageKeyAndBucket.set(storageKey, new Map());
      void this.storageAgent.invoke_trackIndexedDBForStorageKey({storageKey});
    }
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageKey) || new Map();
    console.assert(!storageKeyBuckets.has(storageBucket.name ?? DEFAULT_BUCKET));
    storageKeyBuckets.set(storageBucket.name ?? DEFAULT_BUCKET, new Set());
    void this.loadDatabaseNamesByStorageBucket(storageBucket);
  }

  private removeStorageBucket(storageBucket: Protocol.Storage.StorageBucket): void {
    const {storageKey} = storageBucket;
    console.assert(this.databaseNamesByStorageKeyAndBucket.has(storageKey));
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageKey) || new Map();
    console.assert(storageKeyBuckets.has(storageBucket.name ?? DEFAULT_BUCKET));
    const databaseIds = storageKeyBuckets.get(storageBucket.name ?? DEFAULT_BUCKET) || new Map();
    for (const databaseId of databaseIds) {
      this.databaseRemovedForStorageBucket(databaseId);
    }
    storageKeyBuckets.delete(storageBucket.name ?? DEFAULT_BUCKET);
    if (storageKeyBuckets.size === 0) {
      this.databaseNamesByStorageKeyAndBucket.delete(storageKey);
      void this.storageAgent.invoke_untrackIndexedDBForStorageKey({storageKey});
    }
  }

  private updateStorageKeyDatabaseNames(storageBucket: Protocol.Storage.StorageBucket, databaseNames: string[]): void {
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageBucket.storageKey);
    if (storageKeyBuckets === undefined) {
      return;
    }

    const newDatabases = new Set(databaseNames.map(databaseName => new DatabaseId(storageBucket, databaseName)));
    const oldDatabases = new Set(storageKeyBuckets.get(storageBucket.name ?? DEFAULT_BUCKET));

    storageKeyBuckets.set(storageBucket.name ?? DEFAULT_BUCKET, newDatabases);

    for (const database of oldDatabases) {
      if (!database.inSet(newDatabases)) {
        this.databaseRemovedForStorageBucket(database);
      }
    }
    for (const database of newDatabases) {
      if (!database.inSet(oldDatabases)) {
        this.databaseAddedForStorageBucket(database);
      }
    }
  }

  databases(): DatabaseId[] {
    const result = [];
    for (const [, buckets] of this.databaseNamesByStorageKeyAndBucket) {
      for (const [, databases] of buckets) {
        for (const database of databases) {
          result.push(database);
        }
      }
    }
    return result;
  }

  private databaseAddedForStorageBucket(databaseId: DatabaseId): void {
    this.dispatchEventToListeners(Events.DatabaseAdded, {model: this, databaseId});
  }

  private databaseRemovedForStorageBucket(databaseId: DatabaseId): void {
    this.dispatchEventToListeners(Events.DatabaseRemoved, {model: this, databaseId});
  }

  private async loadDatabaseNamesByStorageBucket(storageBucket: Protocol.Storage.StorageBucket): Promise<string[]> {
    const {storageKey} = storageBucket;
    const {databaseNames} = await this.indexedDBAgent.invoke_requestDatabaseNames({storageBucket});
    if (!databaseNames) {
      return [];
    }
    if (!this.databaseNamesByStorageKeyAndBucket.has(storageKey)) {
      return [];
    }
    const storageKeyBuckets = this.databaseNamesByStorageKeyAndBucket.get(storageKey) || new Map();
    if (!storageKeyBuckets.has(storageBucket.name ?? DEFAULT_BUCKET)) {
      return [];
    }
    this.updateStorageKeyDatabaseNames(storageBucket, databaseNames);
    return databaseNames;
  }

  private async loadDatabase(databaseId: DatabaseId, entriesUpdated: boolean): Promise<void> {
    const databaseWithObjectStores = (await this.indexedDBAgent.invoke_requestDatabase({
                                       storageBucket: databaseId.storageBucket,
                                       databaseName: databaseId.name,
                                     })).databaseWithObjectStores;
    if (!this.databaseNamesByStorageKeyAndBucket.get(databaseId.storageBucket.storageKey)
             ?.has(databaseId.storageBucket.name ?? DEFAULT_BUCKET)) {
      return;
    }
    if (!databaseWithObjectStores) {
      return;
    }

    const databaseModel = new Database(databaseId, databaseWithObjectStores.version);
    this.databasesInternal.set(databaseId, databaseModel);
    for (const objectStore of databaseWithObjectStores.objectStores) {
      const objectStoreIDBKeyPath = IndexedDBModel.idbKeyPathFromKeyPath(objectStore.keyPath);
      const objectStoreModel = new ObjectStore(objectStore.name, objectStoreIDBKeyPath, objectStore.autoIncrement);
      for (let j = 0; j < objectStore.indexes.length; ++j) {
        const index = objectStore.indexes[j];
        const indexIDBKeyPath = IndexedDBModel.idbKeyPathFromKeyPath(index.keyPath);
        const indexModel = new Index(index.name, indexIDBKeyPath, index.unique, index.multiEntry);
        objectStoreModel.indexes.set(indexModel.name, indexModel);
      }
      databaseModel.objectStores.set(objectStoreModel.name, objectStoreModel);
    }

    this.dispatchEventToListeners(Events.DatabaseLoaded, {model: this, database: databaseModel, entriesUpdated});
  }

  loadObjectStoreData(
      databaseId: DatabaseId, objectStoreName: string, idbKeyRange: IDBKeyRange|null, skipCount: number,
      pageSize: number, callback: (arg0: Array<Entry>, arg1: boolean) => void): void {
    void this.requestData(databaseId, databaseId.name, objectStoreName, '', idbKeyRange, skipCount, pageSize, callback);
  }

  loadIndexData(
      databaseId: DatabaseId, objectStoreName: string, indexName: string, idbKeyRange: IDBKeyRange|null,
      skipCount: number, pageSize: number, callback: (arg0: Array<Entry>, arg1: boolean) => void): void {
    void this.requestData(
        databaseId, databaseId.name, objectStoreName, indexName, idbKeyRange, skipCount, pageSize, callback);
  }

  private async requestData(
      databaseId: DatabaseId, databaseName: string, objectStoreName: string, indexName: string,
      idbKeyRange: IDBKeyRange|null, skipCount: number, pageSize: number,
      callback: (arg0: Array<Entry>, arg1: boolean) => void): Promise<void> {
    const keyRange = idbKeyRange ? IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange) : undefined;
    const runtimeModel = this.target().model(SDK.RuntimeModel.RuntimeModel);
    const response = await this.indexedDBAgent.invoke_requestData({
      storageBucket: databaseId.storageBucket,
      databaseName,
      objectStoreName,
      indexName,
      skipCount,
      pageSize,
      keyRange,
    });
    if (!runtimeModel ||
        !this.databaseNamesByStorageKeyAndBucket.get(databaseId.storageBucket.storageKey)
             ?.has(databaseId.storageBucket.name ?? DEFAULT_BUCKET)) {
      return;
    }
    if (response.getError()) {
      console.error('IndexedDBAgent error: ' + response.getError());
      return;
    }

    const dataEntries = response.objectStoreDataEntries;
    const entries = [];
    for (const dataEntry of dataEntries) {
      const key = runtimeModel?.createRemoteObject(dataEntry.key);
      const primaryKey = runtimeModel?.createRemoteObject(dataEntry.primaryKey);
      const value = runtimeModel?.createRemoteObject(dataEntry.value);
      if (!key || !primaryKey || !value) {
        return;
      }
      entries.push(new Entry(key, primaryKey, value));
    }
    callback(entries, response.hasMore);
  }

  async getMetadata(databaseId: DatabaseId, objectStore: ObjectStore): Promise<ObjectStoreMetadata|null> {
    const databaseName = databaseId.name;
    const objectStoreName = objectStore.name;
    const response = await this.indexedDBAgent.invoke_getMetadata(
        {storageBucket: databaseId.storageBucket, databaseName, objectStoreName});

    if (response.getError()) {
      console.error('IndexedDBAgent error: ' + response.getError());
      return null;
    }
    return {entriesCount: response.entriesCount, keyGeneratorValue: response.keyGeneratorValue};
  }

  private async refreshDatabaseListForStorageBucket(storageBucket: Protocol.Storage.StorageBucket): Promise<void> {
    const databaseNames = await this.loadDatabaseNamesByStorageBucket(storageBucket);
    for (const databaseName of databaseNames) {
      void this.loadDatabase(new DatabaseId(storageBucket, databaseName), false);
    }
  }

  indexedDBListUpdated({storageKey, bucketId}: Protocol.Storage.IndexedDBListUpdatedEvent): void {
    const storageBucket = this.storageBucketModel?.getBucketById(bucketId)?.bucket;
    if (storageKey && storageBucket) {
      this.updatedStorageBuckets.add(storageBucket);
      void this.throttler.schedule(() => {
        const promises = Array.from(this.updatedStorageBuckets, storageBucket => {
          void this.refreshDatabaseListForStorageBucket(storageBucket);
        });
        this.updatedStorageBuckets.clear();
        return Promise.all(promises);
      });
    }
  }

  indexedDBContentUpdated({bucketId, databaseName, objectStoreName}: Protocol.Storage.IndexedDBContentUpdatedEvent):
      void {
    const storageBucket = this.storageBucketModel?.getBucketById(bucketId)?.bucket;
    if (storageBucket) {
      const databaseId = new DatabaseId(storageBucket, databaseName);
      this.dispatchEventToListeners(Events.IndexedDBContentUpdated, {databaseId, objectStoreName, model: this});
    }
  }
  attributionReportingTriggerRegistered(_event: Protocol.Storage.AttributionReportingTriggerRegisteredEvent): void {
  }

  cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void {
  }

  cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
  }

  interestGroupAuctionEventOccurred(_event: Protocol.Storage.InterestGroupAuctionEventOccurredEvent): void {
  }

  interestGroupAuctionNetworkRequestCreated(_event: Protocol.Storage.InterestGroupAuctionNetworkRequestCreatedEvent):
      void {
  }

  sharedStorageAccessed(_event: Protocol.Storage.SharedStorageAccessedEvent): void {
  }

  storageBucketCreatedOrUpdated(_event: Protocol.Storage.StorageBucketCreatedOrUpdatedEvent): void {
  }

  storageBucketDeleted(_event: Protocol.Storage.StorageBucketDeletedEvent): void {
  }

  attributionReportingSourceRegistered(_event: Protocol.Storage.AttributionReportingSourceRegisteredEvent): void {
  }
}

SDK.SDKModel.SDKModel.register(IndexedDBModel, {capabilities: SDK.Target.Capability.STORAGE, autostart: false});

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  DatabaseAdded = 'DatabaseAdded',
  DatabaseRemoved = 'DatabaseRemoved',
  DatabaseLoaded = 'DatabaseLoaded',
  DatabaseNamesRefreshed = 'DatabaseNamesRefreshed',
  IndexedDBContentUpdated = 'IndexedDBContentUpdated',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export type EventTypes = {
  [Events.DatabaseAdded]: {model: IndexedDBModel, databaseId: DatabaseId},
  [Events.DatabaseRemoved]: {model: IndexedDBModel, databaseId: DatabaseId},
  [Events.DatabaseLoaded]: {model: IndexedDBModel, database: Database, entriesUpdated: boolean},
  [Events.DatabaseNamesRefreshed]: void,
  [Events.IndexedDBContentUpdated]: {model: IndexedDBModel, databaseId: DatabaseId, objectStoreName: string},
};

export class Entry {
  key: SDK.RemoteObject.RemoteObject;
  primaryKey: SDK.RemoteObject.RemoteObject;
  value: SDK.RemoteObject.RemoteObject;

  constructor(
      key: SDK.RemoteObject.RemoteObject, primaryKey: SDK.RemoteObject.RemoteObject,
      value: SDK.RemoteObject.RemoteObject) {
    this.key = key;
    this.primaryKey = primaryKey;
    this.value = value;
  }
}

export class DatabaseId {
  readonly storageBucket: Protocol.Storage.StorageBucket;
  name: string;
  constructor(storageBucket: Protocol.Storage.StorageBucket, name: string) {
    this.storageBucket = storageBucket;
    this.name = name;
  }

  inBucket(storageBucket: Protocol.Storage.StorageBucket): boolean {
    return this.storageBucket.name === storageBucket.name;
  }

  equals(databaseId: DatabaseId): boolean {
    return this.name === databaseId.name && this.storageBucket.name === databaseId.storageBucket.name &&
        this.storageBucket.storageKey === databaseId.storageBucket.storageKey;
  }

  inSet(databaseSet: Set<DatabaseId>): boolean {
    for (const database of databaseSet) {
      if (this.equals(database)) {
        return true;
      }
    }
    return false;
  }
}

export class Database {
  databaseId: DatabaseId;
  version: number;
  objectStores: Map<string, ObjectStore>;
  constructor(databaseId: DatabaseId, version: number) {
    this.databaseId = databaseId;
    this.version = version;
    this.objectStores = new Map();
  }
}

export class ObjectStore {
  name: string;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyPath: any;
  autoIncrement: boolean;
  indexes: Map<string, Index>;

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(name: string, keyPath: any, autoIncrement: boolean) {
    this.name = name;
    this.keyPath = keyPath;
    this.autoIncrement = autoIncrement;
    this.indexes = new Map();
  }

  get keyPathString(): string {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // @ts-expect-error
    return IndexedDBModel.keyPathStringFromIDBKeyPath((this.keyPath as string));
  }
}

export class Index {
  name: string;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyPath: any;
  unique: boolean;
  multiEntry: boolean;
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(name: string, keyPath: any, unique: boolean, multiEntry: boolean) {
    this.name = name;
    this.keyPath = keyPath;
    this.unique = unique;
    this.multiEntry = multiEntry;
  }

  get keyPathString(): string {
    return IndexedDBModel.keyPathStringFromIDBKeyPath((this.keyPath as string)) as string;
  }
}
export interface ObjectStoreMetadata {
  entriesCount: number;
  keyGeneratorValue: number;
}
