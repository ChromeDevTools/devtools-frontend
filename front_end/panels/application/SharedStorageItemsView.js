// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ApplicationComponents from './components/components.js';
import { KeyValueStorageItemsView } from './KeyValueStorageItemsView.js';
const UIStrings = {
    /**
     * @description Text in SharedStorage Items View of the Application panel
     */
    sharedStorage: 'Shared storage',
    /**
     * @description Text for announcing that the "Shared Storage Items" table was cleared, that is, all
     * entries were deleted.
     */
    sharedStorageItemsCleared: 'Shared Storage items cleared',
    /**
     * @description Text for announcing that the filtered "Shared Storage Items" table was cleared, that is,
     * all filtered entries were deleted.
     */
    sharedStorageFilteredItemsCleared: 'Shared Storage filtered items cleared',
    /**
     * @description Text for announcing a Shared Storage key/value item has been deleted
     */
    sharedStorageItemDeleted: 'The storage item was deleted.',
    /**
     * @description Text for announcing a Shared Storage key/value item has been edited
     */
    sharedStorageItemEdited: 'The storage item was edited.',
    /**
     * @description Text for announcing a Shared Storage key/value item edit request has been canceled
     */
    sharedStorageItemEditCanceled: 'The storage item edit was canceled.',
};
const str_ = i18n.i18n.registerUIStrings('panels/application/SharedStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class SharedStorageItemsView extends KeyValueStorageItemsView {
    #sharedStorage;
    sharedStorageItemsDispatcher;
    constructor(sharedStorage, view) {
        super(i18nString(UIStrings.sharedStorage), 'shared-storage-items-view', /* editable=*/ true, view, new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataView(sharedStorage, sharedStorage.securityOrigin));
        this.#sharedStorage = sharedStorage;
        this.performUpdate();
        this.#sharedStorage.addEventListener("SharedStorageChanged" /* SharedStorageForOrigin.Events.SHARED_STORAGE_CHANGED */, this.#sharedStorageChanged, this);
        this.sharedStorageItemsDispatcher =
            new Common.ObjectWrapper.ObjectWrapper();
    }
    // Use `createView()` instead of the constructor to create a view, so that entries can be awaited asynchronously.
    static async createView(sharedStorage, viewFunction) {
        const view = new SharedStorageItemsView(sharedStorage, viewFunction);
        await view.updateEntriesOnly();
        return view;
    }
    async updateEntriesOnly() {
        const entries = await this.#sharedStorage.getEntries();
        if (entries) {
            this.#showSharedStorageItems(entries);
        }
    }
    async #sharedStorageChanged() {
        await this.refreshItems();
    }
    async refreshItems() {
        await this.metadataView?.render();
        await this.updateEntriesOnly();
        this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemsRefreshed" /* SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED */);
    }
    async deleteAllItems() {
        if (!this.toolbar?.hasFilter()) {
            await this.#sharedStorage.clear();
            await this.refreshItems();
            this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemsCleared" /* SharedStorageItemsDispatcher.Events.ITEMS_CLEARED */);
            UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemsCleared));
            return;
        }
        await Promise.all(this.keys().map(key => this.#sharedStorage.deleteEntry(key)));
        await this.refreshItems();
        this.sharedStorageItemsDispatcher.dispatchEventToListeners("FilteredItemsCleared" /* SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED */);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageFilteredItemsCleared));
    }
    isEditAllowed(columnIdentifier, _oldText, newText) {
        if (columnIdentifier === 'key' && newText === '') {
            // The Shared Storage backend does not currently allow '' as a key, so we only set a new entry with a new key if its new key is nonempty.
            void this.refreshItems().then(() => {
                UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemEditCanceled));
            });
            return false;
        }
        return true;
    }
    async setItem(key, value) {
        await this.#sharedStorage.setEntry(key, value, false);
        await this.refreshItems();
        this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemEdited" /* SharedStorageItemsDispatcher.Events.ITEM_EDITED */);
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemEdited));
    }
    #showSharedStorageItems(items) {
        if (this.toolbar) {
            const filteredList = items.filter(item => this.toolbar?.filterRegex?.test(`${item.key} ${item.value}`) ?? true);
            this.showItems(filteredList);
        }
    }
    async removeItem(key) {
        await this.#sharedStorage.deleteEntry(key);
        await this.refreshItems();
        this.sharedStorageItemsDispatcher.dispatchEventToListeners("ItemDeleted" /* SharedStorageItemsDispatcher.Events.ITEM_DELETED */, { key });
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemDeleted));
    }
    async createPreview(key, value) {
        const wrappedEntry = key && { key, value: value || '' };
        return SourceFrame.JSONView.JSONView.createViewSync(wrappedEntry);
    }
}
//# sourceMappingURL=SharedStorageItemsView.js.map