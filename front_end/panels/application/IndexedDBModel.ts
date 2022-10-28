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

export class IndexedDBModel extends SDK.SDKModel.SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
  private readonly storageKeyManager: SDK.StorageKeyManager.StorageKeyManager|null;
  private readonly indexedDBAgent: ProtocolProxyApi.IndexedDBApi;
  private readonly storageAgent: ProtocolProxyApi.StorageApi;
  private readonly databasesInternal: Map<DatabaseId, Database>;
  private databaseNamesByStorageKey: Map<string, Set<string>>;
  private readonly updatedStorageKeys: Set<string>;
  private readonly throttler: Common.Throttler.Throttler;
  private enabled?: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
    this.indexedDBAgent = target.indexedDBAgent();
    this.storageAgent = target.storageAgent();

    this.databasesInternal = new Map();
    this.databaseNamesByStorageKey = new Map();

    this.updatedStorageKeys = new Set();
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
    if (this.storageKeyManager) {
      this.storageKeyManager.addEventListener(SDK.StorageKeyManager.Events.StorageKeyAdded, this.storageKeyAdded, this);
      this.storageKeyManager.addEventListener(
          SDK.StorageKeyManager.Events.StorageKeyRemoved, this.storageKeyRemoved, this);
      for (const storageKey of this.storageKeyManager.storageKeys()) {
        this.addStorageKey(storageKey);
      }
    }

    this.enabled = true;
  }

  clearForStorageKey(storageKey: string): void {
    if (!this.enabled || !this.databaseNamesByStorageKey.has(storageKey)) {
      return;
    }

    this.removeStorageKey(storageKey);
    this.addStorageKey(storageKey);
  }

  async deleteDatabase(databaseId: DatabaseId): Promise<void> {
    if (!this.enabled) {
      return;
    }
    await this.indexedDBAgent.invoke_deleteDatabase({storageKey: databaseId.storageKey, databaseName: databaseId.name});
    void this.loadDatabaseNamesByStorageKey(databaseId.storageKey);
  }

  async refreshDatabaseNames(): Promise<void> {
    for (const storageKey of this.databaseNamesByStorageKey.keys()) {
      await this.loadDatabaseNamesByStorageKey(storageKey);
    }
    this.dispatchEventToListeners(Events.DatabaseNamesRefreshed);
  }

  refreshDatabase(databaseId: DatabaseId): void {
    void this.loadDatabase(databaseId, true);
  }

  async clearObjectStore(databaseId: DatabaseId, objectStoreName: string): Promise<void> {
    await this.indexedDBAgent.invoke_clearObjectStore(
        {storageKey: databaseId.storageKey, databaseName: databaseId.name, objectStoreName});
  }

  async deleteEntries(databaseId: DatabaseId, objectStoreName: string, idbKeyRange: IDBKeyRange): Promise<void> {
    const keyRange = IndexedDBModel.keyRangeFromIDBKeyRange(idbKeyRange);
    await this.indexedDBAgent.invoke_deleteObjectStoreEntries(
        {storageKey: databaseId.storageKey, databaseName: databaseId.name, objectStoreName, keyRange});
  }

  private storageKeyAdded(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.addStorageKey(event.data);
  }

  private storageKeyRemoved(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.removeStorageKey(event.data);
  }

  private addStorageKey(storageKey: string): void {
    console.assert(!this.databaseNamesByStorageKey.has(storageKey));
    this.databaseNamesByStorageKey.set(storageKey, new Set());
    void this.loadDatabaseNamesByStorageKey(storageKey);
    void this.storageAgent.invoke_trackIndexedDBForStorageKey({storageKey});
  }

  private removeStorageKey(storageKey: string): void {
    console.assert(this.databaseNamesByStorageKey.has(storageKey));
    for (const name of this.databaseNamesByStorageKey.get(storageKey) || []) {
      this.databaseRemovedForStorageKey(storageKey, name);
    }
    this.databaseNamesByStorageKey.delete(storageKey);
    void this.storageAgent.invoke_untrackIndexedDBForStorageKey({storageKey});
  }

  private updateStorageKeyDatabaseNames(storageKey: string, databaseNames: string[]): void {
    const newDatabaseNames = new Set(databaseNames);
    const oldDatabaseNames = new Set(this.databaseNamesByStorageKey.get(storageKey));

    this.databaseNamesByStorageKey.set(storageKey, newDatabaseNames);

    for (const databaseName of oldDatabaseNames) {
      if (!newDatabaseNames.has(databaseName)) {
        this.databaseRemovedForStorageKey(storageKey, databaseName);
      }
    }
    for (const databaseName of newDatabaseNames) {
      if (!oldDatabaseNames.has(databaseName)) {
        this.databaseAddedForStorageKey(storageKey, databaseName);
      }
    }
  }

  databases(): DatabaseId[] {
    const result = [];
    for (const [storageKey, databaseNames] of this.databaseNamesByStorageKey) {
      for (const name of databaseNames) {
        result.push(new DatabaseId(storageKey, name));
      }
    }
    return result;
  }

  private databaseAddedForStorageKey(storageKey: string, databaseName: string): void {
    const databaseId = new DatabaseId(storageKey, databaseName);
    this.dispatchEventToListeners(Events.DatabaseAdded, {model: this, databaseId: databaseId});
  }

  private databaseRemovedForStorageKey(storageKey: string, databaseName: string): void {
    const databaseId = new DatabaseId(storageKey, databaseName);
    this.dispatchEventToListeners(Events.DatabaseRemoved, {model: this, databaseId: databaseId});
  }

  private async loadDatabaseNamesByStorageKey(storageKey: string): Promise<string[]> {
    const {databaseNames} = await this.indexedDBAgent.invoke_requestDatabaseNames({storageKey});
    if (!databaseNames) {
      return [];
    }
    if (!this.databaseNamesByStorageKey.has(storageKey)) {
      return [];
    }
    this.updateStorageKeyDatabaseNames(storageKey, databaseNames);
    return databaseNames;
  }

  private async loadDatabase(databaseId: DatabaseId, entriesUpdated: boolean): Promise<void> {
    const databaseWithObjectStores = (await this.indexedDBAgent.invoke_requestDatabase({
                                       storageKey: databaseId.storageKey,
                                       databaseName: databaseId.name,
                                     })).databaseWithObjectStores;
    if (!this.databaseNamesByStorageKey.has(databaseId.storageKey)) {
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

    this.dispatchEventToListeners(
        Events.DatabaseLoaded, {model: this, database: databaseModel, entriesUpdated: entriesUpdated});
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
      storageKey: databaseId.storageKey,
      databaseName,
      objectStoreName,
      indexName,
      skipCount,
      pageSize,
      keyRange,
    });
    if (!runtimeModel || !this.databaseNamesByStorageKey.has(databaseId.storageKey)) {
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
        {storageKey: databaseId.storageKey, databaseName, objectStoreName});

    if (response.getError()) {
      console.error('IndexedDBAgent error: ' + response.getError());
      return null;
    }
    return {entriesCount: response.entriesCount, keyGeneratorValue: response.keyGeneratorValue};
  }

  private async refreshDatabaseListForStorageKey(storageKey: string): Promise<void> {
    const databaseNames = await this.loadDatabaseNamesByStorageKey(storageKey);
    for (const databaseName of databaseNames) {
      void this.loadDatabase(new DatabaseId(storageKey, databaseName), false);
    }
  }

  indexedDBListUpdated({storageKey: storageKey}: Protocol.Storage.IndexedDBListUpdatedEvent): void {
    if (storageKey) {
      this.updatedStorageKeys.add(storageKey);
      void this.throttler.schedule(() => {
        const promises = Array.from(this.updatedStorageKeys, storageKey => {
          void this.refreshDatabaseListForStorageKey(storageKey);
        });
        this.updatedStorageKeys.clear();
        return Promise.all(promises);
      });
    }
  }

  indexedDBContentUpdated({storageKey, databaseName, objectStoreName}: Protocol.Storage.IndexedDBContentUpdatedEvent):
      void {
    const databaseId = new DatabaseId(storageKey, databaseName);
    this.dispatchEventToListeners(
        Events.IndexedDBContentUpdated, {databaseId: databaseId, objectStoreName: objectStoreName, model: this});
  }

  cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void {
  }

  cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
  }

  sharedStorageAccessed(_event: Protocol.Storage.SharedStorageAccessedEvent): void {
  }
}

SDK.SDKModel.SDKModel.register(IndexedDBModel, {capabilities: SDK.Target.Capability.Storage, autostart: false});

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DatabaseAdded = 'DatabaseAdded',
  DatabaseRemoved = 'DatabaseRemoved',
  DatabaseLoaded = 'DatabaseLoaded',
  DatabaseNamesRefreshed = 'DatabaseNamesRefreshed',
  IndexedDBContentUpdated = 'IndexedDBContentUpdated',
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
  readonly storageKey: string;
  name: string;
  constructor(storageKey: string, name: string) {
    this.storageKey = storageKey;
    this.name = name;
  }

  equals(databaseId: DatabaseId): boolean {
    return this.name === databaseId.name && this.storageKey === databaseId.storageKey;
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
