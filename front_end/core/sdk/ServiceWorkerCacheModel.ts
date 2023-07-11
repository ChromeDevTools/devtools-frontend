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

import {Events as StorageBucketsModelEvents, StorageBucketsModel, type BucketEvent} from './StorageBucketsModel.js';

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
  readonly #storageBucketModel: StorageBucketsModel;

  readonly #cachesInternal = new Map<string, Cache>();
  readonly #storageKeysTracked = new Set<string>();
  readonly #storageBucketsUpdated = new Set<Protocol.Storage.StorageBucket>();
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
    this.#storageBucketModel = (target.model(StorageBucketsModel) as StorageBucketsModel);
  }

  enable(): void {
    if (this.#enabled) {
      return;
    }

    this.#storageBucketModel.addEventListener(StorageBucketsModelEvents.BucketAdded, this.storageBucketAdded, this);
    this.#storageBucketModel.addEventListener(StorageBucketsModelEvents.BucketRemoved, this.storageBucketRemoved, this);

    for (const storageBucket of this.#storageBucketModel.getBuckets()) {
      this.addStorageBucket(storageBucket.bucket);
    }
    this.#enabled = true;
  }

  clearForStorageKey(storageKey: string): void {
    for (const [opaqueId, cache] of this.#cachesInternal.entries()) {
      if (cache.storageKey === storageKey) {
        this.#cachesInternal.delete((opaqueId as string));
        this.cacheRemoved((cache as Cache));
      }
    }
    for (const storageBucket of this.#storageBucketModel.getBucketsForStorageKey(storageKey)) {
      void this.loadCacheNames(storageBucket.bucket);
    }
  }

  refreshCacheNames(): void {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    const storageBuckets = this.#storageBucketModel.getBuckets();
    for (const storageBucket of storageBuckets) {
      void this.loadCacheNames(storageBucket.bucket);
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

  override dispose(): void {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    if (this.#enabled) {
      this.#storageBucketModel.removeEventListener(
          StorageBucketsModelEvents.BucketAdded, this.storageBucketAdded, this);
      this.#storageBucketModel.removeEventListener(
          StorageBucketsModelEvents.BucketRemoved, this.storageBucketRemoved, this);
    }
  }

  private addStorageBucket(storageBucket: Protocol.Storage.StorageBucket): void {
    void this.loadCacheNames(storageBucket);
    if (!this.#storageKeysTracked.has(storageBucket.storageKey)) {
      this.#storageKeysTracked.add(storageBucket.storageKey);
      void this.#storageAgent.invoke_trackCacheStorageForStorageKey({storageKey: storageBucket.storageKey});
    }
  }

  private removeStorageBucket(storageBucket: Protocol.Storage.StorageBucket): void {
    let storageKeyCount = 0;
    for (const [opaqueId, cache] of this.#cachesInternal.entries()) {
      if (storageBucket.storageKey === cache.storageKey) {
        storageKeyCount++;
      }
      if (cache.inBucket(storageBucket)) {
        storageKeyCount--;
        this.#cachesInternal.delete((opaqueId as string));
        this.cacheRemoved((cache as Cache));
      }
    }
    if (storageKeyCount === 0) {
      this.#storageKeysTracked.delete(storageBucket.storageKey);
      void this.#storageAgent.invoke_untrackCacheStorageForStorageKey({storageKey: storageBucket.storageKey});
    }
  }

  private async loadCacheNames(storageBucket: Protocol.Storage.StorageBucket): Promise<void> {
    const response = await this.cacheAgent.invoke_requestCacheNames({storageBucket});
    if (response.getError()) {
      return;
    }
    this.updateCacheNames(storageBucket, response.caches);
  }

  private updateCacheNames(storageBucket: Protocol.Storage.StorageBucket, cachesJson: Protocol.CacheStorage.Cache[]):
      void {
    function deleteAndSaveOldCaches(this: ServiceWorkerCacheModel, cache: Cache): void {
      if (cache.inBucket(storageBucket) && !updatingCachesIds.has(cache.cacheId)) {
        oldCaches.set(cache.cacheId, cache);
        this.#cachesInternal.delete(cache.cacheId);
      }
    }

    const updatingCachesIds = new Set<string>();
    const newCaches = new Map<string, Cache>();
    const oldCaches = new Map<string, Cache>();

    for (const cacheJson of cachesJson) {
      const storageBucket = cacheJson.storageBucket ??
          this.#storageBucketModel.getDefaultBucketForStorageKey(cacheJson.storageKey)?.bucket;
      if (!storageBucket) {
        continue;
      }
      const cache = new Cache(this, storageBucket, cacheJson.cacheName, cacheJson.cacheId);
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

  private storageBucketAdded({data: {bucketInfo: {bucket}}}: Common.EventTarget.EventTargetEvent<BucketEvent>): void {
    this.addStorageBucket(bucket);
  }

  private storageBucketRemoved({data: {bucketInfo: {bucket}}}: Common.EventTarget.EventTargetEvent<BucketEvent>): void {
    this.removeStorageBucket(bucket);
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

  cacheStorageListUpdated({bucketId}: Protocol.Storage.CacheStorageListUpdatedEvent): void {
    const storageBucket = this.#storageBucketModel.getBucketById(bucketId)?.bucket;
    if (storageBucket) {
      this.#storageBucketsUpdated.add(storageBucket);

      void this.#throttler.schedule(() => {
        const promises = Array.from(this.#storageBucketsUpdated, storageBucket => this.loadCacheNames(storageBucket));
        this.#storageBucketsUpdated.clear();
        return Promise.all(promises);
      }, this.#scheduleAsSoonAsPossible);
    }
  }

  cacheStorageContentUpdated({bucketId, cacheName}: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
    const storageBucket = this.#storageBucketModel.getBucketById(bucketId)?.bucket;
    if (storageBucket) {
      this.dispatchEventToListeners(Events.CacheStorageContentUpdated, {storageBucket, cacheName});
    }
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
  }

  sharedStorageAccessed(_event: Protocol.Storage.SharedStorageAccessedEvent): void {
  }

  storageBucketCreatedOrUpdated(_event: Protocol.Storage.StorageBucketCreatedOrUpdatedEvent): void {
  }

  storageBucketDeleted(_event: Protocol.Storage.StorageBucketDeletedEvent): void {
  }

  setThrottlerSchedulesAsSoonAsPossibleForTest(): void {
    this.#scheduleAsSoonAsPossible = true;
  }

  attributionReportingSourceRegistered(_event: Protocol.Storage.AttributionReportingSourceRegisteredEvent): void {
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
  storageBucket: Protocol.Storage.StorageBucket;
  cacheName: string;
}

export type EventTypes = {
  [Events.CacheAdded]: CacheEvent,
  [Events.CacheRemoved]: CacheEvent,
  [Events.CacheStorageContentUpdated]: CacheStorageContentUpdatedEvent,
};

export class Cache {
  readonly #model: ServiceWorkerCacheModel;
  storageKey: string;
  storageBucket: Protocol.Storage.StorageBucket;
  cacheName: string;
  cacheId: Protocol.CacheStorage.CacheId;

  constructor(
      model: ServiceWorkerCacheModel, storageBucket: Protocol.Storage.StorageBucket, cacheName: string,
      cacheId: Protocol.CacheStorage.CacheId) {
    this.#model = model;
    this.storageBucket = storageBucket;
    this.storageKey = storageBucket.storageKey;
    this.cacheName = cacheName;
    this.cacheId = cacheId;
  }

  inBucket(storageBucket: Protocol.Storage.StorageBucket): boolean {
    return this.storageKey === storageBucket.storageKey && this.storageBucket.name === storageBucket.name;
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
