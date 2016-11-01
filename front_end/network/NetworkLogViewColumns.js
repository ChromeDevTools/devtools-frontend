// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!WebInspector.NetworkLogView} networkLogView
 * @param {!WebInspector.NetworkTransferTimeCalculator} timeCalculator
 * @param {!WebInspector.NetworkTransferDurationCalculator} durationCalculator
 * @param {!WebInspector.Setting} networkLogLargeRowsSetting
 */
WebInspector.NetworkLogViewColumns = function(networkLogView, timeCalculator, durationCalculator, networkLogLargeRowsSetting)
{
    if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
        var timelineColumn = WebInspector.NetworkLogViewColumns._defaultColumns.find(columnConfig => columnConfig.id === "timeline");
        timelineColumn.visible = false;
        timelineColumn.hideable = false;
    }

    this._networkLogView = networkLogView;

    /** @type {!WebInspector.Setting} */
    this._persistantSettings = WebInspector.settings.createSetting("networkLogColumns", {});

    /** @type {!Array<!Element>} */
    this._dropDownColumnSelectors = [];

    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this._networkLogLargeRowsSetting.addChangeListener(this._updateRowsSize, this);

    /** @type {!Array<{time: number, element: !Element}>} */
    this._eventDividers = [];

    /** @type {!Map<string, !Array<number>>} */
    this._shownEventDividers = new Map();
    this._eventDividersShown = false;

    this._gridMode = true;

    /** @type {!Array.<!WebInspector.NetworkLogViewColumns.Descriptor>} */
    this._columns = [];

    /** @type {?WebInspector.TimelineGrid} */
    this._timelineGrid = null;
    this._timelineHeaderElement = null;
    this._timelineRequestsAreStale = false;
    this._timelineScrollerWidthIsStale = true;

    /** @type {!WebInspector.Linkifier} */
    this._popupLinkifier = new WebInspector.Linkifier();

    /** @type {!Map<string, !WebInspector.NetworkTimeCalculator>} */
    this._calculatorsMap = new Map();
    this._calculatorsMap.set(WebInspector.NetworkLogViewColumns._calculatorTypes.Time, timeCalculator);
    this._calculatorsMap.set(WebInspector.NetworkLogViewColumns._calculatorTypes.Duration, durationCalculator);

    this._setupDataGrid();
    if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
        this._setupTimeline();
};

WebInspector.NetworkLogViewColumns._initialSortColumn = "timeline";

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
 *     sortConfig: !WebInspector.NetworkLogViewColumns.SortConfig,
 *     isCustomHeader: boolean
 * }}
 */
WebInspector.NetworkLogViewColumns.Descriptor;

/**
 * @typedef {{
 *     sortingFunction: (!function(!WebInspector.NetworkDataGridNode, !WebInspector.NetworkDataGridNode):number|undefined),
 *     entries: (!Array.<!WebInspector.DataGrid.ColumnDescriptor>|undefined)
 * }}
 */
WebInspector.NetworkLogViewColumns.SortConfig;

