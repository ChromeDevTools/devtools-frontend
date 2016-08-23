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
 * @constructor
 * @extends {WebInspector.VBox}
 * @implements {WebInspector.Searchable}
 * @implements {WebInspector.TargetManager.Observer}
 * @param {!WebInspector.FilterBar} filterBar
 * @param {!Element} progressBarContainer
 * @param {!WebInspector.Setting} networkLogLargeRowsSetting
 */
WebInspector.NetworkLogView = function(filterBar, progressBarContainer, networkLogLargeRowsSetting)
{
    WebInspector.VBox.call(this);
    this.setMinimumSize(50, 64);
    this.registerRequiredCSS("network/networkLogView.css");

    this._networkHideDataURLSetting = WebInspector.settings.createSetting("networkHideDataURL", false);
    this._networkResourceTypeFiltersSetting = WebInspector.settings.createSetting("networkResourceTypeFilters", {});
    this._networkShowPrimaryLoadWaterfallSetting = WebInspector.settings.createSetting("networkShowPrimaryLoadWaterfall", false);

    this._filterBar = filterBar;
    this._progressBarContainer = progressBarContainer;
    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;

    this._columns = new WebInspector.NetworkLogViewColumns(this, networkLogLargeRowsSetting);

    /** @type {!Map.<string, !WebInspector.NetworkDataGridNode>} */
    this._nodesByRequestId = new Map();
    /** @type {!Object.<string, boolean>} */
    this._staleRequestIds = {};
    /** @type {number} */
    this._mainRequestLoadTime = -1;
    /** @type {number} */
    this._mainRequestDOMContentLoadedTime = -1;
    this._matchedRequestCount = 0;
    this._highlightedSubstringChanges = [];

    /** @type {!Array.<!WebInspector.NetworkLogView.Filter>} */
    this._filters = [];
    /** @type {?WebInspector.NetworkLogView.Filter} */
    this._timeFilter = null;

    this._currentMatchedRequestNode = null;
    this._currentMatchedRequestIndex = -1;

    /** @type {!WebInspector.Linkifier} */
    this.linkifier = new WebInspector.Linkifier();

    this._recording = false;
    this._preserveLog = false;

    /** @type {number} */
    this._rowHeight = 0;

    this._addFilters();
    this._resetSuggestionBuilder();
    this._initializeView();

    WebInspector.moduleSetting("networkColorCodeResourceTypes").addChangeListener(this._invalidateAllItems, this);
    this._networkLogLargeRowsSetting.addChangeListener(this._updateRowsSize, this);

    WebInspector.targetManager.observeTargets(this);
    WebInspector.targetManager.addModelListener(WebInspector.NetworkManager, WebInspector.NetworkManager.Events.RequestStarted, this._onRequestStarted, this);
    WebInspector.targetManager.addModelListener(WebInspector.NetworkManager, WebInspector.NetworkManager.Events.RequestUpdated, this._onRequestUpdated, this);
    WebInspector.targetManager.addModelListener(WebInspector.NetworkManager, WebInspector.NetworkManager.Events.RequestFinished, this._onRequestUpdated, this);
}

WebInspector.NetworkLogView._isFilteredOutSymbol = Symbol("isFilteredOut");
WebInspector.NetworkLogView._isMatchingSearchQuerySymbol = Symbol("isMatchingSearchQuery");

WebInspector.NetworkLogView.HTTPSchemas = {"http": true, "https": true, "ws": true, "wss": true};

WebInspector.NetworkLogView._defaultRefreshDelay = 200;

WebInspector.NetworkLogView._waterfallMinOvertime = 1;
WebInspector.NetworkLogView._waterfallMaxOvertime = 3;

/** @enum {symbol} */
WebInspector.NetworkLogView.Events = {
    RequestSelected: Symbol("RequestSelected"),
    SearchCountUpdated: Symbol("SearchCountUpdated"),
    SearchIndexUpdated: Symbol("SearchIndexUpdated"),
    UpdateRequest: Symbol("UpdateRequest")
}

/** @enum {string} */
WebInspector.NetworkLogView.FilterType = {
    Domain: "domain",
    HasResponseHeader: "has-response-header",
    Is: "is",
    LargerThan: "larger-than",
    Method: "method",
    MimeType: "mime-type",
    MixedContent: "mixed-content",
    Scheme: "scheme",
    SetCookieDomain: "set-cookie-domain",
    SetCookieName: "set-cookie-name",
    SetCookieValue: "set-cookie-value",
    StatusCode: "status-code"
};

/** @enum {string} */
WebInspector.NetworkLogView.MixedContentFilterValues = {
    All: "all",
    Displayed: "displayed",
    Blocked: "blocked",
    BlockOverridden: "block-overridden"
}

/** @enum {string} */
WebInspector.NetworkLogView.IsFilterType = {
    Running: "running"
};

/** @type {!Array<string>} */
WebInspector.NetworkLogView._searchKeys = Object.keys(WebInspector.NetworkLogView.FilterType).map(key => WebInspector.NetworkLogView.FilterType[key]);

