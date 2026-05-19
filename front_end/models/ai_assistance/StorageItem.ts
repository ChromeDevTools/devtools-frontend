// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

interface StorageItemOriginOnly {
  origin: string;
  storageKey?: string;
  storageType?: never;
  key?: never;
}

interface StorageItemWithKey {
  origin: string;
  storageKey?: string;
  storageType: 'cookie'|'localStorage'|'sessionStorage';
  key: string;
}

export type StorageItemData = StorageItemOriginOnly|StorageItemWithKey;

// The StorageItem is used as context for the Ai Assistance.
// If the user selects a row in e.g. the cookies table, the storageType and key
// will be populated.
export class StorageItem {
  readonly origin: string;
  readonly storageKey?: string;
  readonly storageType?: 'cookie'|'localStorage'|'sessionStorage';
  readonly key?: string;

  constructor(data: StorageItemData) {
    this.origin = data.origin;
    this.storageKey = data.storageKey;
    this.storageType = data.storageType;
    this.key = data.key;
  }
}
