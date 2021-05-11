// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Common from '../../core/common/common.js'; // eslint-disable-line no-unused-vars
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as UI from '../../ui/legacy/legacy.js';

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
  _filterRegex: RegExp|null;
  _refreshButton: UI.Toolbar.ToolbarButton;
  _mainToolbar: UI.Toolbar.Toolbar;
  _filterItem: UI.Toolbar.ToolbarInput;
  _deleteAllButton: UI.Toolbar.ToolbarButton;
  _deleteSelectedButton: UI.Toolbar.ToolbarButton;

  constructor(_title: string, _filterName: string) {
    super(false);
    this._filterRegex = null;

    this._refreshButton = this._addButton(i18nString(UIStrings.refresh), 'largeicon-refresh', () => {
      this.refreshItems();
      UI.ARIAUtils.alert(i18nString(UIStrings.refreshedStatus));
    });

    this._mainToolbar = new UI.Toolbar.Toolbar('top-resources-toolbar', this.element);

    this._filterItem = new UI.Toolbar.ToolbarInput(i18nString(UIStrings.filter), '', 0.4);
    this._filterItem.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._filterChanged, this);

    const toolbarSeparator = new UI.Toolbar.ToolbarSeparator();
    this._deleteAllButton = this._addButton(i18nString(UIStrings.clearAll), 'largeicon-clear', this.deleteAllItems);
    this._deleteSelectedButton =
        this._addButton(i18nString(UIStrings.deleteSelected), 'largeicon-delete', this.deleteSelectedItem);
    this._deleteAllButton.element.id = 'storage-items-delete-all';

    const toolbarItems =
        [this._refreshButton, this._filterItem, toolbarSeparator, this._deleteAllButton, this._deleteSelectedButton];
    for (const item of toolbarItems) {
      this._mainToolbar.appendToolbarItem(item);
    }
  }

  setDeleteAllTitle(title: string): void {
    this._deleteAllButton.setTitle(title);
  }

  setDeleteAllGlyph(glyph: string): void {
    this._deleteAllButton.setGlyph(glyph);
  }

  appendToolbarItem(item: UI.Toolbar.ToolbarItem): void {
    this._mainToolbar.appendToolbarItem(item);
  }

  _addButton(label: string, glyph: string, callback: (arg0: Common.EventTarget.EventTargetEvent) => void):
      UI.Toolbar.ToolbarButton {
    const button = new UI.Toolbar.ToolbarButton(label, glyph);
    button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, callback, this);
    return button;
  }

  _filterChanged(event: Common.EventTarget.EventTargetEvent): void {
    const text = (event.data as string | null);
    this._filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i') : null;
    this.refreshItems();
  }

  filter<T>(items: T[], keyFunction: (arg0: T) => string): T[] {
    if (this._filterRegex) {
      const regExp = this._filterRegex;
      return items.filter(item => regExp.test(keyFunction(item)));
    }
    return items;
  }

  hasFilter(): boolean {
    return Boolean(this._filterRegex);
  }

  wasShown(): void {
    this.refreshItems();
  }

  setCanDeleteAll(enabled: boolean): void {
    this._deleteAllButton.setEnabled(enabled);
  }

  setCanDeleteSelected(enabled: boolean): void {
    this._deleteSelectedButton.setEnabled(enabled);
  }

  setCanRefresh(enabled: boolean): void {
    this._refreshButton.setEnabled(enabled);
  }

  setCanFilter(enabled: boolean): void {
    this._filterItem.setEnabled(enabled);
  }

  deleteAllItems(): void {
  }

  deleteSelectedItem(): void {
  }

  refreshItems(): void {
  }
}
