// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export class StorageItem {
  constructor(
      /**
       * The origin of the top-level primary page target being inspected.
       * Used to restrict AI agent tools from accessing unauthorized pages.
       */
      readonly primaryTargetOrigin: string,
      /**
       * The origin of the selected storage or cookie item (if any).
       * If no item is selected, this is the same as primaryTargetOrigin.
       */
      readonly origin: string,
  ) {
  }
}

export class DOMStorageItem extends StorageItem {
  constructor(
      primaryTargetOrigin: string,
      origin: string,
      /** The storage key partition identifier used by the browser storage engine. */
      readonly storageKey: string,
      /** The sub-category of DOM storage: 'localStorage' or 'sessionStorage'. */
      readonly type: string,
      /** The optional specific key of the selected item in this storage partition. */
      readonly key?: string,
  ) {
    super(primaryTargetOrigin, origin);
  }
}

export class CookieItem extends StorageItem {
  constructor(primaryTargetOrigin: string, origin: string, readonly name?: string) {
    super(primaryTargetOrigin, origin);
  }
}
