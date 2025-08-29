// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import * as ApplicationComponents from './components/components.js';
import {KeyValueStorageItemsView, type View as ViewFunction} from './KeyValueStorageItemsView.js';
import {SharedStorageForOrigin} from './SharedStorageModel.js';

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
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/application/SharedStorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface WrappedEntry {
  key: string;
  value: string;
}

export namespace SharedStorageItemsDispatcher {
  export const enum Events {
    FILTERED_ITEMS_CLEARED = 'FilteredItemsCleared',
    ITEM_DELETED = 'ItemDeleted',
    ITEM_EDITED = 'ItemEdited',
    ITEMS_CLEARED = 'ItemsCleared',
    ITEMS_REFRESHED = 'ItemsRefreshed',
  }

  export interface ItemDeletedEvent {
    key: string;
  }

  export interface ItemEditedEvent {
    columnIdentifier: string;
    oldText: string|null;
    newText: string;
  }

  export interface EventTypes {
    [Events.FILTERED_ITEMS_CLEARED]: void;
    [Events.ITEM_DELETED]: ItemDeletedEvent;
    [Events.ITEM_EDITED]: void;
    [Events.ITEMS_CLEARED]: void;
    [Events.ITEMS_REFRESHED]: void;
  }
}

export class SharedStorageItemsView extends KeyValueStorageItemsView {
  #sharedStorage: SharedStorageForOrigin;
  readonly sharedStorageItemsDispatcher: Common.ObjectWrapper.ObjectWrapper<SharedStorageItemsDispatcher.EventTypes>;

  constructor(sharedStorage: SharedStorageForOrigin, view?: ViewFunction) {
    super(
        i18nString(UIStrings.sharedStorage), 'shared-storage-items-view', /* editable=*/ true, view,
        new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataView(
            sharedStorage, sharedStorage.securityOrigin));

    this.#sharedStorage = sharedStorage;
    this.performUpdate();

    this.#sharedStorage.addEventListener(
        SharedStorageForOrigin.Events.SHARED_STORAGE_CHANGED, this.#sharedStorageChanged, this);

    this.sharedStorageItemsDispatcher =
        new Common.ObjectWrapper.ObjectWrapper<SharedStorageItemsDispatcher.EventTypes>();
  }

  // Use `createView()` instead of the constructor to create a view, so that entries can be awaited asynchronously.
  static async createView(sharedStorage: SharedStorageForOrigin, viewFunction?: ViewFunction):
      Promise<SharedStorageItemsView> {
    const view = new SharedStorageItemsView(sharedStorage, viewFunction);
    await view.updateEntriesOnly();
    return view;
  }

  async updateEntriesOnly(): Promise<void> {
    const entries = await this.#sharedStorage.getEntries();
    if (entries) {
      this.#showSharedStorageItems(entries);
    }
  }

  async #sharedStorageChanged(): Promise<void> {
    await this.refreshItems();
  }

  override async refreshItems(): Promise<void> {
    await this.metadataView?.render();
    await this.updateEntriesOnly();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED);
  }

  override async deleteAllItems(): Promise<void> {
    if (!this.toolbar?.hasFilter()) {
      await this.#sharedStorage.clear();
      await this.refreshItems();
      this.sharedStorageItemsDispatcher.dispatchEventToListeners(SharedStorageItemsDispatcher.Events.ITEMS_CLEARED);
      UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemsCleared));
      return;
    }

    await Promise.all(this.keys().map(key => this.#sharedStorage.deleteEntry(key)));

    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
        SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED);
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageFilteredItemsCleared));
  }

  protected override isEditAllowed(columnIdentifier: string, _oldText: string, newText: string): boolean {
    if (columnIdentifier === 'key' && newText === '') {
      // The Shared Storage backend does not currently allow '' as a key, so we only set a new entry with a new key if its new key is nonempty.
      void this.refreshItems().then(() => {
        UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemEditCanceled));
      });
      return false;
    }
    return true;
  }

  protected async setItem(key: string, value: string): Promise<void> {
    await this.#sharedStorage.setEntry(key, value, false);

    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(SharedStorageItemsDispatcher.Events.ITEM_EDITED);
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemEdited));
  }

  #showSharedStorageItems(items: Protocol.Storage.SharedStorageEntry[]): void {
    if (this.toolbar) {
      const filteredList = items.filter(item => this.toolbar?.filterRegex?.test(`${item.key} ${item.value}`) ?? true);
      this.showItems(filteredList);
    }
  }

  protected async removeItem(key: string): Promise<void> {
    await this.#sharedStorage.deleteEntry(key);
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
        SharedStorageItemsDispatcher.Events.ITEM_DELETED, {key} as SharedStorageItemsDispatcher.ItemDeletedEvent);
    UI.ARIAUtils.LiveAnnouncer.alert(i18nString(UIStrings.sharedStorageItemDeleted));
  }

  protected async createPreview(key: string, value: string): Promise<UI.Widget.Widget|null> {
    const wrappedEntry = key && {key, value: value || ''} as WrappedEntry;
    return SourceFrame.JSONView.JSONView.createViewSync(wrappedEntry);
  }
}
