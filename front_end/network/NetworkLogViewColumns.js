// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.NetworkLogViewColumns = class {
  /**
   * @param {!WebInspector.NetworkLogView} networkLogView
   * @param {!WebInspector.NetworkTransferTimeCalculator} timeCalculator
   * @param {!WebInspector.NetworkTransferDurationCalculator} durationCalculator
   * @param {!WebInspector.Setting} networkLogLargeRowsSetting
   */
  constructor(networkLogView, timeCalculator, durationCalculator, networkLogLargeRowsSetting) {
    this._networkLogView = networkLogView;

    /** @type {!WebInspector.Setting} */
    this._persistantSettings = WebInspector.settings.createSetting('networkLogColumns', {});

    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this._networkLogLargeRowsSetting.addChangeListener(this._updateRowsSize, this);

    /** @type {!Map<string, !Array<number>>} */
    this._eventDividers = new Map();
    this._eventDividersShown = false;

    this._gridMode = true;

    /** @type {!Array.<!WebInspector.NetworkLogViewColumns.Descriptor>} */
    this._columns = [];

    this._timelineRequestsAreStale = false;
    this._timelineScrollerWidthIsStale = true;

    /** @type {!WebInspector.Linkifier} */
    this._popupLinkifier = new WebInspector.Linkifier();

    /** @type {!Map<string, !WebInspector.NetworkTimeCalculator>} */
    this._calculatorsMap = new Map();
    this._calculatorsMap.set(WebInspector.NetworkLogViewColumns._calculatorTypes.Time, timeCalculator);
    this._calculatorsMap.set(WebInspector.NetworkLogViewColumns._calculatorTypes.Duration, durationCalculator);

    this._setupDataGrid();
    this._setupTimeline();
  }

  /**
   * @param {!WebInspector.NetworkLogViewColumns.Descriptor} columnConfig
   * @return {!WebInspector.DataGrid.ColumnDescriptor}
   */
  static _convertToDataGridDescriptor(columnConfig) {
    return /** @type {!WebInspector.DataGrid.ColumnDescriptor} */ ({
      id: columnConfig.id,
      title: columnConfig.title,
      sortable: columnConfig.sortable,
      align: columnConfig.align,
      nonSelectable: columnConfig.nonSelectable,
      weight: columnConfig.weight
    });
  }

  wasShown() {
    this._updateRowsSize();
  }

  willHide() {
    this._popoverHelper.hidePopover();
  }

  reset() {
    if (this._popoverHelper)
      this._popoverHelper.hidePopover();
    this._eventDividers.clear();
  }

  _setupDataGrid() {
    var defaultColumns = WebInspector.NetworkLogViewColumns._defaultColumns;
    var defaultColumnConfig = WebInspector.NetworkLogViewColumns._defaultColumnConfig;

    this._columns = /** @type {!Array<!WebInspector.NetworkLogViewColumns.Descriptor>} */ ([]);
    for (var currentConfigColumn of defaultColumns) {
      var columnConfig = /** @type {!WebInspector.NetworkLogViewColumns.Descriptor} */ (
          Object.assign(/** @type {!Object} */ ({}), defaultColumnConfig, currentConfigColumn));
      columnConfig.id = columnConfig.id;
      if (columnConfig.subtitle)
        columnConfig.titleDOMFragment = this._makeHeaderFragment(columnConfig.title, columnConfig.subtitle);
      this._columns.push(columnConfig);
    }
    this._loadColumns();

    this._popoverHelper = new WebInspector.PopoverHelper(this._networkLogView.element);
    this._popoverHelper.initializeCallbacks(
        this._getPopoverAnchor.bind(this), this._showPopover.bind(this), this._onHidePopover.bind(this));

    this._dataGrid = new WebInspector.SortableDataGrid(
        this._columns.map(WebInspector.NetworkLogViewColumns._convertToDataGridDescriptor));
    this._dataGrid.element.addEventListener('mousedown', event => {
      if ((!this._dataGrid.selectedNode && event.button) || event.target.enclosingNodeOrSelfWithNodeName('a'))
        event.consume();
    }, true);

    this._dataGridScroller = this._dataGrid.scrollContainer;

    this._updateColumns();
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortHandler, this);
    this._dataGrid.setHeaderContextMenuCallback(this._innerHeaderContextMenu.bind(this));

    this._activeTimelineSortId = WebInspector.NetworkLogViewColumns.TimelineSortIds.StartTime;
    this._dataGrid.markColumnAsSortedBy(
        WebInspector.NetworkLogViewColumns._initialSortColumn, WebInspector.DataGrid.Order.Ascending);

    this._splitWidget = new WebInspector.SplitWidget(true, true, 'networkPanelSplitViewTimeline', 200);
    var widget = this._dataGrid.asWidget();
    widget.setMinimumSize(150, 0);
    this._splitWidget.setMainWidget(widget);
  }

  _setupTimeline() {
    this._timelineColumn =
        new WebInspector.NetworkTimelineColumn(this._networkLogView.rowHeight(), this._networkLogView.calculator());

    this._timelineColumn.element.addEventListener('contextmenu', handleContextMenu.bind(this));
    this._timelineColumn.element.addEventListener('mousewheel', this._onMouseWheel.bind(this, false), {passive: true});
    this._dataGridScroller.addEventListener('mousewheel', this._onMouseWheel.bind(this, true), true);

    this._timelineColumn.element.addEventListener(
        'mousemove',
        event => this._networkLogView.setHoveredRequest(
            this._timelineColumn.getRequestFromPoint(event.offsetX, event.offsetY + event.target.offsetTop),
            event.shiftKey),
        true);
    this._timelineColumn.element.addEventListener(
        'mouseleave', this._networkLogView.setHoveredRequest.bind(this._networkLogView, null, false), true);

    this._timelineScroller = this._timelineColumn.contentElement.createChild('div', 'network-timeline-v-scroll');
    this._timelineScroller.addEventListener('scroll', this._syncScrollers.bind(this), {passive: true});
    this._timelineScrollerContent = this._timelineScroller.createChild('div', 'network-timeline-v-scroll-content');

    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.PaddingChanged, () => {
      this._timelineScrollerWidthIsStale = true;
      this._syncScrollers();
    });
    this._dataGrid.addEventListener(
        WebInspector.ViewportDataGrid.Events.ViewportCalculated, this._redrawTimelineColumn.bind(this));

    this._createTimelineHeader();
    this._timelineColumn.contentElement.classList.add('network-timeline-view');

    this._timelineColumn.setMinimumSize(100, 0);
    this._splitWidget.setSidebarWidget(this._timelineColumn);

    this.switchViewMode(false);

    /**
     * @param {!Event} event
     * @this {WebInspector.NetworkLogViewColumns}
     */
    function handleContextMenu(event) {
      var request = this._timelineColumn.getRequestFromPoint(event.offsetX, event.offsetY);
      if (!request)
        return;
      var contextMenu = new WebInspector.ContextMenu(event);
      this._networkLogView.handleContextMenuForRequest(contextMenu, request);
      contextMenu.show();
    }
  }

  /**
   * @param {boolean} shouldConsume
   * @param {!Event} event
   */
  _onMouseWheel(shouldConsume, event) {
    if (shouldConsume)
      event.consume(true);
    this._activeScroller.scrollTop -= event.wheelDeltaY;
    this._syncScrollers();
    this._networkLogView.setHoveredRequest(
        this._timelineColumn.getRequestFromPoint(event.offsetX, event.offsetY), event.shiftKey);
  }

  _syncScrollers() {
    if (!this._timelineColumn.isShowing())
      return;
    this._timelineScrollerContent.style.height = this._dataGridScroller.scrollHeight + 'px';
    this._updateScrollerWidthIfNeeded();
    this._dataGridScroller.scrollTop = this._timelineScroller.scrollTop;
  }

  _updateScrollerWidthIfNeeded() {
    if (this._timelineScrollerWidthIsStale) {
      this._timelineScrollerWidthIsStale = false;
      this._timelineColumn.setRightPadding(
          this._timelineScroller.offsetWidth - this._timelineScrollerContent.offsetWidth);
    }
  }

  _redrawTimelineColumn() {
    if (!this._timelineRequestsAreStale) {
      this._updateScrollerWidthIfNeeded();
      this._timelineColumn.update(
          this._activeScroller.scrollTop, this._eventDividersShown ? this._eventDividers : undefined);
      return;
    }
    var currentNode = this._dataGrid.rootNode();
    /** @type {!WebInspector.NetworkTimelineColumn.RequestData} */
    var requestData = {requests: [], navigationRequest: null};
    while (currentNode = currentNode.traverseNextNode(true)) {
      if (currentNode.isNavigationRequest())
        requestData.navigationRequest = currentNode.request();
      requestData.requests.push(currentNode.request());
    }
    this._timelineColumn.update(this._activeScroller.scrollTop, this._eventDividers, requestData);
  }

  /**
   * @param {?WebInspector.NetworkRequest} request
   * @param {boolean} highlightInitiatorChain
   */
  setHoveredRequest(request, highlightInitiatorChain) {
    this._timelineColumn.setHoveredRequest(request, highlightInitiatorChain);
  }

  _createTimelineHeader() {
    this._timelineHeaderElement = this._timelineColumn.contentElement.createChild('div', 'network-timeline-header');
    this._timelineHeaderElement.addEventListener('click', timelineHeaderClicked.bind(this));
    this._timelineHeaderElement.addEventListener(
        'contextmenu', event => this._innerHeaderContextMenu(new WebInspector.ContextMenu(event)));
    var innerElement = this._timelineHeaderElement.createChild('div');
    innerElement.textContent = WebInspector.UIString('Waterfall');
    this._timelineColumnSortIcon = this._timelineHeaderElement.createChild('div', 'sort-order-icon-container')
        .createChild('div', 'sort-order-icon');

    /**
     * @this {WebInspector.NetworkLogViewColumns}
     */
    function timelineHeaderClicked() {
      var sortOrders = WebInspector.DataGrid.Order;
      var sortOrder =
          this._dataGrid.sortOrder() === sortOrders.Ascending ? sortOrders.Descending : sortOrders.Ascending;
      this._dataGrid.markColumnAsSortedBy('timeline', sortOrder);
      this._sortHandler();
    }
  }

  /**
   * @param {!WebInspector.NetworkTimeCalculator} x
   */
  setCalculator(x) {
    this._timelineColumn.setCalculator(x);
  }

  dataChanged() {
    this._timelineRequestsAreStale = true;
  }

  _updateRowsSize() {
    var largeRows = !!this._networkLogLargeRowsSetting.get();
    this._dataGrid.element.classList.toggle('small', !largeRows);
    this._dataGrid.scheduleUpdate();

    this._timelineScrollerWidthIsStale = true;
    this._timelineColumn.setRowHeight(this._networkLogView.rowHeight());
    this._timelineScroller.classList.toggle('small', !largeRows);
    this._timelineHeaderElement.classList.toggle('small', !largeRows);
    this._timelineColumn.setHeaderHeight(this._timelineScroller.offsetTop);
  }

  /**
   * @param {!Element} element
   */
  show(element) {
    this._splitWidget.show(element);
  }

  /**
   * @return {!WebInspector.SortableDataGrid} dataGrid
   */
  dataGrid() {
    return this._dataGrid;
  }

  sortByCurrentColumn() {
    this._sortHandler();
  }

  _sortHandler() {
    var columnId = this._dataGrid.sortColumnId();
    this._networkLogView.removeAllNodeHighlights();
    if (columnId === 'timeline') {
      this._timelineColumnSortIcon.classList.remove('sort-ascending', 'sort-descending');

      if (this._dataGrid.sortOrder() === WebInspector.DataGrid.Order.Ascending)
        this._timelineColumnSortIcon.classList.add('sort-ascending');
      else
        this._timelineColumnSortIcon.classList.add('sort-descending');

      this._timelineRequestsAreStale = true;
      var sortFunction =
          WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, this._activeTimelineSortId);
      this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());
      return;
    }

    var columnConfig = this._columns.find(columnConfig => columnConfig.id === columnId);
    if (!columnConfig || !columnConfig.sortingFunction)
      return;

    this._dataGrid.sortNodes(columnConfig.sortingFunction, !this._dataGrid.isSortOrderAscending());
    this._networkLogView.dataGridSorted();
  }

  _updateColumns() {
    if (!this._dataGrid)
      return;
    var visibleColumns = /** @type {!Object.<string, boolean>} */ ({});
    if (this._gridMode) {
      for (var columnConfig of this._columns)
        visibleColumns[columnConfig.id] = columnConfig.visible;
    } else {
      visibleColumns.name = true;
    }
    this._dataGrid.setColumnsVisiblity(visibleColumns);
  }

  /**
   * @param {boolean} gridMode
   */
  switchViewMode(gridMode) {
    if (this._gridMode === gridMode)
      return;
    this._gridMode = gridMode;

    if (gridMode) {
      if (this._dataGrid.selectedNode)
        this._dataGrid.selectedNode.selected = false;
      this._splitWidget.showBoth();
      this._activeScroller = this._timelineScroller;
      this._timelineScroller.scrollTop = this._dataGridScroller.scrollTop;
      this._dataGrid.setScrollContainer(this._timelineScroller);
    } else {
      this._networkLogView.removeAllNodeHighlights();
      this._splitWidget.hideSidebar();
      this._activeScroller = this._dataGridScroller;
      this._dataGrid.setScrollContainer(this._dataGridScroller);
    }
    this._networkLogView.element.classList.toggle('brief-mode', !gridMode);
    this._updateColumns();
  }

  /**
   * @param {!WebInspector.NetworkLogViewColumns.Descriptor} columnConfig
   */
  _toggleColumnVisibility(columnConfig) {
    this._loadColumns();
    columnConfig.visible = !columnConfig.visible;
    this._saveColumns();
    this._updateColumns();
  }

  _saveColumns() {
    var saveableSettings = {};
    for (var columnConfig of this._columns) {
      saveableSettings[columnConfig.id] = {visible: columnConfig.visible, title: columnConfig.title};
    }
    this._persistantSettings.set(saveableSettings);
  }

  _loadColumns() {
    var savedSettings = this._persistantSettings.get();
    var columnIds = Object.keys(savedSettings);
    for (var columnId of columnIds) {
      var setting = savedSettings[columnId];
      var columnConfig = this._columns.find(columnConfig => columnConfig.id === columnId);
      if (!columnConfig)
        columnConfig = this._addCustomHeader(setting.title, columnId);
      if (columnConfig.hideable && typeof setting.visible === 'boolean')
        columnConfig.visible = !!setting.visible;
      if (typeof setting.title === 'string')
        columnConfig.title = setting.title;
    }
  }

  /**
   * @param {string} title
   * @param {string} subtitle
   * @return {!DocumentFragment}
   */
  _makeHeaderFragment(title, subtitle) {
    var fragment = createDocumentFragment();
    fragment.createTextChild(title);
    var subtitleDiv = fragment.createChild('div', 'network-header-subtitle');
    subtitleDiv.createTextChild(subtitle);
    return fragment;
  }

  /**
   * @param {!WebInspector.ContextMenu} contextMenu
   */
  _innerHeaderContextMenu(contextMenu) {
    var columnConfigs = this._columns.filter(columnConfig => columnConfig.hideable);
    var nonResponseHeaders = columnConfigs.filter(columnConfig => !columnConfig.isResponseHeader);
    for (var columnConfig of nonResponseHeaders) {
      contextMenu.appendCheckboxItem(
          columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible);
    }

    contextMenu.appendSeparator();

    var responseSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString('Response Headers'));
    var responseHeaders = columnConfigs.filter(columnConfig => columnConfig.isResponseHeader);
    for (var columnConfig of responseHeaders) {
      responseSubMenu.appendCheckboxItem(
          columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible);
    }

    responseSubMenu.appendSeparator();
    responseSubMenu.appendItem(
        WebInspector.UIString('Manage Header Columns\u2026'), this._manageCustomHeaderDialog.bind(this));

    contextMenu.appendSeparator();

    var timelineSortIds = WebInspector.NetworkLogViewColumns.TimelineSortIds;
    var timelineSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString('Waterfall'));
    timelineSubMenu.appendCheckboxItem(
        WebInspector.UIString('Start Time'), setTimelineMode.bind(this, timelineSortIds.StartTime),
        this._activeTimelineSortId === timelineSortIds.StartTime);
    timelineSubMenu.appendCheckboxItem(
        WebInspector.UIString('Response Time'), setTimelineMode.bind(this, timelineSortIds.ResponseTime),
        this._activeTimelineSortId === timelineSortIds.ResponseTime);
    timelineSubMenu.appendCheckboxItem(
        WebInspector.UIString('End Time'), setTimelineMode.bind(this, timelineSortIds.EndTime),
        this._activeTimelineSortId === timelineSortIds.EndTime);
    timelineSubMenu.appendCheckboxItem(
        WebInspector.UIString('Total Duration'), setTimelineMode.bind(this, timelineSortIds.Duration),
        this._activeTimelineSortId === timelineSortIds.Duration);
    timelineSubMenu.appendCheckboxItem(
        WebInspector.UIString('Latency'), setTimelineMode.bind(this, timelineSortIds.Latency),
        this._activeTimelineSortId === timelineSortIds.Latency);

    contextMenu.show();

    /**
     * @param {!WebInspector.NetworkLogViewColumns.TimelineSortIds} sortId
     * @this {WebInspector.NetworkLogViewColumns}
     */
    function setTimelineMode(sortId) {
      var calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Time);
      var timelineSortIds = WebInspector.NetworkLogViewColumns.TimelineSortIds;
      if (sortId === timelineSortIds.Duration || sortId === timelineSortIds.Latency)
        calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Duration);
      this._networkLogView.setCalculator(calculator);

      this._activeTimelineSortId = sortId;
      this._dataGrid.markColumnAsSortedBy('timeline', WebInspector.DataGrid.Order.Ascending);
      this._sortHandler();
    }
  }

  _manageCustomHeaderDialog() {
    var customHeaders = [];
    for (var columnConfig of this._columns) {
      if (columnConfig.isResponseHeader)
        customHeaders.push({title: columnConfig.title, editable: columnConfig.isCustomHeader});
    }
    var manageCustomHeaders = new WebInspector.NetworkManageCustomHeadersView(
        customHeaders, headerTitle => !!this._addCustomHeader(headerTitle), this._changeCustomHeader.bind(this),
        this._removeCustomHeader.bind(this));
    var dialog = new WebInspector.Dialog();
    manageCustomHeaders.show(dialog.element);
    dialog.setWrapsContent(true);
    dialog.show();
  }

  /**
   * @param {string} headerId
   * @return {boolean}
   */
  _removeCustomHeader(headerId) {
    headerId = headerId.toLowerCase();
    var index = this._columns.findIndex(columnConfig => columnConfig.id === headerId);
    if (index === -1)
      return false;
    var columnConfig = this._columns.splice(index, 1);
    this._dataGrid.removeColumn(headerId);
    this._saveColumns();
    this._updateColumns();
    return true;
  }

  /**
   * @param {string} headerTitle
   * @param {string=} headerId
   * @param {number=} index
   * @return {?WebInspector.NetworkLogViewColumns.Descriptor}
   */
  _addCustomHeader(headerTitle, headerId, index) {
    if (!headerId)
      headerId = headerTitle.toLowerCase();
    if (index === undefined)
      index = this._columns.length - 1;

    var currentColumnConfig = this._columns.find(columnConfig => columnConfig.id === headerId);
    if (currentColumnConfig)
      return null;

    var columnConfig = /** @type {!WebInspector.NetworkLogViewColumns.Descriptor} */ (
        Object.assign(/** @type {!Object} */ ({}), WebInspector.NetworkLogViewColumns._defaultColumnConfig, {
          id: headerId,
          title: headerTitle,
          isResponseHeader: true,
          isCustomHeader: true,
          visible: true,
          sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, headerId)
        }));
    this._columns.splice(index, 0, columnConfig);
    if (this._dataGrid)
      this._dataGrid.addColumn(WebInspector.NetworkLogViewColumns._convertToDataGridDescriptor(columnConfig), index);
    this._saveColumns();
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
    if (!newHeaderId)
      newHeaderId = newHeaderTitle.toLowerCase();
    oldHeaderId = oldHeaderId.toLowerCase();

    var oldIndex = this._columns.findIndex(columnConfig => columnConfig.id === oldHeaderId);
    var oldColumnConfig = this._columns[oldIndex];
    var currentColumnConfig = this._columns.find(columnConfig => columnConfig.id === newHeaderId);
    if (!oldColumnConfig || (currentColumnConfig && oldHeaderId !== newHeaderId))
      return false;

    this._removeCustomHeader(oldHeaderId);
    this._addCustomHeader(newHeaderTitle, newHeaderId, oldIndex);
    return true;
  }

  /**
   * @param {!Element} element
   * @param {!Event} event
   * @return {!Element|!AnchorBox|undefined}
   */
  _getPopoverAnchor(element, event) {
    if (!this._gridMode)
      return;
    var anchor = element.enclosingNodeOrSelfWithClass('network-script-initiated');
    if (anchor && anchor.request) {
      var initiator = /** @type {!WebInspector.NetworkRequest} */ (anchor.request).initiator();
      if (initiator && initiator.stack)
        return anchor;
    }
  }

  /**
   * @param {!Element} anchor
   * @param {!WebInspector.Popover} popover
   */
  _showPopover(anchor, popover) {
    var request = /** @type {!WebInspector.NetworkRequest} */ (anchor.request);
    var initiator = /** @type {!Protocol.Network.Initiator} */ (request.initiator());
    var content = WebInspector.DOMPresentationUtils.buildStackTracePreviewContents(
        request.target(), this._popupLinkifier, initiator.stack);
    popover.setCanShrink(true);
    popover.showForAnchor(content, anchor);
  }

  _onHidePopover() {
    this._popupLinkifier.reset();
  }

  /**
   * @param {!Array<number>} times
   * @param {string} className
   */
  addEventDividers(times, className) {
    // TODO(allada) Remove this and pass in the color.
    var color = 'transparent';
    switch (className) {
      case 'network-blue-divider':
        color = 'hsla(240, 100%, 80%, 0.7)';
        break;
      case 'network-red-divider':
        color = 'rgba(255, 0, 0, 0.5)';
        break;
      default:
        return;
    }
    var currentTimes = this._eventDividers.get(color) || [];
    this._eventDividers.set(color, currentTimes.concat(times));
    this._networkLogView.scheduleRefresh();
  }

  hideEventDividers() {
    this._eventDividersShown = true;
    this._redrawTimelineColumn();
  }

  showEventDividers() {
    this._eventDividersShown = false;
    this._redrawTimelineColumn();
  }

  /**
   * @param {number} time
   */
  selectFilmStripFrame(time) {
    this._eventDividers.set(WebInspector.NetworkLogViewColumns._filmStripDividerColor, [time]);
    this._redrawTimelineColumn();
  }

  clearFilmStripFrame() {
    this._eventDividers.delete(WebInspector.NetworkLogViewColumns._filmStripDividerColor);
    this._redrawTimelineColumn();
  }
};

