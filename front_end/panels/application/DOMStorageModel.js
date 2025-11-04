// Copyright 2021 The Chromium Authors
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
export class DOMStorage extends Common.ObjectWrapper.ObjectWrapper {
    model;
    #storageKey;
    #isLocalStorage;
    constructor(model, storageKey, isLocalStorage) {
        super();
        this.model = model;
        this.#storageKey = storageKey;
        this.#isLocalStorage = isLocalStorage;
    }
    static storageId(storageKey, isLocalStorage) {
        return { storageKey, isLocalStorage };
    }
    get id() {
        return DOMStorage.storageId(this.#storageKey, this.#isLocalStorage);
    }
    get storageKey() {
        return this.#storageKey;
    }
    get isLocalStorage() {
        return this.#isLocalStorage;
    }
    getItems() {
        return this.model.agent.invoke_getDOMStorageItems({ storageId: this.id }).then(({ entries }) => entries);
    }
    setItem(key, value) {
        void this.model.agent.invoke_setDOMStorageItem({ storageId: this.id, key, value });
    }
    removeItem(key) {
        void this.model.agent.invoke_removeDOMStorageItem({ storageId: this.id, key });
    }
    clear() {
        void this.model.agent.invoke_clear({ storageId: this.id });
    }
}
export class DOMStorageModel extends SDK.SDKModel.SDKModel {
    #storageKeyManager;
    #storages;
    agent;
    enabled;
    constructor(target) {
        super(target);
        this.#storageKeyManager = target.model(SDK.StorageKeyManager.StorageKeyManager);
        this.#storages = {};
        this.agent = target.domstorageAgent();
    }
    enable() {
        if (this.enabled) {
            return;
        }
        this.target().registerDOMStorageDispatcher(new DOMStorageDispatcher(this));
        if (this.#storageKeyManager) {
            this.#storageKeyManager.addEventListener("StorageKeyAdded" /* SDK.StorageKeyManager.Events.STORAGE_KEY_ADDED */, this.storageKeyAdded, this);
            this.#storageKeyManager.addEventListener("StorageKeyRemoved" /* SDK.StorageKeyManager.Events.STORAGE_KEY_REMOVED */, this.storageKeyRemoved, this);
            for (const storageKey of this.#storageKeyManager.storageKeys()) {
                this.addStorageKey(storageKey);
            }
        }
        void this.agent.invoke_enable();
        this.enabled = true;
    }
    clearForStorageKey(storageKey) {
        if (!this.enabled) {
            return;
        }
        for (const isLocal of [true, false]) {
            const key = this.storageKey(storageKey, isLocal);
            const storage = this.#storages[key];
            if (!storage) {
                return;
            }
            storage.clear();
        }
        this.removeStorageKey(storageKey);
        this.addStorageKey(storageKey);
    }
    storageKeyAdded(event) {
        this.addStorageKey(event.data);
    }
    addStorageKey(storageKey) {
        for (const isLocal of [true, false]) {
            const key = this.storageKey(storageKey, isLocal);
            console.assert(!this.#storages[key]);
            const storage = new DOMStorage(this, storageKey, isLocal);
            this.#storages[key] = storage;
            this.dispatchEventToListeners("DOMStorageAdded" /* Events.DOM_STORAGE_ADDED */, storage);
        }
    }
    storageKeyRemoved(event) {
        this.removeStorageKey(event.data);
    }
    removeStorageKey(storageKey) {
        for (const isLocal of [true, false]) {
            const key = this.storageKey(storageKey, isLocal);
            const storage = this.#storages[key];
            if (!storage) {
                continue;
            }
            delete this.#storages[key];
            this.dispatchEventToListeners("DOMStorageRemoved" /* Events.DOM_STORAGE_REMOVED */, storage);
        }
    }
    storageKey(storageKey, isLocalStorage) {
        return JSON.stringify(DOMStorage.storageId(storageKey, isLocalStorage));
    }
    domStorageItemsCleared(storageId) {
        const domStorage = this.storageForId(storageId);
        if (!domStorage) {
            return;
        }
        domStorage.dispatchEventToListeners("DOMStorageItemsCleared" /* DOMStorage.Events.DOM_STORAGE_ITEMS_CLEARED */);
    }
    domStorageItemRemoved(storageId, key) {
        const domStorage = this.storageForId(storageId);
        if (!domStorage) {
            return;
        }
        const eventData = { key };
        domStorage.dispatchEventToListeners("DOMStorageItemRemoved" /* DOMStorage.Events.DOM_STORAGE_ITEM_REMOVED */, eventData);
    }
    domStorageItemAdded(storageId, key, value) {
        const domStorage = this.storageForId(storageId);
        if (!domStorage) {
            return;
        }
        const eventData = { key, value };
        domStorage.dispatchEventToListeners("DOMStorageItemAdded" /* DOMStorage.Events.DOM_STORAGE_ITEM_ADDED */, eventData);
    }
    domStorageItemUpdated(storageId, key, oldValue, value) {
        const domStorage = this.storageForId(storageId);
        if (!domStorage) {
            return;
        }
        const eventData = { key, oldValue, value };
        domStorage.dispatchEventToListeners("DOMStorageItemUpdated" /* DOMStorage.Events.DOM_STORAGE_ITEM_UPDATED */, eventData);
    }
    storageForId(storageId) {
        console.assert(Boolean(storageId.storageKey));
        return this.#storages[this.storageKey(storageId.storageKey || '', storageId.isLocalStorage)];
    }
    storages() {
        const result = [];
        for (const id in this.#storages) {
            result.push(this.#storages[id]);
        }
        return result;
    }
}
SDK.SDKModel.SDKModel.register(DOMStorageModel, { capabilities: 2 /* SDK.Target.Capability.DOM */, autostart: false });
export class DOMStorageDispatcher {
    model;
    constructor(model) {
        this.model = model;
    }
    domStorageItemsCleared({ storageId }) {
        this.model.domStorageItemsCleared(storageId);
    }
    domStorageItemRemoved({ storageId, key }) {
        this.model.domStorageItemRemoved(storageId, key);
    }
    domStorageItemAdded({ storageId, key, newValue }) {
        this.model.domStorageItemAdded(storageId, key, newValue);
    }
    domStorageItemUpdated({ storageId, key, oldValue, newValue }) {
        this.model.domStorageItemUpdated(storageId, key, oldValue, newValue);
    }
}
//# sourceMappingURL=DOMStorageModel.js.map