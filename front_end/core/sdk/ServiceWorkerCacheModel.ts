// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import type {NameValue} from './NetworkRequest.js'; // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';  // eslint-disable-line no-unused-vars
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

export class ServiceWorkerCacheModel extends SDKModel implements ProtocolProxyApi.StorageDispatcher {
  _caches: Map<string, Cache>;
  _cacheAgent: ProtocolProxyApi.CacheStorageApi;
  _storageAgent: ProtocolProxyApi.StorageApi;
  _securityOriginManager: SecurityOriginManager;
  _originsUpdated: Set<string>;
  _throttler: Common.Throttler.Throttler;
  _enabled: boolean;

  /**
   * Invariant: This model can only be constructed on a ServiceWorker target.
   */
  constructor(target: Target) {
    super(target);
    target.registerStorageDispatcher(this);

    this._caches = new Map();

    this._cacheAgent = target.cacheStorageAgent();
    this._storageAgent = target.storageAgent();
    this._securityOriginManager = (target.model(SecurityOriginManager) as SecurityOriginManager);

    this._originsUpdated = new Set();
    this._throttler = new Common.Throttler.Throttler(2000);

    this._enabled = false;
  }

  enable(): void {
    if (this._enabled) {
      return;
    }

    this._securityOriginManager.addEventListener(
        SecurityOriginManagerEvents.SecurityOriginAdded, this._securityOriginAdded, this);
    this._securityOriginManager.addEventListener(
        SecurityOriginManagerEvents.SecurityOriginRemoved, this._securityOriginRemoved, this);

    for (const securityOrigin of this._securityOriginManager.securityOrigins()) {
      this._addOrigin(securityOrigin);
    }
    this._enabled = true;
  }

  clearForOrigin(origin: string): void {
    this._removeOrigin(origin);
    this._addOrigin(origin);
  }

  refreshCacheNames(): void {
    for (const cache of this._caches.values()) {
      this._cacheRemoved(cache);
    }
    this._caches.clear();
    const securityOrigins = this._securityOriginManager.securityOrigins();
    for (const securityOrigin of securityOrigins) {
      this._loadCacheNames(securityOrigin);
    }
  }

  async deleteCache(cache: Cache): Promise<void> {
    const response = await this._cacheAgent.invoke_deleteCache({cacheId: cache.cacheId});
    if (response.getError()) {
      console.error(`ServiceWorkerCacheAgent error deleting cache ${cache.toString()}: ${response.getError()}`);
      return;
    }
    this._caches.delete(cache.cacheId);
    this._cacheRemoved(cache);
  }

  async deleteCacheEntry(cache: Cache, request: string): Promise<void> {
    const response = await this._cacheAgent.invoke_deleteEntry({cacheId: cache.cacheId, request});
    if (response.getError()) {
      Common.Console.Console.instance().error(
          i18nString(UIStrings.serviceworkercacheagentError, {PH1: cache.toString(), PH2: response.getError()}));
      return;
    }
  }

  loadCacheData(
      cache: Cache, skipCount: number, pageSize: number, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): void {
    this._requestEntries(cache, skipCount, pageSize, pathFilter, callback);
  }

  loadAllCacheData(
      cache: Cache, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): void {
    this._requestAllEntries(cache, pathFilter, callback);
  }

  caches(): Cache[] {
    const caches = new Array();
    for (const cache of this._caches.values()) {
      caches.push(cache);
    }
    return caches;
  }

  dispose(): void {
    for (const cache of this._caches.values()) {
      this._cacheRemoved(cache);
    }
    this._caches.clear();
    if (this._enabled) {
      this._securityOriginManager.removeEventListener(
          SecurityOriginManagerEvents.SecurityOriginAdded, this._securityOriginAdded, this);
      this._securityOriginManager.removeEventListener(
          SecurityOriginManagerEvents.SecurityOriginRemoved, this._securityOriginRemoved, this);
    }
  }

  _addOrigin(securityOrigin: string): void {
    this._loadCacheNames(securityOrigin);
    if (this._isValidSecurityOrigin(securityOrigin)) {
      this._storageAgent.invoke_trackCacheStorageForOrigin({origin: securityOrigin});
    }
  }

  _removeOrigin(securityOrigin: string): void {
    for (const [opaqueId, cache] of this._caches.entries()) {
      if (cache.securityOrigin === securityOrigin) {
        this._caches.delete((opaqueId as string));
        this._cacheRemoved((cache as Cache));
      }
    }
    if (this._isValidSecurityOrigin(securityOrigin)) {
      this._storageAgent.invoke_untrackCacheStorageForOrigin({origin: securityOrigin});
    }
  }

