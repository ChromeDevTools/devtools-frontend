// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/ui.js';

import {NetworkNode, NetworkRequestNode} from './NetworkDataGridNode.js';  // eslint-disable-line no-unused-vars
import {NetworkLogView} from './NetworkLogView.js';                        // eslint-disable-line no-unused-vars
import {NetworkManageCustomHeadersView} from './NetworkManageCustomHeadersView.js';
import {NetworkTimeCalculator, NetworkTransferDurationCalculator, NetworkTransferTimeCalculator,} from './NetworkTimeCalculator.js';  // eslint-disable-line no-unused-vars
import {NetworkWaterfallColumn} from './NetworkWaterfallColumn.js';
import {RequestInitiatorView} from './RequestInitiatorView.js';

export const UIStrings = {
  /**
  *@description Data grid name for Network Log data grids
  */
  networkLog: 'Network Log',
  /**
  *@description Inner element text content in Network Log View Columns of the Network panel
  */
  waterfall: 'Waterfall',
  /**
  *@description A context menu item in the Network Log View Columns of the Network panel
  */
  responseHeaders: 'Response Headers',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  manageHeaderColumns: 'Manage Header Columns…',
  /**
  *@description Text for the start time of an activity
  */
  startTime: 'Start Time',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  responseTime: 'Response Time',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  endTime: 'End Time',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  totalDuration: 'Total Duration',
  /**
  *@description Text for the latency of a task
  */
  latency: 'Latency',
  /**
  *@description Text for the name of something
  */
  name: 'Name',
  /**
  *@description Text that refers to a file path
  */
  path: 'Path',
  /**
  *@description Text in Timeline UIUtils of the Performance panel
  */
  url: 'Url',
  /**
  *@description Text for one or a group of functions
  */
  method: 'Method',
  /**
  *@description Text for the status of something
  */
  status: 'Status',
  /**
  *@description Generic label for any text
  */
  text: 'Text',
  /**
  *@description Text for security or network protocol
  */
  protocol: 'Protocol',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  scheme: 'Scheme',
  /**
  *@description Text for the domain of a website
  */
  domain: 'Domain',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  remoteAddress: 'Remote Address',
  /**
  *@description Text that refers to some types
  */
  type: 'Type',
  /**
  *@description Text for the initiator of something
  */
  initiator: 'Initiator',
  /**
  *@description Column header in the Network log view of the Network panel
  */
  initiatorAddressSpace: 'Initiator Address Space',
  /**
  *@description Text for web cookies
  */
  cookies: 'Cookies',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  setCookies: 'Set Cookies',
  /**
  *@description Text for the size of something
  */
  size: 'Size',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  content: 'Content',
  /**
  *@description Text that refers to the time
  */
  time: 'Time',
  /**
  *@description Text to show the priority of an item
  */
  priority: 'Priority',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  connectionId: 'Connection ID',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  cachecontrol: '`Cache-Control`',
  /**
  *@description Text that only contain a placeholder
  *@example {100ms (at 200ms)} PH1
  */
  s: '{PH1}',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  contentencoding: '`Content-Encoding`',
  /**
  *@description Text for the network request Content-Length header
  */
  contentlength: '`Content-Length`',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  etag: '`ETag`',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  keepalive: '`Keep-Alive`',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  lastmodified: '`Last-Modified`',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  server: '`Server`',
  /**
  *@description Text in Network Log View Columns of the Network panel
  */
  vary: '`Vary`',
};
const str_ = i18n.i18n.registerUIStrings('network/NetworkLogViewColumns.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkLogViewColumns {
  /**
   * @param {!NetworkLogView} networkLogView
   * @param {!NetworkTransferTimeCalculator} timeCalculator
   * @param {!NetworkTransferDurationCalculator} durationCalculator
   * @param {!Common.Settings.Setting<number>} networkLogLargeRowsSetting
   */
  constructor(networkLogView, timeCalculator, durationCalculator, networkLogLargeRowsSetting) {
    this._networkLogView = networkLogView;

    /** @type {!Common.Settings.Setting<!Object<string, !{visible:boolean, title:string}>>} */
    this._persistantSettings = Common.Settings.Settings.instance().createSetting('networkLogColumns', {});

    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this._networkLogLargeRowsSetting.addChangeListener(this._updateRowsSize, this);

    /** @type {!Map<string, !Array<number>>} */
    this._eventDividers = new Map();
    this._eventDividersShown = false;

    this._gridMode = true;

    /** @type {!Array.<!Descriptor>} */
    this._columns = [];

    this._waterfallRequestsAreStale = false;
    this._waterfallScrollerWidthIsStale = true;

    /** @type {!Components.Linkifier.Linkifier} */
    this._popupLinkifier = new Components.Linkifier.Linkifier();

    /** @type {!Map<string, !NetworkTimeCalculator>} */
    this._calculatorsMap = new Map();
    this._calculatorsMap.set(_calculatorTypes.Time, timeCalculator);
    this._calculatorsMap.set(_calculatorTypes.Duration, durationCalculator);

    this._lastWheelTime = 0;

    // The following properties are set by the setupDataGrid and setupWaterfall
    // methods and are guaranteed to be non-null.

    /** @type {!DataGrid.SortableDataGrid.SortableDataGrid<!NetworkNode>} */
    this._dataGrid;

    /** @type {!UI.SplitWidget.SplitWidget} */
    this._splitWidget;

    /** @type {!NetworkWaterfallColumn} */
    this._waterfallColumn;

    /** @type {!Element} */
    this._activeScroller;

    /** @type {!HTMLElement} */
    this._dataGridScroller;

    /** @type {!HTMLElement} */
    this._waterfallScroller;

    /** @type {!HTMLDivElement} */
    this._waterfallScrollerContent;

    /** @type {!HTMLElement} */
    this._waterfallHeaderElement;

    /** @type {!UI.Icon.Icon} */
    this._waterfallColumnSortIcon;

    /** @type {string} */
    this._activeWaterfallSortId;

    this._setupDataGrid();
    this._setupWaterfall();
  }

  /**
   * @param {!Descriptor} columnConfig
   * @return {!DataGrid.DataGrid.ColumnDescriptor}
   */
  static _convertToDataGridDescriptor(columnConfig) {
    return /** @type {!DataGrid.DataGrid.ColumnDescriptor} */ ({
      id: columnConfig.id,
      title: columnConfig.title,
      sortable: columnConfig.sortable,
      align: columnConfig.align,
      nonSelectable: columnConfig.nonSelectable,
      weight: columnConfig.weight,
      allowInSortByEvenWhenHidden: columnConfig.allowInSortByEvenWhenHidden,
    });
  }

  wasShown() {
    this._updateRowsSize();
  }

  willHide() {
    if (this._popoverHelper) {
      this._popoverHelper.hidePopover();
    }
  }

  reset() {
    if (this._popoverHelper) {
      this._popoverHelper.hidePopover();
    }
    this._eventDividers.clear();
  }

  _setupDataGrid() {
    const defaultColumns = _defaultColumns;
    const defaultColumnConfig = _defaultColumnConfig;

    this._columns = /** @type {!Array<!Descriptor>} */ ([]);
    for (const currentConfigColumn of defaultColumns) {
      const descriptor = Object.assign({}, defaultColumnConfig, currentConfigColumn);
      const columnConfig = /** @type {!Descriptor} */ (descriptor);
      columnConfig.id = columnConfig.id;
      if (columnConfig.subtitle) {
        columnConfig.titleDOMFragment = this._makeHeaderFragment(columnConfig.title, columnConfig.subtitle);
      }
      this._columns.push(columnConfig);
    }
    this._loadCustomColumnsAndSettings();

    this._popoverHelper =
        new UI.PopoverHelper.PopoverHelper(this._networkLogView.element, this._getPopoverRequest.bind(this));
    this._popoverHelper.setHasPadding(true);
    this._popoverHelper.setTimeout(300, 300);

    this._dataGrid = new DataGrid.SortableDataGrid.SortableDataGrid(/** @type {!DataGrid.DataGrid.Parameters} */ ({
      displayName: /** @type {string} */ (i18nString(UIStrings.networkLog)),
      columns: this._columns.map(NetworkLogViewColumns._convertToDataGridDescriptor)
    }));
    this._dataGrid.element.addEventListener('mousedown', event => {
      if (!this._dataGrid.selectedNode && event.button) {
        event.consume();
      }
    }, true);

    this._dataGridScroller = /** @type {!HTMLDivElement} */ (this._dataGrid.scrollContainer);

    this._updateColumns();
    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.SortingChanged, this._sortHandler, this);
    this._dataGrid.setHeaderContextMenuCallback(this._innerHeaderContextMenu.bind(this));

    this._activeWaterfallSortId = WaterfallSortIds.StartTime;
    this._dataGrid.markColumnAsSortedBy(_initialSortColumn, DataGrid.DataGrid.Order.Ascending);

    this._splitWidget = new UI.SplitWidget.SplitWidget(true, true, 'networkPanelSplitViewWaterfall', 200);
    const widget = this._dataGrid.asWidget();
    widget.setMinimumSize(150, 0);
    this._splitWidget.setMainWidget(widget);
  }

  _setupWaterfall() {
    this._waterfallColumn = new NetworkWaterfallColumn(this._networkLogView.calculator());

    this._waterfallColumn.element.addEventListener('contextmenu', handleContextMenu.bind(this));
    this._waterfallColumn.element.addEventListener('wheel', this._onMouseWheel.bind(this, false), {passive: true});
    this._waterfallColumn.element.addEventListener('touchstart', this._onTouchStart.bind(this));
    this._waterfallColumn.element.addEventListener('touchmove', this._onTouchMove.bind(this));
    this._waterfallColumn.element.addEventListener('touchend', this._onTouchEnd.bind(this));

    this._dataGridScroller.addEventListener('wheel', this._onMouseWheel.bind(this, true), true);
    this._dataGridScroller.addEventListener('touchstart', this._onTouchStart.bind(this));
    this._dataGridScroller.addEventListener('touchmove', this._onTouchMove.bind(this));
    this._dataGridScroller.addEventListener('touchend', this._onTouchEnd.bind(this));

    this._waterfallScroller = /** @type {!HTMLDivElement} */ (
        this._waterfallColumn.contentElement.createChild('div', 'network-waterfall-v-scroll'));
    this._waterfallScrollerContent = /** @type {!HTMLDivElement} */ (
        this._waterfallScroller.createChild('div', 'network-waterfall-v-scroll-content'));

    this._dataGrid.addEventListener(DataGrid.DataGrid.Events.PaddingChanged, () => {
      this._waterfallScrollerWidthIsStale = true;
      this._syncScrollers();
    });
    this._dataGrid.addEventListener(
        DataGrid.ViewportDataGrid.Events.ViewportCalculated, this._redrawWaterfallColumn.bind(this));

    this._createWaterfallHeader();
    this._waterfallColumn.contentElement.classList.add('network-waterfall-view');

    this._waterfallColumn.setMinimumSize(100, 0);
    this._splitWidget.setSidebarWidget(this._waterfallColumn);

    this.switchViewMode(false);

    /**
     * @param {!Event} ev
     * @this {NetworkLogViewColumns}
     */
    function handleContextMenu(ev) {
      const event = /** @type {!MouseEvent} */ (ev);
      const node = this._waterfallColumn.getNodeFromPoint(event.offsetX, event.offsetY);
      if (!node) {
        return;
      }
      const request = node.request();
      if (!request) {
        return;
      }
      const contextMenu = new UI.ContextMenu.ContextMenu(event);
      this._networkLogView.handleContextMenuForRequest(contextMenu, request);
      contextMenu.show();
    }
  }

  /**
   * @param {boolean} shouldConsume
   * @param {!Event} ev
   */
  _onMouseWheel(shouldConsume, ev) {
    if (shouldConsume) {
      ev.consume(true);
    }
    const event = /** @type {!WheelEvent} */ (ev);
    const hasRecentWheel = Date.now() - this._lastWheelTime < 80;
    this._activeScroller.scrollBy({top: event.deltaY, behavior: hasRecentWheel ? 'auto' : 'smooth'});
    this._syncScrollers();
    this._lastWheelTime = Date.now();
  }

  /**
   * @param {!Event} ev
   */
  _onTouchStart(ev) {
    const event = /** @type {!TouchEvent} */ (ev);
    this._hasScrollerTouchStarted = true;
    this._scrollerTouchStartPos = event.changedTouches[0].pageY;
  }

  /**
   * @param {!Event} ev
   */
  _onTouchMove(ev) {
    if (!this._hasScrollerTouchStarted) {
      return;
    }

    const event = /** @type {!TouchEvent} */ (ev);
    const currentPos = event.changedTouches[0].pageY;
    const delta = /** @type {number} */ (this._scrollerTouchStartPos) - currentPos;

    this._activeScroller.scrollBy({top: delta, behavior: 'auto'});
    this._syncScrollers();

    this._scrollerTouchStartPos = currentPos;
  }

  _onTouchEnd() {
    this._hasScrollerTouchStarted = false;
  }

  _syncScrollers() {
    if (!this._waterfallColumn.isShowing()) {
      return;
    }
    this._waterfallScrollerContent.style.height = this._dataGridScroller.scrollHeight + 'px';
    this._updateScrollerWidthIfNeeded();
    this._dataGridScroller.scrollTop = this._waterfallScroller.scrollTop;
  }

  _updateScrollerWidthIfNeeded() {
    if (this._waterfallScrollerWidthIsStale) {
      this._waterfallScrollerWidthIsStale = false;
      this._waterfallColumn.setRightPadding(
          this._waterfallScroller.offsetWidth - this._waterfallScrollerContent.offsetWidth);
    }
  }

  _redrawWaterfallColumn() {
    if (!this._waterfallRequestsAreStale) {
      this._updateScrollerWidthIfNeeded();
      this._waterfallColumn.update(
          this._activeScroller.scrollTop, this._eventDividersShown ? this._eventDividers : undefined);
      return;
    }
    this._syncScrollers();
    const nodes = this._networkLogView.flatNodesList();
    this._waterfallColumn.update(this._activeScroller.scrollTop, this._eventDividers, nodes);
  }

  _createWaterfallHeader() {
    this._waterfallHeaderElement = /** @type {!HTMLElement} */ (
        this._waterfallColumn.contentElement.createChild('div', 'network-waterfall-header'));
    this._waterfallHeaderElement.addEventListener('click', waterfallHeaderClicked.bind(this));
    this._waterfallHeaderElement.addEventListener(
        'contextmenu', event => this._innerHeaderContextMenu(new UI.ContextMenu.ContextMenu(event)));
    const innerElement = this._waterfallHeaderElement.createChild('div');
    innerElement.textContent = i18nString(UIStrings.waterfall);
    this._waterfallColumnSortIcon = UI.Icon.Icon.create('', 'sort-order-icon');
    this._waterfallHeaderElement.createChild('div', 'sort-order-icon-container')
        .appendChild(this._waterfallColumnSortIcon);

    /**
     * @this {NetworkLogViewColumns}
     */
    function waterfallHeaderClicked() {
      const sortOrders = DataGrid.DataGrid.Order;
      const wasSortedByWaterfall = this._dataGrid.sortColumnId() === 'waterfall';
      const wasSortedAscending = this._dataGrid.isSortOrderAscending();
      const sortOrder = wasSortedByWaterfall && wasSortedAscending ? sortOrders.Descending : sortOrders.Ascending;
      this._dataGrid.markColumnAsSortedBy('waterfall', sortOrder);
      this._sortHandler();
    }
  }

  /**
   * @param {!NetworkTimeCalculator} x
   */
  setCalculator(x) {
    this._waterfallColumn.setCalculator(x);
  }

  scheduleRefresh() {
    this._waterfallColumn.scheduleDraw();
  }
  _updateRowsSize() {
    const largeRows = Boolean(this._networkLogLargeRowsSetting.get());

    this._dataGrid.element.classList.toggle('small', !largeRows);
    this._dataGrid.scheduleUpdate();

    this._waterfallScrollerWidthIsStale = true;
    this._waterfallColumn.setRowHeight(largeRows ? 41 : 21);
    this._waterfallScroller.classList.toggle('small', !largeRows);
    this._waterfallHeaderElement.classList.toggle('small', !largeRows);

    // Request an animation frame because under certain conditions
    // (see crbug.com/1019723) this._waterfallScroller.offsetTop does
    // not return the value it's supposed to return as of the applied
    // css classes.
    window.requestAnimationFrame(() => {
      this._waterfallColumn.setHeaderHeight(this._waterfallScroller.offsetTop);
    });
  }

  /**
   * @param {!Element} element
   */
  show(element) {
    this._splitWidget.show(element);
  }

  /**
   * @param {boolean} value
   */
  setHidden(value) {
    UI.ARIAUtils.setHidden(this._splitWidget.element, value);
  }

  /**
   * @return {!DataGrid.SortableDataGrid.SortableDataGrid<!NetworkNode>} dataGrid
   */
  dataGrid() {
    return this._dataGrid;
  }

  sortByCurrentColumn() {
    this._sortHandler();
  }

  _sortHandler() {
    const columnId = this._dataGrid.sortColumnId();
    this._networkLogView.removeAllNodeHighlights();
    this._waterfallRequestsAreStale = true;
    if (columnId === 'waterfall') {
      if (this._dataGrid.sortOrder() === DataGrid.DataGrid.Order.Ascending) {
        this._waterfallColumnSortIcon.setIconType('smallicon-triangle-up');
      } else {
        this._waterfallColumnSortIcon.setIconType('smallicon-triangle-down');
      }

      const sortFunction =
          /** @type {function(!DataGrid.SortableDataGrid.SortableDataGridNode<!NetworkNode>, !DataGrid.SortableDataGrid.SortableDataGridNode<!NetworkNode>):number} */
          (NetworkRequestNode.RequestPropertyComparator.bind(null, this._activeWaterfallSortId));
      this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());
      this._dataGridSortedForTest();
      return;
    }
    this._waterfallColumnSortIcon.setIconType('');

    const columnConfig = this._columns.find(columnConfig => columnConfig.id === columnId);
    if (!columnConfig || !columnConfig.sortingFunction) {
      return;
    }
    const sortingFunction =
        /** @type {undefined|function(!DataGrid.SortableDataGrid.SortableDataGridNode<!NetworkNode>, !DataGrid.SortableDataGrid.SortableDataGridNode<!NetworkNode>):number} */
        (columnConfig.sortingFunction);
    if (!sortingFunction) {
      return;
    }
    this._dataGrid.sortNodes(sortingFunction, !this._dataGrid.isSortOrderAscending());
    this._dataGridSortedForTest();
  }

  _dataGridSortedForTest() {
  }

  _updateColumns() {
    if (!this._dataGrid) {
      return;
    }
    const visibleColumns = new Set();
    if (this._gridMode) {
      for (const columnConfig of this._columns) {
        if (columnConfig.visible) {
          visibleColumns.add(columnConfig.id);
        }
      }
    } else {
      // Find the first visible column from the path group
      const visibleColumn = this._columns.find(c => c.hideableGroup === 'path' && c.visible);
      if (visibleColumn) {
        visibleColumns.add(visibleColumn.id);
      } else {
        // This should not happen because inside a hideableGroup
        // there should always be at least one column visible
        // This is just in case.
        visibleColumns.add('name');
      }
    }
    this._dataGrid.setColumnsVisiblity(visibleColumns);
  }

  /**
   * @param {boolean} gridMode
   */
  switchViewMode(gridMode) {
    if (this._gridMode === gridMode) {
      return;
    }
    this._gridMode = gridMode;

    if (gridMode) {
      this._splitWidget.showBoth();
      this._activeScroller = this._waterfallScroller;
      this._waterfallScroller.scrollTop = this._dataGridScroller.scrollTop;
      this._dataGrid.setScrollContainer(this._waterfallScroller);
    } else {
      this._networkLogView.removeAllNodeHighlights();
      this._splitWidget.hideSidebar();
      this._activeScroller = this._dataGridScroller;
      this._dataGrid.setScrollContainer(this._dataGridScroller);
    }
    this._networkLogView.element.classList.toggle('brief-mode', !gridMode);
    this._updateColumns();
    this._updateRowsSize();
  }

  /**
   * @param {!Descriptor} columnConfig
   */
  _toggleColumnVisibility(columnConfig) {
    this._loadCustomColumnsAndSettings();
    columnConfig.visible = !columnConfig.visible;
    this._saveColumnsSettings();
    this._updateColumns();
  }

  _saveColumnsSettings() {
    /** @type {!Object<string, ?>} */
    const saveableSettings = {};
    for (const columnConfig of this._columns) {
      saveableSettings[columnConfig.id] = {visible: columnConfig.visible, title: columnConfig.title};
    }

    this._persistantSettings.set(saveableSettings);
  }

  _loadCustomColumnsAndSettings() {
    const savedSettings = this._persistantSettings.get();
    const columnIds = Object.keys(savedSettings);
    for (const columnId of columnIds) {
      const setting = savedSettings[columnId];
      let columnConfig = this._columns.find(columnConfig => columnConfig.id === columnId);
      if (!columnConfig) {
        columnConfig = this._addCustomHeader(setting.title, columnId) || undefined;
      }
      if (columnConfig && columnConfig.hideable && typeof setting.visible === 'boolean') {
        columnConfig.visible = Boolean(setting.visible);
      }
      if (columnConfig && typeof setting.title === 'string') {
        columnConfig.title = setting.title;
      }
    }
  }

  /**
   * @param {string} title
   * @param {string} subtitle
   * @return {!DocumentFragment}
   */
  _makeHeaderFragment(title, subtitle) {
    const fragment = document.createDocumentFragment();
    UI.UIUtils.createTextChild(fragment, title);
    const subtitleDiv = fragment.createChild('div', 'network-header-subtitle');
    UI.UIUtils.createTextChild(subtitleDiv, subtitle);
    return fragment;
  }

  /**
   * @param {!UI.ContextMenu.SubMenu} contextMenu
   */
  _innerHeaderContextMenu(contextMenu) {
    const columnConfigs = this._columns.filter(columnConfig => columnConfig.hideable);
    const nonResponseHeaders = columnConfigs.filter(columnConfig => !columnConfig.isResponseHeader);

    /** @type {!Map<string, !Array<!Descriptor>>} */
    const hideableGroups = new Map();
    /** @type {!Array.<!Descriptor>} */
    const nonResponseHeadersWithoutGroup = [];

    // Sort columns into their groups
    for (const columnConfig of nonResponseHeaders) {
      if (!columnConfig.hideableGroup) {
        nonResponseHeadersWithoutGroup.push(columnConfig);
      } else {
        const name = columnConfig.hideableGroup;
        let hideableGroup = hideableGroups.get(name);
        if (!hideableGroup) {
          hideableGroup = [];
          hideableGroups.set(name, hideableGroup);
        }

        hideableGroup.push(columnConfig);
      }
    }

    // Add all the groups first
    for (const group of hideableGroups.values()) {
      const visibleColumns = group.filter(columnConfig => columnConfig.visible);

      for (const columnConfig of group) {
        // Make sure that at least one item in every group is enabled
        const isDisabled = visibleColumns.length === 1 && visibleColumns[0] === columnConfig;

        contextMenu.headerSection().appendCheckboxItem(
            columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible,
            isDisabled);
      }

      contextMenu.headerSection().appendSeparator();
    }

    // Add normal columns not belonging to any group
    for (const columnConfig of nonResponseHeadersWithoutGroup) {
      contextMenu.headerSection().appendCheckboxItem(
          columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible);
    }

    const responseSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString(UIStrings.responseHeaders));
    const responseHeaders = columnConfigs.filter(columnConfig => columnConfig.isResponseHeader);
    for (const columnConfig of responseHeaders) {
      responseSubMenu.defaultSection().appendCheckboxItem(
          columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible);
    }

    responseSubMenu.footerSection().appendItem(
        i18nString(UIStrings.manageHeaderColumns), this._manageCustomHeaderDialog.bind(this));

    const waterfallSortIds = WaterfallSortIds;
    const waterfallSubMenu = contextMenu.footerSection().appendSubMenuItem(i18nString(UIStrings.waterfall));
    waterfallSubMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.startTime), setWaterfallMode.bind(this, waterfallSortIds.StartTime),
        this._activeWaterfallSortId === waterfallSortIds.StartTime);
    waterfallSubMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.responseTime), setWaterfallMode.bind(this, waterfallSortIds.ResponseTime),
        this._activeWaterfallSortId === waterfallSortIds.ResponseTime);
    waterfallSubMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.endTime), setWaterfallMode.bind(this, waterfallSortIds.EndTime),
        this._activeWaterfallSortId === waterfallSortIds.EndTime);
    waterfallSubMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.totalDuration), setWaterfallMode.bind(this, waterfallSortIds.Duration),
        this._activeWaterfallSortId === waterfallSortIds.Duration);
    waterfallSubMenu.defaultSection().appendCheckboxItem(
        i18nString(UIStrings.latency), setWaterfallMode.bind(this, waterfallSortIds.Latency),
        this._activeWaterfallSortId === waterfallSortIds.Latency);

    /**
     * @param {!WaterfallSortIds} sortId
     * @this {NetworkLogViewColumns}
     */
    function setWaterfallMode(sortId) {
      let calculator = this._calculatorsMap.get(_calculatorTypes.Time);
      const waterfallSortIds = WaterfallSortIds;
      if (sortId === waterfallSortIds.Duration || sortId === waterfallSortIds.Latency) {
        calculator = this._calculatorsMap.get(_calculatorTypes.Duration);
      }
      this._networkLogView.setCalculator(/** @type {!NetworkTimeCalculator} */ (calculator));

      this._activeWaterfallSortId = sortId;
      this._dataGrid.markColumnAsSortedBy('waterfall', DataGrid.DataGrid.Order.Ascending);
      this._sortHandler();
    }
  }

  _manageCustomHeaderDialog() {
    const customHeaders = [];
    for (const columnConfig of this._columns) {
      if (columnConfig.isResponseHeader) {
        customHeaders.push({title: columnConfig.title, editable: columnConfig.isCustomHeader});
      }
    }
    const manageCustomHeaders = new NetworkManageCustomHeadersView(
        customHeaders, headerTitle => Boolean(this._addCustomHeader(headerTitle)), this._changeCustomHeader.bind(this),
        this._removeCustomHeader.bind(this));
    const dialog = new UI.Dialog.Dialog();
    manageCustomHeaders.show(dialog.contentElement);
    dialog.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    // @ts-ignore
    // TypeScript somehow tries to appy the `WidgetElement` class to the
    // `Document` type of the (Document|Element) union. WidgetElement inherits
    // from HTMLElement so its valid to be passed here.
    dialog.show(this._networkLogView.element);
  }

  /**
   * @param {string} headerId
   * @return {boolean}
   */
  _removeCustomHeader(headerId) {
    headerId = headerId.toLowerCase();
    const index = this._columns.findIndex(columnConfig => columnConfig.id === headerId);
    if (index === -1) {
      return false;
    }
    this._columns.splice(index, 1);
    this._dataGrid.removeColumn(headerId);
    this._saveColumnsSettings();
    this._updateColumns();
    return true;
  }

  /**
   * @param {string} headerTitle
   * @param {string=} headerId
   * @param {number=} index
   * @return {?Descriptor}
   */
  _addCustomHeader(headerTitle, headerId, index) {
    if (!headerId) {
      headerId = headerTitle.toLowerCase();
    }
    if (index === undefined) {
      index = this._columns.length - 1;
    }

    const currentColumnConfig = this._columns.find(columnConfig => columnConfig.id === headerId);
    if (currentColumnConfig) {
      return null;
    }

    const columnConfigBase = Object.assign({}, _defaultColumnConfig, {
      id: headerId,
      title: headerTitle,
      isResponseHeader: true,
      isCustomHeader: true,
      visible: true,
      sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, headerId)
    });

    // Split out the column config from the typed version, as doing it in a single assignment causes
    // issues with Closure compiler.
    const columnConfig = /** @type {!Descriptor} */ (columnConfigBase);

    this._columns.splice(index, 0, columnConfig);
    if (this._dataGrid) {
      this._dataGrid.addColumn(NetworkLogViewColumns._convertToDataGridDescriptor(columnConfig), index);
    }
    this._saveColumnsSettings();
    this._updateColumns();
    return columnConfig;
  }

  /**
   * @param {string} oldHeaderId
   * @param {string} newHeaderTitle
   * @param {string=} newHeaderId
   * @return {boolean}
   */
  _changeCustomHeader(oldHeaderId, newHeaderTitle, newHeaderId) {
    if (!newHeaderId) {
      newHeaderId = newHeaderTitle.toLowerCase();
    }
    oldHeaderId = oldHeaderId.toLowerCase();

    const oldIndex = this._columns.findIndex(columnConfig => columnConfig.id === oldHeaderId);
    const oldColumnConfig = this._columns[oldIndex];
    const currentColumnConfig = this._columns.find(columnConfig => columnConfig.id === newHeaderId);
    if (!oldColumnConfig || (currentColumnConfig && oldHeaderId !== newHeaderId)) {
      return false;
    }

    this._removeCustomHeader(oldHeaderId);
    this._addCustomHeader(newHeaderTitle, newHeaderId, oldIndex);
    return true;
  }

  /**
   * @param {!Event} event
   * @return {?UI.PopoverHelper.PopoverRequest}
   */
  _getPopoverRequest(event) {
    if (!this._gridMode) {
      return null;
    }
    const hoveredNode = this._networkLogView.hoveredNode();
    if (!hoveredNode || !event.target) {
      return null;
    }

    const anchor = /** @type {!HTMLElement} */ (event.target).enclosingNodeOrSelfWithClass('network-script-initiated');
    if (!anchor) {
      return null;
    }
    const request = hoveredNode.request();
    if (!request) {
      return null;
    }
    return {
      box: anchor.boxInWindow(),
      /** @param {!UI.GlassPane.GlassPane} popover */
      show: async popover => {
        this._popupLinkifier.setLiveLocationUpdateCallback(() => {
          popover.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
        });
        const content = RequestInitiatorView.createStackTracePreview(
            /** @type {!SDK.NetworkRequest.NetworkRequest} */ (request), this._popupLinkifier, false);
        if (!content) {
          return false;
        }
        popover.contentElement.appendChild(content.element);
        return true;
      },
      hide: this._popupLinkifier.reset.bind(this._popupLinkifier)
    };
  }

  /**
   * @param {!Array<number>} times
   * @param {string} className
   */
  addEventDividers(times, className) {
    // TODO(allada) Remove this and pass in the color.
    let color = 'transparent';
    switch (className) {
      case 'network-dcl-divider':
        color = '#0867CB';
        break;
      case 'network-load-divider':
        color = '#B31412';
        break;
      default:
        return;
    }
    const currentTimes = this._eventDividers.get(color) || [];
    this._eventDividers.set(color, currentTimes.concat(times));
    this._networkLogView.scheduleRefresh();
  }

  hideEventDividers() {
    this._eventDividersShown = true;
    this._redrawWaterfallColumn();
  }

  showEventDividers() {
    this._eventDividersShown = false;
    this._redrawWaterfallColumn();
  }

  /**
   * @param {number} time
   */
  selectFilmStripFrame(time) {
    this._eventDividers.set(_filmStripDividerColor, [time]);
    this._redrawWaterfallColumn();
  }

  clearFilmStripFrame() {
    this._eventDividers.delete(_filmStripDividerColor);
    this._redrawWaterfallColumn();
  }
}

