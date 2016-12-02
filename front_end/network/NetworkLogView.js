/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008, 2009 Anthony Ricaud <rik@webkit.org>
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/**
 * @implements {UI.Searchable}
 * @implements {SDK.TargetManager.Observer}
 * @unrestricted
 */
Network.NetworkLogView = class extends UI.VBox {
  /**
   * @param {!UI.FilterBar} filterBar
   * @param {!Element} progressBarContainer
   * @param {!Common.Setting} networkLogLargeRowsSetting
   */
  constructor(filterBar, progressBarContainer, networkLogLargeRowsSetting) {
    super();
    this.setMinimumSize(50, 64);
    this.registerRequiredCSS('network/networkLogView.css');

    this._networkHideDataURLSetting = Common.settings.createSetting('networkHideDataURL', false);
    this._networkResourceTypeFiltersSetting = Common.settings.createSetting('networkResourceTypeFilters', {});
    this._networkShowPrimaryLoadWaterfallSetting =
        Common.settings.createSetting('networkShowPrimaryLoadWaterfall', false);

    this._filterBar = filterBar;
    this._progressBarContainer = progressBarContainer;
    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this._networkLogLargeRowsSetting.addChangeListener(updateRowHeight.bind(this), this);

    /** @type {!Network.NetworkTransferTimeCalculator} */
    this._timeCalculator = new Network.NetworkTransferTimeCalculator();
    /** @type {!Network.NetworkTransferDurationCalculator} */
    this._durationCalculator = new Network.NetworkTransferDurationCalculator();
    this._calculator = this._timeCalculator;

    /**
     * @this {Network.NetworkLogView}
     */
    function updateRowHeight() {
      /** @type {number} */
      this._rowHeight = !!this._networkLogLargeRowsSetting.get() ? 41 : 21;
    }
    updateRowHeight.call(this);

    this._columns = new Network.NetworkLogViewColumns(
        this, this._timeCalculator, this._durationCalculator, networkLogLargeRowsSetting);

    /** @type {!Map.<string, !Network.NetworkDataGridNode>} */
    this._nodesByRequestId = new Map();
    /** @type {!Object.<string, boolean>} */
    this._staleRequestIds = {};
    /** @type {number} */
    this._mainRequestLoadTime = -1;
    /** @type {number} */
    this._mainRequestDOMContentLoadedTime = -1;
    this._matchedRequestCount = 0;
    this._highlightedSubstringChanges = [];

    /** @type {!Array.<!Network.NetworkLogView.Filter>} */
    this._filters = [];
    /** @type {?Network.NetworkLogView.Filter} */
    this._timeFilter = null;
    this._hoveredNode = null;

    this._currentMatchedRequestNode = null;
    this._currentMatchedRequestIndex = -1;

    /** @type {!Components.Linkifier} */
    this.linkifier = new Components.Linkifier();

    this._recording = false;
    this._preserveLog = false;

    this._headerHeight = 0;

    this._addFilters();
    this._resetSuggestionBuilder();
    this._initializeView();

    Common.moduleSetting('networkColorCodeResourceTypes').addChangeListener(this._invalidateAllItems, this);

    SDK.targetManager.observeTargets(this);
    SDK.targetManager.addModelListener(
        SDK.NetworkManager, SDK.NetworkManager.Events.RequestStarted, this._onRequestStarted, this);
    SDK.targetManager.addModelListener(
        SDK.NetworkManager, SDK.NetworkManager.Events.RequestUpdated, this._onRequestUpdated, this);
    SDK.targetManager.addModelListener(
        SDK.NetworkManager, SDK.NetworkManager.Events.RequestFinished, this._onRequestUpdated, this);
  }

  /**
   * @param {!Network.NetworkLogView.Filter} filter
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _negativeFilter(filter, request) {
    return !filter(request);
  }

  /**
   * @param {?RegExp} regex
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestPathFilter(regex, request) {
    if (!regex)
      return false;

    return regex.test(request.path() + '/' + request.name());
  }

  /**
   * @param {string} domain
   * @return {!Array.<string>}
   */
  static _subdomains(domain) {
    var result = [domain];
    var indexOfPeriod = domain.indexOf('.');
    while (indexOfPeriod !== -1) {
      result.push('*' + domain.substring(indexOfPeriod));
      indexOfPeriod = domain.indexOf('.', indexOfPeriod + 1);
    }
    return result;
  }

  /**
   * @param {string} value
   * @return {!Network.NetworkLogView.Filter}
   */
  static _createRequestDomainFilter(value) {
    /**
     * @param {string} string
     * @return {string}
     */
    function escapeForRegExp(string) {
      return string.escapeForRegExp();
    }
    var escapedPattern = value.split('*').map(escapeForRegExp).join('.*');
    return Network.NetworkLogView._requestDomainFilter.bind(null, new RegExp('^' + escapedPattern + '$', 'i'));
  }

  /**
   * @param {!RegExp} regex
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestDomainFilter(regex, request) {
    return regex.test(request.domain);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _runningRequestFilter(request) {
    return !request.finished;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _fromCacheRequestFilter(request) {
    return request.cached();
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestResponseHeaderFilter(value, request) {
    return request.responseHeaderValue(value) !== undefined;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestMethodFilter(value, request) {
    return request.requestMethod === value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestMimeTypeFilter(value, request) {
    return request.mimeType === value;
  }

  /**
   * @param {!Network.NetworkLogView.MixedContentFilterValues} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestMixedContentFilter(value, request) {
    if (value === Network.NetworkLogView.MixedContentFilterValues.Displayed)
      return request.mixedContentType === 'optionally-blockable';
    else if (value === Network.NetworkLogView.MixedContentFilterValues.Blocked)
      return request.mixedContentType === 'blockable' && request.wasBlocked();
    else if (value === Network.NetworkLogView.MixedContentFilterValues.BlockOverridden)
      return request.mixedContentType === 'blockable' && !request.wasBlocked();
    else if (value === Network.NetworkLogView.MixedContentFilterValues.All)
      return request.mixedContentType !== 'none';

    return false;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSchemeFilter(value, request) {
    return request.scheme === value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSetCookieDomainFilter(value, request) {
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
      if (cookies[i].domain() === value)
        return true;
    }
    return false;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSetCookieNameFilter(value, request) {
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
      if (cookies[i].name() === value)
        return true;
    }
    return false;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSetCookieValueFilter(value, request) {
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
      if (cookies[i].value() === value)
        return true;
    }
    return false;
  }

  /**
   * @param {number} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestSizeLargerThanFilter(value, request) {
    return request.transferSize >= value;
  }

  /**
   * @param {string} value
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _statusCodeFilter(value, request) {
    return ('' + request.statusCode) === value;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static HTTPRequestsFilter(request) {
    return request.parsedURL.isValid && (request.scheme in Network.NetworkLogView.HTTPSchemas);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static FinishedRequestsFilter(request) {
    return request.finished;
  }

  /**
   * @param {number} windowStart
   * @param {number} windowEnd
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  static _requestTimeFilter(windowStart, windowEnd, request) {
    if (request.issueTime() > windowEnd)
      return false;
    if (request.endTime !== -1 && request.endTime < windowStart)
      return false;
    return true;
  }

  /**
   * @return {number}
   */
  headerHeight() {
    return this._headerHeight;
  }

  /**
   * @param {boolean} recording
   */
  setRecording(recording) {
    this._recording = recording;
    this._updateSummaryBar();
  }

  /**
   * @param {boolean} preserveLog
   */
  setPreserveLog(preserveLog) {
    this._preserveLog = preserveLog;
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetAdded(target) {
    if (!target.parentTarget()) {
      var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
      if (resourceTreeModel) {
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this);
        resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
        resourceTreeModel.addEventListener(
            SDK.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
      }
    }
    var networkLog = SDK.NetworkLog.fromTarget(target);
    if (networkLog)
      networkLog.requests().forEach(this._appendRequest.bind(this));
  }

  /**
   * @override
   * @param {!SDK.Target} target
   */
  targetRemoved(target) {
    if (!target.parentTarget()) {
      var resourceTreeModel = SDK.ResourceTreeModel.fromTarget(target);
      if (resourceTreeModel) {
        resourceTreeModel.removeEventListener(
            SDK.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this);
        resourceTreeModel.removeEventListener(SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
        resourceTreeModel.removeEventListener(
            SDK.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
      }
    }
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  setWindow(start, end) {
    if (!start && !end) {
      this._timeFilter = null;
      this._timeCalculator.setWindow(null);
    } else {
      this._timeFilter = Network.NetworkLogView._requestTimeFilter.bind(null, start, end);
      this._timeCalculator.setWindow(new Network.NetworkTimeBoundary(start, end));
    }
    this._filterRequests();
  }

  clearSelection() {
    if (this._dataGrid.selectedNode)
      this._dataGrid.selectedNode.deselect();
  }

  _addFilters() {
    this._textFilterUI = new UI.TextFilterUI(true);
    this._textFilterUI.addEventListener(UI.FilterUI.Events.FilterChanged, this._filterChanged, this);
    this._filterBar.addFilter(this._textFilterUI);

    var dataURLSetting = this._networkHideDataURLSetting;
    this._dataURLFilterUI =
        new UI.CheckboxFilterUI('hide-data-url', Common.UIString('Hide data URLs'), true, dataURLSetting);
    this._dataURLFilterUI.addEventListener(UI.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
    this._filterBar.addFilter(this._dataURLFilterUI);

    var filterItems = [];
    for (var categoryId in Common.resourceCategories) {
      var category = Common.resourceCategories[categoryId];
      filterItems.push({name: category.title, label: category.shortTitle, title: category.title});
    }
    this._resourceCategoryFilterUI = new UI.NamedBitSetFilterUI(filterItems, this._networkResourceTypeFiltersSetting);
    this._resourceCategoryFilterUI.addEventListener(
        UI.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
    this._filterBar.addFilter(this._resourceCategoryFilterUI);
  }

  _resetSuggestionBuilder() {
    this._suggestionBuilder = new Network.FilterSuggestionBuilder(Network.NetworkLogView._searchKeys);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.Is, Network.NetworkLogView.IsFilterType.Running);
    this._suggestionBuilder.addItem(
        Network.NetworkLogView.FilterType.Is, Network.NetworkLogView.IsFilterType.FromCache);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.LargerThan, '100');
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.LargerThan, '10k');
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.LargerThan, '1M');
    this._textFilterUI.setSuggestionBuilder(this._suggestionBuilder);
  }

  /**
   * @param {!Common.Event} event
   */
  _filterChanged(event) {
    this.removeAllNodeHighlights();
    this._parseFilterQuery(this._textFilterUI.value());
    this._filterRequests();
  }

  _initializeView() {
    this.element.id = 'network-container';
    this._setupDataGrid();

    this._columns.show(this.element);

    this._summaryBarElement = this.element.createChild('div', 'network-summary-bar');

    this._columns.sortByCurrentColumn();
  }

  _showRecordingHint() {
    this._hideRecordingHint();
    this._recordingHint = this.element.createChild('div', 'network-status-pane fill');
    var hintText = this._recordingHint.createChild('div', 'recording-hint');
    var reloadShortcutNode = this._recordingHint.createChild('b');
    reloadShortcutNode.textContent = UI.shortcutRegistry.shortcutDescriptorsForAction('main.reload')[0].name;

    if (this._recording) {
      var recordingText = hintText.createChild('span');
      recordingText.textContent = Common.UIString('Recording network activity\u2026');
      hintText.createChild('br');
      hintText.appendChild(
          UI.formatLocalized('Perform a request or hit %s to record the reload.', [reloadShortcutNode]));
    } else {
      var recordNode = hintText.createChild('b');
      recordNode.textContent = UI.shortcutRegistry.shortcutTitleForAction('network.toggle-recording');
      hintText.appendChild(UI.formatLocalized(
          'Record (%s) or reload (%s) to display network activity.', [recordNode, reloadShortcutNode]));
    }
  }

  _hideRecordingHint() {
    if (this._recordingHint)
      this._recordingHint.remove();
    delete this._recordingHint;
  }

  /**
   * @override
   * @return {!Array.<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    if (!this._dataGrid)  // Not initialized yet.
      return [];
    return [this._dataGrid.scrollContainer];
  }

  _setupDataGrid() {
    /** @type {!UI.SortableDataGrid} */
    this._dataGrid = this._columns.dataGrid();
    this._dataGrid.setRowContextMenuCallback(
        (contextMenu, node) => this.handleContextMenuForRequest(contextMenu, node.request()));
    this._dataGrid.setStickToBottom(true);
    this._dataGrid.setName('networkLog');
    this._dataGrid.setResizeMethod(UI.DataGrid.ResizeMethod.Last);
    this._dataGrid.element.classList.add('network-log-grid');
    this._dataGrid.element.addEventListener('mousedown', this._dataGridMouseDown.bind(this), true);
    this._dataGrid.element.addEventListener('mousemove', this._dataGridMouseMove.bind(this), true);
    this._dataGrid.element.addEventListener('mouseleave', this._dataGridMouseLeave.bind(this), true);
  }

  /**
   * @param {!Event} event
   */
  _dataGridMouseMove(event) {
    var node = /** @type {?Network.NetworkDataGridNode} */ (
        this._dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target)));
    var highlightInitiatorChain = event.shiftKey;
    this._setHoveredNode(node, highlightInitiatorChain);
    this._highlightInitiatorChain((highlightInitiatorChain && node) ? node.request() : null);
  }

  _dataGridMouseLeave() {
    this._setHoveredNode(null);
    this._highlightInitiatorChain(null);
  }

  /**
   * @param {?Network.NetworkDataGridNode} node
   * @param {boolean} highlightInitiatorChain
   */
  setHoveredNode(node, highlightInitiatorChain) {
    this._setHoveredNode(node, highlightInitiatorChain);
    this._highlightInitiatorChain((node && highlightInitiatorChain) ? node.request() : null);
  }

  /**
   * @param {?Network.NetworkDataGridNode} node
   * @param {boolean=} highlightInitiatorChain
   */
  _setHoveredNode(node, highlightInitiatorChain) {
    if (this._hoveredNode)
      this._hoveredNode.element().classList.remove('hover');
    this._hoveredNode = node;
    if (this._hoveredNode)
      this._hoveredNode.element().classList.add('hover');
    this._columns.setHoveredNode(this._hoveredNode, !!highlightInitiatorChain);
  }

  /**
   * @param {!Event} event
   */
  _dataGridMouseDown(event) {
    if (!this._dataGrid.selectedNode && event.button)
      event.consume();
  }

  /**
   * @param {?SDK.NetworkRequest} request
   */
  _highlightInitiatorChain(request) {
    if (this._requestWithHighlightedInitiators === request)
      return;
    this._requestWithHighlightedInitiators = request;

    if (!request) {
      for (var node of this._nodesByRequestId.values()) {
        if (!node.dataGrid)
          continue;
        node.element().classList.remove('network-node-on-initiator-path', 'network-node-on-initiated-path');
      }
      return;
    }

    var initiatorGraph = request.initiatorGraph();
    for (var node of this._nodesByRequestId.values()) {
      if (!node.dataGrid)
        continue;
      node.element().classList.toggle(
          'network-node-on-initiator-path',
          node.request() !== request && initiatorGraph.initiators.has(node.request()));
      node.element().classList.toggle(
          'network-node-on-initiated-path', node.request() !== request && initiatorGraph.initiated.has(node.request()));
    }
  }

  _updateSummaryBar() {
    var requestsNumber = this._nodesByRequestId.size;

    if (!requestsNumber) {
      this._showRecordingHint();
      return;
    }
    this._hideRecordingHint();

    var transferSize = 0;
    var selectedRequestsNumber = 0;
    var selectedTransferSize = 0;
    var baseTime = -1;
    var maxTime = -1;
    var nodes = this._nodesByRequestId.valuesArray();
    for (var i = 0; i < nodes.length; ++i) {
      var request = nodes[i].request();
      var requestTransferSize = request.transferSize;
      transferSize += requestTransferSize;
      if (!nodes[i][Network.NetworkLogView._isFilteredOutSymbol]) {
        selectedRequestsNumber++;
        selectedTransferSize += requestTransferSize;
      }
      if (request.url === request.target().inspectedURL() && request.resourceType() === Common.resourceTypes.Document)
        baseTime = request.startTime;
      if (request.endTime > maxTime)
        maxTime = request.endTime;
    }

    var summaryBar = this._summaryBarElement;
    summaryBar.removeChildren();
    var separator = '\u2002\u2758\u2002';
    var text = '';
    /**
     * @param {string} chunk
     * @return {!Element}
     */
    function appendChunk(chunk) {
      var span = summaryBar.createChild('span');
      span.textContent = chunk;
      text += chunk;
      return span;
    }

    if (selectedRequestsNumber !== requestsNumber) {
      appendChunk(Common.UIString('%d / %d requests', selectedRequestsNumber, requestsNumber));
      appendChunk(separator);
      appendChunk(Common.UIString(
          '%s / %s transferred', Number.bytesToString(selectedTransferSize), Number.bytesToString(transferSize)));
    } else {
      appendChunk(Common.UIString('%d requests', requestsNumber));
      appendChunk(separator);
      appendChunk(Common.UIString('%s transferred', Number.bytesToString(transferSize)));
    }
    if (baseTime !== -1 && maxTime !== -1) {
      appendChunk(separator);
      appendChunk(Common.UIString('Finish: %s', Number.secondsToString(maxTime - baseTime)));
      if (this._mainRequestDOMContentLoadedTime !== -1 && this._mainRequestDOMContentLoadedTime > baseTime) {
        appendChunk(separator);
        var domContentLoadedText = Common.UIString(
            'DOMContentLoaded: %s', Number.secondsToString(this._mainRequestDOMContentLoadedTime - baseTime));
        appendChunk(domContentLoadedText).classList.add('summary-blue');
      }
      if (this._mainRequestLoadTime !== -1) {
        appendChunk(separator);
        var loadText = Common.UIString('Load: %s', Number.secondsToString(this._mainRequestLoadTime - baseTime));
        appendChunk(loadText).classList.add('summary-red');
      }
    }
    summaryBar.title = text;
  }

  scheduleRefresh() {
    if (this._needsRefresh)
      return;

    this._needsRefresh = true;

    if (this.isShowing() && !this._refreshRequestId)
      this._refreshRequestId = this.element.window().requestAnimationFrame(this._refresh.bind(this));
  }

  /**
   * @param {!Array<number>} times
   */
  addFilmStripFrames(times) {
    this._columns.addEventDividers(times, 'network-frame-divider');
  }

  /**
   * @param {number} time
   */
  selectFilmStripFrame(time) {
    this._columns.selectFilmStripFrame(time);
  }

  clearFilmStripFrame() {
    this._columns.clearFilmStripFrame();
  }

  _refreshIfNeeded() {
    if (this._needsRefresh)
      this._refresh();
  }

  _invalidateAllItems() {
    var requestIds = this._nodesByRequestId.keysArray();
    for (var i = 0; i < requestIds.length; ++i)
      this._staleRequestIds[requestIds[i]] = true;
    this._refresh();
  }

  /**
   * @return {!Network.NetworkTimeCalculator}
   */
  timeCalculator() {
    return this._timeCalculator;
  }

  /**
   * @return {!Network.NetworkTimeCalculator}
   */
  calculator() {
    return this._calculator;
  }

  /**
   * @param {!Network.NetworkTimeCalculator} x
   */
  setCalculator(x) {
    if (!x || this._calculator === x)
      return;

    if (this._calculator !== x) {
      this._calculator = x;
      this._columns.setCalculator(this._calculator);
    }
    this._calculator.reset();

    if (this._calculator.startAtZero)
      this._columns.hideEventDividers();
    else
      this._columns.showEventDividers();

    this._invalidateAllItems();
  }

  /**
   * @param {!Common.Event} event
   */
  _loadEventFired(event) {
    if (!this._recording)
      return;

    var data = /** @type {number} */ (event.data);
    if (data) {
      this._mainRequestLoadTime = data;
      this._columns.addEventDividers([data], 'network-red-divider');
    }
  }

  /**
   * @param {!Common.Event} event
   */
  _domContentLoadedEventFired(event) {
    if (!this._recording)
      return;
    var data = /** @type {number} */ (event.data);
    if (data) {
      this._mainRequestDOMContentLoadedTime = data;
      this._columns.addEventDividers([data], 'network-blue-divider');
    }
  }

  /**
   * @override
   */
  wasShown() {
    this._refreshIfNeeded();
    this._columns.wasShown();
  }

  /**
   * @override
   */
  willHide() {
    this._columns.willHide();
  }

  /**
   * @return {!Array<!Network.NetworkDataGridNode>}
   */
  flatNodesList() {
    return this._dataGrid.rootNode().flattenChildren();
  }

  _refresh() {
    this._needsRefresh = false;

    if (this._refreshRequestId) {
      this.element.window().cancelAnimationFrame(this._refreshRequestId);
      delete this._refreshRequestId;
    }

    this.removeAllNodeHighlights();

    var oldBoundary = this.calculator().boundary();
    this._timeCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
    this._durationCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
    this._timeCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);
    this._durationCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);

    var dataGrid = this._dataGrid;
    var rootNode = dataGrid.rootNode();
    /** @type {!Array<!Network.NetworkDataGridNode> } */
    var nodesToInsert = [];
    /** @type {!Array<!Network.NetworkDataGridNode> } */
    var nodesToRefresh = [];
    for (var requestId in this._staleRequestIds) {
      var node = this._nodesByRequestId.get(requestId);
      if (!node)
        continue;
      var isFilteredOut = !this._applyFilter(node);
      if (isFilteredOut && node === this._hoveredNode)
        this._setHoveredNode(null);
      if (node[Network.NetworkLogView._isFilteredOutSymbol] !== isFilteredOut) {
        if (!node[Network.NetworkLogView._isFilteredOutSymbol])
          rootNode.removeChild(node);

        node[Network.NetworkLogView._isFilteredOutSymbol] = isFilteredOut;

        if (!node[Network.NetworkLogView._isFilteredOutSymbol])
          nodesToInsert.push(node);
      }
      if (!isFilteredOut)
        nodesToRefresh.push(node);
      var request = node.request();
      this._timeCalculator.updateBoundaries(request);
      this._durationCalculator.updateBoundaries(request);
    }

    for (var i = 0; i < nodesToInsert.length; ++i) {
      var node = nodesToInsert[i];
      var request = node.request();
      dataGrid.insertChild(node);
      node[Network.NetworkLogView._isMatchingSearchQuerySymbol] = this._matchRequest(request);
    }

    for (var node of nodesToRefresh)
      node.refresh();

    this._highlightNthMatchedRequestForSearch(
        this._updateMatchCountAndFindMatchIndex(this._currentMatchedRequestNode), false);

    this._staleRequestIds = {};
    this._updateSummaryBar();

    this._columns.dataChanged();
  }

  reset() {
    this._requestWithHighlightedInitiators = null;
    this.dispatchEventToListeners(Network.NetworkLogView.Events.RequestSelected, null);

    this._clearSearchMatchedList();

    this._setHoveredNode(null);
    this._columns.reset();

    this._timeFilter = null;
    this._calculator.reset();

    this._timeCalculator.setWindow(null);

    var nodes = this._nodesByRequestId.valuesArray();
    for (var i = 0; i < nodes.length; ++i)
      nodes[i].dispose();

    this._nodesByRequestId.clear();
    this._staleRequestIds = {};
    this._resetSuggestionBuilder();

    this._mainRequestLoadTime = -1;
    this._mainRequestDOMContentLoadedTime = -1;

    if (this._dataGrid) {
      this._dataGrid.rootNode().removeChildren();
      this._updateSummaryBar();
    }
  }

  /**
   * @param {string} filterString
   */
  setTextFilterValue(filterString) {
    this._textFilterUI.setValue(filterString);
    this._textFilterUI.setRegexChecked(false);
    this._dataURLFilterUI.setChecked(false);
    this._resourceCategoryFilterUI.reset();
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestStarted(event) {
    if (!this._recording)
      return;
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._appendRequest(request);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _appendRequest(request) {
    var node = new Network.NetworkDataGridNode(this, request);
    node[Network.NetworkLogView._isFilteredOutSymbol] = true;
    node[Network.NetworkLogView._isMatchingSearchQuerySymbol] = false;

    // In case of redirect request id is reassigned to a redirected
    // request and we need to update _nodesByRequestId and search results.
    var originalRequestNode = this._nodesByRequestId.get(request.requestId);
    if (originalRequestNode)
      this._nodesByRequestId.set(originalRequestNode.request().requestId, originalRequestNode);
    this._nodesByRequestId.set(request.requestId, node);

    // Pull all the redirects of the main request upon commit load.
    if (request.redirects) {
      for (var i = 0; i < request.redirects.length; ++i)
        this._refreshRequest(request.redirects[i]);
    }

    this._refreshRequest(request);
  }

  /**
   * @param {!Common.Event} event
   */
  _onRequestUpdated(event) {
    var request = /** @type {!SDK.NetworkRequest} */ (event.data);
    this._refreshRequest(request);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _refreshRequest(request) {
    if (!this._nodesByRequestId.get(request.requestId))
      return;

    Network.NetworkLogView._subdomains(request.domain)
        .forEach(
            this._suggestionBuilder.addItem.bind(this._suggestionBuilder, Network.NetworkLogView.FilterType.Domain));
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.Method, request.requestMethod);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.MimeType, request.mimeType);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.Scheme, '' + request.scheme);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.StatusCode, '' + request.statusCode);

    if (request.mixedContentType !== 'none') {
      this._suggestionBuilder.addItem(
          Network.NetworkLogView.FilterType.MixedContent, Network.NetworkLogView.MixedContentFilterValues.All);
    }

    if (request.mixedContentType === 'optionally-blockable') {
      this._suggestionBuilder.addItem(
          Network.NetworkLogView.FilterType.MixedContent, Network.NetworkLogView.MixedContentFilterValues.Displayed);
    }

    if (request.mixedContentType === 'blockable') {
      var suggestion = request.wasBlocked() ? Network.NetworkLogView.MixedContentFilterValues.Blocked :
                                              Network.NetworkLogView.MixedContentFilterValues.BlockOverridden;
      this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.MixedContent, suggestion);
    }

    var responseHeaders = request.responseHeaders;
    for (var i = 0, l = responseHeaders.length; i < l; ++i)
      this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.HasResponseHeader, responseHeaders[i].name);
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
      var cookie = cookies[i];
      this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.SetCookieDomain, cookie.domain());
      this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.SetCookieName, cookie.name());
      this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.SetCookieValue, cookie.value());
    }

    this._staleRequestIds[request.requestId] = true;
    this.dispatchEventToListeners(Network.NetworkLogView.Events.UpdateRequest, request);
    this.scheduleRefresh();
  }

  /**
   * @param {!Common.Event} event
   */
  _mainFrameNavigated(event) {
    if (!this._recording)
      return;

    var frame = /** @type {!SDK.ResourceTreeFrame} */ (event.data);
    var loaderId = frame.loaderId;

    // Pick provisional load requests.
    var requestsToPick = [];
    var networkLog = SDK.NetworkLog.fromTarget(frame.target());
    var requests = networkLog ? networkLog.requests() : [];
    for (var i = 0; i < requests.length; ++i) {
      var request = requests[i];
      if (request.loaderId === loaderId)
        requestsToPick.push(request);
    }

    if (!this._preserveLog) {
      this.reset();
      for (var i = 0; i < requestsToPick.length; ++i)
        this._appendRequest(requestsToPick[i]);
    }
    for (var i = 0; i < requestsToPick.length; ++i) {
      var request = requestsToPick[i];
      var node = this._nodesByRequestId.get(request.requestId);
      if (node) {
        node.markAsNavigationRequest();
        break;
      }
    }
  }

  /**
   * @return {number}
   */
  rowHeight() {
    return this._rowHeight;
  }

  /**
   * @param {boolean} gridMode
   */
  switchViewMode(gridMode) {
    this._columns.switchViewMode(gridMode);
  }

  /**
   * @param {!UI.ContextMenu} contextMenu
   * @param {!SDK.NetworkRequest} request
   */
  handleContextMenuForRequest(contextMenu, request) {
    contextMenu.appendApplicableItems(request);
    var copyMenu = contextMenu.appendSubMenuItem(Common.UIString('Copy'));
    if (request) {
      copyMenu.appendItem(
          UI.copyLinkAddressLabel(), InspectorFrontendHost.copyText.bind(InspectorFrontendHost, request.contentURL()));
      copyMenu.appendSeparator();

      if (request.requestHeadersText()) {
        copyMenu.appendItem(
            Common.UIString.capitalize('Copy ^request ^headers'), this._copyRequestHeaders.bind(this, request));
      }
      if (request.responseHeadersText) {
        copyMenu.appendItem(
            Common.UIString.capitalize('Copy ^response ^headers'), this._copyResponseHeaders.bind(this, request));
      }
      if (request.finished)
        copyMenu.appendItem(Common.UIString.capitalize('Copy ^response'), this._copyResponse.bind(this, request));

      if (Host.isWin()) {
        copyMenu.appendItem(Common.UIString('Copy as cURL (cmd)'), this._copyCurlCommand.bind(this, request, 'win'));
        copyMenu.appendItem(Common.UIString('Copy as cURL (bash)'), this._copyCurlCommand.bind(this, request, 'unix'));
        copyMenu.appendItem(Common.UIString('Copy All as cURL (cmd)'), this._copyAllCurlCommand.bind(this, 'win'));
        copyMenu.appendItem(Common.UIString('Copy All as cURL (bash)'), this._copyAllCurlCommand.bind(this, 'unix'));
      } else {
        copyMenu.appendItem(Common.UIString('Copy as cURL'), this._copyCurlCommand.bind(this, request, 'unix'));
        copyMenu.appendItem(Common.UIString('Copy All as cURL'), this._copyAllCurlCommand.bind(this, 'unix'));
      }
    } else {
      copyMenu = contextMenu.appendSubMenuItem(Common.UIString('Copy'));
    }
    copyMenu.appendItem(Common.UIString.capitalize('Copy ^all as HAR'), this._copyAll.bind(this));

    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString.capitalize('Save as HAR with ^content'), this._exportAll.bind(this));

    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString.capitalize('Clear ^browser ^cache'), this._clearBrowserCache.bind(this));
    contextMenu.appendItem(Common.UIString.capitalize('Clear ^browser ^cookies'), this._clearBrowserCookies.bind(this));

    var blockedSetting = Common.moduleSetting('blockedURLs');
    if (request && Runtime.experiments.isEnabled('requestBlocking')) {  // Disabled until ready.
      contextMenu.appendSeparator();

      var urlWithoutScheme = request.parsedURL.urlWithoutScheme();
      if (urlWithoutScheme && blockedSetting.get().indexOf(urlWithoutScheme) === -1) {
        contextMenu.appendItem(
            Common.UIString.capitalize('Block ^request URL'), addBlockedURL.bind(null, urlWithoutScheme));
      }

      var domain = request.parsedURL.domain();
      if (domain && blockedSetting.get().indexOf(domain) === -1)
        contextMenu.appendItem(Common.UIString.capitalize('Block ^request ^domain'), addBlockedURL.bind(null, domain));

      function addBlockedURL(url) {
        var list = blockedSetting.get();
        list.push(url);
        blockedSetting.set(list);
        UI.viewManager.showView('network.blocked-urls');
      }
    }

    if (request && request.resourceType() === Common.resourceTypes.XHR) {
      contextMenu.appendSeparator();
      contextMenu.appendItem(Common.UIString('Replay XHR'), request.replayXHR.bind(request));
      contextMenu.appendSeparator();
    }
  }

  _harRequests() {
    var requests = this._nodesByRequestId.valuesArray().map(function(node) {
      return node.request();
    });
    var httpRequests = requests.filter(Network.NetworkLogView.HTTPRequestsFilter);
    return httpRequests.filter(Network.NetworkLogView.FinishedRequestsFilter);
  }

  _copyAll() {
    var harArchive = {log: (new SDK.HARLog(this._harRequests())).build()};
    InspectorFrontendHost.copyText(JSON.stringify(harArchive, null, 2));
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _copyRequestHeaders(request) {
    InspectorFrontendHost.copyText(request.requestHeadersText());
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _copyResponse(request) {
    /**
     * @param {?string} content
     */
    function callback(content) {
      if (request.contentEncoded)
        content = request.asDataURL();
      InspectorFrontendHost.copyText(content || '');
    }
    request.requestContent().then(callback);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  _copyResponseHeaders(request) {
    InspectorFrontendHost.copyText(request.responseHeadersText);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {string} platform
   */
  _copyCurlCommand(request, platform) {
    InspectorFrontendHost.copyText(this._generateCurlCommand(request, platform));
  }

  /**
   * @param {string} platform
   */
  _copyAllCurlCommand(platform) {
    var requests = this._nodesByRequestId.valuesArray().map(node => node.request());
    var commands = [];
    for (var request of requests)
      commands.push(this._generateCurlCommand(request, platform));
    if (platform === 'win')
      InspectorFrontendHost.copyText(commands.join(' &\r\n'));
    else
      InspectorFrontendHost.copyText(commands.join(' ;\n'));
  }

  _exportAll() {
    var url = SDK.targetManager.mainTarget().inspectedURL();
    var parsedURL = url.asParsedURL();
    var filename = parsedURL ? parsedURL.host : 'network-log';
    var stream = new Bindings.FileOutputStream();
    stream.open(filename + '.har', openCallback.bind(this));

    /**
     * @param {boolean} accepted
     * @this {Network.NetworkLogView}
     */
    function openCallback(accepted) {
      if (!accepted)
        return;
      var progressIndicator = new UI.ProgressIndicator();
      this._progressBarContainer.appendChild(progressIndicator.element);
      var harWriter = new Network.HARWriter();
      harWriter.write(stream, this._harRequests(), progressIndicator);
    }
  }

  _clearBrowserCache() {
    if (confirm(Common.UIString('Are you sure you want to clear browser cache?')))
      SDK.multitargetNetworkManager.clearBrowserCache();
  }

  _clearBrowserCookies() {
    if (confirm(Common.UIString('Are you sure you want to clear browser cookies?')))
      SDK.multitargetNetworkManager.clearBrowserCookies();
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {boolean}
   */
  _matchRequest(request) {
    var re = this._searchRegex;
    if (!re)
      return false;

    var text = this._networkLogLargeRowsSetting.get() ? request.path() + '/' + request.name() : request.name();
    return re.test(text);
  }

  _clearSearchMatchedList() {
    this._matchedRequestCount = -1;
    this._currentMatchedRequestNode = null;
    this._removeAllHighlights();
  }

  _removeAllHighlights() {
    this.removeAllNodeHighlights();
    for (var i = 0; i < this._highlightedSubstringChanges.length; ++i)
      UI.revertDomChanges(this._highlightedSubstringChanges[i]);
    this._highlightedSubstringChanges = [];
  }

  dataGridSorted() {
    this._highlightNthMatchedRequestForSearch(
        this._updateMatchCountAndFindMatchIndex(this._currentMatchedRequestNode), false);
  }

  /**
   * @param {number} n
   * @param {boolean} reveal
   */
  _highlightNthMatchedRequestForSearch(n, reveal) {
    this._removeAllHighlights();

    /** @type {!Array.<!Network.NetworkDataGridNode>} */
    var nodes = this._dataGrid.rootNode().children;
    var matchCount = 0;
    var node = null;
    for (var i = 0; i < nodes.length; ++i) {
      if (nodes[i][Network.NetworkLogView._isMatchingSearchQuerySymbol]) {
        if (matchCount === n) {
          node = nodes[i];
          break;
        }
        matchCount++;
      }
    }
    if (!node) {
      this._currentMatchedRequestNode = null;
      return;
    }

    var request = node.request();
    if (reveal)
      Common.Revealer.reveal(request);
    var highlightedSubstringChanges = node.highlightMatchedSubstring(this._searchRegex);
    this._highlightedSubstringChanges.push(highlightedSubstringChanges);

    this._currentMatchedRequestNode = node;
    this._currentMatchedRequestIndex = n;
    this.dispatchEventToListeners(Network.NetworkLogView.Events.SearchIndexUpdated, n);
  }

  /**
   * @override
   * @param {!UI.SearchableView.SearchConfig} searchConfig
   * @param {boolean} shouldJump
   * @param {boolean=} jumpBackwards
   */
  performSearch(searchConfig, shouldJump, jumpBackwards) {
    var query = searchConfig.query;
    var currentMatchedRequestNode = this._currentMatchedRequestNode;
    this._clearSearchMatchedList();
    this._searchRegex = createPlainTextSearchRegex(query, 'i');

    /** @type {!Array.<!Network.NetworkDataGridNode>} */
    var nodes = this._dataGrid.rootNode().children;
    for (var i = 0; i < nodes.length; ++i)
      nodes[i][Network.NetworkLogView._isMatchingSearchQuerySymbol] = this._matchRequest(nodes[i].request());
    var newMatchedRequestIndex = this._updateMatchCountAndFindMatchIndex(currentMatchedRequestNode);
    if (!newMatchedRequestIndex && jumpBackwards)
      newMatchedRequestIndex = this._matchedRequestCount - 1;
    this._highlightNthMatchedRequestForSearch(newMatchedRequestIndex, shouldJump);
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsCaseSensitiveSearch() {
    return false;
  }

  /**
   * @override
   * @return {boolean}
   */
  supportsRegexSearch() {
    return true;
  }

  /**
   * @param {?Network.NetworkDataGridNode} node
   * @return {number}
   */
  _updateMatchCountAndFindMatchIndex(node) {
    /** @type {!Array.<!Network.NetworkDataGridNode>} */
    var nodes = this._dataGrid.rootNode().children;
    var matchCount = 0;
    var matchIndex = 0;
    for (var i = 0; i < nodes.length; ++i) {
      if (!nodes[i][Network.NetworkLogView._isMatchingSearchQuerySymbol])
        continue;
      if (node === nodes[i])
        matchIndex = matchCount;
      matchCount++;
    }
    if (this._matchedRequestCount !== matchCount) {
      this._matchedRequestCount = matchCount;
      this.dispatchEventToListeners(Network.NetworkLogView.Events.SearchCountUpdated, matchCount);
    }
    return matchIndex;
  }

  /**
   * @param {number} index
   * @return {number}
   */
  _normalizeSearchResultIndex(index) {
    return (index + this._matchedRequestCount) % this._matchedRequestCount;
  }

  /**
   * @param {!Network.NetworkDataGridNode} node
   * @return {boolean}
   */
  _applyFilter(node) {
    var request = node.request();
    if (this._timeFilter && !this._timeFilter(request))
      return false;
    var categoryName = request.resourceType().category().title;
    if (!this._resourceCategoryFilterUI.accept(categoryName))
      return false;
    if (this._dataURLFilterUI.checked() && request.parsedURL.isDataURL())
      return false;
    if (request.statusText === 'Service Worker Fallback Required')
      return false;
    for (var i = 0; i < this._filters.length; ++i) {
      if (!this._filters[i](request))
        return false;
    }
    return true;
  }

  /**
   * @param {string} query
   */
  _parseFilterQuery(query) {
    var parsedQuery;
    if (this._textFilterUI.isRegexChecked() && query !== '')
      parsedQuery = {text: [query], filters: []};
    else
      parsedQuery = this._suggestionBuilder.parseQuery(query);

    this._filters = parsedQuery.text.map(this._createTextFilter, this);

    var n = parsedQuery.filters.length;
    for (var i = 0; i < n; ++i) {
      var filter = parsedQuery.filters[i];
      var filterType = /** @type {!Network.NetworkLogView.FilterType} */ (filter.type.toLowerCase());
      this._filters.push(this._createFilter(filterType, filter.data, filter.negative));
    }
  }

  /**
   * @param {string} text
   * @return {!Network.NetworkLogView.Filter}
   */
  _createTextFilter(text) {
    var negative = false;
    /** @type {?RegExp} */
    var regex;
    if (!this._textFilterUI.isRegexChecked() && text[0] === '-' && text.length > 1) {
      negative = true;
      text = text.substring(1);
      regex = new RegExp(text.escapeForRegExp(), 'i');
    } else {
      regex = this._textFilterUI.regex();
    }

    var filter = Network.NetworkLogView._requestPathFilter.bind(null, regex);
    if (negative)
      filter = Network.NetworkLogView._negativeFilter.bind(null, filter);
    return filter;
  }

  /**
   * @param {!Network.NetworkLogView.FilterType} type
   * @param {string} value
   * @param {boolean} negative
   * @return {!Network.NetworkLogView.Filter}
   */
  _createFilter(type, value, negative) {
    var filter = this._createSpecialFilter(type, value);
    if (!filter)
      return this._createTextFilter((negative ? '-' : '') + type + ':' + value);
    if (negative)
      return Network.NetworkLogView._negativeFilter.bind(null, filter);
    return filter;
  }

  /**
   * @param {!Network.NetworkLogView.FilterType} type
   * @param {string} value
   * @return {?Network.NetworkLogView.Filter}
   */
  _createSpecialFilter(type, value) {
    switch (type) {
      case Network.NetworkLogView.FilterType.Domain:
        return Network.NetworkLogView._createRequestDomainFilter(value);

      case Network.NetworkLogView.FilterType.HasResponseHeader:
        return Network.NetworkLogView._requestResponseHeaderFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.Is:
        if (value.toLowerCase() === Network.NetworkLogView.IsFilterType.Running)
          return Network.NetworkLogView._runningRequestFilter;
        if (value.toLowerCase() === Network.NetworkLogView.IsFilterType.FromCache)
          return Network.NetworkLogView._fromCacheRequestFilter;
        break;

      case Network.NetworkLogView.FilterType.LargerThan:
        return this._createSizeFilter(value.toLowerCase());

      case Network.NetworkLogView.FilterType.Method:
        return Network.NetworkLogView._requestMethodFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.MimeType:
        return Network.NetworkLogView._requestMimeTypeFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.MixedContent:
        return Network.NetworkLogView._requestMixedContentFilter.bind(
            null, /** @type {!Network.NetworkLogView.MixedContentFilterValues} */ (value));

      case Network.NetworkLogView.FilterType.Scheme:
        return Network.NetworkLogView._requestSchemeFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.SetCookieDomain:
        return Network.NetworkLogView._requestSetCookieDomainFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.SetCookieName:
        return Network.NetworkLogView._requestSetCookieNameFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.SetCookieValue:
        return Network.NetworkLogView._requestSetCookieValueFilter.bind(null, value);

      case Network.NetworkLogView.FilterType.StatusCode:
        return Network.NetworkLogView._statusCodeFilter.bind(null, value);
    }
    return null;
  }

  /**
   * @param {string} value
   * @return {?Network.NetworkLogView.Filter}
   */
  _createSizeFilter(value) {
    var multiplier = 1;
    if (value.endsWith('k')) {
      multiplier = 1024;
      value = value.substring(0, value.length - 1);
    } else if (value.endsWith('m')) {
      multiplier = 1024 * 1024;
      value = value.substring(0, value.length - 1);
    }
    var quantity = Number(value);
    if (isNaN(quantity))
      return null;
    return Network.NetworkLogView._requestSizeLargerThanFilter.bind(null, quantity * multiplier);
  }

  _filterRequests() {
    this._removeAllHighlights();
    this._invalidateAllItems();
  }

  /**
   * @override
   */
  jumpToPreviousSearchResult() {
    if (!this._matchedRequestCount)
      return;
    var index = this._normalizeSearchResultIndex(this._currentMatchedRequestIndex - 1);
    this._highlightNthMatchedRequestForSearch(index, true);
  }

  /**
   * @override
   */
  jumpToNextSearchResult() {
    if (!this._matchedRequestCount)
      return;
    var index = this._normalizeSearchResultIndex(this._currentMatchedRequestIndex + 1);
    this._highlightNthMatchedRequestForSearch(index, true);
  }

  /**
   * @override
   */
  searchCanceled() {
    delete this._searchRegex;
    this._clearSearchMatchedList();
    this.dispatchEventToListeners(Network.NetworkLogView.Events.SearchCountUpdated, 0);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  revealAndHighlightRequest(request) {
    this.removeAllNodeHighlights();

    var node = this._nodesByRequestId.get(request.requestId);
    if (node) {
      node.reveal();
      this._highlightNode(node);
    }
  }

  removeAllNodeHighlights() {
    if (this._highlightedNode) {
      this._highlightedNode.element().classList.remove('highlighted-row');
      delete this._highlightedNode;
    }
  }

  /**
   * @param {!Network.NetworkDataGridNode} node
   */
  _highlightNode(node) {
    UI.runCSSAnimationOnce(node.element(), 'highlighted-row');
    this._highlightedNode = node;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @param {string} platform
   * @return {string}
   */
  _generateCurlCommand(request, platform) {
    var command = ['curl'];
    // These headers are derived from URL (except "version") and would be added by cURL anyway.
    var ignoredHeaders = {'host': 1, 'method': 1, 'path': 1, 'scheme': 1, 'version': 1};

    function escapeStringWin(str) {
      /* If there are no new line characters do not escape the " characters
               since it only uglifies the command.

               Because cmd.exe parser and MS Crt arguments parsers use some of the
               same escape characters, they can interact with each other in
               horrible ways, the order of operations is critical.

               Replace \ with \\ first because it is an escape character for certain
               conditions in both parsers.

               Replace all " with \" to ensure the first parser does not remove it.

               Then escape all characters we are not sure about with ^ to ensure it
               gets to MS Crt parser safely.

               The % character is special because MS Crt parser will try and look for
               ENV variables and fill them in it's place. We cannot escape them with %
               and cannot escape them with ^ (because it's cmd.exe's escape not MS Crt
               parser); So we can get cmd.exe parser to escape the character after it,
               if it is followed by a valid beginning character of an ENV variable.
               This ensures we do not try and double escape another ^ if it was placed
               by the previous replace.

               Lastly we replace new lines with ^ and TWO new lines because the first
               new line is there to enact the escape command the second is the character
               to escape (in this case new line).
            */
      var encapsChars = /[\r\n]/.test(str) ? '^"' : '"';
      return encapsChars +
          str.replace(/\\/g, '\\\\')
              .replace(/"/g, '\\"')
              .replace(/[^a-zA-Z0-9\s_\-:=+~'\/.',?;()*`]/g, '^$&')
              .replace(/%(?=[a-zA-Z0-9_])/g, '%^')
              .replace(/\r\n|[\n\r]/g, '^\n\n') +
          encapsChars;
    }

    function escapeStringPosix(str) {
      function escapeCharacter(x) {
        var code = x.charCodeAt(0);
        if (code < 256) {
          // Add leading zero when needed to not care about the next character.
          return code < 16 ? '\\x0' + code.toString(16) : '\\x' + code.toString(16);
        }
        code = code.toString(16);
        return '\\u' + ('0000' + code).substr(code.length, 4);
      }

      if (/[^\x20-\x7E]|\'/.test(str)) {
        // Use ANSI-C quoting syntax.
        return '$\'' +
            str.replace(/\\/g, '\\\\')
                .replace(/\'/g, '\\\'')
                .replace(/\n/g, '\\n')
                .replace(/\r/g, '\\r')
                .replace(/[^\x20-\x7E]/g, escapeCharacter) +
            '\'';
      } else {
        // Use single quote syntax.
        return '\'' + str + '\'';
      }
    }

    // cURL command expected to run on the same platform that DevTools run
    // (it may be different from the inspected page platform).
    var escapeString = platform === 'win' ? escapeStringWin : escapeStringPosix;

    command.push(escapeString(request.url).replace(/[[{}\]]/g, '\\$&'));

    var inferredMethod = 'GET';
    var data = [];
    var requestContentType = request.requestContentType();
    if (requestContentType && requestContentType.startsWith('application/x-www-form-urlencoded') &&
        request.requestFormData) {
      data.push('--data');
      data.push(escapeString(request.requestFormData));
      ignoredHeaders['content-length'] = true;
      inferredMethod = 'POST';
    } else if (request.requestFormData) {
      data.push('--data-binary');
      data.push(escapeString(request.requestFormData));
      ignoredHeaders['content-length'] = true;
      inferredMethod = 'POST';
    }

    if (request.requestMethod !== inferredMethod) {
      command.push('-X');
      command.push(request.requestMethod);
    }

    var requestHeaders = request.requestHeaders();
    for (var i = 0; i < requestHeaders.length; i++) {
      var header = requestHeaders[i];
      var name = header.name.replace(/^:/, '');  // Translate SPDY v3 headers to HTTP headers.
      if (name.toLowerCase() in ignoredHeaders)
        continue;
      command.push('-H');
      command.push(escapeString(name + ': ' + header.value));
    }
    command = command.concat(data);
    command.push('--compressed');

    if (request.securityState() === Protocol.Security.SecurityState.Insecure)
      command.push('--insecure');
    return command.join(' ');
  }
};

Network.NetworkLogView._isFilteredOutSymbol = Symbol('isFilteredOut');
Network.NetworkLogView._isMatchingSearchQuerySymbol = Symbol('isMatchingSearchQuery');

Network.NetworkLogView.HTTPSchemas = {
  'http': true,
  'https': true,
  'ws': true,
  'wss': true
};

Network.NetworkLogView._waterfallMinOvertime = 1;
Network.NetworkLogView._waterfallMaxOvertime = 3;

/** @enum {symbol} */
Network.NetworkLogView.Events = {
  RequestSelected: Symbol('RequestSelected'),
  SearchCountUpdated: Symbol('SearchCountUpdated'),
  SearchIndexUpdated: Symbol('SearchIndexUpdated'),
  UpdateRequest: Symbol('UpdateRequest')
};

/** @enum {string} */
Network.NetworkLogView.FilterType = {
  Domain: 'domain',
  HasResponseHeader: 'has-response-header',
  Is: 'is',
  LargerThan: 'larger-than',
  Method: 'method',
  MimeType: 'mime-type',
  MixedContent: 'mixed-content',
  Scheme: 'scheme',
  SetCookieDomain: 'set-cookie-domain',
  SetCookieName: 'set-cookie-name',
  SetCookieValue: 'set-cookie-value',
  StatusCode: 'status-code'
};

/** @enum {string} */
Network.NetworkLogView.MixedContentFilterValues = {
  All: 'all',
  Displayed: 'displayed',
  Blocked: 'blocked',
  BlockOverridden: 'block-overridden'
};

/** @enum {string} */
Network.NetworkLogView.IsFilterType = {
  Running: 'running',
  FromCache: 'from-cache'
};

/** @type {!Array<string>} */
Network.NetworkLogView._searchKeys =
    Object.keys(Network.NetworkLogView.FilterType).map(key => Network.NetworkLogView.FilterType[key]);

/** @typedef {function(!SDK.NetworkRequest): boolean} */
Network.NetworkLogView.Filter;