WebInspector.NetworkLogView.prototype = {
    /**
     * @param {boolean} recording
     */
    setRecording: function(recording)
    {
        this._recording = recording;
        this._updateSummaryBar();
    },

    /**
     * @param {boolean} preserveLog
     */
    setPreserveLog: function(preserveLog)
    {
        this._preserveLog = preserveLog;
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetAdded: function(target)
    {
        if (!target.parentTarget()) {
            var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
            if (resourceTreeModel) {
                resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this);
                resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.Events.Load, this._loadEventFired, this);
                resourceTreeModel.addEventListener(WebInspector.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
            }
        }
        var networkLog = WebInspector.NetworkLog.fromTarget(target);
        if (networkLog)
            networkLog.requests().forEach(this._appendRequest.bind(this));
    },

    /**
     * @override
     * @param {!WebInspector.Target} target
     */
    targetRemoved: function(target)
    {
        if (!target.parentTarget()) {
            var resourceTreeModel = WebInspector.ResourceTreeModel.fromTarget(target);
            if (resourceTreeModel) {
                resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.Events.MainFrameNavigated, this._mainFrameNavigated, this);
                resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.Events.Load, this._loadEventFired, this);
                resourceTreeModel.removeEventListener(WebInspector.ResourceTreeModel.Events.DOMContentLoaded, this._domContentLoadedEventFired, this);
            }
        }
    },

    /**
     * @param {number} start
     * @param {number} end
     */
    setWindow: function(start, end)
    {
        if (!start && !end) {
            this._timeFilter = null;
            this._timeCalculator.setWindow(null);
        } else {
            this._timeFilter = WebInspector.NetworkLogView._requestTimeFilter.bind(null, start, end);
            this._timeCalculator.setWindow(new WebInspector.NetworkTimeBoundary(start, end));
        }
        this._columns.updateDividersIfNeeded();
        this._filterRequests();
    },

    clearSelection: function()
    {
        if (this._dataGrid.selectedNode)
            this._dataGrid.selectedNode.deselect();
    },

    _addFilters: function()
    {
        this._textFilterUI = new WebInspector.TextFilterUI(true);
        this._textFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged, this);
        this._filterBar.addFilter(this._textFilterUI);

        var dataURLSetting = this._networkHideDataURLSetting;
        this._dataURLFilterUI = new WebInspector.CheckboxFilterUI("hide-data-url", WebInspector.UIString("Hide data URLs"), true, dataURLSetting);
        this._dataURLFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
        this._filterBar.addFilter(this._dataURLFilterUI);

        var filterItems = [];
        for (var categoryId in WebInspector.resourceCategories) {
            var category = WebInspector.resourceCategories[categoryId];
            filterItems.push({name: category.title, label: category.shortTitle, title: category.title});
        }
        this._resourceCategoryFilterUI = new WebInspector.NamedBitSetFilterUI(filterItems, this._networkResourceTypeFiltersSetting);
        this._resourceCategoryFilterUI.addEventListener(WebInspector.FilterUI.Events.FilterChanged, this._filterChanged.bind(this), this);
        this._filterBar.addFilter(this._resourceCategoryFilterUI);
    },

    _resetSuggestionBuilder: function()
    {
        this._suggestionBuilder = new WebInspector.FilterSuggestionBuilder(WebInspector.NetworkLogView._searchKeys);
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.Is, WebInspector.NetworkLogView.IsFilterType.Running);
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.LargerThan, "100");
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.LargerThan, "10k");
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.LargerThan, "1M");
        this._textFilterUI.setSuggestionBuilder(this._suggestionBuilder);
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _filterChanged: function(event)
    {
        this.removeAllNodeHighlights();
        this._parseFilterQuery(this._textFilterUI.value());
        this._filterRequests();
    },

    _initializeView: function()
    {
        this.element.id = "network-container";

        /** @type {!WebInspector.NetworkTransferTimeCalculator} */
        this._timeCalculator = new WebInspector.NetworkTransferTimeCalculator();
        /** @type {!WebInspector.NetworkTransferDurationCalculator} */
        this._durationCalculator = new WebInspector.NetworkTransferDurationCalculator();
        this._calculator = this._timeCalculator;

        this._createTable();
        this._summaryBarElement = this.element.createChild("div", "network-summary-bar");

        this._updateRowsSize();
    },

    _showRecordingHint: function()
    {
        this._hideRecordingHint();
        this._recordingHint = this.element.createChild("div", "network-status-pane fill");
        var hintText = this._recordingHint.createChild("div", "recording-hint");
        var reloadShortcutNode = this._recordingHint.createChild("b");
        reloadShortcutNode.textContent = WebInspector.shortcutRegistry.shortcutDescriptorsForAction("main.reload")[0].name;

        if (this._recording) {
            var recordingText = hintText.createChild("span");
            recordingText.textContent = WebInspector.UIString("Recording network activity\u2026");
            hintText.createChild("br");
            hintText.appendChild(WebInspector.formatLocalized("Perform a request or hit %s to record the reload.", [reloadShortcutNode]));
        } else {
            var recordNode = hintText.createChild("b");
            recordNode.textContent = WebInspector.shortcutRegistry.shortcutTitleForAction("network.toggle-recording");
            hintText.appendChild(WebInspector.formatLocalized("Record (%s) or reload (%s) to display network activity.", [recordNode, reloadShortcutNode]));
        }
    },

    _hideRecordingHint: function()
    {
        if (this._recordingHint)
            this._recordingHint.remove();
        delete this._recordingHint;
    },

    /**
     * @override
     * @return {!Array.<!Element>}
     */
    elementsToRestoreScrollPositionsFor: function()
    {
        if (!this._dataGrid) // Not initialized yet.
            return [];
        return [this._dataGrid.scrollContainer];
    },

    _createTable: function()
    {
        this._dataGrid = this._columns.createGrid(this._timeCalculator, this._durationCalculator);
        this._dataGrid.setStickToBottom(true);
        this._dataGrid.setName("networkLog");
        this._dataGrid.setResizeMethod(WebInspector.DataGrid.ResizeMethod.Last);
        this._dataGrid.element.classList.add("network-log-grid");
        this._dataGrid.element.addEventListener("contextmenu", this._contextMenu.bind(this), true);
        this._dataGrid.element.addEventListener("mousedown", this._dataGridMouseDown.bind(this), true);
        this._dataGrid.element.addEventListener("mousemove", this._dataGridMouseMove.bind(this), true);
        this._dataGrid.element.addEventListener("mouseleave", this._highlightInitiatorChain.bind(this, null), true);
        this._columns.sortByCurrentColumn();
    },

    /**
     * @param {!Event} event
     */
    _dataGridMouseDown: function(event)
    {
        if ((!this._dataGrid.selectedNode && event.button) || event.target.enclosingNodeOrSelfWithNodeName("a"))
            event.consume();
    },

    /**
     * @param {!Event} event
     */
    _dataGridMouseMove: function(event)
    {
        var node = event.shiftKey ? this._dataGrid.dataGridNodeFromNode(event.target) : null;
        this._highlightInitiatorChain(node ? node.request() : null);
    },

    /**
     * @param {?WebInspector.NetworkRequest} request
     */
    _highlightInitiatorChain: function(request)
    {
        if (this._requestWithHighlightedInitiators === request)
            return;
        this._requestWithHighlightedInitiators = request;

        if (!request) {
            for (var node of this._nodesByRequestId.values()) {
                if (!node.dataGrid)
                    continue;
                node.element().classList.remove("network-node-on-initiator-path", "network-node-on-initiated-path");
            }
            return;
        }

        var initiators = request.initiatorChain();
        var initiated = new Set();
        for (var node of this._nodesByRequestId.values()) {
            if (!node.dataGrid)
                continue;
            var localInitiators = node.request().initiatorChain();
            if (localInitiators.has(request))
                initiated.add(node.request());
        }

        for (var node of this._nodesByRequestId.values()) {
            if (!node.dataGrid)
                continue;
            node.element().classList.toggle("network-node-on-initiator-path", node.request() !== request && initiators.has(node.request()));
            node.element().classList.toggle("network-node-on-initiated-path", node.request() !== request && initiated.has(node.request()));
        }
    },

    _updateSummaryBar: function()
    {
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
            if (!nodes[i][WebInspector.NetworkLogView._isFilteredOutSymbol]) {
                selectedRequestsNumber++;
                selectedTransferSize += requestTransferSize;
            }
            if (request.url === request.target().inspectedURL() && request.resourceType() === WebInspector.resourceTypes.Document)
                baseTime = request.startTime;
            if (request.endTime > maxTime)
                maxTime = request.endTime;
        }

        var summaryBar = this._summaryBarElement;
        summaryBar.removeChildren();
        var separator = "\u2002\u2758\u2002";
        var text = "";
        /**
         * @param {string} chunk
         * @return {!Element}
         */
        function appendChunk(chunk)
        {
            var span = summaryBar.createChild("span");
            span.textContent = chunk;
            text += chunk;
            return span;
        }

        if (selectedRequestsNumber !== requestsNumber) {
            appendChunk(WebInspector.UIString("%d / %d requests", selectedRequestsNumber, requestsNumber));
            appendChunk(separator);
            appendChunk(WebInspector.UIString("%s / %s transferred", Number.bytesToString(selectedTransferSize), Number.bytesToString(transferSize)));
        } else {
            appendChunk(WebInspector.UIString("%d requests", requestsNumber));
            appendChunk(separator);
            appendChunk(WebInspector.UIString("%s transferred", Number.bytesToString(transferSize)));
        }
        if (baseTime !== -1 && maxTime !== -1) {
            appendChunk(separator);
            appendChunk(WebInspector.UIString("Finish: %s", Number.secondsToString(maxTime - baseTime)));
            if (this._mainRequestDOMContentLoadedTime !== -1 && this._mainRequestDOMContentLoadedTime > baseTime) {
                appendChunk(separator);
                var domContentLoadedText = WebInspector.UIString("DOMContentLoaded: %s", Number.secondsToString(this._mainRequestDOMContentLoadedTime - baseTime));
                appendChunk(domContentLoadedText).classList.add("summary-blue");
            }
            if (this._mainRequestLoadTime !== -1) {
                appendChunk(separator);
                var loadText = WebInspector.UIString("Load: %s", Number.secondsToString(this._mainRequestLoadTime - baseTime));
                appendChunk(loadText).classList.add("summary-red");
            }
        }
        summaryBar.title = text;
    },

    scheduleRefresh: function()
    {
        if (this._needsRefresh)
            return;

        this._needsRefresh = true;

        if (this.isShowing() && !this._refreshTimeout)
            this._refreshTimeout = setTimeout(this.refresh.bind(this), WebInspector.NetworkLogView._defaultRefreshDelay);
    },

    /**
     * @param {!Array<number>} times
     */
    addFilmStripFrames: function(times)
    {
        this._columns.addEventDividers(times, "network-frame-divider");
    },

    /**
     * @param {number} time
     */
    selectFilmStripFrame: function(time)
    {
        for (var divider of this._eventDividers)
            divider.element.classList.toggle("network-frame-divider-selected", divider.time === time);
    },

    clearFilmStripFrame: function()
    {
        for (var divider of this._eventDividers)
            divider.element.classList.toggle("network-frame-divider-selected", false);
    },

    _refreshIfNeeded: function()
    {
        if (this._needsRefresh)
            this.refresh();
    },

    _invalidateAllItems: function()
    {
        var requestIds = this._nodesByRequestId.keysArray();
        for (var i = 0; i < requestIds.length; ++i)
            this._staleRequestIds[requestIds[i]] = true;
        this.refresh();
    },

    /**
     * @return {!WebInspector.NetworkTimeCalculator}
     */
    timeCalculator: function()
    {
        return this._timeCalculator;
    },

    /**
     * @return {!WebInspector.NetworkTimeCalculator}
     */
    calculator: function()
    {
        return this._calculator;
    },

    /**
     * @param {!WebInspector.NetworkTimeCalculator} x
     */
    setCalculator: function(x)
    {
        if (!x || this._calculator === x)
            return;

        this._calculator = x;
        this._calculator.reset();

        if (this._calculator.startAtZero)
            this._columns.hideEventDividers();
        else
            this._columns.showEventDividers();

        this._invalidateAllItems();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _loadEventFired: function(event)
    {
        if (!this._recording)
            return;

        var data = /** @type {number} */ (event.data);
        if (data) {
            this._mainRequestLoadTime = data;
            this._columns.addEventDividers([data], "network-red-divider");
        }
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _domContentLoadedEventFired: function(event)
    {
        if (!this._recording)
            return;
        var data = /** @type {number} */ (event.data);
        if (data) {
            this._mainRequestDOMContentLoadedTime = data;
            this._columns.addEventDividers([data], "network-blue-divider");
        }
    },

    wasShown: function()
    {
        this._refreshIfNeeded();
    },

    willHide: function()
    {
        this._columns.willHide();
    },

    refresh: function()
    {
        this._needsRefresh = false;
        if (this._refreshTimeout) {
            clearTimeout(this._refreshTimeout);
            delete this._refreshTimeout;
        }

        this.removeAllNodeHighlights();

        var oldBoundary = this.calculator().boundary();
        this._timeCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
        this._durationCalculator.updateBoundariesForEventTime(this._mainRequestLoadTime);
        this._timeCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);
        this._durationCalculator.updateBoundariesForEventTime(this._mainRequestDOMContentLoadedTime);

        var dataGrid = this._dataGrid;
        var rootNode = dataGrid.rootNode();
        /** @type {!Array<!WebInspector.NetworkDataGridNode> } */
        var nodesToInsert = [];
        /** @type {!Array<!WebInspector.NetworkDataGridNode> } */
        var nodesToRefresh = [];
        for (var requestId in this._staleRequestIds) {
            var node = this._nodesByRequestId.get(requestId);
            if (!node)
                continue;
            var isFilteredOut = !this._applyFilter(node);
            if (node[WebInspector.NetworkLogView._isFilteredOutSymbol] !== isFilteredOut) {
                if (!node[WebInspector.NetworkLogView._isFilteredOutSymbol])
                    rootNode.removeChild(node);

                node[WebInspector.NetworkLogView._isFilteredOutSymbol] = isFilteredOut;

                if (!node[WebInspector.NetworkLogView._isFilteredOutSymbol])
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
            node[WebInspector.NetworkLogView._isMatchingSearchQuerySymbol] = this._matchRequest(request);
        }

        for (var node of nodesToRefresh)
            node.refresh();

        this._highlightNthMatchedRequestForSearch(this._updateMatchCountAndFindMatchIndex(this._currentMatchedRequestNode), false);

        if (!this.calculator().boundary().equals(oldBoundary)) {
            // The boundaries changed, so all item graphs are stale.
            this._columns.updateDividersIfNeeded();
            var nodes = this._nodesByRequestId.valuesArray();
            for (var i = 0; i < nodes.length; ++i)
                nodes[i].refreshGraph();
        }

        this._staleRequestIds = {};
        this._updateSummaryBar();
    },

    reset: function()
    {
        this._requestWithHighlightedInitiators = null;
        this.dispatchEventToListeners(WebInspector.NetworkLogView.Events.RequestSelected, null);

        this._clearSearchMatchedList();

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
        this._eventDividers = [];

        if (this._dataGrid) {
            this._dataGrid.rootNode().removeChildren();
            this._updateSummaryBar();
        }
    },

    /**
     * @param {string} filterString
     */
    setTextFilterValue: function(filterString)
    {
        this._textFilterUI.setValue(filterString);
        this._textFilterUI.setRegexChecked(false);
        this._dataURLFilterUI.setChecked(false);
        this._resourceCategoryFilterUI.reset();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRequestStarted: function(event)
    {
        if (!this._recording)
            return;
        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        this._appendRequest(request);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _appendRequest: function(request)
    {
        var node = new WebInspector.NetworkDataGridNode(this, request);
        node[WebInspector.NetworkLogView._isFilteredOutSymbol] = true;
        node[WebInspector.NetworkLogView._isMatchingSearchQuerySymbol] = false;

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
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _onRequestUpdated: function(event)
    {
        var request = /** @type {!WebInspector.NetworkRequest} */ (event.data);
        this._refreshRequest(request);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _refreshRequest: function(request)
    {
        if (!this._nodesByRequestId.get(request.requestId))
            return;

        WebInspector.NetworkLogView._subdomains(request.domain).forEach(this._suggestionBuilder.addItem.bind(this._suggestionBuilder, WebInspector.NetworkLogView.FilterType.Domain));
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.Method, request.requestMethod);
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.MimeType, request.mimeType);
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.Scheme, "" + request.scheme);
        this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.StatusCode, "" + request.statusCode);

        if (request.mixedContentType !== "none") {
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.MixedContent, WebInspector.NetworkLogView.MixedContentFilterValues.All);
        }

        if (request.mixedContentType === "optionally-blockable") {
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.MixedContent, WebInspector.NetworkLogView.MixedContentFilterValues.Displayed);
        }

        if (request.mixedContentType === "blockable") {
            var suggestion = request.wasBlocked() ? WebInspector.NetworkLogView.MixedContentFilterValues.Blocked : WebInspector.NetworkLogView.MixedContentFilterValues.BlockOverridden;
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.MixedContent, suggestion);
        }

        var responseHeaders = request.responseHeaders;
        for (var i = 0, l = responseHeaders.length; i < l; ++i)
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.HasResponseHeader, responseHeaders[i].name);
        var cookies = request.responseCookies;
        for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
            var cookie = cookies[i];
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.SetCookieDomain, cookie.domain());
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.SetCookieName, cookie.name());
            this._suggestionBuilder.addItem(WebInspector.NetworkLogView.FilterType.SetCookieValue, cookie.value());
        }

        this._staleRequestIds[request.requestId] = true;
        this.dispatchEventToListeners(WebInspector.NetworkLogView.Events.UpdateRequest, request);
        this.scheduleRefresh();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _mainFrameNavigated: function(event)
    {
        if (!this._recording)
            return;

        var frame = /** @type {!WebInspector.ResourceTreeFrame} */ (event.data);
        var loaderId = frame.loaderId;

        // Pick provisional load requests.
        var requestsToPick = [];
        var networkLog = WebInspector.NetworkLog.fromTarget(frame.target());
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
    },

    /**
     * @param {boolean} gridMode
     */
    switchViewMode: function(gridMode)
    {
        this._columns.switchViewMode(gridMode);
    },

    /**
     * @return {number}
     */
    rowHeight: function()
    {
        return this._rowHeight;
    },

    _updateRowsSize: function()
    {
        var largeRows = !!this._networkLogLargeRowsSetting.get();
        this._rowHeight = largeRows ? 41 : 21;
        this._dataGrid.element.classList.toggle("small", !largeRows);
        this._dataGrid.scheduleUpdate();
    },

    /**
     * @param {!Event} event
     */
    _contextMenu: function(event)
    {
        // TODO(allada) Fix datagrid's contextmenu so NetworkLogViewColumns can attach it's own contextmenu event
        if (this._columns.contextMenu(event))
            return;
        var contextMenu = new WebInspector.ContextMenu(event);

        var gridNode = this._dataGrid.dataGridNodeFromNode(event.target);
        var request = gridNode && gridNode.request();

        /**
         * @param {string} url
         */
        function openResourceInNewTab(url)
        {
            InspectorFrontendHost.openInNewTab(url);
        }

        contextMenu.appendApplicableItems(request);
        var copyMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Copy"));
        if (request) {
            copyMenu.appendItem(WebInspector.copyLinkAddressLabel(), InspectorFrontendHost.copyText.bind(InspectorFrontendHost, request.contentURL()));
            copyMenu.appendSeparator();

            if (request.requestHeadersText())
                copyMenu.appendItem(WebInspector.UIString.capitalize("Copy ^request ^headers"), this._copyRequestHeaders.bind(this, request));
            if (request.responseHeadersText)
                copyMenu.appendItem(WebInspector.UIString.capitalize("Copy ^response ^headers"), this._copyResponseHeaders.bind(this, request));
            if (request.finished)
                copyMenu.appendItem(WebInspector.UIString.capitalize("Copy ^response"), this._copyResponse.bind(this, request));

            if (WebInspector.isWin()) {
                copyMenu.appendItem(WebInspector.UIString("Copy as cURL (cmd)"), this._copyCurlCommand.bind(this, request, "win"));
                copyMenu.appendItem(WebInspector.UIString("Copy as cURL (bash)"), this._copyCurlCommand.bind(this, request, "unix"));
                copyMenu.appendItem(WebInspector.UIString("Copy All as cURL (cmd)"), this._copyAllCurlCommand.bind(this, "win"));
                copyMenu.appendItem(WebInspector.UIString("Copy All as cURL (bash)"), this._copyAllCurlCommand.bind(this, "unix"));
            } else {
                copyMenu.appendItem(WebInspector.UIString("Copy as cURL"), this._copyCurlCommand.bind(this, request, "unix"));
                copyMenu.appendItem(WebInspector.UIString("Copy All as cURL"), this._copyAllCurlCommand.bind(this, "unix"));
            }
        } else {
            copyMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Copy"));
        }
        copyMenu.appendItem(WebInspector.UIString.capitalize("Copy ^all as HAR"), this._copyAll.bind(this));

        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString.capitalize("Save as HAR with ^content"), this._exportAll.bind(this));

        contextMenu.appendSeparator();
        contextMenu.appendItem(WebInspector.UIString.capitalize("Clear ^browser ^cache"), this._clearBrowserCache.bind(this));
        contextMenu.appendItem(WebInspector.UIString.capitalize("Clear ^browser ^cookies"), this._clearBrowserCookies.bind(this));

        var blockedSetting = WebInspector.moduleSetting("blockedURLs");
        if (request && Runtime.experiments.isEnabled("requestBlocking")) {  // Disabled until ready.
            contextMenu.appendSeparator();

            var urlWithoutScheme = request.parsedURL.urlWithoutScheme();
            if (urlWithoutScheme && blockedSetting.get().indexOf(urlWithoutScheme) === -1)
                contextMenu.appendItem(WebInspector.UIString.capitalize("Block ^request URL"), addBlockedURL.bind(null, urlWithoutScheme));

            var domain = request.parsedURL.domain();
            if (domain && blockedSetting.get().indexOf(domain) === -1)
                contextMenu.appendItem(WebInspector.UIString.capitalize("Block ^request ^domain"), addBlockedURL.bind(null, domain));

            function addBlockedURL(url)
            {
                var list = blockedSetting.get();
                list.push(url);
                blockedSetting.set(list);
                WebInspector.viewManager.showView("network.blocked-urls");
            }
        }

        if (request && request.resourceType() === WebInspector.resourceTypes.XHR) {
            contextMenu.appendSeparator();
            contextMenu.appendItem(WebInspector.UIString("Replay XHR"), request.replayXHR.bind(request));
            contextMenu.appendSeparator();
        }

        contextMenu.show();
    },

    _harRequests: function()
    {
        var requests = this._nodesByRequestId.valuesArray().map(function(node) { return node.request(); });
        var httpRequests = requests.filter(WebInspector.NetworkLogView.HTTPRequestsFilter);
        return httpRequests.filter(WebInspector.NetworkLogView.FinishedRequestsFilter);
    },

    _copyAll: function()
    {
        var harArchive = {
            log: (new WebInspector.HARLog(this._harRequests())).build()
        };
        InspectorFrontendHost.copyText(JSON.stringify(harArchive, null, 2));
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _copyRequestHeaders: function(request)
    {
        InspectorFrontendHost.copyText(request.requestHeadersText());
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _copyResponse: function(request)
    {
        /**
         * @param {?string} content
         */
        function callback(content)
        {
            if (request.contentEncoded)
                content = request.asDataURL();
            InspectorFrontendHost.copyText(content || "");
        }
        request.requestContent().then(callback);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    _copyResponseHeaders: function(request)
    {
        InspectorFrontendHost.copyText(request.responseHeadersText);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     * @param {string} platform
     */
    _copyCurlCommand: function(request, platform)
    {
        InspectorFrontendHost.copyText(this._generateCurlCommand(request, platform));
    },

    /**
     * @param {string} platform
     */
    _copyAllCurlCommand: function(platform)
    {
        var requests = this._nodesByRequestId.valuesArray().map(node => node.request());
        var commands = [];
        for (var request of requests)
            commands.push(this._generateCurlCommand(request, platform));
        if (platform === "win")
            InspectorFrontendHost.copyText(commands.join(" &\r\n"));
        else
            InspectorFrontendHost.copyText(commands.join(" ;\n"));
    },

    _exportAll: function()
    {
        var url = WebInspector.targetManager.mainTarget().inspectedURL();
        var parsedURL = url.asParsedURL();
        var filename = parsedURL ? parsedURL.host : "network-log";
        var stream = new WebInspector.FileOutputStream();
        stream.open(filename + ".har", openCallback.bind(this));

        /**
         * @param {boolean} accepted
         * @this {WebInspector.NetworkLogView}
         */
        function openCallback(accepted)
        {
            if (!accepted)
                return;
            var progressIndicator = new WebInspector.ProgressIndicator();
            this._progressBarContainer.appendChild(progressIndicator.element);
            var harWriter = new WebInspector.HARWriter();
            harWriter.write(stream, this._harRequests(), progressIndicator);
        }
    },

    _clearBrowserCache: function()
    {
        if (confirm(WebInspector.UIString("Are you sure you want to clear browser cache?")))
            WebInspector.multitargetNetworkManager.clearBrowserCache();
    },

    _clearBrowserCookies: function()
    {
        if (confirm(WebInspector.UIString("Are you sure you want to clear browser cookies?")))
            WebInspector.multitargetNetworkManager.clearBrowserCookies();
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     * @return {boolean}
     */
    _matchRequest: function(request)
    {
        var re = this._searchRegex;
        if (!re)
            return false;

        var text = this._networkLogLargeRowsSetting.get() ? request.path() + "/" + request.name() : request.name();
        return re.test(text);
    },

    _clearSearchMatchedList: function()
    {
        this._matchedRequestCount = -1;
        this._currentMatchedRequestNode = null;
        this._removeAllHighlights();
    },

    _removeAllHighlights: function()
    {
        this.removeAllNodeHighlights();
        for (var i = 0; i < this._highlightedSubstringChanges.length; ++i)
            WebInspector.revertDomChanges(this._highlightedSubstringChanges[i]);
        this._highlightedSubstringChanges = [];
    },

    dataGridSorted: function()
    {
        this._highlightNthMatchedRequestForSearch(this._updateMatchCountAndFindMatchIndex(this._currentMatchedRequestNode), false);
    },

    /**
     * @param {number} n
     * @param {boolean} reveal
     */
    _highlightNthMatchedRequestForSearch: function(n, reveal)
    {
        this._removeAllHighlights();

        /** @type {!Array.<!WebInspector.NetworkDataGridNode>} */
        var nodes = this._dataGrid.rootNode().children;
        var matchCount = 0;
        var node = null;
        for (var i = 0; i < nodes.length; ++i) {
            if (nodes[i][WebInspector.NetworkLogView._isMatchingSearchQuerySymbol]) {
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
            WebInspector.Revealer.reveal(request);
        var highlightedSubstringChanges = node.highlightMatchedSubstring(this._searchRegex);
        this._highlightedSubstringChanges.push(highlightedSubstringChanges);

        this._currentMatchedRequestNode = node;
        this._currentMatchedRequestIndex = n;
        this.dispatchEventToListeners(WebInspector.NetworkLogView.Events.SearchIndexUpdated, n);
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        var query = searchConfig.query;
        var currentMatchedRequestNode = this._currentMatchedRequestNode;
        this._clearSearchMatchedList();
        this._searchRegex = createPlainTextSearchRegex(query, "i");

        /** @type {!Array.<!WebInspector.NetworkDataGridNode>} */
        var nodes = this._dataGrid.rootNode().children;
        for (var i = 0; i < nodes.length; ++i)
            nodes[i][WebInspector.NetworkLogView._isMatchingSearchQuerySymbol] = this._matchRequest(nodes[i].request());
        var newMatchedRequestIndex = this._updateMatchCountAndFindMatchIndex(currentMatchedRequestNode);
        if (!newMatchedRequestIndex && jumpBackwards)
            newMatchedRequestIndex = this._matchedRequestCount - 1;
        this._highlightNthMatchedRequestForSearch(newMatchedRequestIndex, shouldJump);
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsCaseSensitiveSearch: function()
    {
        return false;
    },

    /**
     * @override
     * @return {boolean}
     */
    supportsRegexSearch: function()
    {
        return true;
    },

    /**
     * @param {?WebInspector.NetworkDataGridNode} node
     * @return {number}
     */
    _updateMatchCountAndFindMatchIndex: function(node)
    {
        /** @type {!Array.<!WebInspector.NetworkDataGridNode>} */
        var nodes = this._dataGrid.rootNode().children;
        var matchCount = 0;
        var matchIndex = 0;
        for (var i = 0; i < nodes.length; ++i) {
            if (!nodes[i][WebInspector.NetworkLogView._isMatchingSearchQuerySymbol])
                continue;
            if (node === nodes[i])
                matchIndex = matchCount;
            matchCount++;
        }
        if (this._matchedRequestCount !== matchCount) {
            this._matchedRequestCount = matchCount;
            this.dispatchEventToListeners(WebInspector.NetworkLogView.Events.SearchCountUpdated, matchCount);
        }
        return matchIndex;
    },

    /**
     * @param {number} index
     * @return {number}
     */
    _normalizeSearchResultIndex: function(index)
    {
        return (index + this._matchedRequestCount) % this._matchedRequestCount;
    },

    /**
     * @param {!WebInspector.NetworkDataGridNode} node
     * @return {boolean}
     */
    _applyFilter: function(node)
    {
        var request = node.request();
        if (this._timeFilter && !this._timeFilter(request))
            return false;
        var categoryName = request.resourceType().category().title;
        if (!this._resourceCategoryFilterUI.accept(categoryName))
            return false;
        if (this._dataURLFilterUI.checked() && request.parsedURL.isDataURL())
            return false;
        if (request.statusText === "Service Worker Fallback Required")
            return false;
        for (var i = 0; i < this._filters.length; ++i) {
            if (!this._filters[i](request))
                return false;
        }
        return true;
    },

    /**
     * @param {string} query
     */
    _parseFilterQuery: function(query)
    {
        var parsedQuery;
        if (this._textFilterUI.isRegexChecked() && query !== "")
            parsedQuery = {text: [query], filters: []};
        else
            parsedQuery = this._suggestionBuilder.parseQuery(query);

        this._filters = parsedQuery.text.map(this._createTextFilter, this);

        var n = parsedQuery.filters.length;
        for (var i = 0; i < n; ++i) {
            var filter = parsedQuery.filters[i];
            var filterType = /** @type {!WebInspector.NetworkLogView.FilterType} */ (filter.type.toLowerCase());
            this._filters.push(this._createFilter(filterType, filter.data, filter.negative));
        }
    },

    /**
     * @param {string} text
     * @return {!WebInspector.NetworkLogView.Filter}
     */
    _createTextFilter: function(text)
    {
        var negative = false;
        /** @type {?RegExp} */
        var regex;
        if (!this._textFilterUI.isRegexChecked() && text[0] === "-" && text.length > 1) {
            negative = true;
            text = text.substring(1);
            regex = new RegExp(text.escapeForRegExp(), "i");
        } else {
            regex = this._textFilterUI.regex();
        }

        var filter = WebInspector.NetworkLogView._requestPathFilter.bind(null, regex);
        if (negative)
            filter = WebInspector.NetworkLogView._negativeFilter.bind(null, filter);
        return filter;
    },

    /**
     * @param {!WebInspector.NetworkLogView.FilterType} type
     * @param {string} value
     * @param {boolean} negative
     * @return {!WebInspector.NetworkLogView.Filter}
     */
    _createFilter: function(type, value, negative)
    {
        var filter = this._createSpecialFilter(type, value);
        if (!filter)
            return this._createTextFilter((negative ? "-" : "") + type + ":" + value);
        if (negative)
            return WebInspector.NetworkLogView._negativeFilter.bind(null, filter);
        return filter;
    },

    /**
     * @param {!WebInspector.NetworkLogView.FilterType} type
     * @param {string} value
     * @return {?WebInspector.NetworkLogView.Filter}
     */
    _createSpecialFilter: function(type, value)
    {
        switch (type) {
        case WebInspector.NetworkLogView.FilterType.Domain:
            return WebInspector.NetworkLogView._createRequestDomainFilter(value);

        case WebInspector.NetworkLogView.FilterType.HasResponseHeader:
            return WebInspector.NetworkLogView._requestResponseHeaderFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.Is:
            if (value.toLowerCase() === WebInspector.NetworkLogView.IsFilterType.Running)
                return WebInspector.NetworkLogView._runningRequestFilter;
            break;

        case WebInspector.NetworkLogView.FilterType.LargerThan:
            return this._createSizeFilter(value.toLowerCase());

        case WebInspector.NetworkLogView.FilterType.Method:
            return WebInspector.NetworkLogView._requestMethodFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.MimeType:
            return WebInspector.NetworkLogView._requestMimeTypeFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.MixedContent:
            return WebInspector.NetworkLogView._requestMixedContentFilter.bind(null, /** @type {!WebInspector.NetworkLogView.MixedContentFilterValues} */ (value));

        case WebInspector.NetworkLogView.FilterType.Scheme:
            return WebInspector.NetworkLogView._requestSchemeFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.SetCookieDomain:
            return WebInspector.NetworkLogView._requestSetCookieDomainFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.SetCookieName:
            return WebInspector.NetworkLogView._requestSetCookieNameFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.SetCookieValue:
            return WebInspector.NetworkLogView._requestSetCookieValueFilter.bind(null, value);

        case WebInspector.NetworkLogView.FilterType.StatusCode:
            return WebInspector.NetworkLogView._statusCodeFilter.bind(null, value);
        }
        return null;
    },

    /**
     * @param {string} value
     * @return {?WebInspector.NetworkLogView.Filter}
     */
    _createSizeFilter: function(value)
    {
        var multiplier = 1;
        if (value.endsWith("k")) {
            multiplier = 1024;
            value = value.substring(0, value.length - 1);
        } else if (value.endsWith("m")) {
            multiplier = 1024 * 1024;
            value = value.substring(0, value.length - 1);
        }
        var quantity  = Number(value);
        if (isNaN(quantity))
            return null;
        return WebInspector.NetworkLogView._requestSizeLargerThanFilter.bind(null, quantity * multiplier);
    },

    _filterRequests: function()
    {
        this._removeAllHighlights();
        this._invalidateAllItems();
    },

    /**
     * @override
     */
    jumpToPreviousSearchResult: function()
    {
        if (!this._matchedRequestCount)
            return;
        var index = this._normalizeSearchResultIndex(this._currentMatchedRequestIndex - 1);
        this._highlightNthMatchedRequestForSearch(index, true);
    },

    /**
     * @override
     */
    jumpToNextSearchResult: function()
    {
        if (!this._matchedRequestCount)
            return;
        var index = this._normalizeSearchResultIndex(this._currentMatchedRequestIndex + 1);
        this._highlightNthMatchedRequestForSearch(index, true);
    },

    /**
     * @override
     */
    searchCanceled: function()
    {
        delete this._searchRegex;
        this._clearSearchMatchedList();
        this.dispatchEventToListeners(WebInspector.NetworkLogView.Events.SearchCountUpdated, 0);
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     */
    revealAndHighlightRequest: function(request)
    {
        this.removeAllNodeHighlights();

        var node = this._nodesByRequestId.get(request.requestId);
        if (node) {
            node.reveal();
            this._highlightNode(node);
        }
    },

    removeAllNodeHighlights: function()
    {
        if (this._highlightedNode) {
            this._highlightedNode.element().classList.remove("highlighted-row");
            delete this._highlightedNode;
        }
    },

    /**
     * @param {!WebInspector.NetworkDataGridNode} node
     */
    _highlightNode: function(node)
    {
        WebInspector.runCSSAnimationOnce(node.element(), "highlighted-row");
        this._highlightedNode = node;
    },

    /**
     * @param {!WebInspector.NetworkRequest} request
     * @param {string} platform
     * @return {string}
     */
    _generateCurlCommand: function(request, platform)
    {
        var command = ["curl"];
        // These headers are derived from URL (except "version") and would be added by cURL anyway.
        var ignoredHeaders = {"host": 1, "method": 1, "path": 1, "scheme": 1, "version": 1};

        function escapeStringWin(str)
        {
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
            var encapsChars = /[\r\n]/.test(str) ? "^\"" : "\"";
            return encapsChars + str.replace(/\\/g, "\\\\")
                             .replace(/"/g, "\\\"")
                             .replace(/[^a-zA-Z0-9\s_\-:=+~'\/.',?;()*`]/g, "^$&")
                             .replace(/%(?=[a-zA-Z0-9_])/g, "%^")
                             .replace(/\r\n|[\n\r]/g, "^\n\n") + encapsChars;
        }

        function escapeStringPosix(str)
        {
            function escapeCharacter(x)
            {
                var code = x.charCodeAt(0);
                if (code < 256) {
                    // Add leading zero when needed to not care about the next character.
                    return code < 16 ? "\\x0" + code.toString(16) : "\\x" + code.toString(16);
                }
                code = code.toString(16);
                return "\\u" + ("0000" + code).substr(code.length, 4);
            }

            if (/[^\x20-\x7E]|\'/.test(str)) {
                // Use ANSI-C quoting syntax.
                return "$\'" + str.replace(/\\/g, "\\\\")
                                  .replace(/\'/g, "\\\'")
                                  .replace(/\n/g, "\\n")
                                  .replace(/\r/g, "\\r")
                                  .replace(/[^\x20-\x7E]/g, escapeCharacter) + "'";
            } else {
                // Use single quote syntax.
                return "'" + str + "'";
            }
        }

        // cURL command expected to run on the same platform that DevTools run
        // (it may be different from the inspected page platform).
        var escapeString = platform === "win" ? escapeStringWin : escapeStringPosix;

        command.push(escapeString(request.url).replace(/[[{}\]]/g, "\\$&"));

        var inferredMethod = "GET";
        var data = [];
        var requestContentType = request.requestContentType();
        if (requestContentType && requestContentType.startsWith("application/x-www-form-urlencoded") && request.requestFormData) {
            data.push("--data");
            data.push(escapeString(request.requestFormData));
            ignoredHeaders["content-length"] = true;
            inferredMethod = "POST";
        } else if (request.requestFormData) {
            data.push("--data-binary");
            data.push(escapeString(request.requestFormData));
            ignoredHeaders["content-length"] = true;
            inferredMethod = "POST";
        }

        if (request.requestMethod !== inferredMethod) {
            command.push("-X");
            command.push(request.requestMethod);
        }

        var requestHeaders = request.requestHeaders();
        for (var i = 0; i < requestHeaders.length; i++) {
            var header = requestHeaders[i];
            var name = header.name.replace(/^:/, ""); // Translate SPDY v3 headers to HTTP headers.
            if (name.toLowerCase() in ignoredHeaders)
                continue;
            command.push("-H");
            command.push(escapeString(name + ": " + header.value));
        }
        command = command.concat(data);
        command.push("--compressed");

        if (request.securityState() === SecurityAgent.SecurityState.Insecure)
            command.push("--insecure");
        return command.join(" ");
    },

    __proto__: WebInspector.VBox.prototype
}

/** @typedef {function(!WebInspector.NetworkRequest): boolean} */
WebInspector.NetworkLogView.Filter;

/**
 * @param {!WebInspector.NetworkLogView.Filter} filter
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._negativeFilter = function(filter, request)
{
    return !filter(request);
}

/**
 * @param {?RegExp} regex
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestPathFilter = function(regex, request)
{
    if (!regex)
        return false;

    return regex.test(request.path() + "/" + request.name());
}

/**
 * @param {string} domain
 * @return {!Array.<string>}
 */
WebInspector.NetworkLogView._subdomains = function(domain)
{
    var result = [domain];
    var indexOfPeriod = domain.indexOf(".");
    while (indexOfPeriod !== -1) {
        result.push("*" + domain.substring(indexOfPeriod));
        indexOfPeriod = domain.indexOf(".", indexOfPeriod + 1);
    }
    return result;
}

/**
 * @param {string} value
 * @return {!WebInspector.NetworkLogView.Filter}
 */
WebInspector.NetworkLogView._createRequestDomainFilter = function(value)
{
    /**
     * @param {string} string
     * @return {string}
     */
    function escapeForRegExp(string)
    {
        return string.escapeForRegExp();
    }
    var escapedPattern = value.split("*").map(escapeForRegExp).join(".*");
    return WebInspector.NetworkLogView._requestDomainFilter.bind(null, new RegExp("^" + escapedPattern + "$", "i"));
}

/**
 * @param {!RegExp} regex
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestDomainFilter = function(regex, request)
{
    return regex.test(request.domain);
}

/**
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._runningRequestFilter = function(request)
{
    return !request.finished;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestResponseHeaderFilter = function(value, request)
{
    return request.responseHeaderValue(value) !== undefined;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestMethodFilter = function(value, request)
{
    return request.requestMethod === value;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestMimeTypeFilter = function(value, request)
{
    return request.mimeType === value;
}

/**
 * @param {!WebInspector.NetworkLogView.MixedContentFilterValues} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestMixedContentFilter = function(value, request)
{
    if (value === WebInspector.NetworkLogView.MixedContentFilterValues.Displayed) {
        return request.mixedContentType === "optionally-blockable";
    } else if (value === WebInspector.NetworkLogView.MixedContentFilterValues.Blocked) {
        return request.mixedContentType === "blockable" && request.wasBlocked();
    } else if (value === WebInspector.NetworkLogView.MixedContentFilterValues.BlockOverridden) {
        return request.mixedContentType === "blockable" && !request.wasBlocked();
    } else if (value === WebInspector.NetworkLogView.MixedContentFilterValues.All) {
        return request.mixedContentType !== "none";
    }
    return false;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestSchemeFilter = function(value, request)
{
    return request.scheme === value;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestSetCookieDomainFilter = function(value, request)
{
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
        if (cookies[i].domain() === value)
            return true;
    }
    return false;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestSetCookieNameFilter = function(value, request)
{
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
        if (cookies[i].name() === value)
            return true;
    }
    return false;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestSetCookieValueFilter = function(value, request)
{
    var cookies = request.responseCookies;
    for (var i = 0, l = cookies ? cookies.length : 0; i < l; ++i) {
        if (cookies[i].value() === value)
            return true;
    }
    return false;
}

/**
 * @param {number} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestSizeLargerThanFilter = function(value, request)
{
    return request.transferSize >= value;
}

/**
 * @param {string} value
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._statusCodeFilter = function(value, request)
{
    return ("" + request.statusCode) === value;
}

/**
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView.HTTPRequestsFilter = function(request)
{
    return request.parsedURL.isValid && (request.scheme in WebInspector.NetworkLogView.HTTPSchemas);
}

/**
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView.FinishedRequestsFilter = function(request)
{
    return request.finished;
}

/**
 * @param {number} windowStart
 * @param {number} windowEnd
 * @param {!WebInspector.NetworkRequest} request
 * @return {boolean}
 */
WebInspector.NetworkLogView._requestTimeFilter = function(windowStart, windowEnd, request)
{
    if (request.issueTime() > windowEnd)
        return false;
    if (request.endTime !== -1 && request.endTime < windowStart)
        return false;
    return true;
}
