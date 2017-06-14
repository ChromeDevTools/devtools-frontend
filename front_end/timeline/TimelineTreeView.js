// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @unrestricted
 * @implements {UI.Searchable}
 */
Timeline.TimelineTreeView = class extends UI.VBox {
  constructor() {
    super();
    /** @type {?Timeline.PerformanceModel} */
    this._model = null;
    /** @type {?TimelineModel.TimelineProfileTree.Node} */
    this._tree = null;
    this.element.classList.add('timeline-tree-view');
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  static eventNameForSorting(event) {
    if (event.name === TimelineModel.TimelineModel.RecordType.JSFrame) {
      var data = event.args['data'];
      return data['functionName'] + '@' + (data['scriptId'] || data['url'] || '');
    }
    return event.name + ':@' + TimelineModel.TimelineProfileTree.eventURL(event);
  }

  /**
   * @param {!UI.SearchableView} searchableView
   */
  setSearchableView(searchableView) {
    this._searchableView = searchableView;
  }

  /**
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    this._model = model;
    this._populateThreadSelector();
    this.refreshTree();
  }

  /**
   * @protected
   * @return {?Timeline.PerformanceModel} model
   */
  model() {
    return this._model;
  }

  /**
   * @protected
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   */
  init(filters) {
    this._linkifier = new Components.Linkifier();

    this._textFilter = new Timeline.TimelineFilters.RegExp();
    this._filters = [...filters, this._textFilter];

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([]);
    this.populateColumns(columns);

    this._splitWidget = new UI.SplitWidget(true, true, 'timelineTreeViewDetailsSplitWidget');
    var mainView = new UI.VBox();
    var toolbar = new UI.Toolbar('', mainView.element);
    this.populateToolbar(toolbar);

    this._dataGrid = new DataGrid.SortableDataGrid(columns);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    this._dataGrid.element.addEventListener('mousemove', this._onMouseMove.bind(this), true);
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.setRowContextMenuCallback(this._onContextMenu.bind(this));
    this._dataGrid.asWidget().show(mainView.element);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._updateDetailsForSelection, this);

    this._detailsView = new UI.VBox();
    this._detailsView.element.classList.add('timeline-details-view', 'timeline-details-view-body');
    this._splitWidget.setMainWidget(mainView);
    this._splitWidget.setSidebarWidget(this._detailsView);
    this._splitWidget.hideSidebar();
    this._splitWidget.show(this.element);
    this._splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, this._onShowModeChanged, this);

    /** @type {?TimelineModel.TimelineProfileTree.Node|undefined} */
    this._lastSelectedNode;
  }

  /**
   * @protected
   * @return {?TimelineModel.TimelineProfileTree.Node|undefined}
   */
  lastSelectedNode() {
    return this._lastSelectedNode;
  }

  /**
   * @param {!Timeline.TimelineSelection} selection
   */
  updateContents(selection) {
    this.setRange(selection.startTime(), selection.endTime());
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  setRange(startTime, endTime) {
    this._startTime = startTime;
    this._endTime = endTime;
    this.refreshTree();
  }

  /**
   * @return {boolean}
   */
  _exposePercentages() {
    return false;
  }

  /**
   * @protected
   * @param {!UI.Toolbar} toolbar
   */
  populateToolbar(toolbar) {
    this._threadSelector = new UI.ToolbarComboBox(targetChanged.bind(this));
    this._threadSelector.setMaxWidth(230);
    this._currentThreadSetting = Common.settings.createSetting('timelineTreeCurrentThread', 0);
    toolbar.appendToolbarItem(this._threadSelector);
    this._textFilterUI = new UI.ToolbarInput(Common.UIString('Filter'), 0, 0, true);
    this._textFilterUI.addEventListener(UI.ToolbarInput.Event.TextChanged, textFilterChanged, this);
    toolbar.appendToolbarItem(this._textFilterUI);

    /**
     * @this {Timeline.TimelineTreeView}
     */
    function textFilterChanged() {
      var searchQuery = this._textFilterUI.value();
      this._textFilter.setRegExp(searchQuery ? createPlainTextSearchRegex(searchQuery, 'i') : null);
      this.refreshTree();
    }

    /**
     * @this {Timeline.TimelineTreeView}
     */
    function targetChanged() {
      this._currentThreadSetting.set(this._threadSelector.selectedIndex());
      this.refreshTree();
    }
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  _modelEvents() {
    if (!this._model || this._threadSelector.size() === 0)
      return [];
    return this._threadEvents[Number(this._threadSelector.selectedOption().value)];
  }

  _populateThreadSelector() {
    this._threadSelector.removeOptions();
    this._threadEvents = [];
    if (!this._model) {
      this._threadSelector.setVisible(false);
      this._currentThreadSetting.set(0);
      return;
    }
    var option = this._threadSelector.createOption(Common.UIString('Main'), '', '0');
    this._threadEvents.push(this._model.timelineModel().mainThreadEvents());
    this._threadSelector.addOption(option);
    for (var thread of this._model.timelineModel().virtualThreads()) {
      if (!thread.name)
        continue;
      if (!thread.events.some(e => e.name === TimelineModel.TimelineModel.RecordType.JSFrame))
        continue;
      option = this._threadSelector.createOption(thread.name, '', String(this._threadEvents.length));
      this._threadSelector.addOption(option);
      this._threadEvents.push(thread.events);
    }
    this._threadSelector.setSelectedIndex(this._currentThreadSetting.get());
    this._threadSelector.setVisible(this._threadEvents.length > 1);
  }

  /**
   * @param {?TimelineModel.TimelineProfileTree.Node} node
   */
  _onHover(node) {
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   */
  _appendContextMenuItems(contextMenu, node) {
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?Element}
   */
  _linkifyLocation(event) {
    var target = this._model.timelineModel().targetByEvent(event);
    if (!target)
      return null;
    var frame = TimelineModel.TimelineProfileTree.eventStackFrame(event);
    if (!frame)
      return null;
    return this._linkifier.maybeLinkifyConsoleCallFrame(target, frame);
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} treeNode
   * @param {boolean} suppressSelectedEvent
   */
  selectProfileNode(treeNode, suppressSelectedEvent) {
    var pathToRoot = [];
    for (var node = treeNode; node; node = node.parent)
      pathToRoot.push(node);
    for (var i = pathToRoot.length - 1; i > 0; --i) {
      var gridNode = this.dataGridNodeForTreeNode(pathToRoot[i]);
      if (gridNode && gridNode.dataGrid)
        gridNode.expand();
    }
    var gridNode = this.dataGridNodeForTreeNode(treeNode);
    if (gridNode.dataGrid) {
      gridNode.reveal();
      gridNode.select(suppressSelectedEvent);
    }
  }

  /**
   * @protected
   */
  refreshTree() {
    this._linkifier.reset();
    this._dataGrid.rootNode().removeChildren();
    if (!this._model) {
      this._updateDetailsForSelection();
      return;
    }
    this._root = this._buildTree();
    var children = this._root.children();
    var maxSelfTime = 0;
    var maxTotalTime = 0;
    var totalUsedTime = this._root.totalTime - this._root.selfTime;
    for (var child of children.values()) {
      maxSelfTime = Math.max(maxSelfTime, child.selfTime);
      maxTotalTime = Math.max(maxTotalTime, child.totalTime);
    }
    for (var child of children.values()) {
      // Exclude the idle time off the total calculation.
      var gridNode = new Timeline.TimelineTreeView.TreeGridNode(child, totalUsedTime, maxSelfTime, maxTotalTime, this);
      this._dataGrid.insertChild(gridNode);
    }
    this._sortingChanged();
    this._updateDetailsForSelection();
    if (this._searchableView)
      this._searchableView.refreshSearch();
  }

  /**
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildTree() {
    throw new Error('Not Implemented');
  }

  /**
   * @protected
   * @param {boolean} doNotAggregate
   * @param {?function(!SDK.TracingModel.Event):string} groupIdCallback
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  buildTopDownTree(doNotAggregate, groupIdCallback) {
    return new TimelineModel.TimelineProfileTree.TopDownRootNode(
        this._modelEvents(), this._filters, this._startTime, this._endTime, doNotAggregate, groupIdCallback);
  }

  /**
   * @protected
   * @param {!Array<!DataGrid.DataGrid.ColumnDescriptor>} columns
   */
  populateColumns(columns) {
    columns.push({id: 'self', title: Common.UIString('Self Time'), width: '120px', fixedWidth: true, sortable: true});
    columns.push({id: 'total', title: Common.UIString('Total Time'), width: '120px', fixedWidth: true, sortable: true});
    columns.push({id: 'activity', title: Common.UIString('Activity'), disclosure: true, sortable: true});
  }

  _sortingChanged() {
    var columnId = this._dataGrid.sortColumnId();
    if (!columnId)
      return;
    var sortFunction;
    switch (columnId) {
      case 'startTime':
        sortFunction = compareStartTime;
        break;
      case 'self':
        sortFunction = compareNumericField.bind(null, 'selfTime');
        break;
      case 'total':
        sortFunction = compareNumericField.bind(null, 'totalTime');
        break;
      case 'activity':
        sortFunction = compareName;
        break;
      default:
        console.assert(false, 'Unknown sort field: ' + columnId);
        return;
    }
    this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());

    /**
     * @param {string} field
     * @param {!DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareNumericField(field, a, b) {
      var nodeA = /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (a);
      var nodeB = /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (b);
      return nodeA._profileNode[field] - nodeB._profileNode[field];
    }

    /**
     * @param {!DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareStartTime(a, b) {
      var nodeA = /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (a);
      var nodeB = /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (b);
      return nodeA._profileNode.event.startTime - nodeB._profileNode.event.startTime;
    }

    /**
     * @param {!DataGrid.DataGridNode} a
     * @param {!DataGrid.DataGridNode} b
     * @return {number}
     */
    function compareName(a, b) {
      var nodeA = /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (a);
      var nodeB = /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (b);
      var nameA = Timeline.TimelineTreeView.eventNameForSorting(nodeA._profileNode.event);
      var nameB = Timeline.TimelineTreeView.eventNameForSorting(nodeB._profileNode.event);
      return nameA.localeCompare(nameB);
    }
  }

  _onShowModeChanged() {
    if (this._splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain)
      return;
    this._lastSelectedNode = undefined;
    this._updateDetailsForSelection();
  }

  _updateDetailsForSelection() {
    var selectedNode = this._dataGrid.selectedNode ?
        /** @type {!Timeline.TimelineTreeView.TreeGridNode} */ (this._dataGrid.selectedNode)._profileNode :
        null;
    if (selectedNode === this._lastSelectedNode)
      return;
    this._lastSelectedNode = selectedNode;
    if (this._splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain)
      return;
    this._detailsView.detachChildWidgets();
    this._detailsView.element.removeChildren();
    if (selectedNode && this._showDetailsForNode(selectedNode))
      return;
    var banner = this._detailsView.element.createChild('div', 'full-widget-dimmed-banner');
    banner.createTextChild(Common.UIString('Select item for details.'));
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   * @return {boolean}
   */
  _showDetailsForNode(node) {
    return false;
  }

  /**
   * @param {!Event} event
   */
  _onMouseMove(event) {
    var gridNode = event.target && (event.target instanceof Node) ?
        /** @type {?Timeline.TimelineTreeView.TreeGridNode} */ (
            this._dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target))) :
        null;
    var profileNode = gridNode && gridNode._profileNode;
    if (profileNode === this._lastHoveredProfileNode)
      return;
    this._lastHoveredProfileNode = profileNode;
    this._onHover(profileNode);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!DataGrid.DataGridNode} gridNode
   */
  _onContextMenu(contextMenu, gridNode) {
    var profileNode = gridNode._profileNode;
    if (!profileNode)
      return;
    this._appendContextMenuItems(contextMenu, profileNode);
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} treeNode
   * @protected
   * @return {?Timeline.TimelineTreeView.GridNode}
   */
  dataGridNodeForTreeNode(treeNode) {
    return treeNode[Timeline.TimelineTreeView.TreeGridNode._gridNodeSymbol] || null;
  }

  // UI.Searchable implementation

  /**
   * @override
   */
  searchCanceled() {
    this._searchResults = [];
    this._currentResult = 0;
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    this._searchResults = [];
    this._currentResult = 0;
    if (!this._root)
      return;
    var searchRegex = searchConfig.toSearchRegex();
    this._searchResults =
        this._root.searchTree(event => Timeline.TimelineUIUtils.testContentMatching(event, searchRegex));
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults.length)
      return;
    this.selectProfileNode(this._searchResults[this._currentResult], false);
    this._currentResult = mod(this._currentResult + 1, this._searchResults.length);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults.length)
      return;
    this.selectProfileNode(this._searchResults[this._currentResult], false);
    this._currentResult = mod(this._currentResult - 1, this._searchResults.length);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return true;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineTreeView.GridNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} profileNode
   * @param {number} grandTotalTime
   * @param {number} maxSelfTime
   * @param {number} maxTotalTime
   * @param {!Timeline.TimelineTreeView} treeView
   */
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(null, false);
    this._populated = false;
    this._profileNode = profileNode;
    this._treeView = treeView;
    this._grandTotalTime = grandTotalTime;
    this._maxSelfTime = maxSelfTime;
    this._maxTotalTime = maxTotalTime;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    if (columnId === 'activity')
      return this._createNameCell(columnId);
    return this._createValueCell(columnId) || super.createCell(columnId);
  }

  /**
   * @param {string} columnId
   * @return {!Element}
   */
  _createNameCell(columnId) {
    var cell = this.createTD(columnId);
    var container = cell.createChild('div', 'name-container');
    var iconContainer = container.createChild('div', 'activity-icon-container');
    var icon = iconContainer.createChild('div', 'activity-icon');
    var name = container.createChild('div', 'activity-name');
    var event = this._profileNode.event;
    if (this._profileNode.isGroupNode()) {
      var treeView = /** @type {!Timeline.AggregatedTimelineTreeView} */ (this._treeView);
      var info = treeView._displayInfoForGroupNode(this._profileNode);
      name.textContent = info.name;
      icon.style.backgroundColor = info.color;
      if (info.icon)
        iconContainer.insertBefore(info.icon, icon);
    } else if (event) {
      var data = event.args['data'];
      var deoptReason = data && data['deoptReason'];
      if (deoptReason)
        container.createChild('div', 'activity-warning').title = Common.UIString('Not optimized: %s', deoptReason);

      name.textContent = Timeline.TimelineUIUtils.eventTitle(event);
      var link = this._treeView._linkifyLocation(event);
      if (link)
        container.createChild('div', 'activity-link').appendChild(link);
      icon.style.backgroundColor = Timeline.TimelineUIUtils.eventColor(event);
    }
    return cell;
  }

  /**
   * @param {string} columnId
   * @return {?Element}
   */
  _createValueCell(columnId) {
    if (columnId !== 'self' && columnId !== 'total' && columnId !== 'startTime')
      return null;

    var showPercents = false;
    var value;
    var maxTime;
    switch (columnId) {
      case 'startTime':
        value = this._profileNode.event.startTime - this._treeView._model.timelineModel().minimumRecordTime();
        break;
      case 'self':
        value = this._profileNode.selfTime;
        maxTime = this._maxSelfTime;
        showPercents = true;
        break;
      case 'total':
        value = this._profileNode.totalTime;
        maxTime = this._maxTotalTime;
        showPercents = true;
        break;
      default:
        return null;
    }
    var cell = this.createTD(columnId);
    cell.className = 'numeric-column';
    var textDiv = cell.createChild('div');
    textDiv.createChild('span').textContent = Common.UIString('%.1f\xa0ms', value);

    if (showPercents && this._treeView._exposePercentages()) {
      textDiv.createChild('span', 'percent-column').textContent =
          Common.UIString('%.1f\xa0%%', value / this._grandTotalTime * 100);
    }
    if (maxTime) {
      textDiv.classList.add('background-percent-bar');
      cell.createChild('div', 'background-bar-container').createChild('div', 'background-bar').style.width =
          (value * 100 / maxTime).toFixed(1) + '%';
    }
    return cell;
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineTreeView.TreeGridNode = class extends Timeline.TimelineTreeView.GridNode {
  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} profileNode
   * @param {number} grandTotalTime
   * @param {number} maxSelfTime
   * @param {number} maxTotalTime
   * @param {!Timeline.TimelineTreeView} treeView
   */
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.setHasChildren(this._profileNode.hasChildren());
    profileNode[Timeline.TimelineTreeView.TreeGridNode._gridNodeSymbol] = this;
  }

  /**
   * @override
   */
  populate() {
    if (this._populated)
      return;
    this._populated = true;
    if (!this._profileNode.children)
      return;
    for (var node of this._profileNode.children().values()) {
      var gridNode = new Timeline.TimelineTreeView.TreeGridNode(
          node, this._grandTotalTime, this._maxSelfTime, this._maxTotalTime, this._treeView);
      this.insertChildOrdered(gridNode);
    }
  }
};

