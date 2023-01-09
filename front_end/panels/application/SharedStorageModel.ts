// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

export class SharedStorageForOrigin extends Common.ObjectWrapper.ObjectWrapper<SharedStorageForOrigin.EventTypes> {
  readonly #model: SharedStorageModel;
  readonly #securityOrigin: string;

  constructor(model: SharedStorageModel, securityOrigin: string) {
    super();
    this.#model = model;
    this.#securityOrigin = securityOrigin;
  }

  get securityOrigin(): string {
    return this.#securityOrigin;
  }

  async getMetadata(): Promise<Protocol.Storage.SharedStorageMetadata|null> {
    return this.#model.storageAgent.invoke_getSharedStorageMetadata({ownerOrigin: this.securityOrigin})
        .then(({metadata}) => metadata);
  }

  async getEntries(): Promise<Protocol.Storage.SharedStorageEntry[]|null> {
    return this.#model.storageAgent.invoke_getSharedStorageEntries({ownerOrigin: this.securityOrigin})
        .then(({entries}) => entries);
  }

  async setEntry(key: string, value: string, ignoreIfPresent: boolean): Promise<void> {
    await this.#model.storageAgent.invoke_setSharedStorageEntry(
        {ownerOrigin: this.securityOrigin, key, value, ignoreIfPresent});
  }

  async deleteEntry(key: string): Promise<void> {
    await this.#model.storageAgent.invoke_deleteSharedStorageEntry({ownerOrigin: this.securityOrigin, key});
  }

  async clear(): Promise<void> {
    await this.#model.storageAgent.invoke_clearSharedStorageEntries({ownerOrigin: this.securityOrigin});
  }

  async resetBudget(): Promise<void> {
    await this.#model.storageAgent.invoke_resetSharedStorageBudget({ownerOrigin: this.securityOrigin});
  }
}

export namespace SharedStorageForOrigin {
  // TODO(crbug.com/1167717): Make this a const enum.
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    SharedStorageChanged = 'SharedStorageChanged',
  }

  export interface SharedStorageChangedEvent {
    accessTime: Protocol.Network.TimeSinceEpoch;
    type: Protocol.Storage.SharedStorageAccessType;
    mainFrameId: Protocol.Page.FrameId;
    params: Protocol.Storage.SharedStorageAccessParams;
  }

  export type EventTypes = {
    [Events.SharedStorageChanged]: SharedStorageChangedEvent,
  };
}

