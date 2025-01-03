// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

export class DOMStorage extends Common.ObjectWrapper.ObjectWrapper<DOMStorage.EventTypes> {
  private readonly model: DOMStorageModel;
  private readonly storageKeyInternal: string;
  private readonly isLocalStorageInternal: boolean;

  constructor(model: DOMStorageModel, storageKey: string, isLocalStorage: boolean) {
    super();
    this.model = model;
    this.storageKeyInternal = storageKey;
    this.isLocalStorageInternal = isLocalStorage;
  }

  static storageId(storageKey: string, isLocalStorage: boolean): Protocol.DOMStorage.StorageId {
    return {storageKey, isLocalStorage};
  }

  get id(): Protocol.DOMStorage.StorageId {
    return DOMStorage.storageId(this.storageKeyInternal, this.isLocalStorageInternal);
  }

  get storageKey(): string|null {
    return this.storageKeyInternal;
  }

  get isLocalStorage(): boolean {
    return this.isLocalStorageInternal;
  }

  getItems(): Promise<Protocol.DOMStorage.Item[]|null> {
    return this.model.agent.invoke_getDOMStorageItems({storageId: this.id}).then(({entries}) => entries);
  }

  setItem(key: string, value: string): void {
    void this.model.agent.invoke_setDOMStorageItem({storageId: this.id, key, value});
  }

  removeItem(key: string): void {
    void this.model.agent.invoke_removeDOMStorageItem({storageId: this.id, key});
  }

  clear(): void {
    void this.model.agent.invoke_clear({storageId: this.id});
  }
}

export namespace DOMStorage {
  export const enum Events {
    DOM_STORAGE_ITEMS_CLEARED = 'DOMStorageItemsCleared',
    DOM_STORAGE_ITEM_REMOVED = 'DOMStorageItemRemoved',
    DOM_STORAGE_ITEM_ADDED = 'DOMStorageItemAdded',
    DOM_STORAGE_ITEM_UPDATED = 'DOMStorageItemUpdated',
  }

  export interface DOMStorageItemRemovedEvent {
    key: string;
  }

  export interface DOMStorageItemAddedEvent {
    key: string;
    value: string;
  }

  export interface DOMStorageItemUpdatedEvent {
    key: string;
    oldValue: string;
    value: string;
  }

  export type EventTypes = {
    [Events.DOM_STORAGE_ITEMS_CLEARED]: void,
    [Events.DOM_STORAGE_ITEM_REMOVED]: DOMStorageItemRemovedEvent,
    [Events.DOM_STORAGE_ITEM_ADDED]: DOMStorageItemAddedEvent,
    [Events.DOM_STORAGE_ITEM_UPDATED]: DOMStorageItemUpdatedEvent,
  };
}

