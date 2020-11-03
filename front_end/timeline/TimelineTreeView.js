// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as TimelineModel from '../timeline_model/timeline_model.js';
import * as UI from '../ui/ui.js';

import {PerformanceModel} from './PerformanceModel.js';  // eslint-disable-line no-unused-vars
import {TimelineRegExp} from './TimelineFilters.js';
import {TimelineSelection} from './TimelinePanel.js';  // eslint-disable-line no-unused-vars
import {TimelineUIUtils} from './TimelineUIUtils.js';

/**
 * @unrestricted
 * @implements {UI.SearchableView.Searchable}
 */
export class TimelineTreeView extends UI.Widget.VBox {
  constructor() {
    super();
    /** @type {?PerformanceModel} */
    this._model = null;
    /** @type {?TimelineModel.TimelineModel.Track} */
    this._track = null;
    /** @type {?TimelineModel.TimelineProfileTree.Node} */
    this._tree = null;
    this.element.classList.add('timeline-tree-view');

    /** @type {!Array<!TimelineModel.TimelineProfileTree.Node>} */
    this._searchResults = [];
    /** @type {!Components.Linkifier.Linkifier} */
    this.linkifier;
    /** @type {!DataGrid.SortableDataGrid.SortableDataGrid<!GridNode>} */
    this.dataGrid;
    /** @type {?TimelineModel.TimelineProfileTree.Node} */
    this._lastHoveredProfileNode;
    /** @type {!TimelineRegExp} */
    this._textFilter;
    /** @type {!TimelineModel.TimelineModelFilter.ExclusiveNameFilter} */
    this._taskFilter;
    /** @type {number} */
    this._startTime;
    /** @type {number} */
    this._endTime;
    /** @type {!UI.SplitWidget.SplitWidget} */
    this.splitWidget;
    /** @type {!UI.Widget.Widget} */
    this.detailsView;
    /** @type {!UI.SearchableView.SearchableView} */
    this._searchableView;
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {string}
   */
  static eventNameForSorting(event) {
    if (event.name === TimelineModel.TimelineModel.RecordType.JSFrame) {
      const data = event.args['data'];
      return data['functionName'] + '@' + (data['scriptId'] || data['url'] || '');
    }
    return event.name + ':@' + TimelineModel.TimelineProfileTree.eventURL(event);
  }

  /**
   * @param {!UI.SearchableView.SearchableView} searchableView
   */
  setSearchableView(searchableView) {
    this._searchableView = searchableView;
  }

  /**
   * @param {?PerformanceModel} model
   * @param {?TimelineModel.TimelineModel.Track} track
   */
  setModel(model, track) {
    this._model = model;
    this._track = track;
    this.refreshTree();
  }

  /**
   * @return {string}
   */
  getToolbarInputAccessiblePlaceHolder() {
    return '';
  }

  /**
   * @protected
   * @return {?PerformanceModel} model
   */
  model() {
    return this._model;
  }

  /**
   * @protected
   */
  init() {
    this.linkifier = new Components.Linkifier.Linkifier();

    this._taskFilter =
        new TimelineModel.TimelineModelFilter.ExclusiveNameFilter([TimelineModel.TimelineModel.RecordType.Task]);
    this._textFilter = new TimelineRegExp();

    this._currentThreadSetting = Common.Settings.Settings.instance().createSetting('timelineTreeCurrentThread', 0);
    this._currentThreadSetting.addChangeListener(this.refreshTree, this);

    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([]);
    this.populateColumns(columns);

    this.splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'timelineTreeViewDetailsSplitWidget');
    const mainView = new UI.Widget.VBox();
    const toolbar = new UI.Toolbar.Toolbar('', mainView.element);
    this.populateToolbar(toolbar);

    this.dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid({
      displayName: ls`Performance`,
      columns,
      refreshCallback: undefined,
      editCallback: undefined,
      deleteCallback: undefined
    });
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    this.dataGrid.element.addEventListener('mousemove', this._onMouseMove.bind(this), true);
    this.dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this.dataGrid.setRowContextMenuCallback(this._onContextMenu.bind(this));
    this.dataGrid.asWidget().show(mainView.element);
    this.dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._updateDetailsForSelection, this);