WebInspector.NetworkLogViewColumns._initialSortColumn = 'timeline';

/**
 * @typedef {{
 *     id: string,
 *     title: string,
 *     titleDOMFragment: (!DocumentFragment|undefined),
 *     subtitle: (string|null),
 *     visible: boolean,
 *     weight: number,
 *     hideable: boolean,
 *     nonSelectable: boolean,
 *     sortable: boolean,
 *     align: (?WebInspector.DataGrid.Align|undefined),
 *     isResponseHeader: boolean,
 *     sortingFunction: (!function(!WebInspector.NetworkDataGridNode, !WebInspector.NetworkDataGridNode):number|undefined),
 *     isCustomHeader: boolean
 * }}
 */
WebInspector.NetworkLogViewColumns.Descriptor;

/** @enum {string} */
WebInspector.NetworkLogViewColumns._calculatorTypes = {
  Duration: 'Duration',
  Time: 'Time'
};

/**
 * @type {!Object} column
 */
WebInspector.NetworkLogViewColumns._defaultColumnConfig = {
  subtitle: null,
  visible: false,
  weight: 6,
  sortable: true,
  hideable: true,
  nonSelectable: true,
  isResponseHeader: false,
  alwaysVisible: false,
  isCustomHeader: false
};

/**
 * @type {!Array.<!WebInspector.NetworkLogViewColumns.Descriptor>} column
 */
