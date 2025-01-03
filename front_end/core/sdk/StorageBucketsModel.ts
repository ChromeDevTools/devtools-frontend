/*
 * Copyright (C) 2023 Google Inc. All rights reserved.
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

import type * as Common from '../common/common.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import {Events as StorageKeyManagerEvents, StorageKeyManager} from './StorageKeyManager.js';

export class StorageBucketsModel extends SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
  private enabled: boolean = false;
  readonly storageAgent: ProtocolProxyApi.StorageApi;
  private readonly storageKeyManager: StorageKeyManager|null;
  private bucketsById: Map<string, Protocol.Storage.StorageBucketInfo> = new Map();
  private trackedStorageKeys: Set<string> = new Set();

  constructor(target: Target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.storageAgent = target.storageAgent();
    this.storageKeyManager = target.model(StorageKeyManager);
  }

  getBuckets(): Set<Protocol.Storage.StorageBucketInfo> {
    return new Set(this.bucketsById.values());
  }

  getBucketsForStorageKey(storageKey: string): Set<Protocol.Storage.StorageBucketInfo> {
    const buckets = [...this.bucketsById.values()];
    return new Set(buckets.filter(({bucket}) => bucket.storageKey === storageKey));
  }

  getDefaultBucketForStorageKey(storageKey: string): Protocol.Storage.StorageBucketInfo|null {
    const buckets = [...this.bucketsById.values()];
    return buckets.find(({bucket}) => bucket.storageKey === storageKey && bucket.name === undefined) ?? null;
  }

  getBucketById(bucketId: string): Protocol.Storage.StorageBucketInfo|null {
    return this.bucketsById.get(bucketId) ?? null;
  }

  getBucketByName(storageKey: string, bucketName?: string): Protocol.Storage.StorageBucketInfo|null {
    if (!bucketName) {
      return this.getDefaultBucketForStorageKey(storageKey);
    }
    const buckets = [...this.bucketsById.values()];
    return buckets.find(({bucket}) => bucket.storageKey === storageKey && bucket.name === bucketName) ?? null;
  }

  deleteBucket(bucket: Protocol.Storage.StorageBucket): void {
    void this.storageAgent.invoke_deleteStorageBucket({bucket});
  }

  enable(): void {
    if (this.enabled) {
      return;
    }

    if (this.storageKeyManager) {
      this.storageKeyManager.addEventListener(StorageKeyManagerEvents.STORAGE_KEY_ADDED, this.storageKeyAdded, this);
      this.storageKeyManager.addEventListener(
          StorageKeyManagerEvents.STORAGE_KEY_REMOVED, this.storageKeyRemoved, this);
      for (const storageKey of this.storageKeyManager.storageKeys()) {
        this.addStorageKey(storageKey);
      }
    }

    this.enabled = true;
  }

  private storageKeyAdded(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.addStorageKey(event.data);
  }
  private storageKeyRemoved(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.removeStorageKey(event.data);
  }

  private addStorageKey(storageKey: string): void {
    if (this.trackedStorageKeys.has(storageKey)) {
      throw new Error('Can\'t call addStorageKey for a storage key if it has already been added.');
    }

    this.trackedStorageKeys.add(storageKey);
    void this.storageAgent.invoke_setStorageBucketTracking({storageKey, enable: true});
  }

  private removeStorageKey(storageKey: string): void {
    if (!this.trackedStorageKeys.has(storageKey)) {
      throw new Error('Can\'t call removeStorageKey for a storage key if it hasn\'t already been added.');
    }
    const bucketsForStorageKey = this.getBucketsForStorageKey(storageKey);
    for (const bucket of bucketsForStorageKey) {
      this.bucketRemoved(bucket);
    }
    this.trackedStorageKeys.delete(storageKey);
    void this.storageAgent.invoke_setStorageBucketTracking({storageKey, enable: false});
  }

  private bucketAdded(bucketInfo: Protocol.Storage.StorageBucketInfo): void {
    this.bucketsById.set(bucketInfo.id, bucketInfo);
    this.dispatchEventToListeners(Events.BUCKET_ADDED, {model: this, bucketInfo});
  }

  private bucketRemoved(bucketInfo: Protocol.Storage.StorageBucketInfo): void {
    this.bucketsById.delete(bucketInfo.id);
    this.dispatchEventToListeners(Events.BUCKET_REMOVED, {model: this, bucketInfo});
  }

  private bucketChanged(bucketInfo: Protocol.Storage.StorageBucketInfo): void {
    this.dispatchEventToListeners(Events.BUCKET_CHANGED, {model: this, bucketInfo});
  }

  private bucketInfosAreEqual(
      bucketInfo1: Protocol.Storage.StorageBucketInfo, bucketInfo2: Protocol.Storage.StorageBucketInfo): boolean {
    return bucketInfo1.bucket.storageKey === bucketInfo2.bucket.storageKey && bucketInfo1.id === bucketInfo2.id &&
        bucketInfo1.bucket.name === bucketInfo2.bucket.name && bucketInfo1.expiration === bucketInfo2.expiration &&
        bucketInfo1.quota === bucketInfo2.quota && bucketInfo1.persistent === bucketInfo2.persistent &&
        bucketInfo1.durability === bucketInfo2.durability;
  }

  storageBucketCreatedOrUpdated({bucketInfo}: Protocol.Storage.StorageBucketCreatedOrUpdatedEvent): void {
    const curBucket = this.getBucketById(bucketInfo.id);
    if (curBucket) {
      if (!this.bucketInfosAreEqual(curBucket, bucketInfo)) {
        this.bucketChanged(bucketInfo);
      }
    } else {
      this.bucketAdded(bucketInfo);
    }
  }

  storageBucketDeleted({bucketId}: Protocol.Storage.StorageBucketDeletedEvent): void {
    const curBucket = this.getBucketById(bucketId);
    if (curBucket) {
      this.bucketRemoved(curBucket);
    } else {
      throw new Error(
          `Received an event that Storage Bucket '${bucketId}' was deleted, but it wasn't in the StorageBucketsModel.`);
    }
  }

  attributionReportingTriggerRegistered(_event: Protocol.Storage.AttributionReportingTriggerRegisteredEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
  }

  interestGroupAuctionEventOccurred(_event: Protocol.Storage.InterestGroupAuctionEventOccurredEvent): void {
  }

  interestGroupAuctionNetworkRequestCreated(_event: Protocol.Storage.InterestGroupAuctionNetworkRequestCreatedEvent):
      void {
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }

  cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void {
  }

  cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
  }

  sharedStorageAccessed(_event: Protocol.Storage.SharedStorageAccessedEvent): void {
  }

  attributionReportingSourceRegistered(_event: Protocol.Storage.AttributionReportingSourceRegisteredEvent): void {
  }
}

SDKModel.register(StorageBucketsModel, {capabilities: Capability.STORAGE, autostart: false});

export const enum Events {
  BUCKET_ADDED = 'BucketAdded',
  BUCKET_REMOVED = 'BucketRemoved',
  BUCKET_CHANGED = 'BucketChanged',
}

export interface BucketEvent {
  model: StorageBucketsModel;
  bucketInfo: Protocol.Storage.StorageBucketInfo;
}

export type EventTypes = {
  [Events.BUCKET_ADDED]: BucketEvent,
  [Events.BUCKET_REMOVED]: BucketEvent,
  [Events.BUCKET_CHANGED]: BucketEvent,
};