    this.detailsView = new UI.Widget.VBox();
    this.detailsView.element.classList.add('timeline-details-view', 'timeline-details-view-body');
    this.splitWidget.setMainWidget(mainView);
    this.splitWidget.setSidebarWidget(this.detailsView);
    this.splitWidget.hideSidebar();
    this.splitWidget.show(this.element);
    this.splitWidget.addEventListener(UI.SplitWidget.Events.ShowModeChanged, this._onShowModeChanged, this);

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
   * @param {!TimelineSelection} selection
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
   * @protected
   * @return {!Array<!TimelineModel.TimelineModelFilter.TimelineModelFilter>}
   */
  filters() {
    return [this._taskFilter, this._textFilter, ...(this._model ? this._model.filters() : [])];
  }

  /**
   * @protected
   * @return {!Array<!TimelineModel.TimelineModelFilter.TimelineModelFilter>}
   */
  filtersWithoutTextFilter() {
    return [this._taskFilter, ...(this._model ? this._model.filters() : [])];
  }

  /**
   * @protected
   * @return {!TimelineRegExp}
   */
  textFilter() {
    return this._textFilter;
  }

  /**
   * @return {boolean}
   */
  _exposePercentages() {
    return false;
  }

  /**
   * @protected
   * @param {!UI.Toolbar.Toolbar} toolbar
   */
  populateToolbar(toolbar) {
    const textFilterUI =
        new UI.Toolbar.ToolbarInput(Common.UIString.UIString('Filter'), this.getToolbarInputAccessiblePlaceHolder());
    textFilterUI.addEventListener(UI.Toolbar.ToolbarInput.Event.TextChanged, () => {
      const searchQuery = textFilterUI.value();
      this._textFilter.setRegExp(searchQuery ? createPlainTextSearchRegex(searchQuery, 'i') : null);
      this.refreshTree();
    }, this);
    this._textFilterUI = textFilterUI;
    toolbar.appendToolbarItem(textFilterUI);
  }

  /**
   * @return {!Array<!SDK.TracingModel.Event>}
   */
  _modelEvents() {
    return this._track ? this._track.syncEvents() : [];
  }

  /**
   * @param {?TimelineModel.TimelineProfileTree.Node} node
   */
  _onHover(node) {
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   */
  _appendContextMenuItems(contextMenu, node) {
  }

  /**
   * @param {!SDK.TracingModel.Event} event
   * @return {?Element}
   */
  _linkifyLocation(event) {
    if (!this._model) {
      return null;
    }
    const target = this._model.timelineModel().targetByEvent(event);
    if (!target) {
      return null;
    }
    const frame = TimelineModel.TimelineProfileTree.eventStackFrame(event);
    if (!frame) {
      return null;
    }
    return this.linkifier.maybeLinkifyConsoleCallFrame(target, frame);
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} treeNode
   * @param {boolean} suppressSelectedEvent
   */
  selectProfileNode(treeNode, suppressSelectedEvent) {
    const pathToRoot = [];
    /** @type {?TimelineModel.TimelineProfileTree.Node} */
    let node = treeNode;
    for (; node; node = node.parent) {
      pathToRoot.push(node);
    }
    for (let i = pathToRoot.length - 1; i > 0; --i) {
      const gridNode = this.dataGridNodeForTreeNode(pathToRoot[i]);
      if (gridNode && gridNode.dataGrid) {
        gridNode.expand();
      }
    }
    const gridNode = this.dataGridNodeForTreeNode(treeNode);
    if (gridNode && gridNode.dataGrid) {
      gridNode.reveal();
      gridNode.select(suppressSelectedEvent);
    }
  }

  /**
   * @protected
   */
  refreshTree() {
    this.linkifier.reset();
    this.dataGrid.rootNode().removeChildren();
    if (!this._model) {
      this._updateDetailsForSelection();
      return;
    }
    this._root = this._buildTree();
    const children = this._root.children();
    let maxSelfTime = 0;
    let maxTotalTime = 0;
    const totalUsedTime = this._root.totalTime - this._root.selfTime;
    for (const child of children.values()) {
      maxSelfTime = Math.max(maxSelfTime, child.selfTime);
      maxTotalTime = Math.max(maxTotalTime, child.totalTime);
    }
    for (const child of children.values()) {
      // Exclude the idle time off the total calculation.
      const gridNode = new TreeGridNode(child, totalUsedTime, maxSelfTime, maxTotalTime, this);
      this.dataGrid.insertChild(gridNode);
    }
    this._sortingChanged();
    this._updateDetailsForSelection();
    if (this._searchableView) {
      this._searchableView.refreshSearch();
    }
    const rootNode = this.dataGrid.rootNode();
    if (rootNode.children.length > 0) {
      rootNode.children[0].select(/* supressSelectedEvent */ true);
    }
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
        this._modelEvents(), this.filters(), this._startTime, this._endTime, doNotAggregate, groupIdCallback);
  }

