// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.NetworkLogView} networkLogView
 * @param {!WebInspector.Setting} networkLogLargeRowsSetting
 */
WebInspector.NetworkLogViewColumns = function(networkLogView, networkLogLargeRowsSetting)
{
    this._networkLogView = networkLogView;

    var defaultColumnsVisibility = WebInspector.NetworkLogViewColumns._defaultColumnsVisibility;
    /** @type {!WebInspector.Setting} */
    this._columnsVisibilitySetting = WebInspector.settings.createSetting("networkLogColumnsVisibility", defaultColumnsVisibility);
    var savedColumnsVisibility = this._columnsVisibilitySetting.get();
    /** @type {!Object.<boolean>} */
    var columnsVisibility = {};
    for (var columnId in defaultColumnsVisibility)
        columnsVisibility[columnId] = savedColumnsVisibility.hasOwnProperty(columnId) ? savedColumnsVisibility[columnId] : defaultColumnsVisibility[columnId];
    this._columnsVisibilitySetting.set(columnsVisibility);

    networkLogLargeRowsSetting.addChangeListener(this._updateRowsSize, this);

    /** @type {!Array<{time: number, element: !Element}>} */
    this._eventDividers = [];

    this._gridMode = true;

    /** @type {?WebInspector.DataGrid} */
    this._dataGrid = null;
    /** @type {!Array.<!WebInspector.ColumnConfig>} */
    this._columns = [];
    /** @type {!Object.<string, function(!WebInspector.NetworkDataGridNode, !WebInspector.NetworkDataGridNode) : number>} */
    this._sortingFunctions = {};
    /** @type {!Object.<string, !WebInspector.NetworkTimeCalculator>} */
    this._calculators = {};
    /** @type {?Element} */
    this._timelineSortSelector = null;

    /** @type {?WebInspector.TimelineGrid} */
    this._timelineGrid = null;

    /** @type {!WebInspector.Linkifier} */
    this._popupLinkifier = new WebInspector.Linkifier();
}

WebInspector.NetworkLogViewColumns._responseHeaderColumns = ["Cache-Control", "Connection", "Content-Encoding", "Content-Length", "ETag", "Keep-Alive", "Last-Modified", "Server", "Vary"];
WebInspector.NetworkLogViewColumns._defaultColumnsVisibility = {
    method: false, status: true, protocol: false, scheme: false, domain: false, remoteAddress: false, type: true, initiator: true, cookies: false, setCookies: false, size: true, time: true, priority: false, connectionId: false,
    "Cache-Control": false, "Connection": false, "Content-Encoding": false, "Content-Length": false, "ETag": false, "Keep-Alive": false, "Last-Modified": false, "Server": false, "Vary": false
};

/**
 * @typedef {{
 *      id: string,
 *      title: string,
 *      titleDOMFragment: !DocumentFragment,
 *      sortable: boolean,
 *      weight: number,
 *      sort: (?WebInspector.DataGrid.Order|undefined),
 *      align: (?WebInspector.DataGrid.Align|undefined),
 * }}
 */
WebInspector.ColumnConfig;

/** @type {!Object.<string, string>} */
WebInspector.NetworkLogViewColumns._columnTitles = {
    "name": WebInspector.UIString("Name"),
    "method": WebInspector.UIString("Method"),
    "status": WebInspector.UIString("Status"),
    "protocol": WebInspector.UIString("Protocol"),
    "scheme": WebInspector.UIString("Scheme"),
    "domain": WebInspector.UIString("Domain"),
    "remoteAddress": WebInspector.UIString("Remote Address"),
    "type": WebInspector.UIString("Type"),
    "initiator": WebInspector.UIString("Initiator"),
    "cookies": WebInspector.UIString("Cookies"),
    "setCookies": WebInspector.UIString("Set-Cookies"),
    "size": WebInspector.UIString("Size"),
    "time": WebInspector.UIString("Time"),
    "connectionId": WebInspector.UIString("Connection Id"),
    "priority": WebInspector.UIString("Priority"),
    "timeline": WebInspector.UIString("Timeline"),

    // Response header columns
    "Cache-Control": WebInspector.UIString("Cache-Control"),
    "Connection": WebInspector.UIString("Connection"),
    "Content-Encoding": WebInspector.UIString("Content-Encoding"),
    "Content-Length": WebInspector.UIString("Content-Length"),
    "ETag": WebInspector.UIString("ETag"),
    "Keep-Alive": WebInspector.UIString("Keep-Alive"),
    "Last-Modified": WebInspector.UIString("Last-Modified"),
    "Server": WebInspector.UIString("Server"),
    "Vary": WebInspector.UIString("Vary")
};

