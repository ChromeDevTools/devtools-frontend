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
    header.createChild('h1').textContent = ls`Custom keyboard shortcuts`;

    const listHeader = this.contentElement.createChild('div', 'keybinds-list-item keybinds-header');
    listHeader.createChild('div', 'keybinds-list-text').textContent = ls`Action`;
    listHeader.createChild('div', 'keybinds-list-text').textContent = ls`Keyboard input`;
    this._list = new UI.ListWidget.ListWidget(this);
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
    const itemElement = createElementWithClass('div', 'keybinds-list-item');

    if (typeof item === 'string') {
      itemElement.classList.add('keybinds-category-header');
      itemElement.textContent = item;
    } else {
      itemElement.createChild('div', 'keybinds-list-text').textContent = item.title();
      const keysElement = itemElement.createChild('div', 'keybinds-list-text');
      self.UI.shortcutRegistry.shortcutsForAction(item.id()).forEach(
          shortcut => keysElement.createChild('span', 'keybinds-key').textContent = shortcut.descriptor.name);
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