  /**
   * @protected
   * @param {!Array<!DataGrid.DataGrid.ColumnDescriptor>} columns
   */
  populateColumns(columns) {
    columns.push(
        /** @type {!DataGrid.DataGrid.ColumnDescriptor} */ ({
          id: 'self',
          title: Common.UIString.UIString('Self Time'),
          width: '120px',
          fixedWidth: true,
          sortable: true
        }));
    columns.push(
        /** @type {!DataGrid.DataGrid.ColumnDescriptor} */ ({
          id: 'total',
          title: Common.UIString.UIString('Total Time'),
          width: '120px',
          fixedWidth: true,
          sortable: true
        }));
    columns.push(/** @type {!DataGrid.DataGrid.ColumnDescriptor} */ (
        {id: 'activity', title: Common.UIString.UIString('Activity'), disclosure: true, sortable: true}));
  }

  _sortingChanged() {
    const columnId = this.dataGrid.sortColumnId();
    if (!columnId) {
      return;
    }
    let sortFunction;
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
    this.dataGrid.sortNodes(sortFunction, !this.dataGrid.isSortOrderAscending());

    /**
     * @param {string} field
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} a
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} b
     * @return {number}
     */
    function compareNumericField(field, a, b) {
      const nodeA = /** @type {!TreeGridNode} */ (a);
      const nodeB = /** @type {!TreeGridNode} */ (b);
      return /** @type {*} */ (nodeA._profileNode)[field] - /** @type {*} */ (nodeB._profileNode)[field];
    }

    /**
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} a
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} b
     * @return {number}
     */
    function compareStartTime(a, b) {
      const nodeA = /** @type {!TreeGridNode} */ (a);
      const nodeB = /** @type {!TreeGridNode} */ (b);
      const eventA = /** @type {!SDK.TracingModel.Event} */ (nodeA._profileNode.event);
      const eventB = /** @type {!SDK.TracingModel.Event} */ (nodeB._profileNode.event);
      return eventA.startTime - eventB.startTime;
    }

    /**
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} a
     * @param {!DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>} b
     * @return {number}
     */
    function compareName(a, b) {
      const nodeA = /** @type {!TreeGridNode} */ (a);
      const nodeB = /** @type {!TreeGridNode} */ (b);
      const eventA = /** @type {!SDK.TracingModel.Event} */ (nodeA._profileNode.event);
      const eventB = /** @type {!SDK.TracingModel.Event} */ (nodeB._profileNode.event);
      const nameA = TimelineTreeView.eventNameForSorting(eventA);
      const nameB = TimelineTreeView.eventNameForSorting(eventB);
      return nameA.localeCompare(nameB);
    }
  }

