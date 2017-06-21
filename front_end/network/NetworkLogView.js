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
 * @implements {SDK.SDKModelObserver<!SDK.NetworkManager>}
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

    this._filterBar = filterBar;
    this._rawRowHeight = 0;
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
      this._rawRowHeight = !!this._networkLogLargeRowsSetting.get() ? 41 : 21;
      this._updateRowHeight();
    }
    updateRowHeight.call(this);

    this._columns = new Network.NetworkLogViewColumns(
        this, this._timeCalculator, this._durationCalculator, networkLogLargeRowsSetting);

    /** @type {!Set<!SDK.NetworkRequest>} */
    this._staleRequests = new Set();
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
    /** @type {?Network.NetworkNode} */
    this._hoveredNode = null;

    this._currentMatchedRequestNode = null;
    this._currentMatchedRequestIndex = -1;

    this.linkifier = new Components.Linkifier();
    this.badgePool = new ProductRegistry.BadgePool();

    this._recording = false;

    this._headerHeight = 0;

    /** @type {!Map<string, !Network.GroupLookupInterface>} */
    this._groupLookups = new Map();
    this._groupLookups.set('Frame', new Network.NetworkFrameGrouper(this));

    /** @type {?Network.GroupLookupInterface} */
    this._activeGroupLookup = null;

    this._addFilters();
    this._resetSuggestionBuilder();
    this._initializeView();

    Common.moduleSetting('networkColorCodeResourceTypes')
        .addChangeListener(this._invalidateAllItems.bind(this, false), this);

    SDK.targetManager.observeModels(SDK.NetworkManager, this);
    NetworkLog.networkLog.addEventListener(NetworkLog.NetworkLog.Events.RequestAdded, this._onRequestUpdated, this);
    NetworkLog.networkLog.addEventListener(NetworkLog.NetworkLog.Events.RequestUpdated, this._onRequestUpdated, this);
    NetworkLog.networkLog.addEventListener(NetworkLog.NetworkLog.Events.Reset, this._reset, this);

    this._updateGroupByFrame();
    Common.moduleSetting('network.group-by-frame').addChangeListener(() => this._updateGroupByFrame());
  }

  _updateGroupByFrame() {
    var value = Common.moduleSetting('network.group-by-frame').get();
    this._setGrouping(value ? 'Frame' : null);
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
  static _requestPriorityFilter(value, request) {
    return request.initialPriority() === value;
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
   * @param {!SDK.NetworkRequest} request
   */
  static _copyRequestHeaders(request) {
    InspectorFrontendHost.copyText(request.requestHeadersText());
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  static _copyResponseHeaders(request) {
    InspectorFrontendHost.copyText(request.responseHeadersText);
  }

  /**
   * @param {!SDK.NetworkRequest} request
   */
  static async _copyResponse(request) {
    var contentData = await request.contentData();
    var content = contentData.content;
    if (contentData.encoded) {
      content = Common.ContentProvider.contentAsDataURL(
          contentData.content, request.mimeType, contentData.encoded, contentData.encoded ? 'utf-8' : null);
    }
    InspectorFrontendHost.copyText(content || '');
  }

  /**
   * @param {?string} groupKey
   */
  _setGrouping(groupKey) {
    if (this._activeGroupLookup)
      this._activeGroupLookup.reset();
    var groupLookup = groupKey ? this._groupLookups.get(groupKey) || null : null;
    this._activeGroupLookup = groupLookup;
    this._invalidateAllItems();
  }

  _updateRowHeight() {
    this._rowHeight = Math.floor(this._rawRowHeight * window.devicePixelRatio) / window.devicePixelRatio;
  }

  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?Network.NetworkRequestNode}
   */
  nodeForRequest(request) {
    return request[Network.NetworkLogView._networkNodeSymbol] || null;
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
   * @override
   * @param {!SDK.NetworkManager} networkManager
   */
  modelAdded(networkManager) {
    // TODO(allada) Remove dependency on networkManager and instead use NetworkLog and PageLoad for needed data.
    if (networkManager.target().parentTarget())
      return;
    var resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
    }
  }

  /**
   * @override
   * @param {!SDK.NetworkManager} networkManager
   */
  modelRemoved(networkManager) {
    if (!networkManager.target().parentTarget()) {
      var resourceTreeModel = networkManager.target().model(SDK.ResourceTreeModel);
      if (resourceTreeModel) {
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
    this._textFilterUI.setSuggestionProvider(this._suggestionBuilder.completions.bind(this._suggestionBuilder));
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

  columnExtensionResolved() {
    this._invalidateAllItems(true);
  }

  _setupDataGrid() {
    /** @type {!DataGrid.SortableDataGrid<!Network.NetworkNode>} */
    this._dataGrid = this._columns.dataGrid();
    this._dataGrid.setRowContextMenuCallback((contextMenu, node) => {
      var request = node.request();
      if (request)
        this.handleContextMenuForRequest(contextMenu, request);
    });
    this._dataGrid.setStickToBottom(true);
    this._dataGrid.setName('networkLog');
    this._dataGrid.setResizeMethod(DataGrid.DataGrid.ResizeMethod.Last);
    this._dataGrid.element.classList.add('network-log-grid');
    this._dataGrid.element.addEventListener('mousedown', this._dataGridMouseDown.bind(this), true);
    this._dataGrid.element.addEventListener('mousemove', this._dataGridMouseMove.bind(this), true);
    this._dataGrid.element.addEventListener('mouseleave', () => this._setHoveredNode(null), true);
  }

  /**
   * @param {!Event} event
   */
  _dataGridMouseMove(event) {
    var node = (this._dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target)));
    var highlightInitiatorChain = event.shiftKey;
    this._setHoveredNode(node, highlightInitiatorChain);
  }

  /**
   * @return {?Network.NetworkNode}
   */
  hoveredNode() {
    return this._hoveredNode;
  }

  /**
   * @param {?Network.NetworkNode} node
   * @param {boolean=} highlightInitiatorChain
   */
  _setHoveredNode(node, highlightInitiatorChain) {
    if (this._hoveredNode)
      this._hoveredNode.setHovered(false, false);
    this._hoveredNode = node;
    if (this._hoveredNode)
      this._hoveredNode.setHovered(true, !!highlightInitiatorChain);
  }

  /**
   * @param {!Event} event
   */
  _dataGridMouseDown(event) {
    if (!this._dataGrid.selectedNode && event.button)
      event.consume();
  }

  _updateSummaryBar() {
    this._hideRecordingHint();

    var transferSize = 0;
    var selectedNodeNumber = 0;
    var selectedTransferSize = 0;
    var baseTime = -1;
    var maxTime = -1;

    var nodeCount = 0;
    for (var request of NetworkLog.networkLog.requests()) {
      var node = request[Network.NetworkLogView._networkNodeSymbol];
      if (!node)
        continue;
      nodeCount++;
      var requestTransferSize = request.transferSize;
      transferSize += requestTransferSize;
      if (!node[Network.NetworkLogView._isFilteredOutSymbol]) {
        selectedNodeNumber++;
        selectedTransferSize += requestTransferSize;
      }
      var networkManager = SDK.NetworkManager.forRequest(request);
      // TODO(allada) inspectedURL should be stored in PageLoad used instead of target so HAR requests can have an
      // inspected url.
      if (networkManager && request.url() === networkManager.target().inspectedURL() &&
          request.resourceType() === Common.resourceTypes.Document)
        baseTime = request.startTime;
      if (request.endTime > maxTime)
        maxTime = request.endTime;
    }

    if (!nodeCount) {
      this._showRecordingHint();
      return;
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

    if (selectedNodeNumber !== nodeCount) {
      appendChunk(Common.UIString('%d / %d requests', selectedNodeNumber, nodeCount));
      appendChunk(separator);
      appendChunk(Common.UIString(
          '%s / %s transferred', Number.bytesToString(selectedTransferSize), Number.bytesToString(transferSize)));
    } else {
      appendChunk(Common.UIString('%d requests', nodeCount));
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

  /**
   * @param {boolean=} deferUpdate
   */
  _invalidateAllItems(deferUpdate) {
    this._staleRequests = new Set(NetworkLog.networkLog.requests());
    if (deferUpdate)
      this.scheduleRefresh();
    else
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

    var time = /** @type {number} */ (event.data.loadTime);
    if (time) {
      this._mainRequestLoadTime = time;
      this._columns.addEventDividers([time], 'network-red-divider');
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
   * @override
   */
  onResize() {
    this._updateRowHeight();
  }

  /**
   * @return {!Array<!Network.NetworkNode>}
   */
  flatNodesList() {
    return this._dataGrid.rootNode().flatChildren();
  }

  stylesChanged() {
    this._columns.scheduleRefresh();
  }

  _refresh() {
    this._needsRefresh = false;

    if (this._refreshRequestId) {
      this.element.window().cancelAnimationFrame(this._refreshRequestId);
      delete this._refreshRequestId;
    }

    this.removeAllNodeHighlights();

    this._timeCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
    this._durationCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
    this._timeCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);
    this._durationCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);

    /** @type {!Map<!Network.NetworkNode, !Network.NetworkNode>} */
    var nodesToInsert = new Map();
    /** @type {!Array<!Network.NetworkNode>} */
    var nodesToRefresh = [];

    /** @type {!Set<!Network.NetworkRequestNode>} */
    var staleNodes = new Set();

    // While creating nodes it may add more entries into _staleRequests because redirect request nodes update the parent
    // node so we loop until we have no more stale requests.
    while (this._staleRequests.size) {
      var request = this._staleRequests.firstValue();
      this._staleRequests.delete(request);
      var node = request[Network.NetworkLogView._networkNodeSymbol];
      if (!node)
        node = this._createNodeForRequest(request);
      staleNodes.add(node);
    }

    for (var node of staleNodes) {
      var isFilteredOut = !this._applyFilter(node);
      if (isFilteredOut && node === this._hoveredNode)
        this._setHoveredNode(null);

      if (!isFilteredOut)
        nodesToRefresh.push(node);
      var request = node.request();
      this._timeCalculator.updateBoundaries(request);
      this._durationCalculator.updateBoundaries(request);
      var newParent = this._parentNodeForInsert(node);
      if (node[Network.NetworkLogView._isFilteredOutSymbol] === isFilteredOut && node.parent === newParent)
        continue;
      node[Network.NetworkLogView._isFilteredOutSymbol] = isFilteredOut;
      var removeFromParent = node.parent && (isFilteredOut || node.parent !== newParent);
      if (removeFromParent) {
        var parent = node.parent;
        parent.removeChild(node);
        while (parent && !parent.hasChildren() && parent.dataGrid && parent.dataGrid.rootNode() !== parent) {
          var grandparent = parent.parent;
          grandparent.removeChild(parent);
          parent = grandparent;
        }
      }

      if (!newParent || isFilteredOut)
        continue;

      if (!newParent.dataGrid && !nodesToInsert.has(newParent)) {
        nodesToInsert.set(newParent, this._dataGrid.rootNode());
        nodesToRefresh.push(newParent);
      }
      nodesToInsert.set(node, newParent);
    }

    for (var node of nodesToInsert.keys()) {
      var parent = nodesToInsert.get(node);
      var request = node.request();
      if (request)
        node[Network.NetworkLogView._isMatchingSearchQuerySymbol] = this._matchRequest(request);
      parent.appendChild(node);
    }

    for (var node of nodesToRefresh)
      node.refresh();

    this._highlightNthMatchedRequestForSearch(
        this._updateMatchCountAndFindMatchIndex(this._currentMatchedRequestNode), false);

    this._updateSummaryBar();

    if (nodesToInsert.size)
      this._columns.sortByCurrentColumn();

    this._dataGrid.updateInstantly();
    this._didRefreshForTest();
  }

  _didRefreshForTest() {
  }

  /**
   * @param {!Network.NetworkRequestNode} node
   * @return {?Network.NetworkNode}
   */
  _parentNodeForInsert(node) {
    if (!this._activeGroupLookup)
      return this._dataGrid.rootNode();

    var groupNode = this._activeGroupLookup.groupNodeForRequest(node.request());
    if (!groupNode)
      return this._dataGrid.rootNode();
    return groupNode;
  }

  _reset() {
    this._requestWithHighlightedInitiators = null;
    this.dispatchEventToListeners(Network.NetworkLogView.Events.RequestSelected, null);

    this._clearSearchMatchedList();

    this._setHoveredNode(null);
    this._columns.reset();

    this._timeFilter = null;
    this._calculator.reset();

    this._timeCalculator.setWindow(null);
    this.linkifier.reset();
    this.badgePool.reset();

    if (this._activeGroupLookup)
      this._activeGroupLookup.reset();
    this._staleRequests.clear();
    this._resetSuggestionBuilder();

    this._mainRequestLoadTime = -1;
    this._mainRequestDOMContentLoadedTime = -1;

    this._dataGrid.rootNode().removeChildren();
    this._updateSummaryBar();
    this._dataGrid.setStickToBottom(true);
    this.scheduleRefresh();
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
   * @param {!SDK.NetworkRequest} request
   */
  _createNodeForRequest(request) {
    var node = new Network.NetworkRequestNode(this, request);
    request[Network.NetworkLogView._networkNodeSymbol] = node;
    node[Network.NetworkLogView._isFilteredOutSymbol] = true;
    node[Network.NetworkLogView._isMatchingSearchQuerySymbol] = false;

    for (var redirect = request.redirectSource(); redirect; redirect = redirect.redirectSource())
      this._refreshRequest(redirect);
    return node;
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
    Network.NetworkLogView._subdomains(request.domain)
        .forEach(
            this._suggestionBuilder.addItem.bind(this._suggestionBuilder, Network.NetworkLogView.FilterType.Domain));
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.Method, request.requestMethod);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.MimeType, request.mimeType);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.Scheme, '' + request.scheme);
    this._suggestionBuilder.addItem(Network.NetworkLogView.FilterType.StatusCode, '' + request.statusCode);

    var priority = request.initialPriority();
    if (priority) {
      this._suggestionBuilder.addItem(
          Network.NetworkLogView.FilterType.Priority, NetworkPriorities.uiLabelForPriority(priority));
    }

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

    this._staleRequests.add(request);
    this.scheduleRefresh();
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
            Common.UIString('Copy request headers'), Network.NetworkLogView._copyRequestHeaders.bind(null, request));
      }

      if (request.responseHeadersText) {
        copyMenu.appendItem(
            Common.UIString('Copy response headers'), Network.NetworkLogView._copyResponseHeaders.bind(null, request));
      }

      if (request.finished)
        copyMenu.appendItem(Common.UIString('Copy response'), Network.NetworkLogView._copyResponse.bind(null, request));

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
    copyMenu.appendItem(Common.UIString('Copy all as HAR'), this._copyAll.bind(this));

    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('Save as HAR with content'), this._exportAll.bind(this));

    contextMenu.appendSeparator();
    contextMenu.appendItem(Common.UIString('Clear browser cache'), this._clearBrowserCache.bind(this));
    contextMenu.appendItem(Common.UIString('Clear browser cookies'), this._clearBrowserCookies.bind(this));

    if (request) {
      contextMenu.appendSeparator();

      const maxBlockedURLLength = 20;
      var manager = SDK.multitargetNetworkManager;
      var patterns = manager.blockedPatterns();

      var urlWithoutScheme = request.parsedURL.urlWithoutScheme();
      if (urlWithoutScheme && !patterns.find(pattern => pattern.url === urlWithoutScheme)) {
        contextMenu.appendItem(Common.UIString('Block request URL'), addBlockedURL.bind(null, urlWithoutScheme));
      } else if (urlWithoutScheme) {
        const croppedURL = urlWithoutScheme.trimMiddle(maxBlockedURLLength);
        contextMenu.appendItem(
            Common.UIString('Unblock %s', croppedURL), removeBlockedURL.bind(null, urlWithoutScheme));
      }

      var domain = request.parsedURL.domain();
      if (domain && !patterns.find(pattern => pattern.url === domain)) {
        contextMenu.appendItem(Common.UIString('Block request domain'), addBlockedURL.bind(null, domain));
      } else if (domain) {
        const croppedDomain = domain.trimMiddle(maxBlockedURLLength);
        contextMenu.appendItem(Common.UIString('Unblock %s', croppedDomain), removeBlockedURL.bind(null, domain));
      }

      if (SDK.NetworkManager.canReplayRequest(request)) {
        contextMenu.appendSeparator();
        contextMenu.appendItem(Common.UIString('Replay XHR'), SDK.NetworkManager.replayRequest.bind(null, request));
        contextMenu.appendSeparator();
      }

      /**
       * @param {string} url
       */
      function addBlockedURL(url) {
        patterns.push({enabled: true, url: url});
        manager.setBlockedPatterns(patterns);
        manager.setBlockingEnabled(true);
        UI.viewManager.showView('network.blocked-urls');
      }

      /**
       * @param {string} url
       */
      function removeBlockedURL(url) {
        patterns = patterns.filter(pattern => pattern.url !== url);
        manager.setBlockedPatterns(patterns);
        UI.viewManager.showView('network.blocked-urls');
      }
    }
  }

  _harRequests() {
    var httpRequests = NetworkLog.networkLog.requests().filter(Network.NetworkLogView.HTTPRequestsFilter);
    return httpRequests.filter(Network.NetworkLogView.FinishedRequestsFilter);
  }

  _copyAll() {
    var harArchive = {log: (new NetworkLog.HARLog(this._harRequests())).build()};
    InspectorFrontendHost.copyText(JSON.stringify(harArchive, null, 2));
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
    var requests = NetworkLog.networkLog.requests();
    var commands = [];
    for (var request of requests)
      commands.push(this._generateCurlCommand(request, platform));
    if (platform === 'win')
      InspectorFrontendHost.copyText(commands.join(' &\r\n'));
    else
      InspectorFrontendHost.copyText(commands.join(' ;\n'));
  }

  async _exportAll() {
    var url = SDK.targetManager.mainTarget().inspectedURL();
    var parsedURL = url.asParsedURL();
    var filename = parsedURL ? parsedURL.host : 'network-log';
    var stream = new Bindings.FileOutputStream();
    var accepted = await new Promise(resolve => stream.open(filename + '.har', resolve));
    if (!accepted)
      return;

    var progressIndicator = new UI.ProgressIndicator();
    this._progressBarContainer.appendChild(progressIndicator.element);
    await Network.HARWriter.write(stream, this._harRequests(), progressIndicator);
    progressIndicator.done();
    stream.close();
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

    /** @type {!Array.<!Network.NetworkRequestNode>} */
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

    /** @type {!Array.<!Network.NetworkRequestNode>} */
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
   * @param {?Network.NetworkRequestNode} node
   * @return {number}
   */
  _updateMatchCountAndFindMatchIndex(node) {
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
   * @param {!Network.NetworkRequestNode} node
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

      case Network.NetworkLogView.FilterType.Priority:
        return Network.NetworkLogView._requestPriorityFilter.bind(null, NetworkPriorities.uiLabelToPriority(value));

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

    var node = request[Network.NetworkLogView._networkNodeSymbol];
    if (node && this.attached) {
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
   * @param {!Network.NetworkRequestNode} node
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

    /**
     * @param {string} str
     * @return {string}
     */
    function escapeStringPosix(str) {
      /**
       * @param {string} x
       * @return {string}
       */
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

    command.push(escapeString(request.url()).replace(/[[{}\]]/g, '\\$&'));

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
Network.NetworkLogView._networkNodeSymbol = Symbol('NetworkNode');

Network.NetworkLogView.HTTPSchemas = {
  'http': true,
  'https': true,
  'ws': true,
  'wss': true
};

/** @enum {symbol} */
Network.NetworkLogView.Events = {
  RequestSelected: Symbol('RequestSelected'),
  SearchCountUpdated: Symbol('SearchCountUpdated'),
  SearchIndexUpdated: Symbol('SearchIndexUpdated')
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
  Priority: 'priority',
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

/**
 * @interface
 */
Network.GroupLookupInterface = function() {};

Network.GroupLookupInterface.prototype = {
  /**
   * @param {!SDK.NetworkRequest} request
   * @return {?Network.NetworkGroupNode}
   */
  groupNodeForRequest: function(request) {},

  reset: function() {}
};
