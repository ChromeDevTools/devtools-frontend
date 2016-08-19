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

    /** @type {!WebInspector.Setting} */
    this._persistantSettings = WebInspector.settings.createSetting("networkLogColumns", {});

    /** @type {!Array<!Element>} */
    this._dropDownColumnSelectors = [];

    this._networkLogLargeRowsSetting = networkLogLargeRowsSetting;
    this._networkLogLargeRowsSetting.addChangeListener(this._updateRowsSize, this);

    /** @type {!Array<{time: number, element: !Element}>} */
    this._eventDividers = [];

    this._gridMode = true;

    /** @type {?WebInspector.DataGrid} */
    this._dataGrid = null;
    /** @type {!Array.<!WebInspector.NetworkLogViewColumns.Descriptor>} */
    this._columns = [];

    /** @type {?WebInspector.TimelineGrid} */
    this._timelineGrid = null;

    /** @type {!WebInspector.Linkifier} */
    this._popupLinkifier = new WebInspector.Linkifier();
}
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
    },
];

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

        /** @type {!Map<string, !WebInspector.NetworkTimeCalculator>} */
        this._calculatorsMap = new Map();
        this._calculatorsMap.set(WebInspector.NetworkLogViewColumns._calculatorTypes.Time, timeCalculator);
        this._calculatorsMap.set(WebInspector.NetworkLogViewColumns._calculatorTypes.Duration, durationCalculator);

        this._popoverHelper = new WebInspector.PopoverHelper(this._networkLogView.element, this._getPopoverAnchor.bind(this), this._showPopover.bind(this), this._onHidePopover.bind(this));

        this._dataGrid = new WebInspector.SortableDataGrid(this._columns.map(WebInspector.NetworkLogViewColumns._convertToDataGridDescriptor));

        this._dataGrid.asWidget().show(this._networkLogView.element);

        this._updateColumns();
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortHandler, this);
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.ColumnsResized, this.updateDividersIfNeeded, this);

        this._timelineGrid = new WebInspector.TimelineGrid();
        this._timelineGrid.element.classList.add("network-timeline-grid");
        this._dataGrid.element.appendChild(this._timelineGrid.element);
        this._setupDropdownColumns();

        this._dataGrid.markColumnAsSortedBy(WebInspector.NetworkLogViewColumns._initialSortColumn, WebInspector.DataGrid.Order.Ascending);

        this._updateRowsSize();

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
        var columnIdentifier = this._dataGrid.sortColumnIdentifier();
        var columnConfig = this._columns.find(columnConfig => columnConfig.id === columnIdentifier);
        if (!columnConfig)
            return;
        if (columnConfig.sortConfig && columnConfig.sortConfig.entries) {
            this._sortByDropdownItem(columnConfig);
            return;
        }
        if (!columnConfig.sortConfig.sortingFunction)
            return;

        this._networkLogView.removeAllNodeHighlights();
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
                visibleColumns[columnConfig.id] = (columnConfig.visible || !columnConfig.hideable);
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
     * @param {!Event} event
     * @return {boolean}
     */
    contextMenu: function(event)
    {
        if (!this._gridMode || !event.target.isSelfOrDescendant(this._dataGrid.headerTableBody))
            return false;

        var columnConfigs = this._columns.filter(columnConfig => columnConfig.hideable);
        var contextMenu = new WebInspector.ContextMenu(event);
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
        return true;
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
        var calculator = this._calculatorsMap.get(WebInspector.NetworkLogViewColumns._calculatorTypes.Time);
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

    _updateRowsSize: function()
    {
        this._timelineGrid.element.classList.toggle("small", !this._networkLogLargeRowsSetting.get());
    }
}