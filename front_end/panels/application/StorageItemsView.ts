// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ApplicationComponents from './components/components.js';

const UIStrings = {
  /**
   *@description Text to refresh the page
   */
  refresh: 'Refresh',
  /**
   *@description Text to filter result items
   */
  filter: 'Filter',
  /**
   *@description Text to clear everything
   */
  clearAll: 'Clear All',
  /**
   *@description Tooltip text that appears when hovering over the largeicon delete button in the Service Worker Cache Views of the Application panel
   */
  deleteSelected: 'Delete Selected',
  /**
   *@description Text that informs screen reader users that the storage table has been refreshed
   */
  refreshedStatus: 'Table refreshed',
};

const str_ = i18n.i18n.registerUIStrings('panels/application/StorageItemsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class StorageItemsView extends UI.Widget.VBox {
  private filterRegex: RegExp|null;
  readonly refreshButton: UI.Toolbar.ToolbarButton;
  private readonly mainToolbar: UI.Toolbar.Toolbar;
  readonly filterItem: UI.Toolbar.ToolbarInput;
  readonly deleteAllButton: UI.Toolbar.ToolbarButton;
  readonly deleteSelectedButton: UI.Toolbar.ToolbarButton;
  readonly metadataView = new ApplicationComponents.StorageMetadataView.StorageMetadataView();

  constructor(_title: string, _filterName: string) {
    super(false);
    this.filterRegex = null;

    this.refreshButton = this.addButton(i18nString(UIStrings.refresh), 'refresh', () => {
      this.refreshItems();
      UI.ARIAUtils.alert(i18nString(UIStrings.refreshedStatus));
    });

    this.mainToolbar = new UI.Toolbar.Toolbar('top-resources-toolbar', this.element);

    this.filterItem = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.filter), '', 0.4);
    this.filterItem.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this.filterChanged, this);

    const toolbarSeparator = new UI.Toolbar.ToolbarSeparator();
    this.deleteAllButton = this.addButton(i18nString(UIStrings.clearAll), 'clear', this.deleteAllItems);
    this.deleteSelectedButton = this.addButton(i18nString(UIStrings.deleteSelected), 'cross', this.deleteSelectedItem);
    this.deleteAllButton.element.id = 'storage-items-delete-all';

    const toolbarItems =
        [this.refreshButton, this.filterItem, toolbarSeparator, this.deleteAllButton, this.deleteSelectedButton];
    for (const item of toolbarItems) {
      this.mainToolbar.appendToolbarItem(item);
    }
    this.contentElement.appendChild(this.metadataView);
  }

  setDeleteAllTitle(title: string): void {
    this.deleteAllButton.setTitle(title);
  }

  setDeleteAllGlyph(glyph: string): void {
    this.deleteAllButton.setGlyph(glyph);
  }

  appendToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    this.mainToolbar.appendToolbarItem(item);
  }

  setStorageKey(storageKey: string): void {
    this.metadataView.setStorageKey(storageKey);
  }

  private addButton(label: string, glyph: string, callback: (arg0: Common.EventTarget.EventTargetEvent<Event>) => void):
      UI.Toolbar.ToolbarButton {
    const button = new UI.Toolbar.ToolbarButton(label, glyph);
    button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, callback, this);
    return button;
  }

  private filterChanged({data: text}: Common.EventTarget.EventTargetEvent<string|null>): void {
    this.filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i') : null;
    this.refreshItems();
  }

  filter<T>(items: T[], keyFunction: (arg0: T) => string): T[] {
    if (this.filterRegex) {
      const regExp = this.filterRegex;
      return items.filter(item => regExp.test(keyFunction(item)));
    }
    return items;
  }

  hasFilter(): boolean {
    return Boolean(this.filterRegex);
  }

  override wasShown(): void {
    this.refreshItems();
  }

  setCanDeleteAll(enabled: boolean): void {
    this.deleteAllButton.setEnabled(enabled);
  }

  setCanDeleteSelected(enabled: boolean): void {
    this.deleteSelectedButton.setEnabled(enabled);
  }

  setCanRefresh(enabled: boolean): void {
    this.refreshButton.setEnabled(enabled);
  }

  setCanFilter(enabled: boolean): void {
    this.filterItem.setEnabled(enabled);
  }

  deleteAllItems(): void {
  }

  deleteSelectedItem(): void {
  }

  refreshItems(): void {
  }
}