  _onShowModeChanged() {
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain) {
      return;
    }
    this._lastSelectedNode = undefined;
    this._updateDetailsForSelection();
  }

  _updateDetailsForSelection() {
    const selectedNode = this.dataGrid.selectedNode ?
        /** @type {!TreeGridNode} */ (this.dataGrid.selectedNode)._profileNode :
        null;
    if (selectedNode === this._lastSelectedNode) {
      return;
    }
    this._lastSelectedNode = selectedNode;
    if (this.splitWidget.showMode() === UI.SplitWidget.ShowMode.OnlyMain) {
      return;
    }
    this.detailsView.detachChildWidgets();
    this.detailsView.element.removeChildren();
    if (selectedNode && this._showDetailsForNode(selectedNode)) {
      return;
    }
    const banner = this.detailsView.element.createChild('div', 'full-widget-dimmed-banner');
    UI.UIUtils.createTextChild(banner, Common.UIString.UIString('Select item for details.'));
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
    const gridNode = event.target && (event.target instanceof Node) ?
        /** @type {?TreeGridNode} */ (this.dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target))) :
        null;
    const profileNode = gridNode && gridNode._profileNode;
    if (profileNode === this._lastHoveredProfileNode) {
      return;
    }
    this._lastHoveredProfileNode = profileNode;
    this._onHover(profileNode);
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!DataGrid.DataGrid.DataGridNode<!GridNode>} eventGridNode
   */
  _onContextMenu(contextMenu, eventGridNode) {
    const gridNode = /** @type {!GridNode} */ (eventGridNode);
    if (gridNode._linkElement && !contextMenu.containsTarget(gridNode._linkElement)) {
      contextMenu.appendApplicableItems(gridNode._linkElement);
    }
    const profileNode = gridNode._profileNode;
    if (profileNode) {
      this._appendContextMenuItems(contextMenu, profileNode);
    }
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} treeNode
   * @protected
   * @return {?GridNode}
   */
  dataGridNodeForTreeNode(treeNode) {
    return profileNodeToTreeGridNode.get(treeNode) || null;
  }

  // UI.SearchableView.Searchable implementation

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
    if (!this._root) {
      return;
    }
    const searchRegex = searchConfig.toSearchRegex();
    this._searchResults = this._root.searchTree(event => TimelineUIUtils.testContentMatching(event, searchRegex));
    this._searchableView.updateSearchMatchesCount(this._searchResults.length);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._searchResults.length) {
      return;
    }
    this.selectProfileNode(this._searchResults[this._currentResult], false);
    this._currentResult = Platform.NumberUtilities.mod(this._currentResult + 1, this._searchResults.length);
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._searchResults.length) {
      return;
    }
    this.selectProfileNode(this._searchResults[this._currentResult], false);
    this._currentResult = Platform.NumberUtilities.mod(this._currentResult - 1, this._searchResults.length);
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
}

/**
 * @extends {DataGrid.SortableDataGrid.SortableDataGridNode<!GridNode>}
 */
