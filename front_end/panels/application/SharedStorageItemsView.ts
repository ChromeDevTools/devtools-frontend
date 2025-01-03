// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Protocol from '../../generated/protocol.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as ApplicationComponents from './components/components.js';
import {SharedStorageForOrigin} from './SharedStorageModel.js';
import {StorageItemsView} from './StorageItemsView.js';

const UIStrings = {
  /**
   *@description Text in SharedStorage Items View of the Application panel
   */
  sharedStorage: 'Shared storage',
  /**
   *@description Text representing the name of a value stored in the "Shared Storage Items" table
   */
  key: 'Key',
  /**
   *@description Text for the value of something
   */
  value: 'Value',
  /**
   *@description Name for the "Shared Storage Items" table that shows the content of the Shared Storage.
   */
  sharedStorageItems: 'Shared Storage Items',
  /**
   *@description Text for announcing that the "Shared Storage Items" table was cleared, that is, all
   * entries were deleted.
   */
  sharedStorageItemsCleared: 'Shared Storage items cleared',
  /**
   *@description Text for announcing that the filtered "Shared Storage Items" table was cleared, that is,
   * all filtered entries were deleted.
   */
  sharedStorageFilteredItemsCleared: 'Shared Storage filtered items cleared',
  /**
   *@description Text in SharedStorage Items View of the Application panel
   */
  selectAValueToPreview: 'Select a value to preview',
  /**
   *@description Text for announcing a Shared Storage key/value item has been deleted
   */
  sharedStorageItemDeleted: 'The storage item was deleted.',
  /**
   *@description Text for announcing a Shared Storage key/value item has been edited
   */
  sharedStorageItemEdited: 'The storage item was edited.',
  /**
   *@description Text for announcing a Shared Storage key/value item edit request has been canceled
   */
  sharedStorageItemEditCanceled: 'The storage item edit was canceled.',
  /**
   *@description Text for announcing number of entries after filtering
   *@example {5} PH1
   */
  sharedStorageNumberEntries: 'Number of entries shown in table: {PH1}',
};
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

  export type EventTypes = {
    [Events.FILTERED_ITEMS_CLEARED]: void,
    [Events.ITEM_DELETED]: ItemDeletedEvent,
    [Events.ITEM_EDITED]: ItemEditedEvent,
    [Events.ITEMS_CLEARED]: void,
    [Events.ITEMS_REFRESHED]: void,
  };
}

export class SharedStorageItemsView extends StorageItemsView {
  #sharedStorage: SharedStorageForOrigin;
  readonly outerSplitWidget: UI.SplitWidget.SplitWidget;
  readonly innerSplitWidget: UI.SplitWidget.SplitWidget;
  #metadataView: LegacyWrapper.LegacyWrapper
      .LegacyWrapper<UI.Widget.VBox, ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataView>;
  readonly dataGrid: DataGrid.DataGrid.DataGridImpl<Protocol.Storage.SharedStorageEntry>;
  #noDisplayView: UI.Widget.VBox;
  #eventListeners: Common.EventTarget.EventDescriptor[];
  readonly sharedStorageItemsDispatcher: Common.ObjectWrapper.ObjectWrapper<SharedStorageItemsDispatcher.EventTypes>;

