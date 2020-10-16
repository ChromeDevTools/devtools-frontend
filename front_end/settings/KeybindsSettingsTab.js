// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';
import * as Host from '../host/host.js';
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
    const keybindsSetSetting = Common.Settings.Settings.instance().moduleSetting('activeKeybindSet');
    const userShortcutsSetting = Common.Settings.Settings.instance().moduleSetting('userShortcuts');
    userShortcutsSetting.addChangeListener(this.update, this);
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
    this.contentElement.appendChild(UI.UIUtils.createTextButton(ls`Restore default shortcuts`, () => {
      userShortcutsSetting.set([]);
      keybindsSetSetting.set(UI.ShortcutRegistry.DefaultShortcutSetting);
    }));
    /** @type {?UI.Action.Action} */
    this._editingItem = null;
    /** @type {?ShortcutListItem} */
    this._editingRow = null;

    this.update();
  }

  /**
   * @override
   * @param {!KeybindsItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    let itemElement = document.createElement('div');

    if (typeof item === 'string') {
      UI.ARIAUtils.setLevel(itemElement, 1);
      itemElement.classList.add('keybinds-category-header');
      itemElement.textContent = item;
    } else {
      const listItem = new ShortcutListItem(item, this, item === this._editingItem);
      itemElement = listItem.element;
      UI.ARIAUtils.setLevel(itemElement, 2);
      if (item === this._editingItem) {
        this._editingRow = listItem;
      }
    }

    itemElement.classList.add('keybinds-list-item');
    UI.ARIAUtils.markAsListitem(itemElement);
    itemElement.tabIndex = item === this._list.selectedItem() && item !== this._editingItem ? 0 : -1;
    return itemElement;
  }

  /**
   * @param {!UI.Action.Action} item
   * @param {!Map.<!UI.KeyboardShortcut.KeyboardShortcut, ?Array.<!UI.KeyboardShortcut.Descriptor>>} editedShortcuts
   */
  commitChanges(item, editedShortcuts) {
    for (const [originalShortcut, newDescriptors] of editedShortcuts) {
      if (originalShortcut.type !== UI.KeyboardShortcut.Type.UnsetShortcut) {
        UI.ShortcutRegistry.ShortcutRegistry.instance().removeShortcut(originalShortcut);
        if (!newDescriptors) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShortcutRemoved);
        }
      }
      if (newDescriptors) {
        UI.ShortcutRegistry.ShortcutRegistry.instance().registerUserShortcut(
            originalShortcut.changeKeys(/** @type !Array.<!UI.KeyboardShortcut.Descriptor> */ (newDescriptors))
                .changeType(UI.KeyboardShortcut.Type.UserShortcut));
        if (originalShortcut.type === UI.KeyboardShortcut.Type.UnsetShortcut) {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.UserShortcutAdded);
        } else {
          Host.userMetrics.actionTaken(Host.UserMetrics.Action.ShortcutModified);
        }
      }
    }
    this.stopEditing(item);
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
      if (to === this._editingItem) {
        this._editingRow.focus();
      } else {
        toElement.tabIndex = 0;
        if (this._list.element.hasFocus()) {
          toElement.focus();
        }
      }
      this.setDefaultFocusedElement(toElement);
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
   * @param {!UI.Action.Action} action
   */
  startEditing(action) {
    if (this._editingItem) {
      this.stopEditing(this._editingItem);
    }
    UI.UIUtils.markBeingEdited(this._list.element, true);
    this._editingItem = action;
    this._list.refreshItem(action);
  }

  /**
   * @param {!UI.Action.Action} action
   */
  stopEditing(action) {
    UI.UIUtils.markBeingEdited(this._list.element, false);
    this._editingItem = null;
    this._editingRow = null;
    this._list.refreshItem(action);
    this.focus();
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

  /**
   * @param {!Event} event
   */
  onEscapeKeyPressed(event) {
    if (this._editingRow && document.deepActiveElement().nodeName === 'INPUT') {
      this._editingRow.onEscapeKeyPressed(event);
    }
  }

  update() {
    if (this._editingItem) {
      this.stopEditing(this._editingItem);
    }
    this._list.refreshAllItems();
    if (!this._list.selectedItem()) {
      this._list.selectItem(this._items.at(0));
    }
  }

  /**
   * @override
   */
  willHide() {
    if (this._editingItem) {
      this.stopEditing(this._editingItem);
    }
  }
}