WebInspector.NetworkLogViewColumns.prototype = {
    willHide: function()
    {
        this._popoverHelper.hidePopover();
    },

    reset: function()
    {
        if (this._popoverHelper)
            this._popoverHelper.hidePopover();
        this._timelineGrid.removeEventDividers();
        this.updateDividersIfNeeded();
    },

    /**
     * @param {!WebInspector.NetworkTransferTimeCalculator} timeCalculator
     * @param {!WebInspector.NetworkTransferDurationCalculator} durationCalculator
     * @return {!WebInspector.SortableDataGrid} dataGrid
     */
    createGrid: function(timeCalculator, durationCalculator)
    {
        this._createSortingFunctions();
        this._popoverHelper = new WebInspector.PopoverHelper(this._networkLogView.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this), this._onHidePopover.bind(this));

        this._calculators.timeline = timeCalculator;
        this._calculators.startTime = timeCalculator;
        this._calculators.endTime = timeCalculator;
        this._calculators.responseTime = timeCalculator;
        this._calculators.duration = durationCalculator;
        this._calculators.latency = durationCalculator;

        var columns = [];
        columns.push({
            id: "name",
            titleDOMFragment: this._makeHeaderFragment(WebInspector.UIString("Name"), WebInspector.UIString("Path")),
            title: WebInspector.NetworkLogViewColumns._columnTitles["name"],
            weight: 20
        });

        columns.push({
            id: "method",
            title: WebInspector.NetworkLogViewColumns._columnTitles["method"],
            weight: 6
        });

        columns.push({
            id: "status",
            titleDOMFragment: this._makeHeaderFragment(WebInspector.UIString("Status"), WebInspector.UIString("Text")),
            title: WebInspector.NetworkLogViewColumns._columnTitles["status"],
            weight: 6
        });

        columns.push({
            id: "protocol",
            title: WebInspector.NetworkLogViewColumns._columnTitles["protocol"],
            weight: 6
        });

        columns.push({
            id: "scheme",
            title: WebInspector.NetworkLogViewColumns._columnTitles["scheme"],
            weight: 6
        });

        columns.push({
            id: "domain",
            title: WebInspector.NetworkLogViewColumns._columnTitles["domain"],
            weight: 6
        });

        columns.push({
            id: "remoteAddress",
            title: WebInspector.NetworkLogViewColumns._columnTitles["remoteAddress"],
            weight: 10,
            align: WebInspector.DataGrid.Align.Right
        });

        columns.push({
            id: "type",
            title: WebInspector.NetworkLogViewColumns._columnTitles["type"],
            weight: 6
        });

        columns.push({
            id: "initiator",
            title: WebInspector.NetworkLogViewColumns._columnTitles["initiator"],
            weight: 10
        });

        columns.push({
            id: "cookies",
            title: WebInspector.NetworkLogViewColumns._columnTitles["cookies"],
            weight: 6,
            align: WebInspector.DataGrid.Align.Right
        });

        columns.push({
            id: "setCookies",
            title: WebInspector.NetworkLogViewColumns._columnTitles["setCookies"],
            weight: 6,
            align: WebInspector.DataGrid.Align.Right
        });

        columns.push({
            id: "size",
            titleDOMFragment: this._makeHeaderFragment(WebInspector.UIString("Size"), WebInspector.UIString("Content")),
            title: WebInspector.NetworkLogViewColumns._columnTitles["size"],
            weight: 6,
            align: WebInspector.DataGrid.Align.Right
        });

        columns.push({
            id: "time",
            titleDOMFragment: this._makeHeaderFragment(WebInspector.UIString("Time"), WebInspector.UIString("Latency")),
            title: WebInspector.NetworkLogViewColumns._columnTitles["time"],
            weight: 6,
            align: WebInspector.DataGrid.Align.Right
        });

        columns.push({
            id: "priority",
            title: WebInspector.NetworkLogViewColumns._columnTitles["priority"],
            weight: 6
        });

        columns.push({
            id: "connectionId",
            title: WebInspector.NetworkLogViewColumns._columnTitles["connectionId"],
            weight: 6
        });

        var responseHeaderColumns = WebInspector.NetworkLogViewColumns._responseHeaderColumns;
        for (var i = 0; i < responseHeaderColumns.length; ++i) {
            var headerName = responseHeaderColumns[i];
            var descriptor = {
                id: headerName,
                title: WebInspector.NetworkLogViewColumns._columnTitles[headerName],
                weight: 6
            };
            if (headerName === "Content-Length")
                descriptor.align = WebInspector.DataGrid.Align.Right;
            columns.push(descriptor);
        }

        columns.push({
            id: "timeline",
            title: WebInspector.NetworkLogViewColumns._columnTitles["timeline"],
            sortable: false,
            weight: 40,
            sort: WebInspector.DataGrid.Order.Ascending
        });

        for (var column of columns) {
            column.sortable = column.id !== "timeline";
            column.nonSelectable = column.id !== "name";
        }
        this._columns = columns;

        this._networkLogView.switchViewMode(true);

        this._dataGrid = new WebInspector.SortableDataGrid(this._columns);

        this._dataGrid.asWidget().show(this._networkLogView.element);

        this._timelineGrid = new WebInspector.TimelineGrid();
        this._timelineGrid.element.classList.add("network-timeline-grid");
        this._dataGrid.element.appendChild(this._timelineGrid.element);

        this._updateColumns();
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortItems, this);
        this._dataGrid.sortNodes(this._sortingFunctions.startTime, false);
        this._patchTimelineHeader();

        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.ColumnsResized, this.updateDividersIfNeeded, this);

        return this._dataGrid;
    },

    _createSortingFunctions: function()
    {
        this._sortingFunctions.name = WebInspector.NetworkDataGridNode.NameComparator;
        this._sortingFunctions.method = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "requestMethod");
        this._sortingFunctions.status = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "statusCode");
        this._sortingFunctions.protocol = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "protocol");
        this._sortingFunctions.scheme = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "scheme");
        this._sortingFunctions.domain = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "domain");
        this._sortingFunctions.remoteAddress = WebInspector.NetworkDataGridNode.RemoteAddressComparator;
        this._sortingFunctions.type = WebInspector.NetworkDataGridNode.TypeComparator;
        this._sortingFunctions.initiator = WebInspector.NetworkDataGridNode.InitiatorComparator;
        this._sortingFunctions.cookies = WebInspector.NetworkDataGridNode.RequestCookiesCountComparator;
        this._sortingFunctions.setCookies = WebInspector.NetworkDataGridNode.ResponseCookiesCountComparator;
        this._sortingFunctions.size = WebInspector.NetworkDataGridNode.SizeComparator;
        this._sortingFunctions.time = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "duration");
        this._sortingFunctions.connectionId = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "connectionId");
        this._sortingFunctions.priority = WebInspector.NetworkDataGridNode.InitialPriorityComparator;
        this._sortingFunctions.timeline = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "startTime");
        this._sortingFunctions.startTime = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "startTime");
        this._sortingFunctions.endTime = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "endTime");
        this._sortingFunctions.responseTime = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "responseReceivedTime");
        this._sortingFunctions.duration = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "duration");
        this._sortingFunctions.latency = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "latency");

        this._sortingFunctions["Cache-Control"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "Cache-Control");
        this._sortingFunctions["Connection"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "Connection");
        this._sortingFunctions["Content-Encoding"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "Content-Encoding");
        this._sortingFunctions["Content-Length"] = WebInspector.NetworkDataGridNode.ResponseHeaderNumberComparator.bind(null, "Content-Length");
        this._sortingFunctions["ETag"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "ETag");
        this._sortingFunctions["Keep-Alive"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "Keep-Alive");
        this._sortingFunctions["Last-Modified"] = WebInspector.NetworkDataGridNode.ResponseHeaderDateComparator.bind(null, "Last-Modified");
        this._sortingFunctions["Server"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "Server");
        this._sortingFunctions["Vary"] = WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "Vary");
    },

    _sortItems: function()
    {
        this._networkLogView.removeAllNodeHighlights();
        var columnIdentifier = this._dataGrid.sortColumnIdentifier();
        if (!columnIdentifier)
            return;
        if (columnIdentifier === "timeline") {
            this._sortByTimeline();
            return;
        }
        var sortingFunction = this._sortingFunctions[columnIdentifier];
        if (!sortingFunction)
            return;

        this._dataGrid.sortNodes(sortingFunction, !this._dataGrid.isSortOrderAscending());
        this._timelineSortSelector.selectedIndex = 0;
        this._networkLogView.dataGridSorted();
    },

    _sortByTimeline: function()
    {
        this._networkLogView.removeAllNodeHighlights();
        var selectedIndex = this._timelineSortSelector.selectedIndex;
        if (!selectedIndex)
            selectedIndex = 1; // Sort by start time by default.
        var selectedOption = this._timelineSortSelector[selectedIndex];
        var value = selectedOption.value;

        this._networkLogView.setCalculator(this._calculators[value]);
        var sortingFunction = this._sortingFunctions[value];
        this._dataGrid.sortNodes(sortingFunction);

        this._networkLogView.dataGridSorted();

        this._dataGrid.markColumnAsSortedBy("timeline", selectedOption.sortOrder);
    },

    _patchTimelineHeader: function()
    {
        var timelineSorting = createElement("select");

        var option = createElement("option");
        option.value = "startTime";
        option.label = WebInspector.UIString("Timeline");
        option.disabled = true;
        timelineSorting.appendChild(option);

        option = createElement("option");
        option.value = "startTime";
        option.label = WebInspector.UIString("Timeline \u2013 Start Time");
        option.sortOrder = WebInspector.DataGrid.Order.Ascending;
        timelineSorting.appendChild(option);

        option = createElement("option");
        option.value = "responseTime";
        option.label = WebInspector.UIString("Timeline \u2013 Response Time");
        option.sortOrder = WebInspector.DataGrid.Order.Ascending;
        timelineSorting.appendChild(option);

        option = createElement("option");
        option.value = "endTime";
        option.label = WebInspector.UIString("Timeline \u2013 End Time");
        option.sortOrder = WebInspector.DataGrid.Order.Ascending;
        timelineSorting.appendChild(option);

        option = createElement("option");
        option.value = "duration";
        option.label = WebInspector.UIString("Timeline \u2013 Total Duration");
        option.sortOrder = WebInspector.DataGrid.Order.Descending;
        timelineSorting.appendChild(option);

        option = createElement("option");
        option.value = "latency";
        option.label = WebInspector.UIString("Timeline \u2013 Latency");
        option.sortOrder = WebInspector.DataGrid.Order.Descending;
        timelineSorting.appendChild(option);

        var header = this._dataGrid.headerTableHeader("timeline");
        header.replaceChild(timelineSorting, header.firstChild);
        header.createChild("div", "sort-order-icon-container").createChild("div", "sort-order-icon");

        timelineSorting.selectedIndex = 1;
        timelineSorting.addEventListener("click", function(event) { event.consume(); }, false);
        timelineSorting.addEventListener("change", this._sortByTimeline.bind(this), false);
        this._timelineSortSelector = timelineSorting;
    },

    _updateColumns: function()
    {
        if (!this._dataGrid)
            return;
        var gridMode = this._gridMode;
        var visibleColumns = {"name": true};
        if (gridMode)
            visibleColumns["timeline"] = true;
        if (gridMode) {
            var columnsVisibility = this._columnsVisibilitySetting.get();
            for (var columnIdentifier in columnsVisibility)
                visibleColumns[columnIdentifier] = columnsVisibility[columnIdentifier];
        }

        this._dataGrid.setColumnsVisiblity(visibleColumns);
    },

    /**
     * @param {boolean} gridMode
     */
    switchViewMode: function(gridMode)
    {
        if (this._gridMode === gridMode)
            return;
        this._gridMode = gridMode;

        if (gridMode) {
            if (this._dataGrid.selectedNode)
                this._dataGrid.selectedNode.selected = false;
        } else {
            this._networkLogView.removeAllNodeHighlights();
            this._popoverHelper.hidePopover();
        }

        this._networkLogView.element.classList.toggle("brief-mode", !gridMode);
        this._updateColumns();
    },

    /**
     * @param {string} columnIdentifier
     */
    _toggleColumnVisibility: function(columnIdentifier)
    {
        var columnsVisibility = this._columnsVisibilitySetting.get();
        columnsVisibility[columnIdentifier] = !columnsVisibility[columnIdentifier];
        this._columnsVisibilitySetting.set(columnsVisibility);

        this._updateColumns();
    },

    /**
     * @return {!Array.<string>}
     */
    _getConfigurableColumnIDs: function()
    {
        if (this._configurableColumnIDs)
            return this._configurableColumnIDs;

        var columnTitles = WebInspector.NetworkLogViewColumns._columnTitles;
        function compare(id1, id2)
        {
            return columnTitles[id1].compareTo(columnTitles[id2]);
        }

        var columnIDs = Object.keys(this._columnsVisibilitySetting.get());
        this._configurableColumnIDs = columnIDs.sort(compare);
        return this._configurableColumnIDs;
    },

    /**
     * @param {string} title
     * @param {string} subtitle
     * @return {!DocumentFragment}
     */
    _makeHeaderFragment: function(title, subtitle)
    {
        var fragment = createDocumentFragment();
        fragment.createTextChild(title);
        var subtitleDiv = fragment.createChild("div", "network-header-subtitle");
        subtitleDiv.createTextChild(subtitle);
        return fragment;
    },

    /**
     * @param {!Event} event
     * @return {boolean}
     */
    contextMenu: function(event)
    {
        if (!this._gridMode || !event.target.isSelfOrDescendant(this._dataGrid.headerTableBody))
            return false;

        var contextMenu = new WebInspector.ContextMenu(event);

        var columnsVisibility = this._columnsVisibilitySetting.get();
        var columnIDs = this._getConfigurableColumnIDs();
        var columnTitles = WebInspector.NetworkLogViewColumns._columnTitles;
        for (var i = 0; i < columnIDs.length; ++i) {
            var columnIdentifier = columnIDs[i];
            contextMenu.appendCheckboxItem(columnTitles[columnIdentifier], this._toggleColumnVisibility.bind(this, columnIdentifier), !!columnsVisibility[columnIdentifier]);
        }
        contextMenu.show();
        return true;
    },

    updateDividersIfNeeded: function()
    {
        if (!this._networkLogView.isShowing()) {
            this._networkLogView.scheduleRefresh();
            return;
        }

        var timelineOffset = this._dataGrid.columnOffset("timeline");
        // Position timline grid location.
        if (timelineOffset)
            this._timelineGrid.element.style.left = timelineOffset + "px";

        var calculator = this._networkLogView.calculator();
        calculator.setDisplayWindow(this._timelineGrid.dividersElement.clientWidth);
        this._timelineGrid.updateDividers(calculator, 75);

        if (calculator.startAtZero) {
            // If our current sorting method starts at zero, that means it shows all
            // requests starting at the same point, and so onLoad event and DOMContent
            // event lines really wouldn't make much sense here, so don't render them.
            return;
        }

        this._updateEventDividers();
    },

    /**
     * @param {!Element} element
     * @param {!Event} event
     * @return {!Element|!AnchorBox|undefined}
     */
    _getPopoverAnchor: function(element, event)
    {
        if (!this._gridMode)
            return;
        var anchor = element.enclosingNodeOrSelfWithClass("network-graph-bar") || element.enclosingNodeOrSelfWithClass("network-graph-label");
        if (anchor && anchor.parentElement.request && anchor.parentElement.request.timing)
            return anchor;
        anchor = element.enclosingNodeOrSelfWithClass("network-script-initiated");
        if (anchor && anchor.request) {
            var initiator = /** @type {!WebInspector.NetworkRequest} */ (anchor.request).initiator();
            if (initiator && initiator.stack)
                return anchor;
        }
    },

    /**
     * @param {!Element} anchor
     * @param {!WebInspector.Popover} popover
     */
    _showPopover: function(anchor, popover)
    {
        var content;
        if (anchor.classList.contains("network-script-initiated")) {
            var request = /** @type {!WebInspector.NetworkRequest} */ (anchor.request);
            var initiator = /** @type {!NetworkAgent.Initiator} */ (request.initiator());
            content = WebInspector.DOMPresentationUtils.buildStackTracePreviewContents(request.target(), this._popupLinkifier, initiator.stack);
            popover.setCanShrink(true);
        } else {
            content = WebInspector.RequestTimingView.createTimingTable(anchor.parentElement.request, this._networkLogView.timeCalculator().minimumBoundary());
            popover.setCanShrink(false);
        }
        popover.showForAnchor(content, anchor);
    },

    _onHidePopover: function()
    {
        this._popupLinkifier.reset();
    },

    /**
     * @param {!Array<number>} times
     * @param {string} className
     */
    addEventDividers: function(times, className)
    {
        for (var i = 0; i < times.length; ++i) {
            var element = createElementWithClass("div", "network-event-divider " + className);
            this._timelineGrid.addEventDivider(element);
            this._eventDividers.push({time: times[i], element: element});
        }
        // Update event dividers immediately
        this._updateEventDividers();
        // Schedule refresh in case dividers change the calculator span.
        this._networkLogView.scheduleRefresh();
    },

    _updateEventDividers: function()
    {
        var calculator = this._networkLogView.calculator();
        for (var divider of this._eventDividers) {
            var timePercent = calculator.computePercentageFromEventTime(divider.time);
            divider.element.classList.toggle("invisible", timePercent < 0);
            divider.element.style.left = timePercent + "%";
        }
    },

    hideEventDividers: function()
    {
        this._timelineGrid.hideEventDividers();
    },

    showEventDividers: function()
    {
        this._timelineGrid.showEventDividers();
    },

    /**
     * @param {!WebInspector.Event} event
     */
    _updateRowsSize: function(event)
    {
        this._timelineGrid.element.classList.toggle("small", !event.data);
    }
}