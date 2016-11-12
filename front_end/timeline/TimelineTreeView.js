// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.TimelineTreeView = class extends WebInspector.VBox {
  constructor() {
    super();
    this.element.classList.add('timeline-tree-view');
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @return {string}
   */
  static eventNameForSorting(event) {
    if (event.name === WebInspector.TimelineModel.RecordType.JSFrame) {
      var data = event.args['data'];
      return data['functionName'] + '@' + (data['scriptId'] || data['url'] || '');
    }
    return event.name + ':@' + WebInspector.TimelineProfileTree.eventURL(event);
  }

  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  _init(model, filters) {
    this._model = model;
    this._linkifier = new WebInspector.Linkifier();

    this._filters = filters.slice();

    var columns = /** @type {!Array<!WebInspector.DataGrid.ColumnDescriptor>} */ ([]);
    this._populateColumns(columns);

    var mainView = new WebInspector.VBox();
    this._populateToolbar(mainView.element);
    this._dataGrid = new WebInspector.SortableDataGrid(columns);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    this._dataGrid.element.addEventListener('mousemove', this._onMouseMove.bind(this), true);
    this._dataGrid.setResizeMethod(WebInspector.DataGrid.ResizeMethod.Last);
    this._dataGrid.asWidget().show(mainView.element);

    this._splitWidget = new WebInspector.SplitWidget(true, true, 'timelineTreeViewDetailsSplitWidget');
    this._splitWidget.show(this.element);
    this._splitWidget.setMainWidget(mainView);

    this._detailsView = new WebInspector.VBox();
    this._detailsView.element.classList.add('timeline-details-view', 'timeline-details-view-body');
    this._splitWidget.setSidebarWidget(this._detailsView);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._updateDetailsForSelection, this);

    /** @type {?WebInspector.TimelineProfileTree.Node|undefined} */
    this._lastSelectedNode;
  }

  /**
   * @param {!WebInspector.TimelineSelection} selection
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
    this._refreshTree();
  }

  /**
   * @return {boolean}
   */
  _exposePercentages() {
    return false;
  }

  /**
   * @param {!Element} parent
   */
  _populateToolbar(parent) {
  }

  /**
   * @param {?WebInspector.TimelineProfileTree.Node} node
   */
  _onHover(node) {
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @return {?Element}
   */
  _linkifyLocation(event) {
    var target = this._model.targetByEvent(event);
    if (!target)
      return null;
    var frame = WebInspector.TimelineProfileTree.eventStackFrame(event);
    if (!frame)
      return null;
    return this._linkifier.maybeLinkifyConsoleCallFrame(target, frame);
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} treeNode
   * @param {boolean} suppressSelectedEvent
   */
  selectProfileNode(treeNode, suppressSelectedEvent) {
    var pathToRoot = [];
    for (var node = treeNode; node; node = node.parent)
      pathToRoot.push(node);
    for (var i = pathToRoot.length - 1; i > 0; --i) {
      var gridNode = this._dataGridNodeForTreeNode(pathToRoot[i]);
      if (gridNode && gridNode.dataGrid)
        gridNode.expand();
    }
    var gridNode = this._dataGridNodeForTreeNode(treeNode);
    if (gridNode.dataGrid) {
      gridNode.reveal();
      gridNode.select(suppressSelectedEvent);
    }
  }

  _refreshTree() {
    this._linkifier.reset();
    this._dataGrid.rootNode().removeChildren();
    var tree = this._buildTree();
    if (!tree.children)
      return;
    var maxSelfTime = 0;
    var maxTotalTime = 0;
    for (var child of tree.children.values()) {
      maxSelfTime = Math.max(maxSelfTime, child.selfTime);
      maxTotalTime = Math.max(maxTotalTime, child.totalTime);
    }
    for (var child of tree.children.values()) {
      // Exclude the idle time off the total calculation.
      var gridNode =
          new WebInspector.TimelineTreeView.TreeGridNode(child, tree.totalTime, maxSelfTime, maxTotalTime, this);
      this._dataGrid.insertChild(gridNode);
    }
    this._sortingChanged();
    this._updateDetailsForSelection();
  }

  /**
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  _buildTree() {
    throw new Error('Not Implemented');
  }

  /**
   * @param {function(!WebInspector.TracingModel.Event):(string|symbol)=} eventIdCallback
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  _buildTopDownTree(eventIdCallback) {
    return WebInspector.TimelineProfileTree.buildTopDown(
        this._model.mainThreadEvents(), this._filters, this._startTime, this._endTime, eventIdCallback);
  }

  /**
   * @param {!Array<!WebInspector.DataGrid.ColumnDescriptor>} columns
   */
  _populateColumns(columns) {
    columns.push(
        {id: 'self', title: WebInspector.UIString('Self Time'), width: '110px', fixedWidth: true, sortable: true});
    columns.push(
        {id: 'total', title: WebInspector.UIString('Total Time'), width: '110px', fixedWidth: true, sortable: true});
    columns.push({id: 'activity', title: WebInspector.UIString('Activity'), disclosure: true, sortable: true});
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
     * @param {!WebInspector.DataGridNode} a
     * @param {!WebInspector.DataGridNode} b
     * @return {number}
     */
    function compareNumericField(field, a, b) {
      var nodeA = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (a);
      var nodeB = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (b);
      return nodeA._profileNode[field] - nodeB._profileNode[field];
    }

    /**
     * @param {!WebInspector.DataGridNode} a
     * @param {!WebInspector.DataGridNode} b
     * @return {number}
     */
    function compareStartTime(a, b) {
      var nodeA = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (a);
      var nodeB = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (b);
      return nodeA._profileNode.event.startTime - nodeB._profileNode.event.startTime;
    }

    /**
     * @param {!WebInspector.DataGridNode} a
     * @param {!WebInspector.DataGridNode} b
     * @return {number}
     */
    function compareName(a, b) {
      var nodeA = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (a);
      var nodeB = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (b);
      var nameA = WebInspector.TimelineTreeView.eventNameForSorting(nodeA._profileNode.event);
      var nameB = WebInspector.TimelineTreeView.eventNameForSorting(nodeB._profileNode.event);
      return nameA.localeCompare(nameB);
    }
  }

  _updateDetailsForSelection() {
    var selectedNode = this._dataGrid.selectedNode ?
        /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (this._dataGrid.selectedNode)._profileNode :
        null;
    if (selectedNode === this._lastSelectedNode)
      return;
    this._lastSelectedNode = selectedNode;
    this._detailsView.detachChildWidgets();
    this._detailsView.element.removeChildren();
    if (!selectedNode || !this._showDetailsForNode(selectedNode)) {
      var banner = this._detailsView.element.createChild('div', 'full-widget-dimmed-banner');
      banner.createTextChild(WebInspector.UIString('Select item for details.'));
    }
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} node
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
        /** @type {?WebInspector.TimelineTreeView.TreeGridNode} */ (
            this._dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target))) :
        null;
    var profileNode = gridNode && gridNode._profileNode;
    if (profileNode === this._lastHoveredProfileNode)
      return;
    this._lastHoveredProfileNode = profileNode;
    this._onHover(profileNode);
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} treeNode
   * @return {?WebInspector.TimelineTreeView.GridNode}
   */
  _dataGridNodeForTreeNode(treeNode) {
    return treeNode[WebInspector.TimelineTreeView.TreeGridNode._gridNodeSymbol] || null;
  }
};


