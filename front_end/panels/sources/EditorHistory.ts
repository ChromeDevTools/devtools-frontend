// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import type * as Workspace from '../../models/workspace/workspace.js';

export const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
export const MAX_SERIALIZABLE_URL_LENGTH = 4096;

export interface SerializedHistoryItem {
  url: string;
  resourceTypeName: string;
  selectionRange?: TextUtils.TextRange.SerializedTextRange;
  scrollLineNumber?: number;
}

export interface HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
}

export function historyItemKey(uiSourceCode: Workspace.UISourceCode.UISourceCode): HistoryItemKey {
  return {url: uiSourceCode.url(), resourceType: uiSourceCode.contentType()};
}

export class HistoryItem implements HistoryItemKey {
  url: Platform.DevToolsPath.UrlString;
  resourceType: Common.ResourceType.ResourceType;
  selectionRange: TextUtils.TextRange.TextRange|undefined;
  scrollLineNumber: number|undefined;

  constructor(
      url: Platform.DevToolsPath.UrlString,
      resourceType: Common.ResourceType.ResourceType,
      selectionRange?: TextUtils.TextRange.TextRange,
      scrollLineNumber?: number,
  ) {
    this.url = url;
    this.resourceType = resourceType;
    this.selectionRange = selectionRange;
    this.scrollLineNumber = scrollLineNumber;
  }

  static fromObject(serializedHistoryItem: SerializedHistoryItem): HistoryItem {
    const resourceType = Common.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
    if (resourceType === null) {
      throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
    }
    const selectionRange = serializedHistoryItem.selectionRange ?
        TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
        undefined;
    return new HistoryItem(
        serializedHistoryItem.url as Platform.DevToolsPath.UrlString,
        resourceType,
        selectionRange,
        serializedHistoryItem.scrollLineNumber,
    );
  }

  toObject(): SerializedHistoryItem|null {
    if (this.url.length >= MAX_SERIALIZABLE_URL_LENGTH) {
      return null;
    }
    return {
      url: this.url,
      resourceTypeName: this.resourceType.name(),
      selectionRange: this.selectionRange,
      scrollLineNumber: this.scrollLineNumber,
    };
  }
}

export class History {
  #items: HistoryItem[];

  constructor(items: HistoryItem[]) {
    this.#items = items;
  }

  static fromObject(serializedHistoryItems: SerializedHistoryItem[]): History {
    const items: HistoryItem[] = [];
    for (const serializedHistoryItem of serializedHistoryItems) {
      try {
        items.push(HistoryItem.fromObject(serializedHistoryItem));
      } catch {
      }
    }
    return new History(items);
  }

  index({url, resourceType}: HistoryItemKey): number {
    return this.#items.findIndex(item => item.url === url && item.resourceType === resourceType);
  }

  selectionRange(key: HistoryItemKey): TextUtils.TextRange.TextRange|undefined {
    const index = this.index(key);
    if (index === -1) {
      return undefined;
    }
    return this.#items[index].selectionRange;
  }

  updateSelectionRange(key: HistoryItemKey, selectionRange?: TextUtils.TextRange.TextRange): void {
    if (!selectionRange) {
      return;
    }
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.#items[index].selectionRange = selectionRange;
  }

  scrollLineNumber(key: HistoryItemKey): number|undefined {
    const index = this.index(key);
    if (index === -1) {
      return undefined;
    }
    return this.#items[index].scrollLineNumber;
  }

  updateScrollLineNumber(key: HistoryItemKey, scrollLineNumber: number): void {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.#items[index].scrollLineNumber = scrollLineNumber;
  }

  update(keys: HistoryItemKey[]): void {
    for (let i = keys.length - 1; i >= 0; --i) {
      const index = this.index(keys[i]);
      let item;
      if (index !== -1) {
        item = this.#items[index];
        this.#items.splice(index, 1);
      } else {
        item = new HistoryItem(keys[i].url, keys[i].resourceType);
      }
      this.#items.unshift(item);
    }
  }

  remove(key: HistoryItemKey): void {
    const index = this.index(key);
    if (index === -1) {
      return;
    }
    this.#items.splice(index, 1);
  }

  toObject(): SerializedHistoryItem[] {
    const serializedHistoryItems = [];
    for (const item of this.#items) {
      const serializedItem = item.toObject();
      if (serializedItem) {
        serializedHistoryItems.push(serializedItem);
      }
      if (serializedHistoryItems.length === MAX_PREVIOUSLY_VIEWED_FILES_COUNT) {
        break;
      }
    }
    return serializedHistoryItems;
  }

  keys(): HistoryItemKey[] {
    return this.#items;
  }
}
