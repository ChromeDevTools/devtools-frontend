// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {UI.ListDelegate<!Console.ConsoleFilter>}
 */
Console.ConsoleSidebar = class extends UI.VBox {
  constructor() {
    super(true);
    this.registerRequiredCSS('console/consoleSidebar.css');
    this.setMinimumSize(50, 0);

    /** @type {!UI.ListModel<!Console.ConsoleFilter>} */
    this._filters = new UI.ListModel();
    /** @type {!UI.ListControl<!Console.ConsoleFilter>} */
    this._list = new UI.ListControl(this._filters, this, UI.ListMode.EqualHeightItems);
    this._list.element.classList.add('list');
    this.contentElement.appendChild(this._list.element);

    this._allFilter =
        new Console.ConsoleFilter(Common.UIString('All'), [], Console.ConsoleFilter.allLevelsFilterValue());
    this._filters.replaceAll([this._allFilter]);
    this._list.selectItem(this._filters.at(0));

    /** @type {!Map<string, !Console.ConsoleFilter>} */
    this._contextFilters = new Map();
    /** @type {!Set<!Console.ConsoleFilter>} */
    this._pendingFiltersToAdd = new Set();
    this._pendingClear = false;

    this._enabled = Runtime.experiments.isEnabled('logManagement');
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
    if (!this._enabled)
      return;
    this._allFilter[Console.ConsoleSidebar._filterIsDirtySymbol] = true;

    var context = message.context;
    if (context) {
      var filter = this._contextFilters.get(context);
      if (!filter) {
        var parsedFilter = {key: Console.ConsoleFilter.FilterType.Context, text: context, negative: false};
        filter = new Console.ConsoleFilter(context, [parsedFilter]);
        this._contextFilters.set(context, filter);
        this._pendingFiltersToAdd.add(filter);
      } else {
        filter[Console.ConsoleSidebar._filterIsDirtySymbol] = true;
      }
    }
  }

  clear() {
    if (!this._enabled)
      return;
    this._contextFilters.clear();
    this._pendingFiltersToAdd.clear();
    this._pendingClear = true;
  }

  /**
   * @param {!Console.ConsoleViewMessage} viewMessage
   * @return {boolean}
   */
  applyFilters(viewMessage) {
    var passed = true;
    for (var filter of this._filters) {
      var passedFilter = filter.applyFilter(viewMessage);
      if (filter === this._list.selectedItem())
        passed = passedFilter;
    }
    for (var filter of this._pendingFiltersToAdd)
      filter.applyFilter(viewMessage);
    return passed;
  }

  resetItemCounters() {
    for (var filter of this._filters) {
      filter.resetCounters();
      filter[Console.ConsoleSidebar._filterIsDirtySymbol] = true;
    }
  }

  refresh() {
    if (!this._enabled)
      return;
    if (this._pendingClear) {
      this._filters.replaceAll([this._allFilter]);
      this._list.selectItem(this._filters.at(0));
      this._pendingClear = false;
    }
    // Refresh counters for stale groups.
    for (var filter of this._filters) {
      if (filter[Console.ConsoleSidebar._filterIsDirtySymbol]) {
        this._list.refreshItem(filter);
        delete filter[Console.ConsoleSidebar._filterIsDirtySymbol];
      }
    }

    // Add new groups.
    if (this._pendingFiltersToAdd.size > 0) {
      this._filters.replaceRange(this._filters.length, this._filters.length, Array.from(this._pendingFiltersToAdd));
      this._pendingFiltersToAdd.clear();
    }
  }

  /**
   * @override
   * @param {!Console.ConsoleFilter} item
   * @return {!Element}
   */
  createElementForItem(item) {
    var element = createElementWithClass('div', 'context-item');
    element.createChild('div', 'name').textContent = item.name;
    element.title = item.name;
    var counters = element.createChild('div', 'counters');
    if (item.errorCount)
      counters.createChild('span', 'error-count').textContent = item.errorCount > 99 ? '99+' : item.errorCount;
    if (item.warningCount)
      counters.createChild('span', 'warning-count').textContent = item.warningCount > 99 ? '99+' : item.warningCount;
    if (item.infoCount)
      counters.createChild('span', 'info-count').textContent = item.infoCount > 99 ? '99+' : item.infoCount;
    return element;
  }

  /**
   * @override
   * @param {!Console.ConsoleFilter} item
   * @return {number}
   */
  heightForItem(item) {
    return 28;
  }

  /**
   * @override
   * @param {!Console.ConsoleFilter} item
   * @return {boolean}
   */
  isItemSelectable(item) {
    return true;
  }

  /**
   * @override
   * @param {?Console.ConsoleFilter} from
   * @param {?Console.ConsoleFilter} to
   * @param {?Element} fromElement
   * @param {?Element} toElement
   */
  selectedItemChanged(from, to, fromElement, toElement) {
    if (fromElement)
      fromElement.classList.remove('selected');
    if (!to || !toElement)
      return;

    toElement.classList.add('selected');
    this.dispatchEventToListeners(Console.ConsoleSidebar.Events.FilterSelected, to);
  }
};

/** @enum {symbol} */
Console.ConsoleSidebar.Events = {
  FilterSelected: Symbol('FilterSelected')
};

/** @type {symbol} */
Console.ConsoleSidebar._filterIsDirtySymbol = Symbol('filterIsDirty');
