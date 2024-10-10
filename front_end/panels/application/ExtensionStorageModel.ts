// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import * as Protocol from '../../generated/protocol.js';

export class ExtensionStorage extends Common.ObjectWrapper.ObjectWrapper<{}> {
  readonly #model: ExtensionStorageModel;
  readonly #extensionIdInternal: string;
  readonly #nameInternal: string;
  readonly #storageAreaInternal: Protocol.Extensions.StorageArea;

  constructor(
      model: ExtensionStorageModel, extensionId: string, name: string, storageArea: Protocol.Extensions.StorageArea) {
    super();
    this.#model = model;
    this.#extensionIdInternal = extensionId;
    this.#nameInternal = name;
    this.#storageAreaInternal = storageArea;
  }

  get model(): ExtensionStorageModel {
    return this.#model;
  }

  get extensionId(): string {
    return this.#extensionIdInternal;
  }

  get name(): string {
    return this.#nameInternal;
  }

  // Returns a key that uniquely identifies this extension ID and storage area,
  // but which is not unique across targets, so we can identify two identical
  // storage areas across frames.
  get key(): string {
    return `${this.extensionId}-${this.storageArea}`;
  }

  get storageArea(): Protocol.Extensions.StorageArea {
    return this.#storageAreaInternal;
  }

  async getItems(keys?: string[]): Promise<{[key: string]: unknown}> {
    const params: Protocol.Extensions.GetStorageItemsRequest = {
      id: this.#extensionIdInternal,
      storageArea: this.#storageAreaInternal,
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

  async setItem(key: string, value: unknown): Promise<void> {
    const response = await this.#model.agent.invoke_setStorageItems(
        {id: this.#extensionIdInternal, storageArea: this.#storageAreaInternal, values: {[key]: value}});
    if (response.getError()) {
      throw new Error(response.getError());
    }
  }

  async removeItem(key: string): Promise<void> {
    const response = await this.#model.agent.invoke_removeStorageItems(
        {id: this.#extensionIdInternal, storageArea: this.#storageAreaInternal, keys: [key]});
    if (response.getError()) {
      throw new Error(response.getError());
    }
  }

  async clear(): Promise<void> {
    const response = await this.#model.agent.invoke_clearStorageItems(
        {id: this.#extensionIdInternal, storageArea: this.#storageAreaInternal});
    if (response.getError()) {
      throw new Error(response.getError());
    }
  }

  matchesTarget(target: SDK.Target.Target|undefined): boolean {
    if (!target) {
      return false;
    }
    const targetURL = target.targetInfo()?.url;
    const parsedURL = targetURL ? Common.ParsedURL.ParsedURL.fromString(targetURL) : null;
    return parsedURL?.scheme === 'chrome-extension' && parsedURL?.host === this.extensionId;
  }
}

export class ExtensionStorageModel extends SDK.SDKModel.SDKModel<EventTypes> {
  readonly #runtimeModelInternal: SDK.RuntimeModel.RuntimeModel|null;
  #storagesInternal: Map<string, Map<Protocol.Extensions.StorageArea, ExtensionStorage>>;
  readonly agent: ProtocolProxyApi.ExtensionsApi;
  #enabled?: boolean;

  constructor(target: SDK.Target.Target) {
    super(target);

    this.#runtimeModelInternal = target.model(SDK.RuntimeModel.RuntimeModel);
    this.#storagesInternal = new Map();
    this.agent = target.extensionsAgent();
  }

  enable(): void {
    if (this.#enabled) {
      return;
    }

    if (this.#runtimeModelInternal) {
      this.#runtimeModelInternal.addEventListener(
          SDK.RuntimeModel.Events.ExecutionContextCreated, this.#onExecutionContextCreated, this);
      this.#runtimeModelInternal.addEventListener(
          SDK.RuntimeModel.Events.ExecutionContextDestroyed, this.#onExecutionContextDestroyed, this);
      this.#runtimeModelInternal.executionContexts().forEach(this.#executionContextCreated, this);
    }

    this.#enabled = true;
  }

  #getStoragesForExtension(id: string): Map<Protocol.Extensions.StorageArea, ExtensionStorage> {
    const existingStorages = this.#storagesInternal.get(id);

    if (existingStorages) {
      return existingStorages;
    }

    const newStorages = new Map();
    this.#storagesInternal.set(id, newStorages);
    return newStorages;
  }

  #addExtension(id: string, name: string): void {
    for (const storageArea
             of [Protocol.Extensions.StorageArea.Session, Protocol.Extensions.StorageArea.Local,
                 Protocol.Extensions.StorageArea.Sync, Protocol.Extensions.StorageArea.Managed]) {
      const storages = this.#getStoragesForExtension(id);
      const storage = new ExtensionStorage(this, id, name, storageArea);

      console.assert(!storages.get(storageArea));

      storage.getItems([])
          .then(() => {
            // The extension may have been removed in the meantime.
            if (this.#storagesInternal.get(id) !== storages) {
              return;
            }
            // The storage area may have been added in the meantime.
            if (storages.get(storageArea)) {
              return;
            }
            storages.set(storageArea, storage);
            this.dispatchEventToListeners(Events.EXTENSION_STORAGE_ADDED, storage);
          })
          .catch(
              () => {
                  // Storage area is inaccessible (extension may have restricted access
                  // or not enabled the API).
              });
    }
  }

  #removeExtension(id: string): void {
    const storages = this.#storagesInternal.get(id);

    if (!storages) {
      return;
    }

    for (const [key, storage] of storages) {
      // Delete this before firing the event, since this matches the behavior
      // of other models and meets expectations for a removed event.
      storages.delete(key);
      this.dispatchEventToListeners(Events.EXTENSION_STORAGE_REMOVED, storage);
    }

    this.#storagesInternal.delete(id);
  }

  #executionContextCreated(context: SDK.RuntimeModel.ExecutionContext): void {
    const extensionId = this.#extensionIdForContext(context);
    if (extensionId) {
      this.#addExtension(extensionId, context.name);
    }
  }

  #onExecutionContextCreated(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>): void {
    this.#executionContextCreated(event.data);
  }