  _isValidSecurityOrigin(securityOrigin: string): boolean {
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(securityOrigin);
    return parsedURL !== null && parsedURL.scheme.startsWith('http');
  }

  async _loadCacheNames(securityOrigin: string): Promise<void> {
    const response = await this._cacheAgent.invoke_requestCacheNames({securityOrigin: securityOrigin});
    if (response.getError()) {
      return;
    }
    this._updateCacheNames(securityOrigin, response.caches);
  }

  _updateCacheNames(securityOrigin: string, cachesJson: Protocol.CacheStorage.Cache[]): void {
    function deleteAndSaveOldCaches(this: ServiceWorkerCacheModel, cache: Cache): void {
      if (cache.securityOrigin === securityOrigin && !updatingCachesIds.has(cache.cacheId)) {
        oldCaches.set(cache.cacheId, cache);
        this._caches.delete(cache.cacheId);
      }
    }

    const updatingCachesIds = new Set<string>();
    const newCaches = new Map<string, Cache>();
    const oldCaches = new Map<string, Cache>();

    for (const cacheJson of cachesJson) {
      const cache = new Cache(this, cacheJson.securityOrigin, cacheJson.cacheName, cacheJson.cacheId);
      updatingCachesIds.add(cache.cacheId);
      if (this._caches.has(cache.cacheId)) {
        continue;
      }
      newCaches.set(cache.cacheId, cache);
      this._caches.set(cache.cacheId, cache);
    }
    this._caches.forEach(deleteAndSaveOldCaches, this);
    newCaches.forEach(this._cacheAdded, this);
    oldCaches.forEach(this._cacheRemoved, this);
  }

  _securityOriginAdded(event: Common.EventTarget.EventTargetEvent): void {
    const securityOrigin = (event.data as string);
    this._addOrigin(securityOrigin);
  }

  _securityOriginRemoved(event: Common.EventTarget.EventTargetEvent): void {
    const securityOrigin = (event.data as string);
    this._removeOrigin(securityOrigin);
  }

  _cacheAdded(cache: Cache): void {
    this.dispatchEventToListeners(Events.CacheAdded, {model: this, cache: cache});
  }

  _cacheRemoved(cache: Cache): void {
    this.dispatchEventToListeners(Events.CacheRemoved, {model: this, cache: cache});
  }

  async _requestEntries(
      cache: Cache, skipCount: number, pageSize: number, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): Promise<void> {
    const response =
        await this._cacheAgent.invoke_requestEntries({cacheId: cache.cacheId, skipCount, pageSize, pathFilter});
    if (response.getError()) {
      console.error('ServiceWorkerCacheAgent error while requesting entries: ', response.getError());
      return;
    }
    callback(response.cacheDataEntries, response.returnCount);
  }

  async _requestAllEntries(
      cache: Cache, pathFilter: string,
      callback: (arg0: Array<Protocol.CacheStorage.DataEntry>, arg1: number) => void): Promise<void> {
    const response = await this._cacheAgent.invoke_requestEntries({cacheId: cache.cacheId, pathFilter});
    if (response.getError()) {
      console.error('ServiceWorkerCacheAgent error while requesting entries: ', response.getError());
      return;
    }
    callback(response.cacheDataEntries, response.returnCount);
  }

  cacheStorageListUpdated({origin}: Protocol.Storage.CacheStorageListUpdatedEvent): void {
    this._originsUpdated.add(origin);

    this._throttler.schedule(() => {
      const promises = Array.from(this._originsUpdated, origin => this._loadCacheNames(origin));
      this._originsUpdated.clear();
      return Promise.all(promises);
    });
  }

  cacheStorageContentUpdated({origin, cacheName}: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
    this.dispatchEventToListeners(Events.CacheStorageContentUpdated, {origin, cacheName});
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  CacheAdded = 'CacheAdded',
  CacheRemoved = 'CacheRemoved',
  CacheStorageContentUpdated = 'CacheStorageContentUpdated',
}


export class Cache {
  _model: ServiceWorkerCacheModel;
  securityOrigin: string;
  cacheName: string;
  cacheId: string;

  constructor(model: ServiceWorkerCacheModel, securityOrigin: string, cacheName: string, cacheId: string) {
    this._model = model;
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
    const response = await this._model._cacheAgent.invoke_requestCachedResponse(
        {cacheId: this.cacheId, requestURL: url, requestHeaders});
    if (response.getError()) {
      return null;
    }
    return response.response;
  }
}

SDKModel.register(ServiceWorkerCacheModel, {capabilities: Capability.Storage, autostart: false});
