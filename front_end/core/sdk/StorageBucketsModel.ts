// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as Common from '../common/common.js';

import {SDKModel} from './SDKModel.js';
import {Events as StorageKeyManagerEvents, StorageKeyManager} from './StorageKeyManager.js';
import {Capability, type Target} from './Target.js';

export class StorageBucketsModel extends SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
  private enabled = false;
  readonly storageAgent: ProtocolProxyApi.StorageApi;
  private readonly storageKeyManager: StorageKeyManager|null;
  private bucketsById = new Map<string, Protocol.Storage.StorageBucketInfo>();
  private trackedStorageKeys = new Set<string>();

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

  sharedStorageWorkletOperationExecutionFinished(
      _event: Protocol.Storage.SharedStorageWorkletOperationExecutionFinishedEvent): void {
  }

  attributionReportingSourceRegistered(_event: Protocol.Storage.AttributionReportingSourceRegisteredEvent): void {
  }
  attributionReportingReportSent(_event: Protocol.Storage.AttributionReportingReportSentEvent): void {
  }

  attributionReportingVerboseDebugReportSent(_event: Protocol.Storage.AttributionReportingVerboseDebugReportSentEvent):
      void {
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

export interface EventTypes {
  [Events.BUCKET_ADDED]: BucketEvent;
  [Events.BUCKET_REMOVED]: BucketEvent;
  [Events.BUCKET_CHANGED]: BucketEvent;
}
