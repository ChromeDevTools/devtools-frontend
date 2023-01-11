// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as Platform from '../platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {type NameValue} from './NetworkRequest.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {Events as StorageKeyManagerEvents, StorageKeyManager} from './StorageKeyManager.js';

const UIStrings = {
  /**
   *@description Text in Service Worker Cache Model
   *@example {https://cache} PH1
   *@example {error message} PH2
   */
  serviceworkercacheagentError: '`ServiceWorkerCacheAgent` error deleting cache entry {PH1} in cache: {PH2}',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/ServiceWorkerCacheModel.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class ServiceWorkerCacheModel extends SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
  readonly cacheAgent: ProtocolProxyApi.CacheStorageApi;
  readonly #storageAgent: ProtocolProxyApi.StorageApi;
  readonly #storageKeyManager: StorageKeyManager;

  readonly #cachesInternal = new Map<string, Cache>();
  readonly #storageKeysUpdated = new Set<string>();
  readonly #throttler = new Common.Throttler.Throttler(2000);
  #enabled = false;

  // Used by tests to remove the Throttler timeout.
  #scheduleAsSoonAsPossible = false;

  /**
   * Invariant: This #model can only be constructed on a ServiceWorker target.
   */
  constructor(target: Target) {
    super(target);
    target.registerStorageDispatcher(this);

    this.cacheAgent = target.cacheStorageAgent();
    this.#storageAgent = target.storageAgent();
    this.#storageKeyManager = (target.model(StorageKeyManager) as StorageKeyManager);
  }

  enable(): void {
    if (this.#enabled) {
      return;
    }

    this.#storageKeyManager.addEventListener(StorageKeyManagerEvents.StorageKeyAdded, this.storageKeyAdded, this);
    this.#storageKeyManager.addEventListener(StorageKeyManagerEvents.StorageKeyRemoved, this.storageKeyRemoved, this);

    for (const storageKey of this.#storageKeyManager.storageKeys()) {
      this.addStorageKey(storageKey);
    }
    this.#enabled = true;
  }

  clearForStorageKey(storageKey: string): void {
    this.removeStorageKey(storageKey);
    this.addStorageKey(storageKey);
  }

  refreshCacheNames(): void {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    const storageKeys = this.#storageKeyManager.storageKeys();
    for (const storageKey of storageKeys) {
      void this.loadCacheNames(storageKey);
    }
  }

  async deleteCache(cache: Cache): Promise<void> {
    const response = await this.cacheAgent.invoke_deleteCache({cacheId: cache.cacheId});
    if (response.getError()) {
      console.error(`ServiceWorkerCacheAgent error deleting cache ${cache.toString()}: ${response.getError()}`);
      return;
    }
    this.#cachesInternal.delete(cache.cacheId);
    this.cacheRemoved(cache);
  }

  async deleteCacheEntry(cache: Cache, request: string): Promise<void> {
    const response = await this.cacheAgent.invoke_deleteEntry({cacheId: cache.cacheId, request});
    if (response.getError()) {
      Common.Console.Console.instance().error(i18nString(
          UIStrings.serviceworkercacheagentError, {PH1: cache.toString(), PH2: String(response.getError())}));
      return;
    }
  }

  loadCacheData(
      cache: Cache, skipCount: number, pageSize: number, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): void {
    void this.requestEntries(cache, skipCount, pageSize, pathFilter, callback);
  }

  loadAllCacheData(
      cache: Cache, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): void {
    void this.requestAllEntries(cache, pathFilter, callback);
  }

  caches(): Cache[] {
    const caches = new Array();
    for (const cache of this.#cachesInternal.values()) {
      caches.push(cache);
    }
    return caches;
  }

  dispose(): void {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    if (this.#enabled) {
      this.#storageKeyManager.removeEventListener(StorageKeyManagerEvents.StorageKeyAdded, this.storageKeyAdded, this);
      this.#storageKeyManager.removeEventListener(
          StorageKeyManagerEvents.StorageKeyRemoved, this.storageKeyRemoved, this);
    }
  }

  private addStorageKey(storageKey: string): void {
    void this.loadCacheNames(storageKey);
    void this.#storageAgent.invoke_trackCacheStorageForStorageKey({storageKey});
  }

  private removeStorageKey(storageKey: string): void {
    for (const [opaqueId, cache] of this.#cachesInternal.entries()) {
      if (cache.storageKey === storageKey) {
        this.#cachesInternal.delete((opaqueId as string));
        this.cacheRemoved((cache as Cache));
      }
    }
    void this.#storageAgent.invoke_untrackCacheStorageForStorageKey({storageKey});
  }

  private async loadCacheNames(storageKey: string): Promise<void> {
    const response = await this.cacheAgent.invoke_requestCacheNames({storageKey});
    if (response.getError()) {
      return;
    }
    this.updateCacheNames(storageKey, response.caches);
  }

  private updateCacheNames(storageKey: string|undefined, cachesJson: Protocol.CacheStorage.Cache[]): void {
    function deleteAndSaveOldCaches(this: ServiceWorkerCacheModel, cache: Cache): void {
      if (cache.storageKey === storageKey && !updatingCachesIds.has(cache.cacheId)) {
        oldCaches.set(cache.cacheId, cache);
        this.#cachesInternal.delete(cache.cacheId);
      }
    }

    const updatingCachesIds = new Set<string>();
    const newCaches = new Map<string, Cache>();
    const oldCaches = new Map<string, Cache>();

    for (const cacheJson of cachesJson) {
      const cache = new Cache(this, cacheJson.storageKey, cacheJson.cacheName, cacheJson.cacheId);
      updatingCachesIds.add(cache.cacheId);
      if (this.#cachesInternal.has(cache.cacheId)) {
        continue;
      }
      newCaches.set(cache.cacheId, cache);
      this.#cachesInternal.set(cache.cacheId, cache);
    }
    this.#cachesInternal.forEach(deleteAndSaveOldCaches, this);
    newCaches.forEach(this.cacheAdded, this);
    oldCaches.forEach(this.cacheRemoved, this);
  }

  private storageKeyAdded(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.addStorageKey(event.data);
  }

  private storageKeyRemoved(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.removeStorageKey(event.data);
  }

  private cacheAdded(cache: Cache): void {
    this.dispatchEventToListeners(Events.CacheAdded, {model: this, cache: cache});
  }

  private cacheRemoved(cache: Cache): void {
    this.dispatchEventToListeners(Events.CacheRemoved, {model: this, cache: cache});
  }

  private async requestEntries(
      cache: Cache, skipCount: number, pageSize: number, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): Promise<void> {
    const response =
        await this.cacheAgent.invoke_requestEntries({cacheId: cache.cacheId, skipCount, pageSize, pathFilter});
    if (response.getError()) {
      console.error('ServiceWorkerCacheAgent error while requesting entries: ', response.getError());
      return;
    }
    callback(response.cacheDataEntries, response.returnCount);
  }

  private async requestAllEntries(
      cache: Cache, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): Promise<void> {
    const response = await this.cacheAgent.invoke_requestEntries({cacheId: cache.cacheId, pathFilter});
    if (response.getError()) {
      console.error('ServiceWorkerCacheAgent error while requesting entries: ', response.getError());
      return;
    }
    callback(response.cacheDataEntries, response.returnCount);
  }

  cacheStorageListUpdated({storageKey}: Protocol.Storage.CacheStorageListUpdatedEvent): void {
    this.#storageKeysUpdated.add(storageKey);

    void this.#throttler.schedule(() => {
      const promises = Array.from(this.#storageKeysUpdated, key => this.loadCacheNames(key));
      this.#storageKeysUpdated.clear();
      return Promise.all(promises);
    }, this.#scheduleAsSoonAsPossible);
  }

  cacheStorageContentUpdated({storageKey, cacheName}: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
    this.dispatchEventToListeners(Events.CacheStorageContentUpdated, {storageKey, cacheName});
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
  }

  sharedStorageAccessed(_event: Protocol.Storage.SharedStorageAccessedEvent): void {
  }

  setThrottlerSchedulesAsSoonAsPossibleForTest(): void {
    this.#scheduleAsSoonAsPossible = true;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  CacheAdded = 'CacheAdded',
  CacheRemoved = 'CacheRemoved',
  CacheStorageContentUpdated = 'CacheStorageContentUpdated',
}