export class GridNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} profileNode
   * @param {number} grandTotalTime
   * @param {number} maxSelfTime
   * @param {number} maxTotalTime
   * @param {!TimelineTreeView} treeView
   */
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(null, false);
    this._populated = false;
    this._profileNode = profileNode;
    this._treeView = treeView;
    this._grandTotalTime = grandTotalTime;
    this._maxSelfTime = maxSelfTime;
    this._maxTotalTime = maxTotalTime;
    this._linkElement = null;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!HTMLElement}
   */
  createCell(columnId) {
    if (columnId === 'activity') {
      return this._createNameCell(columnId);
    }
    return this._createValueCell(columnId) || super.createCell(columnId);
  }

  /**
   * @param {string} columnId
   * @return {!HTMLElement}
   */
  _createNameCell(columnId) {
    const cell = this.createTD(columnId);
    const container = cell.createChild('div', 'name-container');
    const iconContainer = container.createChild('div', 'activity-icon-container');
    const icon = iconContainer.createChild('div', 'activity-icon');
    const name = container.createChild('div', 'activity-name');
    const event = this._profileNode.event;
    if (this._profileNode.isGroupNode()) {
      const treeView = /** @type {!AggregatedTimelineTreeView} */ (this._treeView);
      const info = treeView._displayInfoForGroupNode(this._profileNode);
      name.textContent = info.name;
      icon.style.backgroundColor = info.color;
      if (info.icon) {
        iconContainer.insertBefore(info.icon, icon);
      }
    } else if (event) {
      const data = event.args['data'];
      const deoptReason = data && data['deoptReason'];
      if (deoptReason) {
        container.createChild('div', 'activity-warning').title =
            Common.UIString.UIString('Not optimized: %s', deoptReason);
      }

      name.textContent = TimelineUIUtils.eventTitle(event);
      this._linkElement = this._treeView._linkifyLocation(event);
      if (this._linkElement) {
        container.createChild('div', 'activity-link').appendChild(this._linkElement);
      }
      const eventStyle = TimelineUIUtils.eventStyle(event);
      const eventCategory = eventStyle.category;
      UI.ARIAUtils.setAccessibleName(icon, eventCategory.title);
      icon.style.backgroundColor = eventCategory.color;
    }
    return cell;
  }

  /**
   * @param {string} columnId
   * @return {?HTMLElement}
   */
  _createValueCell(columnId) {
    if (columnId !== 'self' && columnId !== 'total' && columnId !== 'startTime') {
      return null;
    }

    let showPercents = false;
    /** @type {number} */
    let value;
    /** @type {number|undefined} */
    let maxTime;
    /** @type {?SDK.TracingModel.Event} */
    let event;
    switch (columnId) {
      case 'startTime':
        event = this._profileNode.event;
        if (!this._treeView._model) {
          throw new Error('Unable to find model for tree view');
        }
        value = (event ? event.startTime : 0) - this._treeView._model.timelineModel().minimumRecordTime();
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
    const cell = this.createTD(columnId);
    cell.className = 'numeric-column';
    const textDiv = cell.createChild('div');
    textDiv.createChild('span').textContent = Common.UIString.UIString('%.1f\xa0ms', value);

    if (showPercents && this._treeView._exposePercentages()) {
      textDiv.createChild('span', 'percent-column').textContent =
          Common.UIString.UIString('%.1f\xa0%%', value / this._grandTotalTime * 100);
    }
    if (maxTime) {
      textDiv.classList.add('background-percent-bar');
      cell.createChild('div', 'background-bar-container').createChild('div', 'background-bar').style.width =
          (value * 100 / maxTime).toFixed(1) + '%';
    }
    return cell;
  }
}

/**
 * @unrestricted
 */
export class TreeGridNode extends GridNode {
  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} profileNode
   * @param {number} grandTotalTime
   * @param {number} maxSelfTime
   * @param {number} maxTotalTime
   * @param {!TimelineTreeView} treeView
   */
  constructor(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView) {
    super(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.setHasChildren(this._profileNode.hasChildren());
    profileNodeToTreeGridNode.set(profileNode, this);
  }

  /**
   * @override
   */
  populate() {
    if (this._populated) {
      return;
    }
    this._populated = true;
    if (!this._profileNode.children) {
      return;
    }
    for (const node of this._profileNode.children().values()) {
      const gridNode =
          new TreeGridNode(node, this._grandTotalTime, this._maxSelfTime, this._maxTotalTime, this._treeView);
      this.insertChildOrdered(gridNode);
    }
  }
}

TreeGridNode._gridNodeSymbol = Symbol('treeGridNode');

/** @type {!WeakMap<!TimelineModel.TimelineProfileTree.Node, !TreeGridNode>} */
const profileNodeToTreeGridNode = new WeakMap();

/**
 * @unrestricted
 */
export class AggregatedTimelineTreeView extends TimelineTreeView {
  constructor() {
    super();
    this._groupBySetting = Common.Settings.Settings.instance().createSetting(
        'timelineTreeGroupBy', AggregatedTimelineTreeView.GroupBy.None);
    this._groupBySetting.addChangeListener(this.refreshTree.bind(this));
    this.init();
    this._stackView = new TimelineStackView(this);
    this._stackView.addEventListener(
        TimelineStackView.Events.SelectionChanged, this._onStackViewSelectionChanged, this);
    /** @type {!Map<string, string>} */
    this._productByURLCache = new Map();
    /** @type {!Map<string, string>} */
    this._colorByURLCache = new Map();
    this._executionContextNamesByOrigin = new Map();
  }

  /**
   * @override
   * @param {?PerformanceModel} model
   * @param {?TimelineModel.TimelineModel.Track} track
   */
  setModel(model, track) {
    super.setModel(model, track);
  }