  #extensionIdForContext(context: SDK.RuntimeModel.ExecutionContext): string|undefined {
    const url = Common.ParsedURL.ParsedURL.fromString(context.origin);
    return url && url.scheme === 'chrome-extension' ? url.host : undefined;
  }

  #executionContextDestroyed(context: SDK.RuntimeModel.ExecutionContext): void {
    const extensionId = this.#extensionIdForContext(context);
    if (extensionId) {
      // Ignore event if there is still another context for this extension.
      if (this.#runtimeModelInternal?.executionContexts().some(c => this.#extensionIdForContext(c) === extensionId)) {
        return;
      }

      this.#removeExtension(extensionId);
    }
  }

  #onExecutionContextDestroyed(event: Common.EventTarget.EventTargetEvent<SDK.RuntimeModel.ExecutionContext>): void {
    this.#executionContextDestroyed(event.data);
  }

  storageForIdAndArea(id: string, storageArea: Protocol.Extensions.StorageArea): ExtensionStorage|undefined {
    return this.#storagesInternal.get(id)?.get(storageArea);
  }

  storages(): ExtensionStorage[] {
    const result = [];
    for (const storages of this.#storagesInternal.values()) {
      result.push(...storages.values());
    }
    return result;
  }
}

SDK.SDKModel.SDKModel.register(ExtensionStorageModel, {capabilities: SDK.Target.Capability.JS, autostart: false});

export const enum Events {
  EXTENSION_STORAGE_ADDED = 'ExtensionStorageAdded',
  EXTENSION_STORAGE_REMOVED = 'ExtensionStorageRemoved',
}

export type EventTypes = {
  [Events.EXTENSION_STORAGE_ADDED]: ExtensionStorage,
  [Events.EXTENSION_STORAGE_REMOVED]: ExtensionStorage,
};
