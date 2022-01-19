// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type {NameValue} from './NetworkRequest.js';
import type {Target} from './Target.js';
import {Capability} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {Events as SecurityOriginManagerEvents, SecurityOriginManager} from './SecurityOriginManager.js';

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
  readonly #securityOriginManager: SecurityOriginManager;

  readonly #cachesInternal = new Map<string, Cache>();
  readonly #originsUpdated = new Set<string>();
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
    this.#securityOriginManager = (target.model(SecurityOriginManager) as SecurityOriginManager);
  }

  enable(): void {
    if (this.#enabled) {
      return;
    }

    this.#securityOriginManager.addEventListener(
        SecurityOriginManagerEvents.SecurityOriginAdded, this.securityOriginAdded, this);
    this.#securityOriginManager.addEventListener(
        SecurityOriginManagerEvents.SecurityOriginRemoved, this.securityOriginRemoved, this);

    for (const securityOrigin of this.#securityOriginManager.securityOrigins()) {
      this.addOrigin(securityOrigin);
    }
    this.#enabled = true;
  }

  clearForOrigin(origin: string): void {
    this.removeOrigin(origin);
    this.addOrigin(origin);
  }

  refreshCacheNames(): void {
    for (const cache of this.#cachesInternal.values()) {
      this.cacheRemoved(cache);
    }
    this.#cachesInternal.clear();
    const securityOrigins = this.#securityOriginManager.securityOrigins();
    for (const securityOrigin of securityOrigins) {
      void this.loadCacheNames(securityOrigin);
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
      this.#securityOriginManager.removeEventListener(
          SecurityOriginManagerEvents.SecurityOriginAdded, this.securityOriginAdded, this);
      this.#securityOriginManager.removeEventListener(
          SecurityOriginManagerEvents.SecurityOriginRemoved, this.securityOriginRemoved, this);
    }
  }

  private addOrigin(securityOrigin: string): void {
    void this.loadCacheNames(securityOrigin);
    if (this.isValidSecurityOrigin(securityOrigin)) {
      void this.#storageAgent.invoke_trackCacheStorageForOrigin({origin: securityOrigin});
    }
  }

  private removeOrigin(securityOrigin: string): void {
    for (const [opaqueId, cache] of this.#cachesInternal.entries()) {
      if (cache.securityOrigin === securityOrigin) {
        this.#cachesInternal.delete((opaqueId as string));
        this.cacheRemoved((cache as Cache));
      }
    }
    if (this.isValidSecurityOrigin(securityOrigin)) {
      void this.#storageAgent.invoke_untrackCacheStorageForOrigin({origin: securityOrigin});
    }
  }

  private isValidSecurityOrigin(securityOrigin: string): boolean {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(securityOrigin);
    return parsedURL !== null && parsedURL.scheme.startsWith('http');
  }

  private async loadCacheNames(securityOrigin: string): Promise<void> {
    const response = await this.cacheAgent.invoke_requestCacheNames({securityOrigin: securityOrigin});
    if (response.getError()) {
      return;
    }
    this.updateCacheNames(securityOrigin, response.caches);
  }

  private updateCacheNames(securityOrigin: string, cachesJson: Protocol.CacheStorage.Cache[]): void {
    function deleteAndSaveOldCaches(this: ServiceWorkerCacheModel, cache: Cache): void {
      if (cache.securityOrigin === securityOrigin && !updatingCachesIds.has(cache.cacheId)) {
        oldCaches.set(cache.cacheId, cache);
        this.#cachesInternal.delete(cache.cacheId);
      }
    }

    const updatingCachesIds = new Set<string>();
    const newCaches = new Map<string, Cache>();
    const oldCaches = new Map<string, Cache>();

    for (const cacheJson of cachesJson) {
      const cache = new Cache(this, cacheJson.securityOrigin, cacheJson.cacheName, cacheJson.cacheId);
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

  private securityOriginAdded(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.addOrigin(event.data);
  }

  private securityOriginRemoved(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.removeOrigin(event.data);
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

  cacheStorageListUpdated({origin}: Protocol.Storage.CacheStorageListUpdatedEvent): void {
    this.#originsUpdated.add(origin);

    void this.#throttler.schedule(() => {
      const promises = Array.from(this.#originsUpdated, origin => this.loadCacheNames(origin));
      this.#originsUpdated.clear();
      return Promise.all(promises);
    }, this.#scheduleAsSoonAsPossible);
  }

  cacheStorageContentUpdated({origin, cacheName}: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
    this.dispatchEventToListeners(Events.CacheStorageContentUpdated, {origin, cacheName});
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
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
  origin: string;
  cacheName: string;
}

export type EventTypes = {
  [Events.CacheAdded]: CacheEvent,
  [Events.CacheRemoved]: CacheEvent,
  [Events.CacheStorageContentUpdated]: CacheStorageContentUpdatedEvent,
};

export class Cache {
  readonly #model: ServiceWorkerCacheModel;
  securityOrigin: string;
  cacheName: string;
  cacheId: Protocol.CacheStorage.CacheId;

  constructor(
      model: ServiceWorkerCacheModel, securityOrigin: string, cacheName: string,
      cacheId: Protocol.CacheStorage.CacheId) {
    this.#model = model;
    this.securityOrigin = securityOrigin;
    this.cacheName = cacheName;
    this.cacheId = cacheId;
  }

  equals(cache: Cache): boolean {
    return this.cacheId === cache.cacheId;
  }

  toString(): string {
    return this.securityOrigin + this.cacheName;
  }

  async requestCachedResponse(url: string, requestHeaders: NameValue[]):
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
