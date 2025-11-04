// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2008 Nokia Inc.  All rights reserved.
 * Copyright (C) 2013 Samsung Electronics. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as JSON5 from '../../third_party/json5/json5.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { KeyValueStorageItemsView } from './KeyValueStorageItemsView.js';
const UIStrings = {
    /**
     * @description Name for the "Extension Storage Items" table that shows the content of the extension Storage.
     */
    extensionStorageItems: 'Extension Storage Items',
    /**
     * @description Text for announcing that the "Extension Storage Items" table was cleared, that is, all
     * entries were deleted.
     */
    extensionStorageItemsCleared: 'Extension Storage Items cleared',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/ExtensionStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ExtensionStorageItemsView extends KeyValueStorageItemsView {
    #extensionStorage;
    extensionStorageItemsDispatcher;
    constructor(extensionStorage, view) {
        super(i18nString(UIStrings.extensionStorageItems), 'extension-storage', true, view);
        this.element.setAttribute('jslog', `${VisualLogging.pane().context('extension-storage-data')}`);
        this.element.classList.add('storage-view', 'table');
        this.extensionStorageItemsDispatcher =
            new Common.ObjectWrapper.ObjectWrapper();
        this.setStorage(extensionStorage);
    }
    get #isEditable() {
        // The managed storage area is always read only, since it exposes values
        // set by enterprise policy.
        return this.#extensionStorage.storageArea !== "managed" /* Protocol.Extensions.StorageArea.Managed */;
    }
    /**
     * When parsing a value provided by the user, attempt to treat it as JSON,
     * falling back to a string otherwise.
     */
    parseValue(input) {
        try {
            return JSON5.parse(input);
        }
        catch {
            return input;
        }
    }
    removeItem(key) {
        void this.#extensionStorage.removeItem(key).then(() => {
            this.refreshItems();
        });
    }
    setItem(key, value) {
        void this.#extensionStorage.setItem(key, this.parseValue(value)).then(() => {
            this.refreshItems();
            this.extensionStorageItemsDispatcher.dispatchEventToListeners("ItemEdited" /* ExtensionStorageItemsDispatcher.Events.ITEM_EDITED */);
        });
    }
    createPreview(key, value) {
        const url = 'extension-storage://' + this.#extensionStorage.extensionId + '/' + this.#extensionStorage.storageArea +
            '/preview/' + key;
        const provider = TextUtils.StaticContentProvider.StaticContentProvider.fromString(url, Common.ResourceType.resourceTypes.XHR, value);
        return SourceFrame.PreviewFactory.PreviewFactory.createPreview(provider, 'text/plain');
    }
    setStorage(extensionStorage) {
        this.#extensionStorage = extensionStorage;
        this.editable = this.#isEditable;
        this.refreshItems();
    }
    #extensionStorageItemsCleared() {
        if (!this.isShowing()) {
            return;
        }
        this.itemsCleared();
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.extensionStorageItemsCleared));
    }
    deleteSelectedItem() {
        if (!this.#isEditable) {
            return;
        }
        this.deleteSelectedItem();
    }
    refreshItems() {
        void this.#refreshItems();
    }
    async #refreshItems() {
        const items = await this.#extensionStorage.getItems();
        if (!items || !this.toolbar) {
            return;
        }
        const filteredItems = Object.entries(items)
            .map(([key, value]) => ({ key, value: typeof value === 'string' ? value : JSON.stringify(value) }))
            .filter(item => this.toolbar?.filterRegex?.test(`${item.key} ${item.value}`) ?? true);
        this.showItems(filteredItems);
        this.extensionStorageItemsDispatcher.dispatchEventToListeners("ItemsRefreshed" /* ExtensionStorageItemsDispatcher.Events.ITEMS_REFRESHED */);
    }
    deleteAllItems() {
        if (!this.#isEditable) {
            return;
        }
        this.#extensionStorage.clear().then(() => {
            this.#extensionStorageItemsCleared();
        }, () => {
            throw new Error('Unable to clear storage.');
        });
    }
}
//# sourceMappingURL=ExtensionStorageItemsView.js.map