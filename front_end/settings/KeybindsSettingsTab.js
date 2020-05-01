// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as UI from '../ui/ui.js';

/**
 * @implements {UI.ListWidget.Delegate}
 */
export class KeybindsSettingsTab extends UI.Widget.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('settings/keybindsSettingsTab.css');
    this._actions = self.UI.actionRegistry.actions().sort((actionA, actionB) => {
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

    const header = this.contentElement.createChild('header');
    header.createChild('h1').textContent = ls`Shortcuts`;
    const keybindsSetSetting = self.Common.settings.moduleSetting('activeKeybindSet');
    keybindsSetSetting.addChangeListener(this.update, this);
    const keybindsSetSelect =
        UI.SettingsUI.createControlForSetting(keybindsSetSetting, ls`Match shortcuts from preset`);
    keybindsSetSelect.classList.add('keybinds-set-select');
    this.contentElement.appendChild(keybindsSetSelect);

    this._list = new UI.ListWidget.ListWidget(this);
    UI.ARIAUtils.markAsList(this._list.element);
    this._list.registerRequiredCSS('settings/keybindsSettingsTab.css');
    this._list.show(this.contentElement);
    this.update();
  }

  /**
   * @override
   * @param {!KeybindsItem} item
   * @return {!Element}
   */
  renderItem(item) {
    const itemElement = document.createElement('div');
    itemElement.classList.add('keybinds-list-item');
    UI.ARIAUtils.markAsListitem(itemElement);

    if (typeof item === 'string') {
      itemElement.classList.add('keybinds-category-header');
      itemElement.textContent = item;
    } else {
      itemElement.createChild('div', 'keybinds-action-name keybinds-list-text').textContent = item.title();
      const shortcuts = self.UI.shortcutRegistry.shortcutsForAction(item.id());
      shortcuts.forEach((shortcut, index) => {
        const shortcutElement = itemElement.createChild('div', 'keybinds-shortcut keybinds-list-text');
        const keys = shortcut.descriptors.flatMap(descriptor => descriptor.name.split(' + '));
        keys.forEach(key => shortcutElement.createChild('span', 'keybinds-key').textContent = key);
      });
    }

    return itemElement;
  }

  /**
   * @override
   * @param {!KeybindsItem} item
   * @param {number} index
   */
  removeItemRequested(item, index) {
  }

  /**
   * None of the items are editable, so this method will never be called
   * @override
   * @param {!KeybindsItem} item
   * @return {!UI.ListWidget.Editor<!KeybindsItem>}
   */
  beginEdit(item) {
    return new UI.ListWidget.Editor();
  }

  /**
   * @override
   * @param {!KeybindsItem} item
   * @param {!UI.ListWidget.Editor<!KeybindsItem>} editor
   * @param {boolean} isNew
   */
  commitEdit(item, editor, isNew) {
  }

  update() {
    this._list.clear();
    let currentCategory;
    this._actions.forEach(action => {
      if (currentCategory !== action.category()) {
        this._list.appendItem(action.category(), false);
      }
      this._list.appendItem(action, false);
      currentCategory = action.category();
    });
  }
}

/** @typedef {string|!UI.Action.Action} */
export let KeybindsItem;