WebInspector.NetworkLogViewColumns._defaultColumns = [
  {
    id: 'name',
    title: WebInspector.UIString('Name'),
    subtitle: WebInspector.UIString('Path'),
    visible: true,
    weight: 20,
    hideable: false,
    nonSelectable: false,
    alwaysVisible: true,
    sortingFunction: WebInspector.NetworkDataGridNode.NameComparator
  },
  {
    id: 'method',
    title: WebInspector.UIString('Method'),
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'requestMethod')
  },
  {
    id: 'status',
    title: WebInspector.UIString('Status'),
    visible: true,
    subtitle: WebInspector.UIString('Text'),
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'statusCode')
  },
  {
    id: 'protocol',
    title: WebInspector.UIString('Protocol'),
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'protocol')
  },
  {
    id: 'scheme',
    title: WebInspector.UIString('Scheme'),
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'scheme')
  },
  {
    id: 'domain',
    title: WebInspector.UIString('Domain'),
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'domain')
  },
  {
    id: 'remoteaddress',
    title: WebInspector.UIString('Remote Address'),
    weight: 10,
    align: WebInspector.DataGrid.Align.Right,
    sortingFunction: WebInspector.NetworkDataGridNode.RemoteAddressComparator
  },
  {
    id: 'type',
    title: WebInspector.UIString('Type'),
    visible: true,
    sortingFunction: WebInspector.NetworkDataGridNode.TypeComparator
  },
  {
    id: 'initiator',
    title: WebInspector.UIString('Initiator'),
    visible: true,
    weight: 10,
    sortingFunction: WebInspector.NetworkDataGridNode.InitiatorComparator
  },
  {
    id: 'cookies',
    title: WebInspector.UIString('Cookies'),
    align: WebInspector.DataGrid.Align.Right,
    sortingFunction: WebInspector.NetworkDataGridNode.RequestCookiesCountComparator
  },
  {
    id: 'setcookies',
    title: WebInspector.UIString('Set Cookies'),
    align: WebInspector.DataGrid.Align.Right,
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseCookiesCountComparator
  },
  {
    id: 'size',
    title: WebInspector.UIString('Size'),
    visible: true,
    subtitle: WebInspector.UIString('Content'),
    align: WebInspector.DataGrid.Align.Right,
    sortingFunction: WebInspector.NetworkDataGridNode.SizeComparator
  },
  {
    id: 'time',
    title: WebInspector.UIString('Time'),
    visible: true,
    subtitle: WebInspector.UIString('Latency'),
    align: WebInspector.DataGrid.Align.Right,
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'duration')
  },
  {
    id: 'priority',
    title: WebInspector.UIString('Priority'),
    sortingFunction: WebInspector.NetworkDataGridNode.InitialPriorityComparator
  },
  {
    id: 'connectionid',
    title: WebInspector.UIString('Connection ID'),
    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, 'connectionId')
  },
  {
    id: 'cache-control',
    isResponseHeader: true,
    title: WebInspector.UIString('Cache-Control'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'cache-control')
  },
  {
    id: 'connection',
    isResponseHeader: true,
    title: WebInspector.UIString('Connection'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'connection')
  },
  {
    id: 'content-encoding',
    isResponseHeader: true,
    title: WebInspector.UIString('Content-Encoding'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'content-encoding')
  },
  {
    id: 'content-length',
    isResponseHeader: true,
    title: WebInspector.UIString('Content-Length'),
    align: WebInspector.DataGrid.Align.Right,
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderNumberComparator.bind(null, 'content-length')
  },
  {
    id: 'etag',
    isResponseHeader: true,
    title: WebInspector.UIString('ETag'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'etag')
  },
  {
    id: 'keep-alive',
    isResponseHeader: true,
    title: WebInspector.UIString('Keep-Alive'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'keep-alive')
  },
  {
    id: 'last-modified',
    isResponseHeader: true,
    title: WebInspector.UIString('Last-Modified'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderDateComparator.bind(null, 'last-modified')
  },
  {
    id: 'server',
    isResponseHeader: true,
    title: WebInspector.UIString('Server'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'server')
  },
  {
    id: 'vary',
    isResponseHeader: true,
    title: WebInspector.UIString('Vary'),
    sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, 'vary')
  },
  // This header is a placeholder to let datagrid know that it can be sorted by this column, but never shown.
  {id: 'timeline', title: '', visible: false, hideable: false}
];

WebInspector.NetworkLogViewColumns._filmStripDividerColor = '#fccc49';

/**
 * @enum {string}
 */
WebInspector.NetworkLogViewColumns.TimelineSortIds = {
  StartTime: 'startTime',
  ResponseTime: 'responseReceivedTime',
  EndTime: 'endTime',
  Duration: 'duration',
  Latency: 'latency'
};