  /**
   * @override
   * @param {!TimelineSelection} selection
   */
  updateContents(selection) {
    this._updateExtensionResolver();
    super.updateContents(selection);
    const rootNode = this.dataGrid.rootNode();
    if (rootNode.children.length) {
      rootNode.children[0].select(/* suppressSelectedEvent */ true);
    }
  }

  _updateExtensionResolver() {
    this._executionContextNamesByOrigin = new Map();
    for (const runtimeModel of SDK.SDKModel.TargetManager.instance().models(SDK.RuntimeModel.RuntimeModel)) {
      for (const context of runtimeModel.executionContexts()) {
        this._executionContextNamesByOrigin.set(context.origin, context.name);
      }
    }
  }

  /**
   * @param {string} name
   * @return {string}
   * @this {AggregatedTimelineTreeView}
   */
  _beautifyDomainName(name) {
    if (AggregatedTimelineTreeView._isExtensionInternalURL(name)) {
      name = Common.UIString.UIString('[Chrome extensions overhead]');
    } else if (AggregatedTimelineTreeView._isV8NativeURL(name)) {
      name = Common.UIString.UIString('[V8 Runtime]');
    } else if (name.startsWith('chrome-extension')) {
      name = this._executionContextNamesByOrigin.get(name) || name;
    }
    return name;
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   * @return {!{name: string, color: string, icon: (!Element|undefined)}}
   */
  _displayInfoForGroupNode(node) {
    const categories = TimelineUIUtils.categories();
    const color = node.id ? TimelineUIUtils.eventColor(/** @type {!SDK.TracingModel.Event} */ (node.event)) :
                            categories['other'].color;
    const unattributed = Common.UIString.UIString('[unattributed]');

    const id = typeof node.id === 'symbol' ? undefined : node.id;

    switch (this._groupBySetting.get()) {
      case AggregatedTimelineTreeView.GroupBy.Category: {
        const category = id ? categories[id] || categories['other'] : {title: unattributed, color: unattributed};
        return {name: category.title, color: category.color, icon: undefined};
      }

      case AggregatedTimelineTreeView.GroupBy.Domain:
      case AggregatedTimelineTreeView.GroupBy.Subdomain: {
        const domainName = id ? this._beautifyDomainName(id) : undefined;
        return {name: domainName || unattributed, color: color, icon: undefined};
      }

      case AggregatedTimelineTreeView.GroupBy.EventName: {
        if (!node.event) {
          throw new Error('Unable to find event for group by operation');
        }
        const name = node.event.name === TimelineModel.TimelineModel.RecordType.JSFrame ?
            Common.UIString.UIString('JavaScript') :
            TimelineUIUtils.eventTitle(node.event);
        return {
          name: name,
          color: node.event.name === TimelineModel.TimelineModel.RecordType.JSFrame ?
              TimelineUIUtils.eventStyle(node.event).category.color :
              color,
          icon: undefined,
        };
      }

      case AggregatedTimelineTreeView.GroupBy.URL:
        break;

      case AggregatedTimelineTreeView.GroupBy.Frame: {
        if (!this._model) {
          throw new Error('Unable to find model for group by frame operation');
        }
        const frame = id ? this._model.timelineModel().pageFrameById(id) : undefined;
        const frameName = frame ? TimelineUIUtils.displayNameForFrame(frame, 80) : Common.UIString.UIString('Page');
        return {name: frameName, color: color, icon: undefined};
      }

      default:
        console.assert(false, 'Unexpected grouping type');
    }
    return {name: id || unattributed, color: color, icon: undefined};
  }

  /**
   * @override
   * @param {!UI.Toolbar.Toolbar} toolbar
   */
  populateToolbar(toolbar) {
    super.populateToolbar(toolbar);
    const groupBy = AggregatedTimelineTreeView.GroupBy;
    const options = [
      {label: Common.UIString.UIString('No Grouping'), value: groupBy.None},
      {label: Common.UIString.UIString('Group by Activity'), value: groupBy.EventName},
      {label: Common.UIString.UIString('Group by Category'), value: groupBy.Category},
      {label: Common.UIString.UIString('Group by Domain'), value: groupBy.Domain},
      {label: Common.UIString.UIString('Group by Frame'), value: groupBy.Frame},
      {label: Common.UIString.UIString('Group by Subdomain'), value: groupBy.Subdomain},
      {label: Common.UIString.UIString('Group by URL'), value: groupBy.URL},
    ];
    toolbar.appendToolbarItem(new UI.Toolbar.ToolbarSettingComboBox(options, this._groupBySetting, ls`Group by`));
    toolbar.appendSpacer();
    toolbar.appendToolbarItem(this.splitWidget.createShowHideSidebarButton(Common.UIString.UIString('heaviest stack')));
  }

  /**
   * @param {!TimelineModel.TimelineProfileTree.Node} treeNode
   * @return {!Array<!TimelineModel.TimelineProfileTree.Node>}
   */
  _buildHeaviestStack(treeNode) {
    console.assert(!!treeNode.parent, 'Attempt to build stack for tree root');
    let result = [];
    // Do not add root to the stack, as it's the tree itself.
    for (let node = treeNode; node && node.parent; node = node.parent) {
      result.push(node);
    }
    result = result.reverse();
    for (let node = treeNode; node && node.children() && node.children().size;) {
      const children = Array.from(node.children().values());
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
    const treeNode = this._stackView.selectedTreeNode();
    if (treeNode) {
      this.selectProfileNode(treeNode, true);
    }
  }

  /**
   * @override
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   * @return {boolean}
   */
  _showDetailsForNode(node) {
    const stack = this._buildHeaviestStack(node);
    this._stackView.setStack(stack, node);
    this._stackView.show(this.detailsView.element);
    return true;
  }

  /**
   * @param {!AggregatedTimelineTreeView.GroupBy} groupBy
   * @return {?function(!SDK.TracingModel.Event):string}
   */
  _groupingFunction(groupBy) {
    const GroupBy = AggregatedTimelineTreeView.GroupBy;
    switch (groupBy) {
      case GroupBy.None:
        return null;
      case GroupBy.EventName:
        return event => TimelineUIUtils.eventStyle(event).title;
      case GroupBy.Category:
        return event => TimelineUIUtils.eventStyle(event).category.name;
      case GroupBy.Subdomain:
        return this._domainByEvent.bind(this, false);
      case GroupBy.Domain:
        return this._domainByEvent.bind(this, true);
      case GroupBy.URL:
        return event => TimelineModel.TimelineProfileTree.eventURL(event) || '';
      case GroupBy.Frame:
        return event => TimelineModel.TimelineModel.TimelineData.forEvent(event).frameId;
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
    const url = TimelineModel.TimelineProfileTree.eventURL(event);
    if (!url) {
      return '';
    }
    if (AggregatedTimelineTreeView._isExtensionInternalURL(url)) {
      return AggregatedTimelineTreeView._extensionInternalPrefix;
    }
    if (AggregatedTimelineTreeView._isV8NativeURL(url)) {
      return AggregatedTimelineTreeView._v8NativePrefix;
    }
    const parsedURL = Common.ParsedURL.ParsedURL.fromString(url);
    if (!parsedURL) {
      return '';
    }
    if (parsedURL.scheme === 'chrome-extension') {
      return parsedURL.scheme + '://' + parsedURL.host;
    }
    if (!groupSubdomains) {
      return parsedURL.host;
    }
    if (/^[.0-9]+$/.test(parsedURL.host)) {
      return parsedURL.host;
    }
    const domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
    return domainMatch && domainMatch[0] || '';
  }

  /**
   * @override
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!TimelineModel.TimelineProfileTree.Node} node
   */
  _appendContextMenuItems(contextMenu, node) {
    if (this._groupBySetting.get() !== AggregatedTimelineTreeView.GroupBy.Frame) {
      return;
    }
    if (!node.isGroupNode()) {
      return;
    }
    if (!this._model) {
      return;
    }
    const frame = this._model.timelineModel().pageFrameById(/** @type {string} */ (node.id));
    if (!frame || !frame.ownerNode) {
      return;
    }
    contextMenu.appendApplicableItems(frame.ownerNode);
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  static _isExtensionInternalURL(url) {
    return url.startsWith(AggregatedTimelineTreeView._extensionInternalPrefix);
  }

  /**
   * @param {string} url
   * @return {boolean}
   */
  static _isV8NativeURL(url) {
    return url.startsWith(AggregatedTimelineTreeView._v8NativePrefix);
  }
}

AggregatedTimelineTreeView._extensionInternalPrefix = 'extensions::';
AggregatedTimelineTreeView._v8NativePrefix = 'native ';

/**
 * @enum {string}
 */
AggregatedTimelineTreeView.GroupBy = {
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
export class CallTreeTimelineTreeView extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.dataGrid.markColumnAsSortedBy('total', DataGrid.DataGrid.Order.Descending);
  }

  /**
   * @override
   * @return {string}
   */
  getToolbarInputAccessiblePlaceHolder() {
    return ls`Filter call tree`;
  }

  /**
   * @override
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildTree() {
    const grouping = this._groupBySetting.get();
    return this.buildTopDownTree(false, this._groupingFunction(grouping));
  }
}

/**
 * @unrestricted
 */
export class BottomUpTimelineTreeView extends AggregatedTimelineTreeView {
  constructor() {
    super();
    this.dataGrid.markColumnAsSortedBy('self', DataGrid.DataGrid.Order.Descending);
  }

  /**
   * @override
   * @return {string}
   */
  getToolbarInputAccessiblePlaceHolder() {
    return ls`Filter bottom-up`;
  }

  /**
   * @override
   * @return {!TimelineModel.TimelineProfileTree.Node}
   */
  _buildTree() {
    return new TimelineModel.TimelineProfileTree.BottomUpRootNode(
        this._modelEvents(), this.textFilter(), this.filtersWithoutTextFilter(), this._startTime, this._endTime,
        this._groupingFunction(this._groupBySetting.get()));
  }
}

/**
 * @unrestricted
 */
export class TimelineStackView extends UI.Widget.VBox {
  /**
   * @param {!TimelineTreeView} treeView
   */
  constructor(treeView) {
    super();
    const header = this.element.createChild('div', 'timeline-stack-view-header');
    header.textContent = Common.UIString.UIString('Heaviest stack');
    this._treeView = treeView;
    const columns = /** @type {!Array<!DataGrid.DataGrid.ColumnDescriptor>} */ ([
      {id: 'total', title: Common.UIString.UIString('Total Time'), fixedWidth: true, width: '110px'},
      {id: 'activity', title: Common.UIString.UIString('Activity')}
    ]);
    this._dataGrid = new DataGrid.ViewportDataGrid.ViewportDataGrid({
      displayName: ls`Timeline Stack`,
      columns,
      deleteCallback: undefined,
      editCallback: undefined,
      refreshCallback: undefined
    });
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SelectedNode, this._onSelectionChanged, this);
    this._dataGrid.asWidget().show(this.element);
  }

  /**
   * @param {!Array<!TimelineModel.TimelineProfileTree.Node>} stack
   * @param {!TimelineModel.TimelineProfileTree.Node} selectedNode
   */
  setStack(stack, selectedNode) {
    const rootNode = this._dataGrid.rootNode();
    rootNode.removeChildren();
    let nodeToReveal = null;
    const totalTime = Math.max.apply(Math, stack.map(node => node.totalTime));
    for (const node of stack) {
      const gridNode = new GridNode(node, totalTime, totalTime, totalTime, this._treeView);
      rootNode.appendChild(gridNode);
      if (node === selectedNode) {
        nodeToReveal = gridNode;
      }
    }
    if (nodeToReveal) {
      nodeToReveal.revealAndSelect();
    }
  }

  /**
   * @return {?TimelineModel.TimelineProfileTree.Node}
   */
  selectedTreeNode() {
    const selectedNode = this._dataGrid.selectedNode;
    return selectedNode && /** @type {!GridNode} */ (selectedNode)._profileNode;
  }

  _onSelectionChanged() {
    this.dispatchEventToListeners(TimelineStackView.Events.SelectionChanged);
  }
}

/** @enum {symbol} */
TimelineStackView.Events = {
  SelectionChanged: Symbol('SelectionChanged')
};
