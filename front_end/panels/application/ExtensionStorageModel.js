// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
export class ExtensionStorage extends Common.ObjectWrapper.ObjectWrapper {
    #model;
    #extensionId;
    #name;
    #storageArea;
    constructor(model, extensionId, name, storageArea) {
        super();
        this.#model = model;
        this.#extensionId = extensionId;
        this.#name = name;
        this.#storageArea = storageArea;
    }
    get model() {
        return this.#model;
    }
    get extensionId() {
        return this.#extensionId;
    }
    get name() {
        return this.#name;
    }
    // Returns a key that uniquely identifies this extension ID and storage area,
    // but which is not unique across targets, so we can identify two identical
    // storage areas across frames.
    get key() {
        return `${this.extensionId}-${this.storageArea}`;
    }
    get storageArea() {
        return this.#storageArea;
    }
    async getItems(keys) {
        const params = {
            id: this.#extensionId,
            storageArea: this.#storageArea,
        };
        if (keys) {
            params.keys = keys;
        }
        const response = await this.#model.agent.invoke_getStorageItems(params);
        if (response.getError()) {
            throw new Error(response.getError());
        }
        return response.data;
    }
    async setItem(key, value) {
        const response = await this.#model.agent.invoke_setStorageItems({ id: this.#extensionId, storageArea: this.#storageArea, values: { [key]: value } });
        if (response.getError()) {
            throw new Error(response.getError());
        }
    }
    async removeItem(key) {
        const response = await this.#model.agent.invoke_removeStorageItems({ id: this.#extensionId, storageArea: this.#storageArea, keys: [key] });
        if (response.getError()) {
            throw new Error(response.getError());
        }
    }
    async clear() {
        const response = await this.#model.agent.invoke_clearStorageItems({ id: this.#extensionId, storageArea: this.#storageArea });
        if (response.getError()) {
            throw new Error(response.getError());
        }
    }
    matchesTarget(target) {
        if (!target) {
            return false;
        }
        const targetURL = target.targetInfo()?.url;
        const parsedURL = targetURL ? Common.ParsedURL.ParsedURL.fromString(targetURL) : null;
        return parsedURL?.scheme === 'chrome-extension' && parsedURL?.host === this.extensionId;
    }
}
export class ExtensionStorageModel extends SDK.SDKModel.SDKModel {
    #runtimeModel;
    #storages;
    agent;
    #enabled;
    constructor(target) {
        super(target);
        this.#runtimeModel = target.model(SDK.RuntimeModel.RuntimeModel);
        this.#storages = new Map();
        this.agent = target.extensionsAgent();
    }
    enable() {
        if (this.#enabled) {
            return;
        }
        if (this.#runtimeModel) {
            this.#runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextCreated, this.#onExecutionContextCreated, this);
            this.#runtimeModel.addEventListener(SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.#onExecutionContextDestroyed, this);
            this.#runtimeModel.executionContexts().forEach(this.#executionContextCreated, this);
        }
        this.#enabled = true;
    }
    #getStoragesForExtension(id) {
        const existingStorages = this.#storages.get(id);
        if (existingStorages) {
            return existingStorages;
        }
        const newStorages = new Map();
        this.#storages.set(id, newStorages);
        return newStorages;
    }
    #addExtension(id, name) {
        for (const storageArea of ["session" /* Protocol.Extensions.StorageArea.Session */, "local" /* Protocol.Extensions.StorageArea.Local */,
            "sync" /* Protocol.Extensions.StorageArea.Sync */, "managed" /* Protocol.Extensions.StorageArea.Managed */]) {
            const storages = this.#getStoragesForExtension(id);
            const storage = new ExtensionStorage(this, id, name, storageArea);
            console.assert(!storages.get(storageArea));
            storage.getItems([])
                .then(() => {
                // The extension may have been removed in the meantime.
                if (this.#storages.get(id) !== storages) {
                    return;
                }
                // The storage area may have been added in the meantime.
                if (storages.get(storageArea)) {
                    return;
                }
                storages.set(storageArea, storage);
                this.dispatchEventToListeners("ExtensionStorageAdded" /* Events.EXTENSION_STORAGE_ADDED */, storage);
            })
                .catch(() => {
                // Storage area is inaccessible (extension may have restricted access
                // or not enabled the API).
            });
        }
    }
    #removeExtension(id) {
        const storages = this.#storages.get(id);
        if (!storages) {
            return;
        }
        for (const [key, storage] of storages) {
            // Delete this before firing the event, since this matches the behavior
            // of other models and meets expectations for a removed event.
            storages.delete(key);
            this.dispatchEventToListeners("ExtensionStorageRemoved" /* Events.EXTENSION_STORAGE_REMOVED */, storage);
        }
        this.#storages.delete(id);
    }
    #executionContextCreated(context) {
        const extensionId = this.#extensionIdForContext(context);
        if (extensionId) {
            this.#addExtension(extensionId, context.name);
        }
    }
    #onExecutionContextCreated(event) {
        this.#executionContextCreated(event.data);
    }
    #extensionIdForContext(context) {
        const url = Common.ParsedURL.ParsedURL.fromString(context.origin);
        return url && url.scheme === 'chrome-extension' ? url.host : undefined;
    }
    #executionContextDestroyed(context) {
        const extensionId = this.#extensionIdForContext(context);
        if (extensionId) {
            // Ignore event if there is still another context for this extension.
            if (this.#runtimeModel?.executionContexts().some(c => this.#extensionIdForContext(c) === extensionId)) {
                return;
            }
            this.#removeExtension(extensionId);
        }
    }
    #onExecutionContextDestroyed(event) {
        this.#executionContextDestroyed(event.data);
    }
    storageForIdAndArea(id, storageArea) {
        return this.#storages.get(id)?.get(storageArea);
    }
    storages() {
        const result = [];
        for (const storages of this.#storages.values()) {
            result.push(...storages.values());
        }
        return result;
    }
}
SDK.SDKModel.SDKModel.register(ExtensionStorageModel, { capabilities: 4 /* SDK.Target.Capability.JS */, autostart: false });
//# sourceMappingURL=ExtensionStorageModel.js.map