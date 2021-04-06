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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';

export class DOMStorage extends Common.ObjectWrapper.ObjectWrapper {
  _model: DOMStorageModel;
  _securityOrigin: string;
  _isLocalStorage: boolean;

  constructor(model: DOMStorageModel, securityOrigin: string, isLocalStorage: boolean) {
    super();
    this._model = model;
    this._securityOrigin = securityOrigin;
    this._isLocalStorage = isLocalStorage;
  }

  static storageId(securityOrigin: string, isLocalStorage: boolean): Protocol.DOMStorage.StorageId {
    return {securityOrigin: securityOrigin, isLocalStorage: isLocalStorage};
  }

  get id(): Protocol.DOMStorage.StorageId {
    return DOMStorage.storageId(this._securityOrigin, this._isLocalStorage);
  }

  get securityOrigin(): string {
    return this._securityOrigin;
  }

  get isLocalStorage(): boolean {
    return this._isLocalStorage;
  }

  getItems(): Promise<Protocol.DOMStorage.Item[]|null> {
    return this._model._agent.invoke_getDOMStorageItems({storageId: this.id}).then(({entries}) => entries);
  }

  setItem(key: string, value: string): void {
    this._model._agent.invoke_setDOMStorageItem({storageId: this.id, key, value});
  }

  removeItem(key: string): void {
    this._model._agent.invoke_removeDOMStorageItem({storageId: this.id, key});
  }

  clear(): void {
    this._model._agent.invoke_clear({storageId: this.id});
  }
}
export namespace DOMStorage {

  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum Events {
    DOMStorageItemsCleared = 'DOMStorageItemsCleared',
    DOMStorageItemRemoved = 'DOMStorageItemRemoved',
    DOMStorageItemAdded = 'DOMStorageItemAdded',
    DOMStorageItemUpdated = 'DOMStorageItemUpdated',
  }
}

export class DOMStorageModel extends SDK.SDKModel.SDKModel {
  _securityOriginManager: SDK.SecurityOriginManager.SecurityOriginManager|null;
  _storages: {
    [x: string]: DOMStorage,
  };
  _agent: ProtocolProxyApi.DOMStorageApi;
  _enabled?: boolean;

  constructor(target: SDK.SDKModel.Target) {
    super(target);

    this._securityOriginManager = target.model(SDK.SecurityOriginManager.SecurityOriginManager);
    this._storages = {};
    this._agent = target.domstorageAgent();
  }

  enable(): void {
    if (this._enabled) {
      return;
    }

    this.target().registerDOMStorageDispatcher(new DOMStorageDispatcher(this));
    if (this._securityOriginManager) {
      this._securityOriginManager.addEventListener(
          SDK.SecurityOriginManager.Events.SecurityOriginAdded, this._securityOriginAdded, this);
      this._securityOriginManager.addEventListener(
          SDK.SecurityOriginManager.Events.SecurityOriginRemoved, this._securityOriginRemoved, this);

      for (const securityOrigin of this._securityOriginManager.securityOrigins()) {
        this._addOrigin(securityOrigin);
      }
    }
    this._agent.invoke_enable();

    this._enabled = true;
  }

  clearForOrigin(origin: string): void {
    if (!this._enabled) {
      return;
    }
    for (const isLocal of [true, false]) {
      const key = this._storageKey(origin, isLocal);
      const storage = this._storages[key];
      if (!storage) {
        return;
      }
      storage.clear();
    }
    this._removeOrigin(origin);
    this._addOrigin(origin);
  }

  _securityOriginAdded(event: Common.EventTarget.EventTargetEvent): void {
    this._addOrigin((event.data as string));
  }

  _addOrigin(securityOrigin: string): void {
    const parsed = new Common.ParsedURL.ParsedURL(securityOrigin);
    // These are "opaque" origins which are not supposed to support DOM storage.
    if (!parsed.isValid || parsed.scheme === 'data' || parsed.scheme === 'about' || parsed.scheme === 'javascript') {
      return;
    }

    for (const isLocal of [true, false]) {
      const key = this._storageKey(securityOrigin, isLocal);
      console.assert(!this._storages[key]);
      const storage = new DOMStorage(this, securityOrigin, isLocal);
      this._storages[key] = storage;
      this.dispatchEventToListeners(Events.DOMStorageAdded, storage);
    }
  }

  _securityOriginRemoved(event: Common.EventTarget.EventTargetEvent): void {
    this._removeOrigin((event.data as string));
  }

  _removeOrigin(securityOrigin: string): void {
    for (const isLocal of [true, false]) {
      const key = this._storageKey(securityOrigin, isLocal);
      const storage = this._storages[key];
      if (!storage) {
        continue;
      }
      delete this._storages[key];
      this.dispatchEventToListeners(Events.DOMStorageRemoved, storage);
    }
  }

  _storageKey(securityOrigin: string, isLocalStorage: boolean): string {
    return JSON.stringify(DOMStorage.storageId(securityOrigin, isLocalStorage));
  }

  _domStorageItemsCleared(storageId: Protocol.DOMStorage.StorageId): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOMStorageItemsCleared, eventData);
  }

  _domStorageItemRemoved(storageId: Protocol.DOMStorage.StorageId, key: string): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {key: key};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOMStorageItemRemoved, eventData);
  }

  _domStorageItemAdded(storageId: Protocol.DOMStorage.StorageId, key: string, value: string): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {key: key, value: value};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOMStorageItemAdded, eventData);
  }

  _domStorageItemUpdated(storageId: Protocol.DOMStorage.StorageId, key: string, oldValue: string, value: string): void {
    const domStorage = this.storageForId(storageId);
    if (!domStorage) {
      return;
    }

    const eventData = {key: key, oldValue: oldValue, value: value};
    domStorage.dispatchEventToListeners(DOMStorage.Events.DOMStorageItemUpdated, eventData);
  }

  storageForId(storageId: Protocol.DOMStorage.StorageId): DOMStorage {
    return this._storages[JSON.stringify(storageId)];
  }

  storages(): DOMStorage[] {
    const result = [];
    for (const id in this._storages) {
      result.push(this._storages[id]);
    }
    return result;
  }
}

SDK.SDKModel.SDKModel.register(DOMStorageModel, SDK.SDKModel.Capability.DOM, false);

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  DOMStorageAdded = 'DOMStorageAdded',
  DOMStorageRemoved = 'DOMStorageRemoved',
}

export class DOMStorageDispatcher implements ProtocolProxyApi.DOMStorageDispatcher {
  _model: DOMStorageModel;
  constructor(model: DOMStorageModel) {
    this._model = model;
  }

  domStorageItemsCleared({storageId}: Protocol.DOMStorage.DomStorageItemsClearedEvent): void {
    this._model._domStorageItemsCleared(storageId);
  }

  domStorageItemRemoved({storageId, key}: Protocol.DOMStorage.DomStorageItemRemovedEvent): void {
    this._model._domStorageItemRemoved(storageId, key);
  }

  domStorageItemAdded({storageId, key, newValue}: Protocol.DOMStorage.DomStorageItemAddedEvent): void {
    this._model._domStorageItemAdded(storageId, key, newValue);
  }

  domStorageItemUpdated({storageId, key, oldValue, newValue}: Protocol.DOMStorage.DomStorageItemUpdatedEvent): void {
    this._model._domStorageItemUpdated(storageId, key, oldValue, newValue);
  }
}
