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

    this._allGroup = this._createAllGroup();
    this._items.replaceAll([this._allGroup]);
    this._list.selectItem(this._items.at(0));

    /** @type {!Map<string, !Console.ConsoleSidebar.GroupItem>} */
    this._contextToItem = new Map();
    /** @type {!Set<!Console.ConsoleSidebar.GroupItem>} */
    this._pendingItemsToAdd = new Set();
    this._pendingClear = false;
  }

  /**
   * @return {!Console.ConsoleSidebar.GroupItem}
   */
  _createAllGroup() {
    this._allGroup = {context: Console.ConsoleSidebar.AllContextsFilter, name: 'All', info: 0, warning: 0, error: 0};
    return this._allGroup;
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
   * @param {!ConsoleModel.ConsoleMessage} message
   */
  onMessageAdded(message) {
    if (!Runtime.experiments.isEnabled('logManagement'))
      return;
    incrementCounters(this._allGroup, message.level);
    var context = message.context;
    if (!context)
      return;

    var item = this._contextToItem.get(context);
    if (!item) {
      item = {name: context, context: context, info: 0, warning: 0, error: 0};
      this._contextToItem.set(context, item);
      this._pendingItemsToAdd.add(item);
    }
    incrementCounters(item, message.level);

    /**
     * @param {!Console.ConsoleSidebar.GroupItem} item
     * @param {?ConsoleModel.ConsoleMessage.MessageLevel} level
     */
    function incrementCounters(item, level) {
      if (level === ConsoleModel.ConsoleMessage.MessageLevel.Info)
        item.info++;
      else if (level === ConsoleModel.ConsoleMessage.MessageLevel.Warning)
        item.warning++;
      else if (level === ConsoleModel.ConsoleMessage.MessageLevel.Error)
        item.error++;
      item[Console.ConsoleSidebar._itemIsDirtySymbol] = true;
    }
  }

  clear() {
    if (!Runtime.experiments.isEnabled('logManagement'))
      return;
    this._contextToItem.clear();
    this._pendingItemsToAdd.clear();
    this._pendingClear = true;
  }

  refresh() {
    if (!Runtime.experiments.isEnabled('logManagement'))
      return;
    if (this._pendingClear) {
      this._items.replaceAll([this._createAllGroup()]);
      this._list.selectItem(this._items.at(0));
      this._pendingClear = false;
    }
    // Refresh counters for stale groups.
    for (var item of this._items) {
      if (item[Console.ConsoleSidebar._itemIsDirtySymbol]) {
        this._list.refreshItem(item);
        delete item[Console.ConsoleSidebar._itemIsDirtySymbol];
      }
    }

    // Add new groups.
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
    var counters = element.createChild('div', 'counters');
    if (item.error)
      counters.createChild('span', 'error-count').textContent = item.error > 99 ? '99+' : item.error;
    if (item.warning)
      counters.createChild('span', 'warning-count').textContent = item.warning > 99 ? '99+' : item.warning;
    if (item.info)
      counters.createChild('span', 'info-count').textContent = item.info > 99 ? '99+' : item.info;
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

/** @typedef {{
        context: (string|symbol),
        name: string,
        info: number,
        warning: number,
        error: number
    }}
 */
Console.ConsoleSidebar.GroupItem;

/** @type {symbol} */
Console.ConsoleSidebar._itemIsDirtySymbol = Symbol('itemIsDirty');