export class DOMStorageModel extends SDK.SDKModel.SDKModel<EventTypes> {
  private readonly storageKeyManagerInternal: SDK.StorageKeyManager.StorageKeyManager|null;
  private storagesInternal: {
    [x: string]: DOMStorage,
  };
  readonly agent: ProtocolProxyApi.DOMStorageApi;
  private enabled?: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);

    this.storageKeyManagerInternal = target.model(SDK.StorageKeyManager.StorageKeyManager);
    this.storagesInternal = {};
    this.agent = target.domstorageAgent();
  }

  get storageKeyManagerForTest(): SDK.StorageKeyManager.StorageKeyManager|null {
    return this.storageKeyManagerInternal;
  }

  enable(): void {
    if (this.enabled) {
      return;
    }

    this.target().registerDOMStorageDispatcher(new DOMStorageDispatcher(this));
    if (this.storageKeyManagerInternal) {
      this.storageKeyManagerInternal.addEventListener(
          SDK.StorageKeyManager.Events.STORAGE_KEY_ADDED, this.storageKeyAdded, this);
      this.storageKeyManagerInternal.addEventListener(
          SDK.StorageKeyManager.Events.STORAGE_KEY_REMOVED, this.storageKeyRemoved, this);

      for (const storageKey of this.storageKeyManagerInternal.storageKeys()) {
        this.addStorageKey(storageKey);
      }
    }
    void this.agent.invoke_enable();

    this.enabled = true;
  }

  clearForStorageKey(storageKey: string): void {
    if (!this.enabled) {
      return;
    }
    for (const isLocal of [true, false]) {
      const key = this.storageKey(storageKey, isLocal);
      const storage = this.storagesInternal[key];
      if (!storage) {
        return;
      }
      storage.clear();
    }
    this.removeStorageKey(storageKey);
    this.addStorageKey(storageKey);
  }

  private storageKeyAdded(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.addStorageKey(event.data);
  }

  private addStorageKey(storageKey: string): void {
    for (const isLocal of [true, false]) {
      const key = this.storageKey(storageKey, isLocal);
      console.assert(!this.storagesInternal[key]);
      const storage = new DOMStorage(this, storageKey, isLocal);
      this.storagesInternal[key] = storage;
      this.dispatchEventToListeners(Events.DOM_STORAGE_ADDED, storage);
    }
  }

  private storageKeyRemoved(event: Common.EventTarget.EventTargetEvent<string>): void {
    this.removeStorageKey(event.data);
  }

  private removeStorageKey(storageKey: string): void {
    for (const isLocal of [true, false]) {
      const key = this.storageKey(storageKey, isLocal);
      const storage = this.storagesInternal[key];
      if (!storage) {
        continue;
      }
      delete this.storagesInternal[key];
      this.dispatchEventToListeners(Events.DOM_STORAGE_REMOVED, storage);
    }
  }

  private storageKey(storageKey: string, isLocalStorage: boolean): string {
    return JSON.stringify(DOMStorage.storageId(storageKey, isLocalStorage));
  }

  domStorageItemsCleared(storageId: Protocol.DOMStorage.StorageId): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    domStorage.dispatchEventToListeners(DOMStorage.Events.DOM_STORAGE_ITEMS_CLEARED);
  }

  domStorageItemRemoved(storageId: Protocol.DOMStorage.StorageId, key: string): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {key};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOM_STORAGE_ITEM_REMOVED, eventData);
  }

  domStorageItemAdded(storageId: Protocol.DOMStorage.StorageId, key: string, value: string): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {key, value};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOM_STORAGE_ITEM_ADDED, eventData);
  }

  domStorageItemUpdated(storageId: Protocol.DOMStorage.StorageId, key: string, oldValue: string, value: string): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {key, oldValue, value};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOM_STORAGE_ITEM_UPDATED, eventData);
  }

  storageForId(storageId: Protocol.DOMStorage.StorageId): DOMStorage {
    console.assert(Boolean(storageId.storageKey));
    return this.storagesInternal[this.storageKey(storageId.storageKey || '', storageId.isLocalStorage)];
  }

  storages(): DOMStorage[] {
    const result = [];
    for (const id in this.storagesInternal) {
      result.push(this.storagesInternal[id]);
    }
    return result;
  }
}

SDK.SDKModel.SDKModel.register(DOMStorageModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});

export const enum Events {
  DOM_STORAGE_ADDED = 'DOMStorageAdded',
  DOM_STORAGE_REMOVED = 'DOMStorageRemoved',
}

export type EventTypes = {
  [Events.DOM_STORAGE_ADDED]: DOMStorage,
  [Events.DOM_STORAGE_REMOVED]: DOMStorage,
};

export class DOMStorageDispatcher implements ProtocolProxyApi.DOMStorageDispatcher {
  private readonly model: DOMStorageModel;
  constructor(model: DOMStorageModel) {
    this.model = model;
  }

  domStorageItemsCleared({storageId}: Protocol.DOMStorage.DomStorageItemsClearedEvent): void {
    this.model.domStorageItemsCleared(storageId);
  }

  domStorageItemRemoved({storageId, key}: Protocol.DOMStorage.DomStorageItemRemovedEvent): void {
    this.model.domStorageItemRemoved(storageId, key);
  }

  domStorageItemAdded({storageId, key, newValue}: Protocol.DOMStorage.DomStorageItemAddedEvent): void {
    this.model.domStorageItemAdded(storageId, key, newValue);
  }

  domStorageItemUpdated({storageId, key, oldValue, newValue}: Protocol.DOMStorage.DomStorageItemUpdatedEvent): void {
    this.model.domStorageItemUpdated(storageId, key, oldValue, newValue);
  }
}
