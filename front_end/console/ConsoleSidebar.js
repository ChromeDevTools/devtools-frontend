// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ListDelegate<!Console.ConsoleSidebar.GroupItem>}
 */
Console.ConsoleSidebar = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('console/consoleSidebar.css');
    this.setMinimumSize(50, 0);

    /** @type {!UI.ListModel<!Console.ConsoleSidebar.GroupItem>} */
    this._items = new UI.ListModel();
    /** @type {!UI.ListControl<!Console.ConsoleSidebar.GroupItem>} */
    this._list = new UI.ListControl(this._items, this, UI.ListMode.EqualHeightItems);
    this._list.element.classList.add('list');
    this.contentElement.appendChild(this._list.element);

    this._items.replaceAll([Console.ConsoleSidebar._createAllGroup()]);
    this._list.selectItem(this._items.at(0));

    /** @type {!Set<string>} */
    this._contexts = new Set();
    /** @type {!Set<!Console.ConsoleSidebar.GroupItem>} */
    this._pendingItemsToAdd = new Set();
    this._pendingClear = false;
  }

  /**
   * @return {!Console.ConsoleSidebar.GroupItem}
   */
  static _createAllGroup() {
    return {context: Console.ConsoleSidebar.AllContextsFilter, name: 'All'};
  }

  /**
   * @override
   */
  wasShown() {
    // ListControl's viewport does not update when hidden.
    this._list.viewportResized();
  }

  /**
   * @override
   */
  onResize() {
    this._list.viewportResized();
  }

  /**
   * @param {!Console.ConsoleSidebar.GroupItem} item
   */
  addGroup(item) {
    if (!Runtime.experiments.isEnabled('logManagement'))
      return;
    if (this._contexts.has(item.context))
      return;
    this._contexts.add(item.context);
    this._pendingItemsToAdd.add(item);
  }

  clear() {
    if (!Runtime.experiments.isEnabled('logManagement'))
      return;
    this._contexts.clear();
    this._pendingItemsToAdd.clear();
    this._pendingClear = true;
  }

  refresh() {
    if (!Runtime.experiments.isEnabled('logManagement'))
      return;
    if (this._pendingClear) {
      this._items.replaceAll([Console.ConsoleSidebar._createAllGroup()]);
      this._list.selectItem(this._items.at(0));
      this._pendingClear = false;
    }
    if (this._pendingItemsToAdd.size > 0) {
      this._items.replaceRange(this._items.length, this._items.length, Array.from(this._pendingItemsToAdd));
      this._pendingItemsToAdd.clear();
    }
  }

  /**
   * @override
   * @param {!Console.ConsoleSidebar.GroupItem} item
   * @return {!Element}
   */
  createElementForItem(item) {
    var element = createElementWithClass('div', 'context-item');
    element.createChild('div', 'name').textContent = item.name;
    element.title = item.name;
    return element;
  }

  /**
   * @override
   * @param {!Console.ConsoleSidebar.GroupItem} item
   * @return {number}
   */
  heightForItem(item) {
    return 28;
  }

  /**
   * @override
   * @param {!Console.ConsoleSidebar.GroupItem} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?Console.ConsoleSidebar.GroupItem} from
   * @param {?Console.ConsoleSidebar.GroupItem} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement)
      fromElement.classList.remove('selected');
    if (!to || !toElement)
      return;

    toElement.classList.add('selected');
    this.dispatchEventToListeners(Console.ConsoleSidebar.Events.ContextSelected, to.context);
  }
};

Console.ConsoleSidebar.AllContextsFilter = Symbol('All');

/** @enum {symbol} */
Console.ConsoleSidebar.Events = {
  ContextSelected: Symbol('ContextSelected')
};

/** @typedef {{context: (string|symbol), name: string}} */
Console.ConsoleSidebar.GroupItem;
