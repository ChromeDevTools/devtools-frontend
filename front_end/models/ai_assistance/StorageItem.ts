// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

export const EMPTY_ORIGIN = '';

export class StorageItem {
  constructor(
      /**
       * The origin of the top-level primary page target being inspected.
       * Used to restrict AI agent tools from accessing unauthorized pages.
       */
      readonly primaryTargetOrigin: string,
      /**
       * The origin of the selected storage or cookie item.
       * If empty (''), this represents a generic category-level context (e.g., all Local Storage or all Cookies).
       */
      readonly origin: string = EMPTY_ORIGIN,
  ) {
  }

  get isGenericContext(): boolean {
    return this.origin === EMPTY_ORIGIN;
  }

  static createGenericContext(primaryTargetOrigin: string, ..._args: unknown[]): StorageItem {
    return new StorageItem(primaryTargetOrigin, EMPTY_ORIGIN);
  }
}

export class DOMStorageItem extends StorageItem {
  constructor(
      primaryTargetOrigin: string,
      origin: string,
      /** The storage key partition identifier used by the browser storage engine. */
      readonly storageKey: string|undefined,
      /** The sub-category of DOM storage: 'localStorage' or 'sessionStorage'. */
      readonly type: 'localStorage'|'sessionStorage',
      /** The optional specific key of the selected item in this storage partition. */
      readonly key?: string,
  ) {
    super(primaryTargetOrigin, origin);
  }

  static override createGenericContext(
      primaryTargetOrigin: string,
      type: 'localStorage'|'sessionStorage',
      ): DOMStorageItem {
    return new DOMStorageItem(primaryTargetOrigin, EMPTY_ORIGIN, undefined, type);
  }
}

export class CookieItem extends StorageItem {
  constructor(primaryTargetOrigin: string, origin: string, readonly name?: string) {
    super(primaryTargetOrigin, origin);
  }

  static override createGenericContext(primaryTargetOrigin: string): CookieItem {
    return new CookieItem(primaryTargetOrigin, EMPTY_ORIGIN);
  }
}