/**
 * @unrestricted
 */
WebInspector.TimelineTreeView.GridNode = class extends WebInspector.SortableDataGridNode {
  /**
   * @param {!WebInspector.TimelineProfileTree.Node} profileNode
   * @param {number} grandTotalTime
   * @param {number} maxSelfTime
   * @param {number} maxTotalTime
   * @param {!WebInspector.TimelineTreeView} treeView
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
    const cell = this.createTD(columnId);
    const container = cell.createChild('div', 'name-container');
    const icon = container.createChild('div', 'activity-icon');
    const name = container.createChild('div', 'activity-name');
    const event = this._profileNode.event;
    if (this._profileNode.isGroupNode()) {
      const treeView = /** @type {!WebInspector.AggregatedTimelineTreeView} */ (this._treeView);
      const info = treeView._displayInfoForGroupNode(this._profileNode);
      name.textContent = info.name;
      icon.style.backgroundColor = info.color;
    } else if (event) {
      const data = event.args['data'];
      const deoptReason = data && data['deoptReason'];
      if (deoptReason) {
        container.createChild('div', 'activity-warning').title =
            WebInspector.UIString('Not optimized: %s', deoptReason);
      }
      name.textContent = WebInspector.TimelineUIUtils.eventTitle(event);
      const link = this._treeView._linkifyLocation(event);
      if (link)
        container.createChild('div', 'activity-link').appendChild(link);
      icon.style.backgroundColor = WebInspector.TimelineUIUtils.eventColor(event);
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
        value = this._profileNode.event.startTime - this._treeView._model.minimumRecordTime();
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
    textDiv.createChild('span').textContent = WebInspector.UIString('%.1f\u2009ms', value);

    if (showPercents && this._treeView._exposePercentages())
      textDiv.createChild('span', 'percent-column').textContent =
          WebInspector.UIString('%.1f\u2009%%', value / this._grandTotalTime * 100);
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
WebInspector.TimelineTreeView.TreeGridNode = class extends WebInspector.TimelineTreeView.GridNode {
  /**
   * @param {!WebInspector.TimelineProfileTree.Node} profileNode
   * @param {number} grandTotalTime
   * @param {number} maxSelfTime
   * @param {number} maxTotalTime
   * @param {!WebInspector.TimelineTreeView} treeView
   */
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.hasChildren = this._profileNode.children ? this._profileNode.children.size > 0 : false;
    profileNode[WebInspector.TimelineTreeView.TreeGridNode._gridNodeSymbol] = this;
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
    for (var node of this._profileNode.children.values()) {
      var gridNode = new WebInspector.TimelineTreeView.TreeGridNode(
          node, this._grandTotalTime, this._maxSelfTime, this._maxTotalTime, this._treeView);
      this.insertChildOrdered(gridNode);
    }
  }
};

