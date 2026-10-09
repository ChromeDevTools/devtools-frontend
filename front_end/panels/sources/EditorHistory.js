// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
export const MAX_PREVIOUSLY_VIEWED_FILES_COUNT = 30;
export const MAX_SERIALIZABLE_URL_LENGTH = 4096;
export function historyItemKey(uiSourceCode) {
    return { url: uiSourceCode.url(), resourceType: uiSourceCode.contentType() };
}
export class HistoryItem {
    url;
    resourceType;
    selectionRange;
    scrollLineNumber;
    constructor(url, resourceType, selectionRange, scrollLineNumber) {
        this.url = url;
        this.resourceType = resourceType;
        this.selectionRange = selectionRange;
        this.scrollLineNumber = scrollLineNumber;
    }
    static fromObject(serializedHistoryItem) {
        const resourceType = Common.ResourceType.ResourceType.fromName(serializedHistoryItem.resourceTypeName);
        if (resourceType === null) {
            throw new TypeError(`Invalid resource type name "${serializedHistoryItem.resourceTypeName}"`);
        }
        const selectionRange = serializedHistoryItem.selectionRange ?
            TextUtils.TextRange.TextRange.fromObject(serializedHistoryItem.selectionRange) :
            undefined;
        return new HistoryItem(serializedHistoryItem.url, resourceType, selectionRange, serializedHistoryItem.scrollLineNumber);
    }
    toObject() {
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
    #items;
    constructor(items) {
        this.#items = items;
    }
    static fromObject(serializedHistoryItems) {
        const items = [];
        for (const serializedHistoryItem of serializedHistoryItems) {
            try {
                items.push(HistoryItem.fromObject(serializedHistoryItem));
            }
            catch {
            }
        }
        return new History(items);
    }
    index({ url, resourceType }) {
        return this.#items.findIndex(item => item.url === url && item.resourceType === resourceType);
    }
    selectionRange(key) {
        const index = this.index(key);
        if (index === -1) {
            return undefined;
        }
        return this.#items[index].selectionRange;
    }
    updateSelectionRange(key, selectionRange) {
        if (!selectionRange) {
            return;
        }
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        this.#items[index].selectionRange = selectionRange;
    }
    scrollLineNumber(key) {
        const index = this.index(key);
        if (index === -1) {
            return undefined;
        }
        return this.#items[index].scrollLineNumber;
    }
    updateScrollLineNumber(key, scrollLineNumber) {
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        this.#items[index].scrollLineNumber = scrollLineNumber;
    }
    update(keys) {
        for (let i = keys.length - 1; i >= 0; --i) {
            const index = this.index(keys[i]);
            let item;
            if (index !== -1) {
                item = this.#items[index];
                this.#items.splice(index, 1);
            }
            else {
                item = new HistoryItem(keys[i].url, keys[i].resourceType);
            }
            this.#items.unshift(item);
        }
    }
    remove(key) {
        const index = this.index(key);
        if (index === -1) {
            return;
        }
        this.#items.splice(index, 1);
    }
    toObject() {
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
    keys() {
        return this.#items;
    }
}
//# sourceMappingURL=EditorHistory.js.map