// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// @ts-nocheck
// TODO(crbug.com/1011811): Enable TypeScript compiler checks

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

/**
 * @enum {number}
 */
const MessageLevelBitfield = {
  Error: 0b0001,
  Warning: 0b0010,
  Info: 0b0100,
  Debug: 0b1000,

  Default: 0b0111,  // Error, Warning, Info
  All: 0b1111,      // Error, Warning, Info, Debug
  Custom: 0
};

/**
 * @typedef {{
 *     title: string,
 *     value: MessageLevelBitfield,
 *     stringValue: string,
 *     selectable: boolean
 * }}
 */
let SelectableLevel;  // eslint-disable-line no-unused-vars

/**
 * @implements {UI.SoftDropDown.Delegate<!SelectableLevel>}
 */
class MessageLevelSelector extends Common.ObjectWrapper.ObjectWrapper {
  constructor(items, view) {
    super();
    this._items = items;
    this._view = view;
    this._itemMap = new Map();
    this._hiddenLevels = [];

    this._bitFieldValue = MessageLevelBitfield.Default;
    this._savedBitFieldValue = MessageLevelBitfield.Default;

    this._defaultTitle = ls`Default`;
    this._customTitle = ls`Custom`;
    this._allTitle = ls`All`;
  }

  defaultTitle() {
    return this._defaultTitle;
  }

  // UI.SoftDropDown
  setDefault(dropdown) {
    dropdown.selectItem(this._items.at(0));
  }

  populate() {
    this._items.insert(
        this._items.length,
        {title: this._defaultTitle, overwrite: true, stringValue: '', value: MessageLevelBitfield.Default});

    this._items.insert(
        this._items.length, {title: this._allTitle, overwrite: true, stringValue: '', value: MessageLevelBitfield.All});

    this._items.insert(
        this._items.length,
        {title: ls`Error`, overwrite: false, stringValue: 'error', value: MessageLevelBitfield.Error});

    this._items.insert(
        this._items.length,
        {title: ls`Warning`, overwrite: false, stringValue: 'warning', value: MessageLevelBitfield.Warning});

    this._items.insert(
        this._items.length, {title: ls`Info`, overwrite: false, stringValue: 'info', value: MessageLevelBitfield.Info});

    this._items.insert(
        this._items.length,
        {title: ls`Debug`, overwrite: false, stringValue: 'debug', value: MessageLevelBitfield.Debug});
  }

  _updateCheckMarks() {
    this._hiddenLevels = [];
    for (const [key, item] of this._itemMap) {
      if (!item.overwrite) {
        if (item.element.firstChild) {
          item.element.firstChild.remove();
        }
        if (key & this._bitFieldValue) {
          item.element.createChild('div').createTextChild('✓');
        } else {
          this._hiddenLevels.push(item.stringValue);
        }
      }
    }
  }

  /**
   * @override
   * @param {!SelectableLevel} item
   * @return {string}
   */
  titleFor(item) {
    // This would make a lot more sense to have in |itemSelected|, but this
    // method gets called first.
    if (item.overwrite) {
      this._bitFieldValue = item.value;
    } else {
      this._bitFieldValue ^= item.value;
    }

    if (this._bitFieldValue === MessageLevelBitfield.Default) {
      return this._defaultTitle;
    }

    if (this._bitFieldValue === MessageLevelBitfield.All) {
      return this._allTitle;
    }

    const potentialMatch = this._itemMap.get(this._bitFieldValue);
    if (potentialMatch) {
      return potentialMatch.title;
    }

    return this._customTitle;
  }

