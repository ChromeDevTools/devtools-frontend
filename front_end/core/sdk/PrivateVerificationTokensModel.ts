// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

import {SDKModel} from './SDKModel.js';
import {Capability, type Target} from './Target.js';

export class PrivateVerificationTokensModel extends SDKModel<EventTypes> implements ProtocolProxyApi.StorageDispatcher {
  readonly #storageAgent: ProtocolProxyApi.StorageApi;

  constructor(target: Target) {
    super(target);
    target.registerStorageDispatcher(this);
    this.#storageAgent = target.storageAgent();
  }

  setTracking(enable: boolean): void {
    void this.#storageAgent.invoke_setPrivateVerificationTokensTracking({enable});
  }

  async getTokens(): Promise<Protocol.Storage.PrivateVerificationToken[]> {
    const response = await this.#storageAgent.invoke_getPrivateVerificationTokens();
    if (response.getError()) {
      return [];
    }
    return response.tokens ?? [];
  }

  async getIssuerConfigs(): Promise<Protocol.Storage.PrivateVerificationTokensIssuerConfig[]> {
    const response = await this.#storageAgent.invoke_getPrivateVerificationTokensIssuerConfigs();
    if (response.getError()) {
      return [];
    }
    return response.configs ?? [];
  }

  async clearTokens(issuerOrigin: string): Promise<void> {
    await this.#storageAgent.invoke_clearPrivateVerificationTokens({issuerOrigin});
  }

  async deleteToken(tokenId: string): Promise<void> {
    await this.#storageAgent.invoke_deletePrivateVerificationToken({tokenId});
  }

  privateVerificationTokensUpdated(): void {
    this.dispatchEventToListeners(Events.TOKENS_UPDATED);
  }

  cacheStorageContentUpdated(_event: Protocol.Storage.CacheStorageContentUpdatedEvent): void {
  }

  cacheStorageListUpdated(_event: Protocol.Storage.CacheStorageListUpdatedEvent): void {
  }

  indexedDBContentUpdated(_event: Protocol.Storage.IndexedDBContentUpdatedEvent): void {
  }

  indexedDBListUpdated(_event: Protocol.Storage.IndexedDBListUpdatedEvent): void {
  }

  storageBucketCreatedOrUpdated(_event: Protocol.Storage.StorageBucketCreatedOrUpdatedEvent): void {
  }

  storageBucketDeleted(_event: Protocol.Storage.StorageBucketDeletedEvent): void {
  }
}

SDKModel.register(PrivateVerificationTokensModel, {capabilities: Capability.STORAGE, autostart: false});

export const enum Events {
  TOKENS_UPDATED = 'TokensUpdated',
}

export interface EventTypes {
  [Events.TOKENS_UPDATED]: void;
}