export class ShortcutListItem {
  /**
   * @param {!UI.Action.Action} item
   * @param {!KeybindsSettingsTab} settingsTab
   * @param {boolean=} isEditing
   */
  constructor(item, settingsTab, isEditing) {
    this._isEditing = !!isEditing;
    this._settingsTab = settingsTab;
    this._item = item;
    this.element = document.createElement('div');
    this.element.classList.toggle('keybinds-editing', this._isEditing);
    this.element.createChild('div', 'keybinds-action-name keybinds-list-text').textContent = item.title();
    const shortcuts = UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutsForAction(item.id());
    /** @type {!Map.<!UI.KeyboardShortcut.KeyboardShortcut, ?Array.<!UI.KeyboardShortcut.Descriptor>>} */
    this._editedShortcuts = new Map();
    /** @type {!Map.<!UI.KeyboardShortcut.KeyboardShortcut, !Element>} */
    this._shortcutInputs = new Map();
    /** @type {?Element} */
    this._elementToFocus = null;
    /** @type {?Element} */
    this._confirmButton = null;
    /** @type {?Element} */
    this._addShortcutLinkContainer = null;
    /** @type {?Element} */
    this._errorMessageElement = null;

    shortcuts.forEach(this._createShortcutRow, this);
    if (shortcuts.length === 0) {
      this._createEmptyInfo();
    }
    if (this._isEditing) {
      this._setupEditor();
    }
  }

  focus() {
    if (this._elementToFocus) {
      this._elementToFocus.focus();
    }
  }

  _createEmptyInfo() {
    if (UI.ShortcutRegistry.ShortcutRegistry.instance().actionHasDefaultShortcut(this._item.id())) {
      const icon = UI.Icon.Icon.create('largeicon-shortcut-changed', 'keybinds-modified');
      UI.ARIAUtils.setAccessibleName(icon, ls`Shortcut modified`);
      this.element.appendChild(icon);
    }
    if (!this._isEditing) {
      const emptyElement = this.element.createChild('div', 'keybinds-shortcut keybinds-list-text');
      UI.ARIAUtils.setAccessibleName(emptyElement, ls`No shortcut for action`);
      if (Root.Runtime.experiments.isEnabled('keyboardShortcutEditor')) {
        this.element.appendChild(this._createEditButton());
      }
    }
  }

  _setupEditor() {
    this._addShortcutLinkContainer = this.element.createChild('div', 'keybinds-shortcut devtools-link');
    const addShortcutLink = this._addShortcutLinkContainer.createChild('span', 'devtools-link');
    addShortcutLink.textContent = ls`Add a shortcut`;
    addShortcutLink.tabIndex = 0;
    UI.ARIAUtils.markAsLink(addShortcutLink);
    if (!this._elementToFocus) {
      this._elementToFocus = addShortcutLink;
    }

    this._errorMessageElement = this.element.createChild('div', 'keybinds-info keybinds-error hidden');
    UI.ARIAUtils.markAsAlert(this._errorMessageElement);
    this._confirmButton = this.element.createChild('button', 'keybinds-confirm-button');
    this._confirmButton.appendChild(UI.Icon.Icon.create('largeicon-checkmark'));
    this._confirmButton.addEventListener(
        'click', () => this._settingsTab.commitChanges(this._item, this._editedShortcuts));
    UI.ARIAUtils.setAccessibleName(this._confirmButton, ls`Confirm changes`);
    const cancelButton = this.element.createChild('button', 'keybinds-cancel-button');
    cancelButton.appendChild(UI.Icon.Icon.create('largeicon-delete'));
    cancelButton.addEventListener('click', () => this._settingsTab.stopEditing(this._item));
    this.element.addEventListener('keydown', event => {
      if (isEscKey(event)) {
        this._settingsTab.stopEditing(this._item);
        event.consume(true);
      }
    });
    UI.ARIAUtils.setAccessibleName(cancelButton, ls`Discard changes`);


    self.onInvokeElement(addShortcutLink, () => {
      const shortcut =
          new UI.KeyboardShortcut.KeyboardShortcut([], this._item.id(), UI.KeyboardShortcut.Type.UnsetShortcut);
      this._createShortcutRow(shortcut);
      this.element.appendChild(this._addShortcutLinkContainer);
      this.element.appendChild(this._errorMessageElement);
      this.element.appendChild(this._confirmButton);
      this.element.appendChild(cancelButton);
      this._shortcutInputs.get(shortcut).focus();
    });
  }