export class SharedStorageModel extends SDK.SDKModel.SDKModel<EventTypes> implements
    ProtocolProxyApi.StorageDispatcher {
  readonly #securityOriginManager: SDK.SecurityOriginManager.SecurityOriginManager;
  #storages: Map<string, SharedStorageForOrigin>;
  readonly storageAgent: ProtocolProxyApi.StorageApi;
  #enabled: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.#securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager) as
        SDK.SecurityOriginManager.SecurityOriginManager;
    this.#storages = new Map();
    this.storageAgent = target.storageAgent();
    this.#enabled = false;
  }

  async enable(): Promise<void> {
    if (this.#enabled) {
      return;
    }

    this.#securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.SecurityOriginAdded, this.#securityOriginAdded, this);
    this.#securityOriginManager.addEventListener(
        SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this.#securityOriginRemoved, this);

    await this.storageAgent.invoke_setSharedStorageTracking({enable: true});
    this.#addAllOrigins();
    this.#enabled = true;
  }

  disable(): void {
    if (!this.#enabled) {
      return;
    }

    this.#securityOriginManager.removeEventListener(
        SDK.SecurityOriginManager.Events.SecurityOriginAdded, this.#securityOriginAdded, this);
    this.#securityOriginManager.removeEventListener(
        SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this.#securityOriginRemoved, this);

    void this.storageAgent.invoke_setSharedStorageTracking({enable: false});
    this.#removeAllOrigins();
    this.#enabled = false;
  }

  dispose(): void {
    this.disable();
  }

  #addAllOrigins(): void {
    for (const securityOrigin of this.#securityOriginManager.securityOrigins()) {
      void this.#maybeAddOrigin(securityOrigin);
    }
  }

  #removeAllOrigins(): void {
    for (const securityOrigin of this.#storages.keys()) {
      this.#removeOrigin(securityOrigin);
    }
  }

  #securityOriginAdded(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.#maybeAddOrigin(event.data);
  }

  #maybeAddOrigin(securityOrigin: string): void {
    const parsedSecurityOrigin = new Common.ParsedURL.ParsedURL(securityOrigin);
    // These are "opaque" origins which are not supposed to support shared storage.
    if (!parsedSecurityOrigin.isValid || parsedSecurityOrigin.scheme === 'data' ||
        parsedSecurityOrigin.scheme === 'about' || parsedSecurityOrigin.scheme === 'javascript') {
      return;
    }

    // Only add origin if it's not already added.
    if (this.#storages.has(securityOrigin)) {
      return;
    }

    const storage = new SharedStorageForOrigin(this, securityOrigin);
    this.#storages.set(securityOrigin, storage);
    this.dispatchEventToListeners(Events.SharedStorageAdded, storage);
  }

  #securityOriginRemoved(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.#removeOrigin(event.data);
  }

  #removeOrigin(securityOrigin: string): void {
    const storage = this.storageForOrigin(securityOrigin);
    if (!storage) {
      return;
    }
    this.#storages.delete(securityOrigin);
    this.dispatchEventToListeners(Events.SharedStorageRemoved, storage);
  }

  storages(): IterableIterator<SharedStorageForOrigin> {
    return this.#storages.values();
  }

  storageForOrigin(origin: string): SharedStorageForOrigin|null {
    return this.#storages.get(origin) || null;
  }

  numStoragesForTesting(): number {
    return this.#storages.size;
  }

  isChangeEvent(event: Protocol.Storage.SharedStorageAccessedEvent): boolean {
    return [
      Protocol.Storage.SharedStorageAccessType.DocumentSet,
      Protocol.Storage.SharedStorageAccessType.DocumentAppend,
      Protocol.Storage.SharedStorageAccessType.DocumentDelete,
      Protocol.Storage.SharedStorageAccessType.DocumentClear,
      Protocol.Storage.SharedStorageAccessType.WorkletSet,
      Protocol.Storage.SharedStorageAccessType.WorkletAppend,
      Protocol.Storage.SharedStorageAccessType.WorkletDelete,
      Protocol.Storage.SharedStorageAccessType.WorkletClear,
    ].includes(event.type);
  }

  sharedStorageAccessed(event: Protocol.Storage.SharedStorageAccessedEvent): void {
    if (this.isChangeEvent(event)) {
      const sharedStorage = this.storageForOrigin(event.ownerOrigin);

      if (sharedStorage) {
        const eventData =
            {accessTime: event.accessTime, type: event.type, mainFrameId: event.mainFrameId, params: event.params};

        // Forward events that may have changed `sharedStorage` to listeners for `sharedStorage`.
        sharedStorage.dispatchEventToListeners(SharedStorageForOrigin.Events.SharedStorageChanged, eventData);
      } else {
        void this.#maybeAddOrigin(event.ownerOrigin);
      }
    }

    this.dispatchEventToListeners(Events.SharedStorageAccess, event);
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }

  cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void {
  }

  cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
  }

  interestGroupAccessed(_event: Protocol.Storage.InterestGroupAccessedEvent): void {
  }
}

SDK.SDKModel.SDKModel.register(SharedStorageModel, {capabilities: SDK.Target.Capability.Storage, autostart: false});

export const enum Events {
  SharedStorageAccess = 'SharedStorageAccess',
  SharedStorageAdded = 'SharedStorageAdded',
  SharedStorageRemoved = 'SharedStorageRemoved',
}

export type EventTypes = {
  [Events.SharedStorageAccess]: Protocol.Storage.SharedStorageAccessedEvent,
  [Events.SharedStorageAdded]: SharedStorageForOrigin,
  [Events.SharedStorageRemoved]: SharedStorageForOrigin,
};
