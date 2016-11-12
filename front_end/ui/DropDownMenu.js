// Copyright 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
UI.DropDownMenu = class extends Common.Object {
  /**
   * @param {!Element} element
   */
  constructor(element) {
    super();
    /** @type {!Array.<!UI.DropDownMenu.Item>} */
    this._items = [];

    element.addEventListener('mousedown', this._onMouseDown.bind(this));
  }

  /**
   * @param {!Event} event
   */
  _onMouseDown(event) {
    if (event.which !== 1)
      return;
    var menu = new UI.ContextMenu(event);
    for (var item of this._items)
      menu.appendCheckboxItem(item.title, this._itemHandler.bind(this, item.id), item.id === this._selectedItemId);
    menu.show();
  }

  /**
   * @param {string} id
   */
  _itemHandler(id) {
    this.dispatchEventToListeners(UI.DropDownMenu.Events.ItemSelected, id);
  }

  /**
   * @param {string} id
   * @param {string} title
   */
  addItem(id, title) {
    this._items.push({id: id, title: title});
  }

  /**
   * @param {string} id
   */
  selectItem(id) {
    this._selectedItemId = id;
  }

  clear() {
    this._items = [];
    delete this._selectedItemId;
  }
};

/** @typedef {{id: string, title: string}} */
UI.DropDownMenu.Item;

/** @enum {symbol} */
UI.DropDownMenu.Events = {
  ItemSelected: Symbol('ItemSelected')
};