WebInspector.TimelineTreeView.TreeGridNode._gridNodeSymbol = Symbol('treeGridNode');

/**
 * @unrestricted
 */
WebInspector.AggregatedTimelineTreeView = class extends WebInspector.TimelineTreeView {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  constructor(model, filters) {
    super();
    this._groupBySetting =
        WebInspector.settings.createSetting('timelineTreeGroupBy', WebInspector.AggregatedTimelineTreeView.GroupBy.Category);
    this._init(model, filters);
    var nonessentialEvents = [
      WebInspector.TimelineModel.RecordType.EventDispatch, WebInspector.TimelineModel.RecordType.FunctionCall,
      WebInspector.TimelineModel.RecordType.TimerFire
    ];
    this._filters.push(new WebInspector.ExclusiveNameFilter(nonessentialEvents));
    this._stackView = new WebInspector.TimelineStackView(this);
    this._stackView.addEventListener(
        WebInspector.TimelineStackView.Events.SelectionChanged, this._onStackViewSelectionChanged, this);
  }

  /**
   * @override
   * @param {!WebInspector.TimelineSelection} selection
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
    for (var target of WebInspector.targetManager.targets()) {
      for (var context of target.runtimeModel.executionContexts())
        this._executionContextNamesByOrigin.set(context.origin, context.name);
    }
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} node
   * @return {!{name: string, color: string}}
   */
  _displayInfoForGroupNode(node) {
    var categories = WebInspector.TimelineUIUtils.categories();
    var color = node.id ? WebInspector.TimelineUIUtils.eventColor(node.event) : categories['other'].color;

    switch (this._groupBySetting.get()) {
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Category:
        var category = categories[node.id] || categories['other'];
        return {name: category.title, color: category.color};

      case WebInspector.AggregatedTimelineTreeView.GroupBy.Domain:
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain:
        var name = node.id;
        if (WebInspector.AggregatedTimelineTreeView._isExtensionInternalURL(name))
          name = WebInspector.UIString('[Chrome extensions overhead]');
        else if (name.startsWith('chrome-extension'))
          name = this._executionContextNamesByOrigin.get(name) || name;
        return {name: name || WebInspector.UIString('unattributed'), color: color};

      case WebInspector.AggregatedTimelineTreeView.GroupBy.EventName:
        var name = node.event.name === WebInspector.TimelineModel.RecordType.JSFrame ?
            WebInspector.UIString('JavaScript') :
            WebInspector.TimelineUIUtils.eventTitle(node.event);
        return {
          name: name,
          color: node.event.name === WebInspector.TimelineModel.RecordType.JSFrame ?
              WebInspector.TimelineUIUtils.eventStyle(node.event).category.color :
              color
        };

      case WebInspector.AggregatedTimelineTreeView.GroupBy.URL:
        break;
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Frame:
        var frame = this._model.pageFrameById(node.id);
        var frameName = frame ? WebInspector.TimelineUIUtils.displayNameForFrame(frame, 80) : WebInspector.UIString('Page');
        return {
          name: frameName,
          color: color
        };
        break;

      default:
        console.assert(false, 'Unexpected aggregation type');
    }
    return {name: node.id || WebInspector.UIString('unattributed'), color: color};
  }

  /**
   * @override
   * @param {!Element} parent
   */
  _populateToolbar(parent) {
    var panelToolbar = new WebInspector.Toolbar('', parent);
    this._groupByCombobox = new WebInspector.ToolbarComboBox(this._onGroupByChanged.bind(this));
    /**
     * @param {string} name
     * @param {string} id
     * @this {WebInspector.TimelineTreeView}
     */
    function addGroupingOption(name, id) {
      var option = this._groupByCombobox.createOption(name, '', id);
      this._groupByCombobox.addOption(option);
      if (id === this._groupBySetting.get())
        this._groupByCombobox.select(option);
    }
    const groupBy = WebInspector.AggregatedTimelineTreeView.GroupBy;
    addGroupingOption.call(this, WebInspector.UIString('No Grouping'), groupBy.None);
    addGroupingOption.call(this, WebInspector.UIString('Group by Activity'), groupBy.EventName);
    addGroupingOption.call(this, WebInspector.UIString('Group by Category'), groupBy.Category);
    addGroupingOption.call(this, WebInspector.UIString('Group by Domain'), groupBy.Domain);
    addGroupingOption.call(this, WebInspector.UIString('Group by Subdomain'), groupBy.Subdomain);
    addGroupingOption.call(this, WebInspector.UIString('Group by URL'), groupBy.URL);
    addGroupingOption.call(this, WebInspector.UIString('Group by Frame'), groupBy.Frame);
    panelToolbar.appendToolbarItem(this._groupByCombobox);
  }

  /**
   * @param {!WebInspector.TimelineProfileTree.Node} treeNode
   * @return {!Array<!WebInspector.TimelineProfileTree.Node>}
   */
  _buildHeaviestStack(treeNode) {
    console.assert(!!treeNode.parent, 'Attempt to build stack for tree root');
    var result = [];
    // Do not add root to the stack, as it's the tree itself.
    for (var node = treeNode; node && node.parent; node = node.parent)
      result.push(node);
    result = result.reverse();
    for (node = treeNode; node && node.children && node.children.size;) {
      var children = Array.from(node.children.values());
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

  _onGroupByChanged() {
    this._groupBySetting.set(this._groupByCombobox.selectedOption().value);
    this._refreshTree();
  }

  _onStackViewSelectionChanged() {
    var treeNode = this._stackView.selectedTreeNode();
    if (treeNode)
      this.selectProfileNode(treeNode, true);
  }

  /**
   * @override
   * @param {!WebInspector.TimelineProfileTree.Node} node
   * @return {boolean}
   */
  _showDetailsForNode(node) {
    var stack = this._buildHeaviestStack(node);
    this._stackView.setStack(stack, node);
    this._stackView.show(this._detailsView.element);
    return true;
  }

  /**
   * @param {!WebInspector.AggregatedTimelineTreeView.GroupBy} groupBy
   * @return {function(!WebInspector.TracingModel.Event):string}
   */
  _groupingFunction(groupBy) {
    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {string}
     */
    function groupByURL(event) {
      return WebInspector.TimelineProfileTree.eventURL(event) || '';
    }

    /**
     * @param {boolean} groupSubdomains
     * @param {!WebInspector.TracingModel.Event} event
     * @return {string}
     */
    function groupByDomain(groupSubdomains, event) {
      var url = WebInspector.TimelineProfileTree.eventURL(event) || '';
      if (WebInspector.AggregatedTimelineTreeView._isExtensionInternalURL(url))
        return WebInspector.AggregatedTimelineTreeView._extensionInternalPrefix;
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

    switch (groupBy) {
      case WebInspector.AggregatedTimelineTreeView.GroupBy.None:
        return () => Symbol('uniqueGroupId');
      case WebInspector.AggregatedTimelineTreeView.GroupBy.EventName:
        return event => WebInspector.TimelineUIUtils.eventStyle(event).title;
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Category:
        return event => WebInspector.TimelineUIUtils.eventStyle(event).category.name;
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain:
        return groupByDomain.bind(null, false);
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Domain:
        return groupByDomain.bind(null, true);
      case WebInspector.AggregatedTimelineTreeView.GroupBy.URL:
        return groupByURL;
      case WebInspector.AggregatedTimelineTreeView.GroupBy.Frame:
        return event => WebInspector.TimelineData.forEvent(event).frameId;
      default:
        console.assert(false, `Unexpected aggregation setting: ${groupBy}`);
        return () => Symbol('uniqueGroupId');
    }
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  static _isExtensionInternalURL(url) {
    return url.startsWith(WebInspector.AggregatedTimelineTreeView._extensionInternalPrefix);
  }
};

WebInspector.AggregatedTimelineTreeView._extensionInternalPrefix = 'extensions::';

/**
 * @enum {string}
 */
WebInspector.AggregatedTimelineTreeView.GroupBy = {
  None: 'None',
  EventName: 'EventName',
  Category: 'Category',
  Domain: 'Domain',
  Subdomain: 'Subdomain',
  URL: 'URL',
  Frame: 'Frame'
};

/**
 * @unrestricted
 */
WebInspector.CallTreeTimelineTreeView = class extends WebInspector.AggregatedTimelineTreeView {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  constructor(model, filters) {
    super(model, filters);
    this._dataGrid.markColumnAsSortedBy('total', WebInspector.DataGrid.Order.Descending);
  }

  /**
   * @override
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  _buildTree() {
    var grouping = this._groupBySetting.get();
    var topDown = this._buildTopDownTree(this._groupingFunction(grouping));
    if (grouping === WebInspector.AggregatedTimelineTreeView.GroupBy.None)
      return topDown;
    return new WebInspector.TimelineAggregator().performGrouping(topDown);
  }
};

/**
 * @unrestricted
 */
WebInspector.BottomUpTimelineTreeView = class extends WebInspector.AggregatedTimelineTreeView {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   */
  constructor(model, filters) {
    super(model, filters);
    this._dataGrid.markColumnAsSortedBy('self', WebInspector.DataGrid.Order.Descending);
  }

  /**
   * @override
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  _buildTree() {
    var topDown = this._buildTopDownTree(this._groupingFunction(this._groupBySetting.get()));
    return WebInspector.TimelineProfileTree.buildBottomUp(topDown);
  }
};

/**
 * @unrestricted
 */
WebInspector.EventsTimelineTreeView = class extends WebInspector.TimelineTreeView {
  /**
   * @param {!WebInspector.TimelineModel} model
   * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
   * @param {!WebInspector.TimelineModeViewDelegate} delegate
   */
  constructor(model, filters, delegate) {
    super();
    this._filtersControl = new WebInspector.TimelineFilters();
    this._filtersControl.addEventListener(
        WebInspector.TimelineFilters.Events.FilterChanged, this._onFilterChanged, this);
    this._init(model, filters);
    this._delegate = delegate;
    this._filters.push.apply(this._filters, this._filtersControl.filters());
    this._dataGrid.markColumnAsSortedBy('startTime', WebInspector.DataGrid.Order.Ascending);
  }

  /**
   * @override
   * @param {!WebInspector.TimelineSelection} selection
   */
  updateContents(selection) {
    super.updateContents(selection);
    if (selection.type() === WebInspector.TimelineSelection.Type.TraceEvent) {
      var event = /** @type {!WebInspector.TracingModel.Event} */ (selection.object());
      this._selectEvent(event, true);
    }
  }

  /**
   * @override
   * @return {!WebInspector.TimelineProfileTree.Node}
   */
  _buildTree() {
    this._currentTree = this._buildTopDownTree();
    return this._currentTree;
  }

  _onFilterChanged() {
    var selectedEvent = this._lastSelectedNode && this._lastSelectedNode.event;
    this._refreshTree();
    if (selectedEvent)
      this._selectEvent(selectedEvent, false);
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @return {?WebInspector.TimelineProfileTree.Node}
   */
  _findNodeWithEvent(event) {
    var iterators = [this._currentTree.children.values()];

    while (iterators.length) {
      var iterator = iterators.peekLast().next();
      if (iterator.done) {
        iterators.pop();
        continue;
      }
      var child = /** @type {!WebInspector.TimelineProfileTree.Node} */ (iterator.value);
      if (child.event === event)
        return child;
      if (child.children)
        iterators.push(child.children.values());
    }
    return null;
  }

  /**
   * @param {!WebInspector.TracingModel.Event} event
   * @param {boolean=} expand
   */
  _selectEvent(event, expand) {
    var node = this._findNodeWithEvent(event);
    if (!node)
      return;
    this.selectProfileNode(node, false);
    if (expand)
      this._dataGridNodeForTreeNode(node).expand();
  }

  /**
   * @override
   * @param {!Array<!WebInspector.DataGrid.ColumnDescriptor>} columns
   */
  _populateColumns(columns) {
    columns.push({
      id: 'startTime',
      title: WebInspector.UIString('Start Time'),
      width: '110px',
      fixedWidth: true,
      sortable: true
    });
    super._populateColumns(columns);
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
   * @param {!WebInspector.TimelineProfileTree.Node} node
   * @return {boolean}
   */
  _showDetailsForNode(node) {
    var traceEvent = node.event;
    if (!traceEvent)
      return false;
    WebInspector.TimelineUIUtils.buildTraceEventDetails(
        traceEvent, this._model, this._linkifier, false, showDetails.bind(this));
    return true;

    /**
     * @param {!DocumentFragment} fragment
     * @this {WebInspector.EventsTimelineTreeView}
     */
    function showDetails(fragment) {
      this._detailsView.element.appendChild(fragment);
    }
  }

  /**
   * @override
   * @param {?WebInspector.TimelineProfileTree.Node} node
   */
  _onHover(node) {
    this._delegate.highlightEvent(node && node.event);
  }
};

/**
 * @unrestricted
 */
WebInspector.TimelineStackView = class extends WebInspector.VBox {
  constructor(treeView) {
    super();
    var header = this.element.createChild('div', 'timeline-stack-view-header');
    header.textContent = WebInspector.UIString('Heaviest stack');
    this._treeView = treeView;
    var columns = /** @type {!Array<!WebInspector.DataGrid.ColumnDescriptor>} */ ([
      {id: 'total', title: WebInspector.UIString('Total Time'), fixedWidth: true, width: '110px'},
      {id: 'activity', title: WebInspector.UIString('Activity')}
    ]);
    this._dataGrid = new WebInspector.ViewportDataGrid(columns);
    this._dataGrid.setResizeMethod(WebInspector.DataGrid.ResizeMethod.Last);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._onSelectionChanged, this);
    this._dataGrid.asWidget().show(this.element);
  }

  /**
   * @param {!Array<!WebInspector.TimelineProfileTree.Node>} stack
   * @param {!WebInspector.TimelineProfileTree.Node} selectedNode
   */
  setStack(stack, selectedNode) {
    var rootNode = this._dataGrid.rootNode();
    rootNode.removeChildren();
    var nodeToReveal = null;
    var totalTime = Math.max.apply(Math, stack.map(node => node.totalTime));
    for (var node of stack) {
      var gridNode = new WebInspector.TimelineTreeView.GridNode(node, totalTime, totalTime, totalTime, this._treeView);
      rootNode.appendChild(gridNode);
      if (node === selectedNode)
        nodeToReveal = gridNode;
    }
    nodeToReveal.revealAndSelect();
  }

  /**
   * @return {?WebInspector.TimelineProfileTree.Node}
   */
  selectedTreeNode() {
    var selectedNode = this._dataGrid.selectedNode;
    return selectedNode && /** @type {!WebInspector.TimelineTreeView.GridNode} */ (selectedNode)._profileNode;
  }

  _onSelectionChanged() {
    this.dispatchEventToListeners(WebInspector.TimelineStackView.Events.SelectionChanged);
  }
};

/** @enum {symbol} */
WebInspector.TimelineStackView.Events = {
  SelectionChanged: Symbol('SelectionChanged')
};