/** @enum {string} */
WebInspector.NetworkLogViewColumns._calculatorTypes = {
    Duration: "Duration",
    Time: "Time"
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
        id: "name",
        title: WebInspector.UIString("Name"),
        subtitle: WebInspector.UIString("Path"),
        visible: true,
        weight: 20,
        hideable: false,
        nonSelectable: false,
        alwaysVisible: true,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.NameComparator
        }
    },
    {
        id: "method",
        title: WebInspector.UIString("Method"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "requestMethod")
        }
    },
    {
        id: "status",
        title: WebInspector.UIString("Status"),
        visible: true,
        subtitle: WebInspector.UIString("Text"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "statusCode")
        }
    },
    {
        id: "protocol",
        title: WebInspector.UIString("Protocol"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "protocol")
        }
    },
    {
        id: "scheme",
        title: WebInspector.UIString("Scheme"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "scheme")
        }
    },
    {
        id: "domain",
        title: WebInspector.UIString("Domain"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "domain")
        }
    },
    {
        id: "remoteaddress",
        title: WebInspector.UIString("Remote Address"),
        weight: 10,
        align: WebInspector.DataGrid.Align.Right,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RemoteAddressComparator
        }
    },
    {
        id: "type",
        title: WebInspector.UIString("Type"),
        visible: true,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.TypeComparator
        }
    },
    {
        id: "initiator",
        title: WebInspector.UIString("Initiator"),
        visible: true,
        weight: 10,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.InitiatorComparator
        }
    },
    {
        id: "cookies",
        title: WebInspector.UIString("Cookies"),
        align: WebInspector.DataGrid.Align.Right,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestCookiesCountComparator
        }
    },
    {
        id: "setcookies",
        title: WebInspector.UIString("Set Cookies"),
        align: WebInspector.DataGrid.Align.Right,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseCookiesCountComparator
        }
    },
    {
        id: "size",
        title: WebInspector.UIString("Size"),
        visible: true,
        subtitle: WebInspector.UIString("Content"),
        align: WebInspector.DataGrid.Align.Right,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.SizeComparator
        }
    },
    {
        id: "time",
        title: WebInspector.UIString("Time"),
        visible: true,
        subtitle:  WebInspector.UIString("Latency"),
        align: WebInspector.DataGrid.Align.Right,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "duration")
        }
    },
    {
        id: "priority",
        title: WebInspector.UIString("Priority"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.InitialPriorityComparator
        }
    },
    {
        id: "connectionid",
        title: WebInspector.UIString("Connection ID"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "connectionId")
        }
    },
    {
        id: "cache-control",
        isResponseHeader: true,
        title: WebInspector.UIString("Cache-Control"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "cache-control")
        }
    },
    {
        id: "connection",
        isResponseHeader: true,
        title: WebInspector.UIString("Connection"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "connection")
        }
    },
    {
        id: "content-encoding",
        isResponseHeader: true,
        title: WebInspector.UIString("Content-Encoding"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "content-encoding")
        }
    },
    {
        id: "content-length",
        isResponseHeader: true,
        title: WebInspector.UIString("Content-Length"),
        align: WebInspector.DataGrid.Align.Right,
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderNumberComparator.bind(null, "content-length")
        }
    },
    {
        id: "etag",
        isResponseHeader: true,
        title: WebInspector.UIString("ETag"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "etag")
        }
    },
    {
        id: "keep-alive",
        isResponseHeader: true,
        title: WebInspector.UIString("Keep-Alive"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "keep-alive")
        }
    },
    {
        id: "last-modified",
        isResponseHeader: true,
        title: WebInspector.UIString("Last-Modified"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderDateComparator.bind(null, "last-modified")
        }
    },
    {
        id: "server",
        isResponseHeader: true,
        title: WebInspector.UIString("Server"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "server")
        }
    },
    {
        id: "vary",
        isResponseHeader: true,
        title: WebInspector.UIString("Vary"),
        sortConfig: {
            sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, "vary")
        }
    },
    {
        id: "timeline",
        title: WebInspector.UIString("Timeline"),
        visible: true,
        weight: 40,
        sortable: false,
        hideable: false,
        sortConfig: {
            entries: [
                {
                    id: "starttime",
                    title: WebInspector.UIString("Timeline \u2013 Start Time"),
                    sort: WebInspector.DataGrid.Order.Ascending,
                    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "startTime"),
                    calculator: WebInspector.NetworkLogViewColumns._calculatorTypes.Time
                },
                {
                    id: "responsetime",
                    title: WebInspector.UIString("Timeline \u2013 Response Time"),
                    sort: WebInspector.DataGrid.Order.Ascending,
                    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "responseReceivedTime"),
                    calculator: WebInspector.NetworkLogViewColumns._calculatorTypes.Time
                },
                {
                    id: "endtime",
                    title: WebInspector.UIString("Timeline \u2013 End Time"),
                    sort: WebInspector.DataGrid.Order.Ascending,
                    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "endTime"),
                    calculator: WebInspector.NetworkLogViewColumns._calculatorTypes.Time
                },
                {
                    id: "duration",
                    title: WebInspector.UIString("Timeline \u2013 Total Duration"),
                    sort: WebInspector.DataGrid.Order.Descending,
                    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "duration"),
                    calculator: WebInspector.NetworkLogViewColumns._calculatorTypes.Duration
                },
                {
                    id: "latency",
                    title: WebInspector.UIString("Timeline \u2013 Latency"),
                    sort: WebInspector.DataGrid.Order.Descending,
                    sortingFunction: WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, "latency"),
                    calculator: WebInspector.NetworkLogViewColumns._calculatorTypes.Duration
                }
            ]
        }
    }
];