  /**
   * @override
   * @param {!SelectableLevel} item
   * @return {!Element}
   */
  createElementForItem(item) {
    const element = document.createElementWithClass('div');
    const shadowRoot = UI.Utils.createShadowRootWithCoreStyles(element, 'media/playerMessagesView.css');
    const container = shadowRoot.createChild('div', 'media-messages-level-dropdown-element');
    const checkBox = container.createChild('div', 'media-messages-level-dropdown-checkbox');
    const text = container.createChild('span', 'media-messages-level-dropdown-text');
    text.createTextChild(item.title);
    item.element = checkBox;
    this._itemMap.set(item.value, item);
    this._updateCheckMarks();
    this._view.regenerateMessageDisplayCss(this._hiddenLevels);
    return element;
  }

  /**
   * @override
   * @param {!SelectableLevel} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?SelectableLevel} item
   */
  itemSelected(item) {
    this._updateCheckMarks();
    this._view.regenerateMessageDisplayCss(this._hiddenLevels);
  }

  /**
   * @override
   * @param {?SelectableLevel} from
   * @param {?SelectableLevel} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  highlightedItemChanged(from, to, fromElement, toElement) {
  }
}

export class PlayerMessagesView extends UI.Widget.VBox {
  constructor() {
    super();
    this.registerRequiredCSS('media/playerMessagesView.css');

    this._headerPanel = this.contentElement.createChild('div', 'media-messages-header');
    this._bodyPanel = this.contentElement.createChild('div', 'media-messages-body');

    this._buildToolbar();
  }

  _buildToolbar() {
    const toolbar = new UI.Toolbar.Toolbar('media-messages-toolbar', this._headerPanel);
    toolbar.appendText(ls`Log level:`);
    toolbar.appendToolbarItem(this._createDropdown());
    toolbar.appendSeparator();
    toolbar.appendToolbarItem(this._createFilterInput());
  }

  _createDropdown() {
    /** @type {!UI.ListModel.ListModel<!SelectableLevel>} */
    const items = new UI.ListModel.ListModel();
    /** @type {!MessageLevelSelector} **/
    this._messageLevelSelector = new MessageLevelSelector(items, this);
    /** @type {!UI.SoftDropDown.SoftDropDown<!SelectableLevel>} */
    const dropDown = new UI.SoftDropDown.SoftDropDown(items, this._messageLevelSelector);
    dropDown.setRowHeight(18);

    this._messageLevelSelector.populate();
    this._messageLevelSelector.setDefault(dropDown);

    const dropDownItem = new UI.Toolbar.ToolbarItem(dropDown.element);
    dropDownItem.element.classList.add('toolbar-has-dropdown');
    dropDownItem.setEnabled(true);
    dropDownItem.setTitle(this._messageLevelSelector.defaultTitle());
    return dropDownItem;
  }

  _createFilterInput() {
    const filterInput = new UI.Toolbar.ToolbarInput(ls`Filter log messages`);
    filterInput.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, this._filterByString, this);
    return filterInput;
  }

  regenerateMessageDisplayCss(hiddenLevels) {
    const messages = this._bodyPanel.getElementsByClassName('media-messages-message-container');
    for (const message of messages) {
      if (this._matchesHiddenLevels(message, hiddenLevels)) {
        message.classList.add('media-messages-message-unselected');
      } else {
        message.classList.remove('media-messages-message-unselected');
      }
    }
  }

  _matchesHiddenLevels(element, hiddenLevels) {
    for (const level of hiddenLevels) {
      if (element.classList.contains('media-message-' + level)) {
        return true;
      }
    }
    return false;
  }

  _filterByString(userStringData) {
    const userString = userStringData.data;
    const messages = this._bodyPanel.getElementsByClassName('media-messages-message-container');

    for (const message of messages) {
      if (userString === '') {
        message.classList.remove('media-messages-message-filtered');
      } else if (message.textContent.includes(userString)) {
        message.classList.remove('media-messages-message-filtered');
      } else {
        message.classList.add('media-messages-message-filtered');
      }
    }
  }

  addMessage(message) {
    const container =
        this._bodyPanel.createChild('div', 'media-messages-message-container media-message-' + message.level);
    container.createTextChild(message.message);
  }
}
