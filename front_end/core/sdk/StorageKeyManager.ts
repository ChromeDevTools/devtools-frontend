// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {Capability, type Target} from './Target.js';
import {SDKModel} from './SDKModel.js';
import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';

export class StorageKeyManager extends SDKModel<EventTypes> {
  #mainStorageKeyInternal: string;
  #storageKeysInternal: Set<string>;
  constructor(target: Target) {
    super(target);

    this.#mainStorageKeyInternal = '';
    this.#storageKeysInternal = new Set();
  }

  updateStorageKeys(storageKeys: Set<string>): void {
    const oldStorageKeys = this.#storageKeysInternal;
    this.#storageKeysInternal = storageKeys;

    for (const storageKey of oldStorageKeys) {
      if (!this.#storageKeysInternal.has(storageKey)) {
        this.dispatchEventToListeners(Events.StorageKeyRemoved, storageKey);
      }
    }

    for (const storageKey of this.#storageKeysInternal) {
      if (!oldStorageKeys.has(storageKey)) {
        this.dispatchEventToListeners(Events.StorageKeyAdded, storageKey);
      }
    }
  }

  storageKeys(): string[] {
    return [...this.#storageKeysInternal];
  }

  mainStorageKey(): string {
    return this.#mainStorageKeyInternal;
  }

  setMainStorageKey(storageKey: string): void {
    this.#mainStorageKeyInternal = storageKey;
    this.dispatchEventToListeners(Events.MainStorageKeyChanged, {
      mainStorageKey: this.#mainStorageKeyInternal,
    });
  }
}

export function parseStorageKey(storageKeyString: string): StorageKey {
  // Based on the canonical implementation of StorageKey::Deserialize in
  // third_party/blink/common/storage_key/storage_key.cc
  const components = storageKeyString.split('^');
  const origin = Common.ParsedURL.ParsedURL.extractOrigin(components[0] as Platform.DevToolsPath.UrlString);
  const storageKey = {origin, components: new Map<StorageKeyComponent, string>()};
  for (let i = 1; i < components.length; ++i) {
    storageKey.components.set(components[i].charAt(0) as StorageKeyComponent, components[i].substring(1));
  }
  return storageKey;
}

export const enum StorageKeyComponent {
  TOP_LEVEL_SITE = '0',
  NONCE_HIGH = '1',
  NONCE_LOW = '2',
  ANCESTOR_CHAIN_BIT = '3',
  TOP_LEVEL_SITE_OPAQUE_NONCE_HIGH = '4',
  TOP_LEVEL_SITE_OPAQUE_NONCE_LOW = '5',
  TOP_LEVEL_SITE_OPAQUE_NONCE_PRECURSOR = '6',
}

export interface StorageKey {
  origin: Platform.DevToolsPath.UrlString;
  components: Map<StorageKeyComponent, string>;
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  StorageKeyAdded = 'StorageKeyAdded',
  StorageKeyRemoved = 'StorageKeyRemoved',
  MainStorageKeyChanged = 'MainStorageKeyChanged',
}

export interface MainStorageKeyChangedEvent {
  mainStorageKey: string;
}

export type EventTypes = {
  [Events.StorageKeyAdded]: string,
  [Events.StorageKeyRemoved]: string,
  [Events.MainStorageKeyChanged]: MainStorageKeyChangedEvent,
};

// TODO(jarhar): this is the one of the two usages of Capability.None. Do something about it!
SDKModel.register(StorageKeyManager, {capabilities: Capability.None, autostart: false});
