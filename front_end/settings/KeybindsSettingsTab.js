// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as UI from '../ui/ui.js';

/**
 * @implements {UI.ListControl.ListDelegate<!KeybindsItem>}
 */
export class KeybindsSettingsTab extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('settings/keybindsSettingsTab.css');

    const header = this.contentElement.createChild('header');
    header.createChild('h1').textContent = ls`Shortcuts`;
    const keybindsSetSetting = self.Common.settings.moduleSetting('activeKeybindSet');
    keybindsSetSetting.addChangeListener(this.update, this);
    const keybindsSetSelect =
        UI.SettingsUI.createControlForSetting(keybindsSetSetting, ls`Match shortcuts from preset`);
    keybindsSetSelect.classList.add('keybinds-set-select');
    this.contentElement.appendChild(keybindsSetSelect);

    /** @type {!UI.ListModel.ListModel<!KeybindsItem>} */
    this._items = new UI.ListModel.ListModel();
    this._list = new UI.ListControl.ListControl(this._items, this, UI.ListControl.ListMode.NonViewport);
    this._items.replaceAll(this._createListItems());
    UI.ARIAUtils.markAsList(this._list.element);
    this.registerRequiredCSS('settings/keybindsSettingsTab.css');
    this.contentElement.appendChild(this._list.element);
    UI.ARIAUtils.setAccessibleName(this._list.element, ls`Keyboard shortcuts list`);
    this.update();
  }

  /**
   * @override
   * @param {!KeybindsItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const itemElement = document.createElement('div');
    itemElement.classList.add('keybinds-list-item');
    UI.ARIAUtils.markAsListitem(itemElement);
    itemElement.tabIndex = item === this._list.selectedItem() ? 0 : -1;

    if (typeof item === 'string') {
      UI.ARIAUtils.setLevel(itemElement, 1);
      itemElement.classList.add('keybinds-category-header');
      itemElement.textContent = item;
    } else {
      UI.ARIAUtils.setLevel(itemElement, 2);
      itemElement.createChild('div', 'keybinds-action-name keybinds-list-text').textContent = item.title();
      const shortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(item.id());
      shortcuts.forEach((shortcut, index) => {
        if (!shortcut.isDefault()) {
          const icon = UI.Icon.Icon.create('largeicon-shortcut-changed', 'keybinds-modified');
          UI.ARIAUtils.setAccessibleName(icon, ls`Shortcut provided by preset`);
          itemElement.appendChild(icon);
        }
        const shortcutElement = itemElement.createChild('div', 'keybinds-shortcut keybinds-list-text');
        const keys = shortcut.descriptors.flatMap(descriptor => descriptor.name.split(' + '));
        keys.forEach(key => {
          shortcutElement.createChild('span', 'keybinds-key').textContent = key;
        });
      });
      if (shortcuts.length === 0) {
        if (UI.ShortcutRegistry.ShortcutRegistry.instance().actionHasDefaultShortcut(item.id())) {
          const icon = UI.Icon.Icon.create('largeicon-shortcut-changed', 'keybinds-modified');
          UI.ARIAUtils.setAccessibleName(icon, ls`Shortcut provided by preset`);
          itemElement.appendChild(icon);
        }
        const emptyElement = itemElement.createChild('div', 'keybinds-shortcut keybinds-list-text');
        UI.ARIAUtils.setAccessibleName(emptyElement, ls`No shortcut for action`);
      }
    }

    return itemElement;
  }

  /**
   * This method will never be called.
   * @override
   * @param {!KeybindsItem} item
   * @return {number}
   */
  heightForItem(item) {
    return 0;
  }


  /**
   * @override
   * @param {!KeybindsItem} item
   * @returns {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?KeybindsItem} from
   * @param {?KeybindsItem} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement) {
      fromElement.tabIndex = -1;
    }
    if (toElement) {
      toElement.tabIndex = 0;
      if (this._list.element.hasFocus()) {
        toElement.focus();
      }
    }
  }

  /**
   * @override
   * @param {?Element} fromElement
   * @param {?Element} toElement
   * @return {boolean}
   */
  updateSelectedItemARIA(fromElement, toElement) {
    return true;
  }

  /**
   * @returns {!Array.<!KeybindsItem>}
   */
  _createListItems() {
    const actions = UI.ActionRegistry.ActionRegistry.instance().actions().sort((actionA, actionB) => {
      if (actionA.category() < actionB.category()) {
        return -1;
      }
      if (actionA.category() > actionB.category()) {
        return 1;
      }
      if (actionA.id() < actionB.id()) {
        return -1;
      }
      if (actionA.id() > actionB.id()) {
        return 1;
      }
      return 0;
    });

    const items = [];
    let currentCategory;
    actions.forEach(action => {
      if (currentCategory !== action.category()) {
        items.push(action.category());
      }
      items.push(action);
      currentCategory = action.category();
    });
    return items;
  }

  update() {
    this._list.refreshAllItems();
    if (!this._list.selectedItem()) {
      this._list.selectItem(this._items.at(0));
    }
  }
}

/** @typedef {string|!UI.Action.Action} */
export let KeybindsItem;
