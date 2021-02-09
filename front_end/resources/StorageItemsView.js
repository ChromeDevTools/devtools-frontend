// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as i18n from '../i18n/i18n.js';
import * as Platform from '../platform/platform.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
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
};
const str_ = i18n.i18n.registerUIStrings('resources/StorageItemsView.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class StorageItemsView extends UI.Widget.VBox {
  /**
   * @param {string} title
   * @param {string} filterName
   */
  constructor(title, filterName) {
    super(false);
    /** @type {?RegExp} */
    this._filterRegex = null;

    this._refreshButton = this._addButton(i18nString(UIStrings.refresh), 'largeicon-refresh', this.refreshItems);

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

  /**
   * @param {string} title
   */
  setDeleteAllTitle(title) {
    this._deleteAllButton.setTitle(title);
  }

  /**
   * @param {string} glyph
   */
  setDeleteAllGlyph(glyph) {
    this._deleteAllButton.setGlyph(glyph);
  }

  /**
   * @param {!UI.Toolbar.ToolbarItem} item
   */
  appendToolbarItem(item) {
    this._mainToolbar.appendToolbarItem(item);
  }

  /**
   * @param {string} label
   * @param {string} glyph
   * @param {function(!Common.EventTarget.EventTargetEvent):void} callback
   * @return {!UI.Toolbar.ToolbarButton}
   */
  _addButton(label, glyph, callback) {
    const button = new UI.Toolbar.ToolbarButton(label, glyph);
    button.addEventListener(UI.Toolbar.ToolbarButton.Events.Click, callback, this);
    return button;
  }

  /**
   * @param {!Common.EventTarget.EventTargetEvent} event
   */
  _filterChanged(event) {
    const text = /** @type {?string} */ (event.data);
    this._filterRegex = text ? new RegExp(Platform.StringUtilities.escapeForRegExp(text), 'i') : null;
    this.refreshItems();
  }

  /**
   * @template T
   * @param {!Array<!T>} items
   * @param {function(!T): string} keyFunction
   * @return {!Array<!T>}
   * @protected
   */
  filter(items, keyFunction) {
    if (this._filterRegex) {
      const regExp = this._filterRegex;
      return items.filter(item => regExp.test(keyFunction(item)));
    }
    return items;
  }

  /**
   * @return {boolean}
   */
  hasFilter() {
    return Boolean(this._filterRegex);
  }

  /**
   * @override
   */
  wasShown() {
    this.refreshItems();
  }

  /**
   * @param {boolean} enabled
   * @protected
   */
  setCanDeleteAll(enabled) {
    this._deleteAllButton.setEnabled(enabled);
  }

  /**
   * @param {boolean} enabled
   * @protected
   */
  setCanDeleteSelected(enabled) {
    this._deleteSelectedButton.setEnabled(enabled);
  }

  /**
   * @param {boolean} enabled
   * @protected
   */
  setCanRefresh(enabled) {
    this._refreshButton.setEnabled(enabled);
  }

  /**
   * @param {boolean} enabled
   * @protected
   */
  setCanFilter(enabled) {
    this._filterItem.setEnabled(enabled);
  }

  deleteAllItems() {
  }

  deleteSelectedItem() {
  }

  refreshItems() {
  }
}