export interface CacheEvent {
  model: ServiceWorkerCacheModel;
  cache: Cache;
}

export interface CacheStorageContentUpdatedEvent {
  storageKey: string;
  cacheName: string;
}

export type EventTypes = {
  [Events.CacheAdded]: CacheEvent,
  [Events.CacheRemoved]: CacheEvent,
  [Events.CacheStorageContentUpdated]: CacheStorageContentUpdatedEvent,
};

export class Cache {
  readonly #model: ServiceWorkerCacheModel;
  storageKey?: string;
  cacheName: string;
  cacheId: Protocol.CacheStorage.CacheId;

  constructor(
      model: ServiceWorkerCacheModel, storageKey: string|undefined, cacheName: string,
      cacheId: Protocol.CacheStorage.CacheId) {
    this.#model = model;
    this.storageKey = storageKey;
    this.cacheName = cacheName;
    this.cacheId = cacheId;
  }

  equals(cache: Cache): boolean {
    return this.cacheId === cache.cacheId;
  }

  toString(): string {
    return this.storageKey + this.cacheName;
  }

  async requestCachedResponse(url: Platform.DevToolsPath.UrlString, requestHeaders: NameValue[]):
      Promise<Protocol.CacheStorage.CachedResponse|null> {
    const response = await this.#model.cacheAgent.invoke_requestCachedResponse(
        {cacheId: this.cacheId, requestURL: url, requestHeaders});
    if (response.getError()) {
      return null;
    }
    return response.response;
  }
}

SDKModel.register(ServiceWorkerCacheModel, {capabilities: Capability.Storage, autostart: false});