  constructor(sharedStorage: SharedStorageForOrigin) {
    super(i18nString(UIStrings.sharedStorage), 'sharedStoragePanel');

    this.#sharedStorage = sharedStorage;

    this.element.classList.add('storage-view', 'table');

    const columns = ([
      {id: 'key', title: i18nString(UIStrings.key), sortable: false, editable: true, longText: true, weight: 50},
      {id: 'value', title: i18nString(UIStrings.value), sortable: false, editable: true, longText: true, weight: 50},
    ] as DataGrid.DataGrid.ColumnDescriptor[]);
    this.dataGrid = new DataGrid.DataGrid.DataGridImpl({
      displayName: i18nString(UIStrings.sharedStorageItems),
      columns,
      editCallback: this.#editingCallback.bind(this),
      deleteCallback: this.#deleteCallback.bind(this),
      refreshCallback: this.refreshItems.bind(this),
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SELECTED_NODE, event => {
      void this.#previewEntry(event.data);
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.DESELECTED_NODE, () => {
      void this.#previewEntry(null);
    });
    this.dataGrid.setStriped(true);
    this.dataGrid.setName('shared-storage-items-view');

    const dataGridWidget = this.dataGrid.asWidget();
    dataGridWidget.setMinimumSize(0, 100);

    this.#metadataView = LegacyWrapper.LegacyWrapper.legacyWrapper(
        UI.Widget.VBox,
        new ApplicationComponents.SharedStorageMetadataView.SharedStorageMetadataView(
            sharedStorage, sharedStorage.securityOrigin));
    this.#metadataView.setMinimumSize(0, 275);
    const innerResizer = this.#metadataView.element.createChild('div', 'metadata-view-resizer');

    this.innerSplitWidget = new UI.SplitWidget.SplitWidget(
        /* isVertical: */ false, /* secondIsSidebar: */ false, 'shared-storage-inner-split-view-state');
    this.innerSplitWidget.setSidebarWidget(this.#metadataView);
    this.innerSplitWidget.setMainWidget(dataGridWidget);
    this.innerSplitWidget.installResizer(innerResizer);

    this.#noDisplayView = new UI.Widget.VBox();
    this.#noDisplayView.setMinimumSize(0, 25);
    this.#noDisplayView.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({resize: true})}`);
    const outerResizer = this.#noDisplayView.element.createChild('div', 'preview-panel-resizer');

    this.outerSplitWidget = new UI.SplitWidget.SplitWidget(
        /* isVertical: */ false, /* secondIsSidebar: */ true, 'shared-storage-outer-split-view-state');
    this.outerSplitWidget.show(this.element);
    this.outerSplitWidget.setMainWidget(this.innerSplitWidget);
    this.outerSplitWidget.setSidebarWidget(this.#noDisplayView);
    this.outerSplitWidget.installResizer(outerResizer);

    this.#noDisplayView.contentElement.classList.add('placeholder');
    const noDisplayDiv = this.#noDisplayView.contentElement.createChild('div');
    noDisplayDiv.textContent = i18nString(UIStrings.selectAValueToPreview);

    this.#eventListeners = [];
    Common.EventTarget.removeEventListeners(this.#eventListeners);
    this.#sharedStorage = sharedStorage;
    this.#eventListeners = [
      this.#sharedStorage.addEventListener(
          SharedStorageForOrigin.Events.SHARED_STORAGE_CHANGED, this.#sharedStorageChanged, this),
    ];

    this.sharedStorageItemsDispatcher =
        new Common.ObjectWrapper.ObjectWrapper<SharedStorageItemsDispatcher.EventTypes>();
  }

  // Use `createView()` instead of the constructor to create a view, so that entries can be awaited asynchronously.
  static async createView(sharedStorage: SharedStorageForOrigin): Promise<SharedStorageItemsView> {
    const view = new SharedStorageItemsView(sharedStorage);
    await view.updateEntriesOnly();
    return view;
  }

  async updateEntriesOnly(): Promise<void> {
    if (!this.isShowing()) {
      return;
    }
    const entries = await this.#sharedStorage.getEntries();
    if (entries) {
      this.#showSharedStorageItems(entries);
    }
  }

  async #sharedStorageChanged(): Promise<void> {
    await this.refreshItems();
  }

  override async refreshItems(): Promise<void> {
    if (!this.isShowing()) {
      return;
    }
    await this.#metadataView.getComponent().render();
    await this.updateEntriesOnly();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(SharedStorageItemsDispatcher.Events.ITEMS_REFRESHED);
  }

  override async deleteSelectedItem(): Promise<void> {
    if (!this.dataGrid.selectedNode) {
      return;
    }

    await this.#deleteCallback(this.dataGrid.selectedNode);
  }

  override async deleteAllItems(): Promise<void> {
    if (!this.hasFilter()) {
      await this.#sharedStorage.clear();
      await this.refreshItems();
      this.sharedStorageItemsDispatcher.dispatchEventToListeners(SharedStorageItemsDispatcher.Events.ITEMS_CLEARED);
      UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemsCleared));
      return;
    }

    await Promise.all(this.dataGrid.rootNode()
                          .children.filter(node => node.data.key)
                          .map(node => this.#sharedStorage.deleteEntry(node.data.key)));

    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
        SharedStorageItemsDispatcher.Events.FILTERED_ITEMS_CLEARED);
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageFilteredItemsCleared));
  }

  async #editingCallback(
      editingNode: DataGrid.DataGrid.DataGridNode<Protocol.Storage.SharedStorageEntry>, columnIdentifier: string,
      oldText: string|null, newText: string): Promise<void> {
    if (columnIdentifier === 'key' && newText === '') {
      // The Shared Storage backend does not currently allow '' as a key, so we only set a new entry with a new key if its new key is nonempty.
      await this.refreshItems();
      UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemEditCanceled));
      return;
    }
    if (columnIdentifier === 'key') {
      if (oldText !== null) {
        await this.#sharedStorage.deleteEntry(oldText);
      }
      await this.#sharedStorage.setEntry(newText, editingNode.data.value || '', false);
    } else {
      // The Shared Storage backend does not currently allow '' as a key, so we use ' ' as the default key instead.
      await this.#sharedStorage.setEntry(editingNode.data.key || ' ', newText, false);
    }

    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
        SharedStorageItemsDispatcher.Events.ITEM_EDITED,
        {columnIdentifier, oldText, newText} as SharedStorageItemsDispatcher.ItemEditedEvent);
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemEdited));
  }

  #showSharedStorageItems(items: Protocol.Storage.SharedStorageEntry[]): void {
    const rootNode = this.dataGrid.rootNode();
    const [selectedKey] = rootNode.children.filter(node => node.selected).map(node => node.data.key);
    rootNode.removeChildren();
    let selectedNode: DataGrid.DataGrid.DataGridNode<Protocol.Storage.SharedStorageEntry>|null = null;
    const filteredItems = (item: Protocol.Storage.SharedStorageEntry): string => `${item.key} ${item.value}`;
    const filteredList = this.filter(items, filteredItems);
    for (const item of filteredList) {
      const node = new DataGrid.DataGrid.DataGridNode({key: item.key, value: item.value}, false);
      node.selectable = true;
      rootNode.appendChild(node);
      if (!selectedNode || item.key === selectedKey) {
        selectedNode = node;
      }
    }
    if (selectedNode) {
      selectedNode.selected = true;
    }
    this.dataGrid.addCreationNode(false);
    this.setCanDeleteSelected(Boolean(selectedNode));
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageNumberEntries, {PH1: filteredList.length}));
  }

  async #deleteCallback(node: DataGrid.DataGrid.DataGridNode<Protocol.Storage.SharedStorageEntry>): Promise<void> {
    if (!node || node.isCreationNode || !this.#sharedStorage) {
      return;
    }

    const key = node.data.key;
    await this.#sharedStorage.deleteEntry(key);
    await this.refreshItems();
    this.sharedStorageItemsDispatcher.dispatchEventToListeners(
        SharedStorageItemsDispatcher.Events.ITEM_DELETED, {key} as SharedStorageItemsDispatcher.ItemDeletedEvent);
    UI.ARIAUtils.alert(i18nString(UIStrings.sharedStorageItemDeleted));
  }

  async #previewEntry(entry: DataGrid.DataGrid.DataGridNode<Protocol.Storage.SharedStorageEntry>|null): Promise<void> {
    const key = entry?.data?.key;
    const value = entry?.data?.value;
    const wrappedEntry = key && {key: key as string, value: value as string || ''} as WrappedEntry;
    if (wrappedEntry) {
      const preview = SourceFrame.JSONView.JSONView.createViewSync(wrappedEntry);

      // Selection could've changed while the preview was loaded
      if (entry.selected) {
        this.outerSplitWidget.setSidebarWidget(preview);
        preview.element.setAttribute('jslog', `${VisualLogging.pane('preview').track({resize: true})}`);
      }
    } else {
      this.outerSplitWidget.setSidebarWidget(this.#noDisplayView);
    }
  }

  getEntriesForTesting(): Array<Protocol.Storage.SharedStorageEntry> {
    return this.dataGrid.rootNode()
        .children.filter(node => node.data.key)
        .map(node => (node.data as Protocol.Storage.SharedStorageEntry));
  }
}
