// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import {
  ConversationContext,
  type ConversationSuggestions,
} from '../agents/AiAgent.js';
import {areOriginsEquivalent} from '../AiOrigins.js';
import {CookieItem, DOMStorageItem, type StorageItem} from '../StorageItem.js';

export class StorageContext extends ConversationContext<StorageItem> {
  #item: StorageItem;

  constructor(item: StorageItem) {
    super();
    this.#item = item;
  }

  override getURL(): string {
    return this.#item.primaryTargetOrigin;
  }

  override getItem(): StorageItem {
    return this.#item;
  }

  override getTitle(): string {
    if (this.#item instanceof CookieItem) {
      if (this.#item.name) {
        return `cookie: ${this.#item.name}${this.#item.origin ? ` ${this.#item.origin}` : ''}`;
      }
      return `cookies${this.#item.isGenericContext ? '' : `: ${this.#item.origin}`}`;
    }
    if (this.#item instanceof DOMStorageItem) {
      if (this.#item.key) {
        return `entry: ${this.#item.key}${this.#item.origin ? ` ${this.#item.origin}` : ''}`;
      }
      const prefix = this.#item.type === 'localStorage' ? 'local storage' : 'session storage';
      return `${prefix}${this.#item.isGenericContext ? '' : `: ${this.#item.origin}`}`;
    }
    return `Storage: ${this.getOrigin()}`;
  }

  /**
   * @override
   */
  override isLoggingEnabled(): boolean {
    if (this.#item instanceof CookieItem && Boolean(this.#item.name)) {
      return false;
    }
    if (this.#item instanceof DOMStorageItem && Boolean(this.#item.key)) {
      return false;
    }
    return true;
  }

  override async getSuggestions(): Promise<ConversationSuggestions|undefined> {
    if (this.#item instanceof CookieItem) {
      if (this.#item.name) {
        return [
          {
            title: 'Why is this cookie set?',
            jslogContext: 'storage-cookie',
          },
          {
            title: 'Explain the value of this cookie',
            jslogContext: 'storage-cookie',
          },
        ];
      }
      return [
        {
          title: 'Explain the cookies set by this page',
          jslogContext: 'storage-cookie',
        },
      ];
    }
    if (this.#item instanceof DOMStorageItem) {
      if (this.#item.key) {
        return [
          {
            title: 'What is the purpose of this storage entry?',
            jslogContext: 'storage-domstorage',
          },
          {
            title: 'Explain the value of this storage entry',
            jslogContext: 'storage-domstorage',
          },
        ];
      }
      return [
        {
          title: 'Explain these storage items',
          jslogContext: 'storage-domstorage',
        },
      ];
    }
    return undefined;
  }
}

export function isSamePageOrigin(target: SDK.Target.Target|null, allowedOrigin: string): boolean {
  if (!target) {
    return false;
  }
  const pageOrigin = Common.ParsedURL.ParsedURL.extractOrigin(target.inspectedURL());
  return pageOrigin !== '' && areOriginsEquivalent(pageOrigin, allowedOrigin);
}
