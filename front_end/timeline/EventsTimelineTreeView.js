// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 */
Timeline.EventsTimelineTreeView = class extends Timeline.TimelineTreeView {
  /**
   * @param {!TimelineModel.TimelineModel} model
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   * @param {!Timeline.TimelineModeViewDelegate} delegate
   */
  constructor(model, filters, delegate) {
    super();
    this._filtersControl = new Timeline.EventsTimelineTreeView.Filters();
    this._filtersControl.addEventListener(
        Timeline.EventsTimelineTreeView.Filters.Events.FilterChanged, this._onFilterChanged, this);
    this.init(model, filters);
    this._delegate = delegate;
    this._filters.push.apply(this._filters, this._filtersControl.filters());
    this._dataGrid.markColumnAsSortedBy('startTime', DataGrid.DataGrid.Order.Ascending);
    this._splitWidget.showBoth();
  }

  /**
   * @override
   * @param {!Timeline.TimelineSelection} selection
   */
  updateContents(selection) {
    super.updateContents(selection);
    if (selection.type() === Timeline.TimelineSelection.Type.TraceEvent) {
      var event = /** @type {!SDK.TracingModel.Event} */ (selection.object());
      this._selectEvent(event, true);
    }
  }

  /**
   * @override
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildTree() {
    this._currentTree = this.buildTopDownTree();
    return this._currentTree;
  }

  _onFilterChanged() {
    var selectedEvent = this.lastSelectedNode() && this.lastSelectedNode().event;
    this.refreshTree();
    if (selectedEvent)
      this._selectEvent(selectedEvent, false);
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?TimelineModel.TimelineProfileTree.Node}
   */
  _findNodeWithEvent(event) {
    var iterators = [this._currentTree.children.values()];

    while (iterators.length) {
      var iterator = iterators.peekLast().next();
      if (iterator.done) {
        iterators.pop();
        continue;
      }
      var child = /** @type {!TimelineModel.TimelineProfileTree.Node} */ (iterator.value);
      if (child.event === event)
        return child;
      if (child.children)
        iterators.push(child.children.values());
    }
    return null;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @param {boolean=} expand
   */
  _selectEvent(event, expand) {
    var node = this._findNodeWithEvent(event);
    if (!node)
      return;
    this.selectProfileNode(node, false);
    if (expand)
      this.dataGridNodeForTreeNode(node).expand();
  }

  /**
   * @override
   * @param {!Array<!DataGrid.DataGrid.ColumnDescriptor>} columns
   */
  populateColumns(columns) {
    columns.push(
        {id: 'startTime', title: Common.UIString('Start Time'), width: '110px', fixedWidth: true, sortable: true});
    super.populateColumns(columns);
  }

  /**
   * @override
   * @param {!Element} parent
   */
  _populateToolbar(parent) {
    var filtersWidget = this._filtersControl.filtersWidget();
    filtersWidget.forceShowFilterBar();
    filtersWidget.show(parent);
  }

  /**
   * @override
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   * @return {boolean}
   */
  _showDetailsForNode(node) {
    var traceEvent = node.event;
    if (!traceEvent)
      return false;
    Timeline.TimelineUIUtils.buildTraceEventDetails(
        traceEvent, this._model, this._linkifier, false, showDetails.bind(this));
    return true;

    /**
     * @param {!DocumentFragment} fragment
     * @this {Timeline.EventsTimelineTreeView}
     */
    function showDetails(fragment) {
      this._detailsView.element.appendChild(fragment);
    }
  }

  /**
   * @override
   * @param {?TimelineModel.TimelineProfileTree.Node} node
   */
  _onHover(node) {
    this._delegate.highlightEvent(node && node.event);
  }
};

/**
 * @unrestricted
 */
Timeline.EventsTimelineTreeView.Filters = class extends Common.Object {
  constructor() {
    super();

    this._categoryFilter = new Timeline.TimelineFilters.Category();
    this._durationFilter = new Timeline.TimelineFilters.IsLong();
    this._textFilter = new Timeline.TimelineFilters.RegExp();
    this._filters = [this._categoryFilter, this._durationFilter, this._textFilter];

    this._createFilterBar();
  }

  /**
   * @return {!Array<!TimelineModel.TimelineModelFilter>}
   */
  filters() {
    return this._filters;
  }

  /**
   * @return {?RegExp}
   */
  searchRegExp() {
    return this._textFilter.regExp();
  }

  /**
   * @return {!UI.ToolbarItem}
   */
  filterButton() {
    return this._filterBar.filterButton();
  }

  /**
   * @return {!UI.Widget}
   */
  filtersWidget() {
    return this._filterBar;
  }

  _createFilterBar() {
    this._filterBar = new UI.FilterBar('timelinePanel');

    this._textFilterUI = new UI.TextFilterUI();
    this._textFilterUI.addEventListener(UI.FilterUI.Events.FilterChanged, textFilterChanged, this);
    this._filterBar.addFilter(this._textFilterUI);

    var durationOptions = [];
    for (var durationMs of Timeline.EventsTimelineTreeView.Filters._durationFilterPresetsMs) {
      var durationOption = {};
      if (!durationMs) {
        durationOption.label = Common.UIString('All');
        durationOption.title = Common.UIString('Show all records');
      } else {
        durationOption.label = Common.UIString('\u2265 %dms', durationMs);
        durationOption.title = Common.UIString('Hide records shorter than %dms', durationMs);
      }
      durationOption.value = String(durationMs);
      durationOptions.push(durationOption);
    }
    var durationFilterUI = new UI.ComboBoxFilterUI(durationOptions);
    durationFilterUI.addEventListener(UI.FilterUI.Events.FilterChanged, durationFilterChanged, this);
    this._filterBar.addFilter(durationFilterUI);

    var categoryFiltersUI = {};
    var categories = Timeline.TimelineUIUtils.categories();
    for (var categoryName in categories) {
      var category = categories[categoryName];
      if (!category.visible)
        continue;
      var filter = new UI.CheckboxFilterUI(category.name, category.title);
      filter.setColor(category.color, 'rgba(0, 0, 0, 0.2)');
      categoryFiltersUI[category.name] = filter;
      filter.addEventListener(UI.FilterUI.Events.FilterChanged, categoriesFilterChanged.bind(this, categoryName));
      this._filterBar.addFilter(filter);
    }
    return this._filterBar;

    /**
     * @this {Timeline.EventsTimelineTreeView.Filters}
     */
    function textFilterChanged() {
      var searchQuery = this._textFilterUI.value();
      this._textFilter.setRegExp(searchQuery ? createPlainTextSearchRegex(searchQuery, 'i') : null);
      this._notifyFiltersChanged();
    }

    /**
     * @this {Timeline.EventsTimelineTreeView.Filters}
     */
    function durationFilterChanged() {
      var duration = durationFilterUI.value();
      var minimumRecordDuration = parseInt(duration, 10);
      this._durationFilter.setMinimumRecordDuration(minimumRecordDuration);
      this._notifyFiltersChanged();
    }

    /**
     * @param {string} name
     * @this {Timeline.EventsTimelineTreeView.Filters}
     */
    function categoriesFilterChanged(name) {
      var categories = Timeline.TimelineUIUtils.categories();
      categories[name].hidden = !categoryFiltersUI[name].checked();
      this._notifyFiltersChanged();
    }
  }

  _notifyFiltersChanged() {
    this.dispatchEventToListeners(Timeline.EventsTimelineTreeView.Filters.Events.FilterChanged);
  }
};

Timeline.EventsTimelineTreeView.Filters._durationFilterPresetsMs = [0, 1, 15];

/** @enum {symbol} */
Timeline.EventsTimelineTreeView.Filters.Events = {
  FilterChanged: Symbol('FilterChanged')
};