WebInspector.NetworkLogViewColumns._filmStripDividerColor = "#fccc49";

/**
 * @enum {string}
 */
WebInspector.NetworkLogViewColumns.TimelineSortIds = {
    StartTime: "startTime",
    ResponseTime: "responseReceivedTime",
    EndTime: "endTime",
    Duration: "duration",
    Latency: "latency"
};

/**
 * @param {!WebInspector.NetworkLogViewColumns.Descriptor} columnConfig
 * @return {!WebInspector.DataGrid.ColumnDescriptor}
 */
WebInspector.NetworkLogViewColumns._convertToDataGridDescriptor = function(columnConfig)
{
    return /** @type {!WebInspector.DataGrid.ColumnDescriptor} */ ({
        id: columnConfig.id,
        title: columnConfig.title,
        sortable: columnConfig.sortable,
        align: columnConfig.align,
        nonSelectable: columnConfig.nonSelectable,
        weight: columnConfig.weight
    });
};

WebInspector.NetworkLogViewColumns.prototype = {
    wasShown: function()
    {
        this._updateRowsSize();
    },

    willHide: function()
    {
        this._popoverHelper.hidePopover();
    },

    reset: function()
    {
        if (this._popoverHelper)
            this._popoverHelper.hidePopover();
        this._timelineGrid.removeEventDividers();
        this._shownEventDividers.clear();
        this.updateDividersIfNeeded();
    },

    _setupDataGrid: function()
    {
        var defaultColumns = WebInspector.NetworkLogViewColumns._defaultColumns;
        var defaultColumnConfig = WebInspector.NetworkLogViewColumns._defaultColumnConfig;

        this._columns = /** @type {!Array<!WebInspector.NetworkLogViewColumns.Descriptor>} */ ([]);
        for (var currentConfigColumn of defaultColumns) {
            var columnConfig = /** @type {!WebInspector.NetworkLogViewColumns.Descriptor} */ (Object.assign(/** @type {!Object} */ ({}), defaultColumnConfig, currentConfigColumn));
            columnConfig.id = columnConfig.id;
            if (columnConfig.subtitle)
                columnConfig.titleDOMFragment = this._makeHeaderFragment(columnConfig.title, columnConfig.subtitle);
            this._columns.push(columnConfig);
        }
        this._loadColumns();

        this._popoverHelper = new WebInspector.PopoverHelper(this._networkLogView.element);
        this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this), this._showPopover.bind(this), this._onHidePopover.bind(this));

        this._dataGrid = new WebInspector.SortableDataGrid(this._columns.map(WebInspector.NetworkLogViewColumns._convertToDataGridDescriptor));
        this._dataGrid.element.addEventListener("mousedown", event => {
            if ((!this._dataGrid.selectedNode && event.button) || event.target.enclosingNodeOrSelfWithNodeName("a"))
                event.consume();
        }, true);

        this._dataGridScroller = this._dataGrid.scrollContainer;

        this._updateColumns();
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortHandler, this);
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.ColumnsResized, this.updateDividersIfNeeded, this);
        this._dataGrid.setHeaderContextMenuCallback(this._innerHeaderContextMenu.bind(this));

        this._timelineGrid = new WebInspector.TimelineGrid();
        this._timelineGrid.element.classList.add("network-timeline-grid");
        if (!Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            this._dataGrid.element.appendChild(this._timelineGrid.element);

        this._setupDropdownColumns();

        this._activeTimelineSortId = WebInspector.NetworkLogViewColumns.TimelineSortIds.StartTime;
        this._dataGrid.markColumnAsSortedBy(WebInspector.NetworkLogViewColumns._initialSortColumn, WebInspector.DataGrid.Order.Ascending);

        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            this._splitWidget = new WebInspector.SplitWidget(true, true, "networkPanelSplitViewTimeline", 200);
            this._splitWidget.setMainWidget(this._dataGrid.asWidget());
        }
    },

    _setupTimeline: function()
    {
        this._timelineColumn = new WebInspector.NetworkTimelineColumn(this._networkLogView.rowHeight(), this._networkLogView.calculator());

        this._timelineColumn.element.addEventListener("contextmenu", handleContextMenu.bind(this));
        this._timelineColumn.element.addEventListener("mousewheel", this._onMouseWheel.bind(this, false), { passive: true });
        this._dataGridScroller.addEventListener("mousewheel",this._onMouseWheel.bind(this, true), true);

        this._timelineColumn.element.addEventListener("mousemove", event => this._networkLogView.setHoveredRequest(this._timelineColumn.getRequestFromPoint(event.offsetX, event.offsetY + event.target.offsetTop)), true);
        this._timelineColumn.element.addEventListener("mouseleave", this._networkLogView.setHoveredRequest.bind(this._networkLogView, null), true);

        this._timelineScroller = this._timelineColumn.contentElement.createChild("div", "network-timeline-v-scroll");
        this._timelineScroller.addEventListener("scroll", this._syncScrollers.bind(this), { passive: true });
        this._timelineScrollerContent = this._timelineScroller.createChild("div", "network-timeline-v-scroll-content");

        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.PaddingChanged, () => {
            this._timelineScrollerWidthIsStale = true;
            this._syncScrollers();
        });
        this._dataGrid.addEventListener(WebInspector.ViewportDataGrid.Events.ViewportCalculated, this._redrawTimelineColumn.bind(this));


        this._createTimelineHeader();
        this._timelineColumn.contentElement.classList.add("network-timeline-view");

        this._splitWidget.setSidebarWidget(this._timelineColumn);

        this.switchViewMode(false);

        /**
         * @param {!Event} event
         * @this {WebInspector.NetworkLogViewColumns}
         */
        function handleContextMenu(event)
        {
            var request = this._timelineColumn.getRequestFromPoint(event.offsetX, event.offsetY);
            if (!request)
                return;
            var contextMenu = new WebInspector.ContextMenu(event);
            this._networkLogView.handleContextMenuForRequest(contextMenu, request);
            contextMenu.show();
        }
    },

    /**
     * @param {boolean} shouldConsume
     * @param {!Event} event
     */
    _onMouseWheel: function(shouldConsume, event)
    {
        if (shouldConsume)
            event.consume(true);
        this._activeScroller.scrollTop -= event.wheelDeltaY;
        this._syncScrollers();
        this._networkLogView.setHoveredRequest(this._timelineColumn.getRequestFromPoint(event.offsetX, event.offsetY));
    },

    _syncScrollers: function()
    {
        if (!this._timelineColumn.isShowing())
            return;
        this._timelineScrollerContent.style.height = this._dataGridScroller.scrollHeight + "px";
        this._updateScrollerWidthIfNeeded();
        this._dataGridScroller.scrollTop = this._timelineScroller.scrollTop;
    },

    _updateScrollerWidthIfNeeded: function()
    {
        if (this._timelineScrollerWidthIsStale) {
            this._timelineScrollerWidthIsStale = false;
            this._timelineColumn.setRightPadding(this._timelineScroller.offsetWidth - this._timelineScrollerContent.offsetWidth);
        }
    },

    _redrawTimelineColumn: function()
    {
        if (!this._timelineRequestsAreStale) {
            this._updateScrollerWidthIfNeeded();
            this._timelineColumn.update(this._activeScroller.scrollTop, this._eventDividersShown ? this._shownEventDividers : undefined);
            return;
        }
        var currentNode = this._dataGrid.rootNode();
        var requestData = {
            requests: [],
            navigationRequest: null
        };
        while (currentNode = currentNode.traverseNextNode(true)) {
            if (currentNode.isNavigationRequest())
                requestData.navigationRequest = currentNode.request();
            requestData.requests.push(currentNode.request());
        }
        this._timelineColumn.update(this._activeScroller.scrollTop, this._shownEventDividers, requestData);
    },

    /**
     * @param {?WebInspector.NetworkRequest} request
     */
    setHoveredRequest: function(request)
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            this._timelineColumn.setHoveredRequest(request);
    },

    _createTimelineHeader: function()
    {
        this._timelineHeaderElement = this._timelineColumn.contentElement.createChild("div", "network-timeline-header");
        this._timelineHeaderElement.addEventListener("click", timelineHeaderClicked.bind(this));
        this._timelineHeaderElement.addEventListener("contextmenu", event => this._innerHeaderContextMenu(new WebInspector.ContextMenu(event)));
        var innerElement = this._timelineHeaderElement.createChild("div");
        innerElement.textContent = WebInspector.UIString("Timeline");
        this._timelineColumnSortIcon = this._timelineHeaderElement.createChild("div", "sort-order-icon-container").createChild("div", "sort-order-icon");

        /**
         * @this {WebInspector.NetworkLogViewColumns}
         */
        function timelineHeaderClicked()
        {
            var sortOrders = WebInspector.DataGrid.Order;
            var sortOrder = this._dataGrid.sortOrder() === sortOrders.Ascending ? sortOrders.Descending : sortOrders.Ascending;
            this._dataGrid.markColumnAsSortedBy("timeline", sortOrder);
            this._sortHandler();
        }
    },

    /**
     * @param {!WebInspector.NetworkTimeCalculator} x
     */
    setCalculator: function(x)
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            this._timelineColumn.setCalculator(x);
    },

    dataChanged: function()
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            this._timelineRequestsAreStale = true;
    },

    _updateRowsSize: function()
    {
        var largeRows = !!this._networkLogLargeRowsSetting.get();
        this._dataGrid.element.classList.toggle("small", !largeRows);
        this._dataGrid.scheduleUpdate();

        if (!Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            return;
        this._timelineScrollerWidthIsStale = true;
        this._timelineColumn.setRowHeight(this._networkLogView.rowHeight());
        this._timelineScroller.classList.toggle("small", !largeRows);
        this._timelineHeaderElement.classList.toggle("small", !largeRows);
        this._timelineGrid.element.classList.toggle("small", !this._networkLogLargeRowsSetting.get());
        this._timelineColumn.setHeaderHeight(this._timelineScroller.offsetTop);
    },

    /**
     * @param {!Element} element
     */
    show: function(element)
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            this._splitWidget.show(element);
        else
            this._dataGrid.asWidget().show(element);
    },

    /**
     * @return {!WebInspector.SortableDataGrid} dataGrid
     */
    dataGrid: function()
    {
        return this._dataGrid;
    },

    _setupDropdownColumns: function()
    {
        for (var columnConfig of this._columns) {
            if (!columnConfig.sortConfig || !columnConfig.sortConfig.entries)
                continue;
            var select = createElement("select");
            var placeHolderOption = select.createChild("option");
            placeHolderOption.classList.add("hidden");
            for (var entry of columnConfig.sortConfig.entries) {
                var option = select.createChild("option");
                option.value = entry.id;
                option.label = entry.title;
                select.appendChild(option);
            }
            var header = this._dataGrid.headerTableHeader(columnConfig.id);
            header.replaceChild(select, header.firstChild);
            header.createChild("div", "sort-order-icon-container").createChild("div", "sort-order-icon");
            columnConfig.selectBox = select;
            select.addEventListener("change", this._sortByDropdownItem.bind(this, columnConfig), false);
            this._dropDownColumnSelectors.push(select);
        }
    },

    sortByCurrentColumn: function()
    {
        this._sortHandler();
    },

    _sortHandler: function()
    {
        var columnId = this._dataGrid.sortColumnId();
        this._networkLogView.removeAllNodeHighlights();
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline") && columnId === "timeline") {
            this._timelineColumnSortIcon.classList.remove("sort-ascending", "sort-descending");

            if (this._dataGrid.sortOrder() === WebInspector.DataGrid.Order.Ascending)
                this._timelineColumnSortIcon.classList.add("sort-ascending");
            else
                this._timelineColumnSortIcon.classList.add("sort-descending");

            this._timelineRequestsAreStale = true;
            var sortFunction = WebInspector.NetworkDataGridNode.RequestPropertyComparator.bind(null, this._activeTimelineSortId);
            this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());
            return;
        }

        var columnConfig = this._columns.find(columnConfig => columnConfig.id === columnId);
        if (!columnConfig)
            return;
        if (columnConfig.sortConfig && columnConfig.sortConfig.entries) {
            this._sortByDropdownItem(columnConfig);
            return;
        }
        if (!columnConfig.sortConfig.sortingFunction)
            return;

        this._dataGrid.sortNodes(columnConfig.sortConfig.sortingFunction, !this._dataGrid.isSortOrderAscending());
        this._networkLogView.dataGridSorted();
    },

    /**
     * @param {!WebInspector.NetworkLogViewColumns.Descriptor} columnConfig
     */
    _sortByDropdownItem: function(columnConfig)
    {
        this._networkLogView.removeAllNodeHighlights();
        var selectedIndex = columnConfig.selectBox.selectedIndex;
        if (!selectedIndex)
            selectedIndex = 1; // Sort by first item by default.
        var selectedItemConfig = columnConfig.sortConfig.entries[selectedIndex - 1]; // -1 because of placeholder.
        var selectedOption = columnConfig.selectBox[selectedIndex];
        var value = selectedOption.value;

        this._dataGrid.sortNodes(selectedItemConfig.sortingFunction);
        this._dataGrid.markColumnAsSortedBy(columnConfig.id, /** @type {!WebInspector.DataGrid.Order} */ (selectedItemConfig.sort));
        if (selectedItemConfig.calculator)
            this._networkLogView.setCalculator(this._calculatorsMap.get(selectedItemConfig.calculator));
        columnConfig.selectBox.options[0].label = selectedItemConfig.title;
        columnConfig.selectBox.selectedIndex = 0;
        this._networkLogView.dataGridSorted();
    },

    _updateColumns: function()
    {
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


        if (!Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            return;
        // TODO(allada) Move this code into the code above.
        if (gridMode) {
            this._splitWidget.showBoth();
            this._activeScroller = this._timelineScroller;
            this._timelineScroller.scrollTop = this._dataGridScroller.scrollTop;
            this._dataGridScroller.style.overflow = "hidden";
            this._dataGrid.setScrollContainer(this._timelineScroller);
        } else {
            this._splitWidget.hideMain();
            this._activeScroller = this._dataGridScroller;
            this._dataGridScroller.style.overflow = "overlay";
            this._dataGrid.setScrollContainer(this._dataGridScroller);
        }
    },

    /**
     * @param {!WebInspector.NetworkLogViewColumns.Descriptor} columnConfig
     */
    _toggleColumnVisibility: function(columnConfig)
    {
        this._loadColumns();
        columnConfig.visible = !columnConfig.visible;
        this._saveColumns();
        this._updateColumns();
    },

    _saveColumns: function()
    {
        var saveableSettings = {};
        for (var columnConfig of this._columns) {
            saveableSettings[columnConfig.id] = {
                visible: columnConfig.visible,
                title: columnConfig.title
            };
        }
        this._persistantSettings.set(saveableSettings);
    },

    _loadColumns: function()
    {
        var savedSettings = this._persistantSettings.get();
        var columnIds = Object.keys(savedSettings);
        for (var columnId of columnIds) {
            var setting = savedSettings[columnId];
            var columnConfig = this._columns.find(columnConfig => columnConfig.id === columnId);
            if (!columnConfig)
                columnConfig = this._addCustomHeader(setting.title, columnId);
            if (columnConfig.hideable && typeof setting.visible === "boolean")
                columnConfig.visible = !!setting.visible;
            if (typeof setting.title === "string")
                columnConfig.title = setting.title;
        }
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
     * @param {!WebInspector.ContextMenu} contextMenu
     */
    _innerHeaderContextMenu: function(contextMenu)
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            var timelineSortIds = WebInspector.NetworkLogViewColumns.TimelineSortIds;
            var timelineSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Timeline"));
            timelineSubMenu.appendCheckboxItem(WebInspector.UIString("Start Time"), setTimelineMode.bind(this, timelineSortIds.StartTime), this._activeTimelineSortId === timelineSortIds.StartTime);
            timelineSubMenu.appendCheckboxItem(WebInspector.UIString("Response Time"), setTimelineMode.bind(this, timelineSortIds.ResponseTime), this._activeTimelineSortId === timelineSortIds.ResponseTime);
            timelineSubMenu.appendCheckboxItem(WebInspector.UIString("End Time"), setTimelineMode.bind(this, timelineSortIds.EndTime), this._activeTimelineSortId === timelineSortIds.EndTime);
            timelineSubMenu.appendCheckboxItem(WebInspector.UIString("Total Duration"), setTimelineMode.bind(this, timelineSortIds.Duration), this._activeTimelineSortId === timelineSortIds.Duration);
            timelineSubMenu.appendCheckboxItem(WebInspector.UIString("Latency"), setTimelineMode.bind(this, timelineSortIds.Latency), this._activeTimelineSortId === timelineSortIds.Latency);
            contextMenu.appendSeparator();
        }
        var columnConfigs = this._columns.filter(columnConfig => columnConfig.hideable);
        var nonResponseHeaders = columnConfigs.filter(columnConfig => !columnConfig.isResponseHeader);
        for (var columnConfig of nonResponseHeaders)
            contextMenu.appendCheckboxItem(columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible);

        contextMenu.appendSeparator();

        var responseSubMenu = contextMenu.appendSubMenuItem(WebInspector.UIString("Response Headers"));
        var responseHeaders = columnConfigs.filter(columnConfig => columnConfig.isResponseHeader);
        for (var columnConfig of responseHeaders)
            responseSubMenu.appendCheckboxItem(columnConfig.title, this._toggleColumnVisibility.bind(this, columnConfig), columnConfig.visible);

        responseSubMenu.appendSeparator();
        responseSubMenu.appendItem(WebInspector.UIString("Manage Header Columns\u2026"), this._manageCustomHeaderDialog.bind(this));

        contextMenu.show();

        /**
         * @param {!WebInspector.NetworkLogViewColumns.TimelineSortIds} sortId
         * @this {WebInspector.NetworkLogViewColumns}
         */
        function setTimelineMode(sortId)
        {
            var calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Time);
            var timelineSortIds = WebInspector.NetworkLogViewColumns.TimelineSortIds;
            if (sortId === timelineSortIds.Duration || sortId === timelineSortIds.Latency)
                calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Duration);
            this._networkLogView.setCalculator(calculator);

            this._activeTimelineSortId = sortId;
            this._dataGrid.markColumnAsSortedBy("timeline", WebInspector.DataGrid.Order.Ascending);
            this._sortHandler();
        }
    },

    _manageCustomHeaderDialog: function()
    {
        var customHeaders = [];
        for (var columnConfig of this._columns) {
            if (columnConfig.isResponseHeader)
                customHeaders.push({title: columnConfig.title, editable: columnConfig.isCustomHeader});
        }
        var manageCustomHeaders = new WebInspector.NetworkManageCustomHeadersView(customHeaders, headerTitle => !!this._addCustomHeader(headerTitle), this._changeCustomHeader.bind(this), this._removeCustomHeader.bind(this));
        var dialog = new WebInspector.Dialog();
        manageCustomHeaders.show(dialog.element);
        dialog.setWrapsContent(true);
        dialog.show();
    },

    /**
     * @param {string} headerId
     * @return {boolean}
     */
    _removeCustomHeader: function(headerId)
    {
        headerId = headerId.toLowerCase();
        var index = this._columns.findIndex(columnConfig => columnConfig.id === headerId);
        if (index === -1)
            return false;
        var columnConfig = this._columns.splice(index, 1);
        this._dataGrid.removeColumn(headerId);
        this._saveColumns();
        this._updateColumns();
        return true;
    },

    /**
     * @param {string} headerTitle
     * @param {string=} headerId
     * @param {number=} index
     * @return {?WebInspector.NetworkLogViewColumns.Descriptor}
     */
    _addCustomHeader: function(headerTitle, headerId, index)
    {
        if (!headerId)
            headerId = headerTitle.toLowerCase();
        if (index === undefined)
            index = this._columns.length - 1;

        var currentColumnConfig = this._columns.find(columnConfig => columnConfig.id === headerId);
        if (currentColumnConfig)
            return null;

        var columnConfig =  /** @type {!WebInspector.NetworkLogViewColumns.Descriptor} */ (Object.assign(/** @type {!Object} */ ({}), WebInspector.NetworkLogViewColumns._defaultColumnConfig, {
            id: headerId,
            title: headerTitle,
            isResponseHeader: true,
            isCustomHeader: true,
            visible: true,
            sortConfig: {
                sortingFunction: WebInspector.NetworkDataGridNode.ResponseHeaderStringComparator.bind(null, headerId)
            }
        }));
        this._columns.splice(index, 0, columnConfig);
        if (this._dataGrid)
            this._dataGrid.addColumn(WebInspector.NetworkLogViewColumns._convertToDataGridDescriptor(columnConfig), index);
        this._saveColumns();
        this._updateColumns();
        return columnConfig;
    },

    /**
     * @param {string} oldHeaderId
     * @param {string} newHeaderTitle
     * @param {string=} newHeaderId
     * @return {boolean}
     */
    _changeCustomHeader: function(oldHeaderId, newHeaderTitle, newHeaderId)
    {
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
    },

    updateDividersIfNeeded: function()
    {
        // TODO(allada) Remove this code out when timeline canvas experiment is over.
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            return;
        if (!this._networkLogView.isShowing()) {
            this._networkLogView.scheduleRefresh();
            return;
        }

        var timelineOffset = this._dataGrid.columnOffset("timeline");
        // Position timline grid location.
        if (timelineOffset)
            this._timelineGrid.element.style.left = timelineOffset + "px";

        var calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Time);
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
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            // TODO(allada) When we remove old timeline remove this and pass in the color.
            var color = "transparent";
            switch (className) {
            case "network-blue-divider":
                color = "hsla(240, 100%, 80%, 0.7)";
                break;
            case "network-red-divider":
                color = "rgba(255, 0, 0, 0.5)";
                break;
            default:
                return;
            }
            var currentTimes = this._shownEventDividers.get(color) || [];
            this._shownEventDividers.set(color, currentTimes.concat(times));

            this._networkLogView.scheduleRefresh();
            return;
        }

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
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline"))
            return;
        var calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Time);
        for (var divider of this._eventDividers) {
            var timePercent = calculator.computePercentageFromEventTime(divider.time);
            divider.element.classList.toggle("invisible", timePercent < 0);
            divider.element.style.left = timePercent + "%";
        }
    },

    hideEventDividers: function()
    {
        this._eventDividersShown = true;
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            this._redrawTimelineColumn();
            return;
        }
        this._timelineGrid.hideEventDividers();
    },

    showEventDividers: function()
    {
        this._eventDividersShown = false;
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            this._redrawTimelineColumn();
            return;
        }
        this._timelineGrid.showEventDividers();
    },

    /**
     * @param {number} time
     */
    selectFilmStripFrame: function(time)
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            this._shownEventDividers.set(WebInspector.NetworkLogViewColumns._filmStripDividerColor, [time]);
            this._redrawTimelineColumn();
            return;
        }
        for (var divider of this._eventDividers)
            divider.element.classList.toggle("network-frame-divider-selected", divider.time === time);
    },

    clearFilmStripFrame: function()
    {
        if (Runtime.experiments.isEnabled("canvasNetworkTimeline")) {
            this._shownEventDividers.delete(WebInspector.NetworkLogViewColumns._filmStripDividerColor);
            this._redrawTimelineColumn();
            return;
        }
        for (var divider of this._eventDividers)
            divider.element.classList.toggle("network-frame-divider-selected", false);
    }
};