Timeline.TimelineTreeView.TreeGridNode._gridNodeSymbol = Symbol('treeGridNode');

/**
 * @unrestricted
 */
Timeline.AggregatedTimelineTreeView = class extends Timeline.TimelineTreeView {
  /**
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   */
  constructor(filters) {
    super();
    this._groupBySetting =
        Common.settings.createSetting('timelineTreeGroupBy', Timeline.AggregatedTimelineTreeView.GroupBy.None);
    this._groupBySetting.addChangeListener(this.refreshTree.bind(this));
    this.init(filters);
    this._stackView = new Timeline.TimelineStackView(this);
    this._stackView.addEventListener(
        Timeline.TimelineStackView.Events.SelectionChanged, this._onStackViewSelectionChanged, this);
    this._badgePool = new ProductRegistry.BadgePool(true);
    /** @type {!Map<string, string>} */
    this._productByURLCache = new Map();
    /** @type {!Map<string, string>} */
    this._colorByURLCache = new Map();
    ProductRegistry.instance().then(registry => {
      this._productRegistry = registry;
      this.refreshTree();
    });
  }

  /**
   * @override
   * @param {?Timeline.PerformanceModel} model
   */
  setModel(model) {
    this._badgePool.reset();
    super.setModel(model);
  }

  /**
   * @override
   * @param {!Timeline.TimelineSelection} selection
   */
  updateContents(selection) {
    this._updateExtensionResolver();
    super.updateContents(selection);
    var rootNode = this._dataGrid.rootNode();
    if (rootNode.children.length)
      rootNode.children[0].revealAndSelect();
  }

  _updateExtensionResolver() {
    this._executionContextNamesByOrigin = new Map();
    for (var runtimeModel of SDK.targetManager.models(SDK.RuntimeModel)) {
      for (var context of runtimeModel.executionContexts())
        this._executionContextNamesByOrigin.set(context.origin, context.name);
    }
  }

  /**
   * @param {string} name
   * @return {string}
   * @this {Timeline.AggregatedTimelineTreeView}
   */
  _beautifyDomainName(name) {
    if (Timeline.AggregatedTimelineTreeView._isExtensionInternalURL(name))
      name = Common.UIString('[Chrome extensions overhead]');
    else if (Timeline.AggregatedTimelineTreeView._isV8NativeURL(name))
      name = Common.UIString('[V8 Runtime]');
    else if (name.startsWith('chrome-extension'))
      name = this._executionContextNamesByOrigin.get(name) || name;
    return name;
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   * @return {!{name: string, color: string, icon: (!Element|undefined)}}
   */
  _displayInfoForGroupNode(node) {
    var categories = Timeline.TimelineUIUtils.categories();
    var color = node.id ? Timeline.TimelineUIUtils.eventColor(/** @type {!SDK.TracingModel.Event} */ (node.event)) :
                          categories['other'].color;
    var unattributed = Common.UIString('[unattributed]');

    switch (this._groupBySetting.get()) {
      case Timeline.AggregatedTimelineTreeView.GroupBy.Category:
        var category = categories[node.id] || categories['other'];
        return {name: category.title, color: category.color};

      case Timeline.AggregatedTimelineTreeView.GroupBy.Domain:
      case Timeline.AggregatedTimelineTreeView.GroupBy.Subdomain:
        var domainName = this._beautifyDomainName(node.id);
        if (domainName) {
          var productName = this._productByEvent(/** @type {!SDK.TracingModel.Event} */ (node.event));
          if (productName)
            domainName += ' \u2014 ' + productName;
        }
        return {name: domainName || unattributed, color: color};

      case Timeline.AggregatedTimelineTreeView.GroupBy.EventName:
        var name = node.event.name === TimelineModel.TimelineModel.RecordType.JSFrame ?
            Common.UIString('JavaScript') :
            Timeline.TimelineUIUtils.eventTitle(node.event);
        return {
          name: name,
          color: node.event.name === TimelineModel.TimelineModel.RecordType.JSFrame ?
              Timeline.TimelineUIUtils.eventStyle(node.event).category.color :
              color
        };

      case Timeline.AggregatedTimelineTreeView.GroupBy.Product:
        var event = /** @type {!SDK.TracingModel.Event} */ (node.event);
        var info = this._productAndBadgeByEvent(event);
        var name = info && info.name || unattributed;
        color = Timeline.TimelineUIUtils.eventColorByProduct(
            this._productRegistry, this._model.timelineModel(), this._colorByURLCache, event);
        return {name: name, color: color, icon: info && info.badge || undefined};

      case Timeline.AggregatedTimelineTreeView.GroupBy.URL:
        break;

      case Timeline.AggregatedTimelineTreeView.GroupBy.Frame:
        var frame = this._model.timelineModel().pageFrameById(node.id);
        var frameName = frame ? Timeline.TimelineUIUtils.displayNameForFrame(frame, 80) : Common.UIString('Page');
        return {name: frameName, color: color};

      default:
        console.assert(false, 'Unexpected grouping type');
    }
    return {name: node.id || unattributed, color: color};
  }

  /**
   * @override
   * @param {!UI.Toolbar} toolbar
   */
  populateToolbar(toolbar) {
    super.populateToolbar(toolbar);
    var groupBy = Timeline.AggregatedTimelineTreeView.GroupBy;
    var options = [
      {label: Common.UIString('No Grouping'), value: groupBy.None},
      {label: Common.UIString('Group by Activity'), value: groupBy.EventName},
      {label: Common.UIString('Group by Category'), value: groupBy.Category},
      {label: Common.UIString('Group by Domain'), value: groupBy.Domain},
      {label: Common.UIString('Group by Frame'), value: groupBy.Frame},
      {label: Common.UIString('Group by Product'), value: groupBy.Product},
      {label: Common.UIString('Group by Subdomain'), value: groupBy.Subdomain},
      {label: Common.UIString('Group by URL'), value: groupBy.URL},
    ];
    toolbar.appendToolbarItem(new UI.ToolbarSettingComboBox(options, this._groupBySetting));
    toolbar.appendSpacer();
    toolbar.appendToolbarItem(this._splitWidget.createShowHideSidebarButton(Common.UIString('heaviest stack')));
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} treeNode
   * @return {!Array<!TimelineModel.TimelineProfileTree.Node>}
   */
  _buildHeaviestStack(treeNode) {
    console.assert(!!treeNode.parent, 'Attempt to build stack for tree root');
    var result = [];
    // Do not add root to the stack, as it's the tree itself.
    for (var node = treeNode; node && node.parent; node = node.parent)
      result.push(node);
    result = result.reverse();
    for (node = treeNode; node && node.children() && node.children().size;) {
      var children = Array.from(node.children().values());
      node = children.reduce((a, b) => a.totalTime > b.totalTime ? a : b);
      result.push(node);
    }
    return result;
  }

  /**
   * @override
   * @return {boolean}
   */
  _exposePercentages() {
    return true;
  }

  _onStackViewSelectionChanged() {
    var treeNode = this._stackView.selectedTreeNode();
    if (treeNode)
      this.selectProfileNode(treeNode, true);
  }

  /**
   * @override
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   * @return {boolean}
   */
  _showDetailsForNode(node) {
    var stack = this._buildHeaviestStack(node);
    this._stackView.setStack(stack, node);
    this._stackView.show(this._detailsView.element);
    return true;
  }

  /**
   * @param {!Timeline.AggregatedTimelineTreeView.GroupBy} groupBy
   * @return {?function(!SDK.TracingModel.Event):string}
   */
  _groupingFunction(groupBy) {
    var GroupBy = Timeline.AggregatedTimelineTreeView.GroupBy;
    switch (groupBy) {
      case GroupBy.None:
        return null;
      case GroupBy.EventName:
        return event => Timeline.TimelineUIUtils.eventStyle(event).title;
      case GroupBy.Category:
        return event => Timeline.TimelineUIUtils.eventStyle(event).category.name;
      case GroupBy.Subdomain:
        return this._domainByEvent.bind(this, false);
      case GroupBy.Domain:
        return this._domainByEvent.bind(this, true);
      case GroupBy.Product:
        return event => this._productByEvent(event) || this._domainByEvent(true, event) || '';
      case GroupBy.URL:
        return event => TimelineModel.TimelineProfileTree.eventURL(event) || '';
      case GroupBy.Frame:
        return event => TimelineModel.TimelineData.forEvent(event).frameId;
      default:
        console.assert(false, `Unexpected aggregation setting: ${groupBy}`);
        return null;
    }
  }

  /**
   * @param {boolean} groupSubdomains
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  _domainByEvent(groupSubdomains, event) {
    var url = TimelineModel.TimelineProfileTree.eventURL(event);
    if (!url)
      return '';
    if (Timeline.AggregatedTimelineTreeView._isExtensionInternalURL(url))
      return Timeline.AggregatedTimelineTreeView._extensionInternalPrefix;
    if (Timeline.AggregatedTimelineTreeView._isV8NativeURL(url))
      return Timeline.AggregatedTimelineTreeView._v8NativePrefix;
    var parsedURL = url.asParsedURL();
    if (!parsedURL)
      return '';
    if (parsedURL.scheme === 'chrome-extension')
      return parsedURL.scheme + '://' + parsedURL.host;
    if (!groupSubdomains)
      return parsedURL.host;
    if (/^[.0-9]+$/.test(parsedURL.host))
      return parsedURL.host;
    var domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
    return domainMatch && domainMatch[0] || '';
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  _productByEvent(event) {
    var url = TimelineModel.TimelineProfileTree.eventURL(event);
    if (!url)
      return '';
    if (this._productByURLCache.has(url))
      return this._productByURLCache.get(url);
    if (!this._productRegistry)
      return '';
    var parsedURL = url.asParsedURL();
    var name = parsedURL && this._productRegistry.nameForUrl(parsedURL) || '';
    this._productByURLCache.set(url, name);
    return name;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?{name: string, badge: ?Element}}
   */
  _productAndBadgeByEvent(event) {
    var url = TimelineModel.TimelineProfileTree.eventURL(event);
    if (!url || !this._productRegistry)
      return null;
    var parsedURL = url.asParsedURL();
    var name = parsedURL && this._productRegistry.nameForUrl(parsedURL) || this._domainByEvent(true, event);
    if (!name)
      return null;
    var icon = parsedURL && this._badgePool.badgeForURL(parsedURL);
    return {name: this._beautifyDomainName(name), badge: icon};
  }

  /**
   * @override
   * @param {!UI.ContextMenu} contextMenu
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   */
  _appendContextMenuItems(contextMenu, node) {
    if (this._groupBySetting.get() !== Timeline.AggregatedTimelineTreeView.GroupBy.Frame)
      return;
    if (!node.isGroupNode())
      return;
    var frame = this._model.timelineModel().pageFrameById(node.id);
    if (!frame || !frame.ownerNode)
      return;
    contextMenu.appendApplicableItems(frame.ownerNode);
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  static _isExtensionInternalURL(url) {
    return url.startsWith(Timeline.AggregatedTimelineTreeView._extensionInternalPrefix);
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  static _isV8NativeURL(url) {
    return url.startsWith(Timeline.AggregatedTimelineTreeView._v8NativePrefix);
  }
};

Timeline.AggregatedTimelineTreeView._extensionInternalPrefix = 'extensions::';
Timeline.AggregatedTimelineTreeView._v8NativePrefix = 'native ';

/**
 * @enum {string}
 */
Timeline.AggregatedTimelineTreeView.GroupBy = {
  None: 'None',
  EventName: 'EventName',
  Category: 'Category',
  Domain: 'Domain',
  Subdomain: 'Subdomain',
  Product: 'Product',
  URL: 'URL',
  Frame: 'Frame'
};

/**
 * @unrestricted
 */
Timeline.CallTreeTimelineTreeView = class extends Timeline.AggregatedTimelineTreeView {
  /**
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   */
  constructor(filters) {
    super(filters);
    this._dataGrid.markColumnAsSortedBy('total', DataGrid.DataGrid.Order.Descending);
  }

  /**
   * @override
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildTree() {
    var grouping = this._groupBySetting.get();
    return this.buildTopDownTree(false, this._groupingFunction(grouping));
  }
};

/**
 * @unrestricted
 */
Timeline.BottomUpTimelineTreeView = class extends Timeline.AggregatedTimelineTreeView {
  /**
   * @param {!Array<!TimelineModel.TimelineModelFilter>} filters
   */
  constructor(filters) {
    super(filters);
    this._dataGrid.markColumnAsSortedBy('self', DataGrid.DataGrid.Order.Descending);
  }

  /**
   * @override
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildTree() {
    return new TimelineModel.TimelineProfileTree.BottomUpRootNode(
        this._modelEvents(), this._filters, this._startTime, this._endTime,
        this._groupingFunction(this._groupBySetting.get()));
  }
};

/**
 * @unrestricted
 */
Timeline.TimelineStackView = class extends UI.VBox {
  constructor(treeView) {
    super();
    var header = this.element.createChild('div', 'timeline-stack-view-header');
    header.textContent = Common.UIString('Heaviest stack');
    this._treeView = treeView;
    var columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'total', title: Common.UIString('Total Time'), fixedWidth: true, width: '110px'},
      {id: 'activity', title: Common.UIString('Activity')}
    ]);
    this._dataGrid = new DataGrid.ViewportDataGrid(columns);
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._onSelectionChanged, this);
    this._dataGrid.asWidget().show(this.element);
  }

  /**
   * @param {!Array<!TimelineModel.TimelineProfileTree.Node>} stack
   * @param {!TimelineModel.TimelineProfileTree.Node} selectedNode
   */
  setStack(stack, selectedNode) {
    var rootNode = this._dataGrid.rootNode();
    rootNode.removeChildren();
    var nodeToReveal = null;
    var totalTime = Math.max.apply(Math, stack.map(node => node.totalTime));
    for (var node of stack) {
      var gridNode = new Timeline.TimelineTreeView.GridNode(node, totalTime, totalTime, totalTime, this._treeView);
      rootNode.appendChild(gridNode);
      if (node === selectedNode)
        nodeToReveal = gridNode;
    }
    nodeToReveal.revealAndSelect();
  }

  /**
   * @return {?TimelineModel.TimelineProfileTree.Node}
   */
  selectedTreeNode() {
    var selectedNode = this._dataGrid.selectedNode;
    return selectedNode && /** @type {!Timeline.TimelineTreeView.GridNode} */ (selectedNode)._profileNode;
  }

  _onSelectionChanged() {
    this.dispatchEventToListeners(Timeline.TimelineStackView.Events.SelectionChanged);
  }
};

/** @enum {symbol} */
Timeline.TimelineStackView.Events = {
  SelectionChanged: Symbol('SelectionChanged')
};