  /**
   * @param {!UI.KeyboardShortcut.KeyboardShortcut} shortcut
   * @param {number=} index
   */
  _createShortcutRow(shortcut, index) {
    let icon;
    if (shortcut.type !== UI.KeyboardShortcut.Type.UnsetShortcut && !shortcut.isDefault()) {
      icon = UI.Icon.Icon.create('largeicon-shortcut-changed', 'keybinds-modified');
      UI.ARIAUtils.setAccessibleName(icon, ls`Shortcut modified`);
      this.element.appendChild(icon);
    }
    const shortcutElement = this.element.createChild('div', 'keybinds-shortcut keybinds-list-text');
    if (this._isEditing) {
      const shortcutInput = shortcutElement.createChild('input', 'harmony-input');
      shortcutInput.spellcheck = false;
      this._shortcutInputs.set(shortcut, shortcutInput);
      if (!this._elementToFocus) {
        this._elementToFocus = shortcutInput;
      }
      shortcutInput.value = shortcut.title();
      shortcutInput.addEventListener('keydown', this._onShortcutInputKeyDown.bind(this, shortcut, shortcutInput));
      const deleteButton = shortcutElement.createChild('button');
      deleteButton.classList.add('keybinds-delete-button');
      deleteButton.appendChild(UI.Icon.Icon.create('largeicon-trash-bin'));
      deleteButton.addEventListener('click', () => {
        this.element.removeChild(shortcutElement);
        if (icon) {
          this.element.removeChild(icon);
        }
        this._shortcutInputs.delete(shortcut);
        this._editedShortcuts.set(shortcut, null);
        this._validateInputs();
      });
      UI.ARIAUtils.setAccessibleName(deleteButton, ls`Remove shortcut`);
    } else {
      const keys = shortcut.descriptors.flatMap(descriptor => descriptor.name.split(' + '));
      keys.forEach(key => {
        shortcutElement.createChild('span', 'keybinds-key').textContent = key;
      });
      if (Root.Runtime.experiments.isEnabled('keyboardShortcutEditor') && index === 0) {
        this.element.appendChild(this._createEditButton());
      }
    }
  }

  /**
    * @return {!Element}
    */
  _createEditButton() {
    const editButton = document.createElement('button');
    editButton.classList.add('keybinds-edit-button');
    editButton.appendChild(UI.Icon.Icon.create('largeicon-edit'));
    editButton.addEventListener('click', () => this._settingsTab.startEditing(this._item));
    UI.ARIAUtils.setAccessibleName(editButton, ls`Edit shortcut`);
    return editButton;
  }

  /**
   * @param {!UI.KeyboardShortcut.KeyboardShortcut} shortcut
   * @param {!Element} shortcutInput
   * @param {!Event} event
   */
  _onShortcutInputKeyDown(shortcut, shortcutInput, event) {
    if (event.key !== 'Tab') {
      const userKey = UI.KeyboardShortcut.KeyboardShortcut.makeKeyFromEvent(/** @type {!KeyboardEvent} */ (event));
      const codeAndModifiers = UI.KeyboardShortcut.KeyboardShortcut.keyCodeAndModifiersFromKey(userKey);
      const userDescriptor = UI.KeyboardShortcut.KeyboardShortcut.makeDescriptor(
          {code: userKey, name: event.key}, codeAndModifiers.modifiers);
      shortcutInput.value = userDescriptor.name;
      this._editedShortcuts.set(shortcut, [userDescriptor]);
      if (UI.KeyboardShortcut.KeyboardShortcut.isModifier(codeAndModifiers.keyCode)) {
        shortcutInput.value = shortcutInput.value.slice(0, shortcutInput.value.lastIndexOf('+'));
      }
      this._validateInputs();
      event.consume(true);
    }
  }

  /**
   * @param {!Event} event
   */
  onEscapeKeyPressed(event) {
    const activeElement = document.deepActiveElement();
    for (const [shortcut, shortcutInput] of this._shortcutInputs.entries()) {
      if (activeElement === shortcutInput) {
        this._onShortcutInputKeyDown(
            /** @type {!UI.KeyboardShortcut.KeyboardShortcut} */ (shortcut),
            /** @type {!HTMLInputElement} */ (shortcutInput), event);
      }
    }
  }

  _validateInputs() {
    this._confirmButton.disabled = false;
    this._errorMessageElement.classList.add('hidden');
    this._shortcutInputs.forEach((shortcutInput, shortcut) => {
      const userDescriptors = this._editedShortcuts.get(shortcut);
      if (!userDescriptors) {
        return;
      }
      if (UI.KeyboardShortcut.KeyboardShortcut.isModifier(userDescriptors[0].key)) {
        this._confirmButton.disabled = true;
        shortcutInput.classList.add('error-input');
        UI.ARIAUtils.setInvalid(shortcutInput, true);
        this._errorMessageElement.classList.remove('hidden');
        this._errorMessageElement.textContent = ls`Shortcuts cannot contain only modifier keys.`;
        return;
      }
      const conflicts = UI.ShortcutRegistry.ShortcutRegistry.instance()
                            .actionsForDescriptors(userDescriptors)
                            .filter(actionId => actionId !== this._item.id());
      if (conflicts.length) {
        this._confirmButton.disabled = true;
        shortcutInput.classList.add('error-input');
        UI.ARIAUtils.setInvalid(shortcutInput, true);
        this._errorMessageElement.classList.remove('hidden');
        const action = UI.ActionRegistry.ActionRegistry.instance().action(conflicts[0]);
        this._errorMessageElement.textContent = ls`This shortcut is in use by ${action.title()}.`;
        return;
      }
      shortcutInput.classList.remove('error-input');
      UI.ARIAUtils.setInvalid(shortcutInput, false);
    });
  }
}

/** @typedef {string|!UI.Action.Action} */
export let KeybindsItem;