export const _initialSortColumn = 'waterfall';


/** @enum {string} */
export const _calculatorTypes = {
  Duration: 'Duration',
  Time: 'Time'
};

/**
 * @type {!Object} column
 */
export const _defaultColumnConfig = {
  subtitle: null,
  visible: false,
  weight: 6,
  sortable: true,
  hideable: true,
  hideableGroup: null,
  nonSelectable: false,
  isResponseHeader: false,
  isCustomHeader: false,
  allowInSortByEvenWhenHidden: false
};

const _temporaryDefaultColumns = [
  {
    id: 'name',
    title: i18nString(UIStrings.name),
    subtitle: i18nString(UIStrings.path),
    visible: true,
    weight: 20,
    hideable: true,
    hideableGroup: 'path',
    sortingFunction: NetworkRequestNode.NameComparator
  },
  {
    id: 'path',
    title: i18nString(UIStrings.path),
    hideable: true,
    hideableGroup: 'path',
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'pathname')
  },
  {
    id: 'url',
    title: i18nString(UIStrings.url),
    hideable: true,
    hideableGroup: 'path',
    sortingFunction: NetworkRequestNode.RequestURLComparator
  },
  {
    id: 'method',
    title: i18nString(UIStrings.method),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'requestMethod')
  },
  {
    id: 'status',
    title: i18nString(UIStrings.status),
    visible: true,
    subtitle: i18nString(UIStrings.text),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'statusCode')
  },
  {
    id: 'protocol',
    title: i18nString(UIStrings.protocol),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'protocol')
  },
  {
    id: 'scheme',
    title: i18nString(UIStrings.scheme),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'scheme')
  },
  {
    id: 'domain',
    title: i18nString(UIStrings.domain),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'domain')
  },
  {
    id: 'remoteaddress',
    title: i18nString(UIStrings.remoteAddress),
    weight: 10,
    align: DataGrid.DataGrid.Align.Right,
    sortingFunction: NetworkRequestNode.RemoteAddressComparator
  },
  {id: 'type', title: i18nString(UIStrings.type), visible: true, sortingFunction: NetworkRequestNode.TypeComparator},
  {
    id: 'initiator',
    title: i18nString(UIStrings.initiator),
    visible: true,
    weight: 10,
    sortingFunction: NetworkRequestNode.InitiatorComparator
  },
  {
    id: 'initiator-address-space',
    title: i18nString(UIStrings.initiatorAddressSpace),
    visible: false,
    weight: 10,
    sortingFunction: NetworkRequestNode.InitiatorAddressSpaceComparator
  },
  {
    id: 'cookies',
    title: i18nString(UIStrings.cookies),
    align: DataGrid.DataGrid.Align.Right,
    sortingFunction: NetworkRequestNode.RequestCookiesCountComparator
  },
  {
    id: 'setcookies',
    title: i18nString(UIStrings.setCookies),
    align: DataGrid.DataGrid.Align.Right,
    sortingFunction: NetworkRequestNode.ResponseCookiesCountComparator
  },
  {
    id: 'size',
    title: i18nString(UIStrings.size),
    visible: true,
    subtitle: i18nString(UIStrings.content),
    align: DataGrid.DataGrid.Align.Right,
    sortingFunction: NetworkRequestNode.SizeComparator
  },
  {
    id: 'time',
    title: i18nString(UIStrings.time),
    visible: true,
    subtitle: i18nString(UIStrings.latency),
    align: DataGrid.DataGrid.Align.Right,
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'duration')
  },
  {id: 'priority', title: i18nString(UIStrings.priority), sortingFunction: NetworkRequestNode.PriorityComparator},
  {
    id: 'connectionid',
    title: i18nString(UIStrings.connectionId),
    sortingFunction: NetworkRequestNode.RequestPropertyComparator.bind(null, 'connectionId')
  },
  {
    id: 'cache-control',
    isResponseHeader: true,
    title: i18nString(UIStrings.cachecontrol),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'cache-control')
  },
  {
    id: 'connection',
    isResponseHeader: true,
    // until IDs are supported for strings, the placeholder is used to workaround the limitation that
    // having multiple translations for a string is not supported
    title: i18nString(UIStrings.s, {PH1: 'Connection'}),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'connection')
  },
  {
    id: 'content-encoding',
    isResponseHeader: true,
    title: i18nString(UIStrings.contentencoding),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'content-encoding')
  },
  {
    id: 'content-length',
    isResponseHeader: true,
    title: i18nString(UIStrings.contentlength),
    align: DataGrid.DataGrid.Align.Right,
    sortingFunction: NetworkRequestNode.ResponseHeaderNumberComparator.bind(null, 'content-length')
  },
  {
    id: 'etag',
    isResponseHeader: true,
    title: i18nString(UIStrings.etag),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'etag')
  },
  {
    id: 'keep-alive',
    isResponseHeader: true,
    title: i18nString(UIStrings.keepalive),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'keep-alive')
  },
  {
    id: 'last-modified',
    isResponseHeader: true,
    title: i18nString(UIStrings.lastmodified),
    sortingFunction: NetworkRequestNode.ResponseHeaderDateComparator.bind(null, 'last-modified')
  },
  {
    id: 'server',
    isResponseHeader: true,
    title: i18nString(UIStrings.server),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'server')
  },
  {
    id: 'vary',
    isResponseHeader: true,
    title: i18nString(UIStrings.vary),
    sortingFunction: NetworkRequestNode.ResponseHeaderStringComparator.bind(null, 'vary')
  },
  // This header is a placeholder to let datagrid know that it can be sorted by this column, but never shown.
  {
    id: 'waterfall',
    title: i18nString(UIStrings.waterfall),
    visible: false,
    hideable: false,
    allowInSortByEvenWhenHidden: true
  }
];

/** @type {!Array<!Descriptor>} */
const _defaultColumns = /** @type {!Array<!Descriptor>} */ (/** @type {*} */ (_temporaryDefaultColumns));

export const _filmStripDividerColor = '#fccc49';

/**
 * @enum {string}
 */
export const WaterfallSortIds = {
  StartTime: 'startTime',
  ResponseTime: 'responseReceivedTime',
  EndTime: 'endTime',
  Duration: 'duration',
  Latency: 'latency'
};

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     titleDOMFragment: (!DocumentFragment|undefined),
 *     subtitle: (string|null),
 *     visible: boolean,
 *     weight: number,
 *     hideable: boolean,
 *     hideableGroup: ?string,
 *     nonSelectable: boolean,
 *     sortable: boolean,
 *     align: (?DataGrid.DataGrid.Align|undefined),
 *     isResponseHeader: boolean,
 *     sortingFunction: (!function(!NetworkNode, !NetworkNode):number|undefined),
 *     isCustomHeader: boolean,
 *     allowInSortByEvenWhenHidden: boolean
 * }}
 */
// @ts-ignore typedef
export let Descriptor;
