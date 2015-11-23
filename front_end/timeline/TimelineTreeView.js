// Copyright 2015 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @extends {WebInspector.VBox}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.TimelineTreeView = function(model)
{
    WebInspector.VBox.call(this);
    this.element.classList.add("timeline-tree-view");

    this._model = model;
    this._linkifier = new WebInspector.Linkifier();

    this._filters = [
        WebInspector.TimelineUIUtils.visibleEventsFilter(),
        new WebInspector.ExcludeTopLevelFilter()
    ];

    var columns = [];
    this._populateColumns(columns);
    this._dataGrid = new WebInspector.SortableDataGrid(columns);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    var dataGridContainerWidget = new WebInspector.DataGridContainerWidget();
    this._populateToolbar(dataGridContainerWidget.element);
    dataGridContainerWidget.appendDataGrid(this._dataGrid);

    this._splitWidget = new WebInspector.SplitWidget(true, true, "timelineTreeViewDetailsSplitWidget");
    this._splitWidget.show(this.element);
    this._splitWidget.setMainWidget(dataGridContainerWidget);
    /** @type {?WebInspector.TimelineModel.ProfileTreeNode|undefined} */
    this._lastSelectedNode;

    if (Runtime.experiments.isEnabled("timelineEventsTreeView")) {
        this._detailsView = new WebInspector.VBox();
        this._detailsView.element.classList.add("timeline-tree-view-details", "timeline-details-view-body");
        this._splitWidget.setSidebarWidget(this._detailsView);
        this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._updateDetailsForSelection, this);
    } else {
        this._splitWidget.hideSidebar(false);
    }
}

WebInspector.TimelineTreeView.prototype = {
    /**
     * @param {!WebInspector.TimelineSelection} selection
     */
    updateContents: function(selection)
    {
        this.setRange(selection.startTime(), selection.endTime());
    },

    /**
     * @param {number} startTime
     * @param {number} endTime
     */
    setRange: function(startTime, endTime)
    {
        this._startTime = startTime;
        this._endTime = endTime;
        this._refreshTree();
    },

    /**
     * @return {boolean}
     */
    _exposePercentages: function()
    {
        return false;
    },

    /**
     * @param {!Element} parent
     */
    _populateToolbar: function(parent) { },

    /**
     * @param {!ConsoleAgent.CallFrame} frame
     * @return {!Element}
     */
    linkifyLocation: function(frame)
    {
        return this._linkifier.linkifyConsoleCallFrame(this._model.target(), frame);
    },

    _refreshTree: function()
    {
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
            var gridNode = new WebInspector.TimelineTreeView.GridNode(child, tree.totalTime, maxSelfTime, maxTotalTime, this);
            this._dataGrid.insertChild(gridNode);
        }
        this._sortingChanged();
        this._updateDetailsForSelection();
    },

    /**
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildTree: function()
    {
        throw new Error("Not Implemented");
    },

    /**
     * @param {!Array.<!WebInspector.DataGrid.ColumnDescriptor>} columns
     */
    _populateColumns: function(columns)
    {
        columns.push({id: "self", title: WebInspector.UIString("Self Time"), width: "110px", sortable: true});
        columns.push({id: "total", title: WebInspector.UIString("Total Time"), width: "110px", sortable: true});
        columns.push({id: "activity", title: WebInspector.UIString("Activity"), disclosure: true, sortable: true});
    },

    _sortingChanged: function()
    {
        var columnIdentifier = this._dataGrid.sortColumnIdentifier();
        if (!columnIdentifier)
            return;
        var sortFunction;
        switch (columnIdentifier) {
        case "startTime":
            sortFunction = compareStartTime;
            break;
        case "self":
            sortFunction = compareNumericField.bind(null, "selfTime");
            break;
        case "total":
            sortFunction = compareNumericField.bind(null, "totalTime");
            break;
        case "activity":
            sortFunction = compareName;
            break;
        default:
            console.assert(false, "Unknown sort field: " + columnIdentifier);
            return;
        }
        this._dataGrid.sortNodes(sortFunction, !this._dataGrid.isSortOrderAscending());

        /**
         * @param {string} field
         * @param {!WebInspector.DataGridNode} a
         * @param {!WebInspector.DataGridNode} b
         * @return {number}
         */
        function compareNumericField(field, a, b)
        {
            var nodeA = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (b);
            return nodeA._profileNode[field] - nodeB._profileNode[field];
        }

        /**
         * @param {!WebInspector.DataGridNode} a
         * @param {!WebInspector.DataGridNode} b
         * @return {number}
         */
        function compareStartTime(a, b)
        {
            var nodeA = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (b);
            return nodeA._profileNode.event.startTime - nodeB._profileNode.event.startTime;
        }

        /**
         * @param {!WebInspector.DataGridNode} a
         * @param {!WebInspector.DataGridNode} b
         * @return {number}
         */
        function compareName(a, b)
        {
            var nodeA = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.GridNode} */ (b);
            var nameA = WebInspector.TimelineTreeView.eventNameForSorting(nodeA._profileNode.event);
            var nameB = WebInspector.TimelineTreeView.eventNameForSorting(nodeB._profileNode.event);
            return nameA.localeCompare(nameB);
        }
    },

    _updateDetailsForSelection: function()
    {
        // FIXME: remove this as we implement details for all modes.
        if (!this._detailsView)
            return;
        var selectedNode = this._dataGrid.selectedNode ? /** @type {!WebInspector.TimelineTreeView.GridNode} */ (this._dataGrid.selectedNode)._profileNode : null;
        if (selectedNode === this._lastSelectedNode)
            return;
        this._lastSelectedNode = selectedNode;
        this._detailsView.element.removeChildren();
        if (!selectedNode || !this._showDetailsForNode(selectedNode)) {
            var banner = this._detailsView.element.createChild("div", "banner");
            banner.createTextChild(WebInspector.UIString("No details are available for current selection."));
        }
    },

    /**
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
     * @return {boolean}
     */
    _showDetailsForNode: function(node)
    {
        return false;
    },

    __proto__: WebInspector.VBox.prototype
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.TimelineTreeView.eventId = function(event)
{
    var prefix = event.name === WebInspector.TimelineModel.RecordType.JSFrame ? "f:" : "";
    return prefix + WebInspector.TimelineTreeView.eventNameForSorting(event);
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.TimelineTreeView.eventNameForSorting = function(event)
{
    if (event.name === WebInspector.TimelineModel.RecordType.JSFrame) {
        var data = event.args["data"];
        return  data["functionName"] + "@" + (data["scriptId"] || data["url"] || "");
    }
    return event.name + ":@" + WebInspector.TimelineTreeView.eventURL(event);
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?Object}
 */
WebInspector.TimelineTreeView.eventStackFrame = function(event)
{
    if (event.name == WebInspector.TimelineModel.RecordType.JSFrame)
        return event.args["data"];
    var topFrame = event.stackTrace && event.stackTrace[0];
    if (topFrame)
        return topFrame;
    var initiator = event.initiator;
    return initiator && initiator.stackTrace && initiator.stackTrace[0] || null;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?string}
 */
WebInspector.TimelineTreeView.eventURL = function(event)
{
    var frame = WebInspector.TimelineTreeView.eventStackFrame(event);
    return frame && frame["url"] || null;
}

WebInspector.TimelineTreeView._gridNodeSymbol = Symbol("gridNode");

/**
 * @constructor
 * @extends {WebInspector.SortableDataGridNode}
 * @param {!WebInspector.TimelineModel.ProfileTreeNode} profileNode
 * @param {number} grandTotalTime
 * @param {number} maxSelfTime
 * @param {number} maxTotalTime
 * @param {!WebInspector.TimelineTreeView} treeView
 */
WebInspector.TimelineTreeView.GridNode = function(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView)
{
    this._populated = false;
    this._profileNode = profileNode;
    this._treeView = treeView;
    this._grandTotalTime = grandTotalTime;
    this._maxSelfTime = maxSelfTime;
    this._maxTotalTime = maxTotalTime;
    profileNode[WebInspector.TimelineTreeView._gridNodeSymbol] = this;
    var hasChildren = this._profileNode.children ? this._profileNode.children.size > 0 : false;
    WebInspector.SortableDataGridNode.call(this, null, hasChildren);
}

WebInspector.TimelineTreeView.GridNode.prototype = {
    /**
     * @override
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    createCell: function(columnIdentifier)
    {
        if (columnIdentifier === "activity")
            return this._createNameCell(columnIdentifier);
        return this._createValueCell(columnIdentifier) || WebInspector.DataGridNode.prototype.createCell.call(this, columnIdentifier);
    },

    /**
     * @param {string} columnIdentifier
     * @return {!Element}
     */
    _createNameCell: function(columnIdentifier)
    {
        var cell = this.createTD(columnIdentifier);
        var container = cell.createChild("div", "name-container");
        var icon = container.createChild("div", "activity-icon");
        var name = container.createChild("div", "activity-name");
        var event = this._profileNode.event;
        if (event) {
            var data = event.args["data"];
            var deoptReason = data && data["deoptReason"];
            if (deoptReason && deoptReason !== "no reason")
                container.createChild("div", "activity-warning").title = WebInspector.UIString("Not optimized: %s", deoptReason);
            name.textContent = event.name === WebInspector.TimelineModel.RecordType.JSFrame
                ? WebInspector.beautifyFunctionName(event.args["data"]["functionName"])
                : WebInspector.TimelineUIUtils.eventTitle(event);
            var frame = WebInspector.TimelineTreeView.eventStackFrame(event);
            if (frame && frame["url"]) {
                var callFrame = /** @type {!ConsoleAgent.CallFrame} */ (frame);
                container.createChild("div", "activity-link").appendChild(this._treeView.linkifyLocation(callFrame));
            }
            icon.style.backgroundColor = WebInspector.TimelineUIUtils.eventColor(event);
        } else {
            name.textContent = this._profileNode.name;
            icon.style.backgroundColor = this._profileNode.color;
        }
        return cell;
    },

    /**
     * @param {string} columnIdentifier
     * @return {?Element}
     */
    _createValueCell: function(columnIdentifier)
    {
        if (columnIdentifier !== "self" && columnIdentifier !== "total" && columnIdentifier !== "startTime")
            return null;

        var showPercents = false;
        var value;
        var maxTime;
        switch (columnIdentifier) {
        case "startTime":
            value = this._profileNode.event.startTime - this._treeView._model.minimumRecordTime();
            break;
        case "self":
            value = this._profileNode.selfTime;
            maxTime = this._maxSelfTime;
            showPercents = true;
            break;
        case "total":
            value = this._profileNode.totalTime;
            maxTime = this._maxTotalTime;
            showPercents = true;
            break;
        default:
            return null;
        }
        var cell = this.createTD(columnIdentifier);
        cell.className = "numeric-column";
        var textDiv = cell.createChild("div");
        textDiv.createChild("span").textContent = WebInspector.UIString("%.1f\u2009ms", value);

        if (showPercents && this._treeView._exposePercentages())
            textDiv.createChild("span", "percent-column").textContent = WebInspector.UIString("%.1f\u2009%%", value / this._grandTotalTime * 100);
        if (maxTime) {
            textDiv.classList.add("background-percent-bar");
            cell.createChild("div", "background-bar-container").createChild("div", "background-bar").style.width = (value * 100 / maxTime).toFixed(1) + "%";
        }
        return cell;
    },

    /**
     * @override
     */
    populate: function()
    {
        if (this._populated)
            return;
        this._populated = true;
        if (!this._profileNode.children)
            return;
        for (var node of this._profileNode.children.values()) {
            var gridNode = new WebInspector.TimelineTreeView.GridNode(node, this._grandTotalTime, this._maxSelfTime, this._maxTotalTime, this._treeView);
            this.insertChildOrdered(gridNode);
        }
    },

    __proto__: WebInspector.SortableDataGridNode.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineTreeView}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.AggregatedTimelineTreeView = function(model)
{
    this._groupBySetting = WebInspector.settings.createSetting("timelineTreeGroupBy", WebInspector.AggregatedTimelineTreeView.GroupBy.Category);
    WebInspector.TimelineTreeView.call(this, model);
    var nonessentialEvents = [
        WebInspector.TimelineModel.RecordType.EventDispatch,
        WebInspector.TimelineModel.RecordType.FunctionCall,
        WebInspector.TimelineModel.RecordType.TimerFire
    ];
    this._filters.push(new WebInspector.ExclusiveNameFilter(nonessentialEvents));
}

/**
 * @enum {string}
 */
WebInspector.AggregatedTimelineTreeView.GroupBy = {
    None: "None",
    Category: "Category",
    Domain: "Domain",
    Subdomain: "Subdomain",
    URL: "URL"
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {string}
 */
WebInspector.AggregatedTimelineTreeView.eventId = function(event)
{
    if (event.name === WebInspector.TimelineModel.RecordType.JSFrame) {
        var data = event.args["data"];
        return "f:" + data["functionName"] + "@" + (data["scriptId"] || data["url"] || "");
    }
    return event.name + ":@" + WebInspector.TimelineTreeView.eventURL(event);
}

WebInspector.AggregatedTimelineTreeView.prototype = {
    /**
     * @override
     * @param {!Element} parent
     */
    _populateToolbar: function(parent)
    {
        var panelToolbar = new WebInspector.Toolbar("", parent);
        this._groupByCombobox = new WebInspector.ToolbarComboBox(this._onGroupByChanged.bind(this));
        /**
         * @param {string} name
         * @param {string} id
         * @this {WebInspector.TimelineTreeView}
         */
        function addGroupingOption(name, id)
        {
            var option = this._groupByCombobox.createOption(name, "", id);
            this._groupByCombobox.addOption(option);
            if (id === this._groupBySetting.get())
                this._groupByCombobox.select(option);
        }
        addGroupingOption.call(this, WebInspector.UIString("No Grouping"), WebInspector.AggregatedTimelineTreeView.GroupBy.None);
        addGroupingOption.call(this, WebInspector.UIString("Group by Category"), WebInspector.AggregatedTimelineTreeView.GroupBy.Category);
        addGroupingOption.call(this, WebInspector.UIString("Group by Domain"), WebInspector.AggregatedTimelineTreeView.GroupBy.Domain);
        addGroupingOption.call(this, WebInspector.UIString("Group by Subdomain"), WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain);
        addGroupingOption.call(this, WebInspector.UIString("Group by URL"), WebInspector.AggregatedTimelineTreeView.GroupBy.URL);
        panelToolbar.appendToolbarItem(this._groupByCombobox);
    },

    /**
     * @override
     * @return {boolean}
     */
    _exposePercentages: function()
    {
        return true;
    },

    _onGroupByChanged: function()
    {
        this._groupBySetting.set(this._groupByCombobox.selectedOption().value);
        this._refreshTree();
    },

    /**
     * @param {function(!WebInspector.TimelineModel.ProfileTreeNode):string} nodeToGroupId
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _nodeToGroupNode: function(nodeToGroupId, node)
    {
        var id = nodeToGroupId(node);
        return this._groupNodes.get(id) || this._buildGroupNode(id, node.event);
    },

    /**
     * @param {string} id
     * @param {!WebInspector.TracingModel.Event} event
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildGroupNode: function(id, event)
    {
        var groupNode = new WebInspector.TimelineModel.ProfileTreeNode();
        groupNode.id = id;
        groupNode.selfTime = 0;
        groupNode.totalTime = 0;
        groupNode.children = new Map();
        this._groupNodes.set(id, groupNode);
        var categories = WebInspector.TimelineUIUtils.categories();
        switch (this._groupBySetting.get()) {
        case WebInspector.AggregatedTimelineTreeView.GroupBy.Category:
            var category = categories[id] || categories["other"];
            groupNode.name = category.title;
            groupNode.color = category.fillColorStop1;
            break;
        case WebInspector.AggregatedTimelineTreeView.GroupBy.Domain:
        case WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain:
        case WebInspector.AggregatedTimelineTreeView.GroupBy.URL:
            groupNode.name = id || WebInspector.UIString("unattributed");
            groupNode.color = id ? WebInspector.TimelineUIUtils.eventColor(event) : categories["other"].fillColorStop1;
            break;
        }
        return groupNode;
    },

    /**
     * @return {?function(!WebInspector.TimelineModel.ProfileTreeNode):string}
     */
    _nodeToGroupIdFunction: function()
    {
        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {string}
         */
        function groupByCategory(node)
        {
            return node.event ? WebInspector.TimelineUIUtils.eventStyle(node.event).category.name : "";
        }

        /**
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {string}
         */
        function groupByURL(node)
        {
            return WebInspector.TimelineTreeView.eventURL(node.event) || "";
        }

        /**
         * @param {boolean} groupSubdomains
         * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
         * @return {string}
         */
        function groupByDomain(groupSubdomains, node)
        {
            var url = WebInspector.TimelineTreeView.eventURL(node.event) || "";
            if (url.startsWith("extensions::"))
                return WebInspector.UIString("[Chrome extensions overhead]");
            var parsedURL = url.asParsedURL();
            if (!parsedURL)
                return "";
            if (parsedURL.scheme === "chrome-extension") {
                url = parsedURL.scheme + "://" + parsedURL.host;
                var displayName = executionContextNamesByOrigin.get(url);
                return displayName ? WebInspector.UIString("[Chrome extension] %s", displayName) : url;
            }
            if (!groupSubdomains)
                return parsedURL.host;
            if (/^[.0-9]+$/.test(parsedURL.host))
                return parsedURL.host;
            var domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
            return domainMatch && domainMatch[0] || "";
        }

        var executionContextNamesByOrigin = new Map();
        for (var target of WebInspector.targetManager.targets()) {
            for (var context of target.runtimeModel.executionContexts())
                executionContextNamesByOrigin.set(context.origin, context.name);
        }
        var groupByMap = /** @type {!Map<!WebInspector.AggregatedTimelineTreeView.GroupBy,?function(!WebInspector.TimelineModel.ProfileTreeNode):string>} */ (new Map([
            [WebInspector.AggregatedTimelineTreeView.GroupBy.None, null],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.Category, groupByCategory],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain, groupByDomain.bind(null, false)],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.Domain, groupByDomain.bind(null, true)],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.URL, groupByURL]
        ]));
        return groupByMap.get(this._groupBySetting.get()) || null;
    },

    __proto__: WebInspector.TimelineTreeView.prototype,
};

/**
 * @constructor
 * @extends {WebInspector.AggregatedTimelineTreeView}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.CallTreeTimelineTreeView = function(model)
{
    WebInspector.AggregatedTimelineTreeView.call(this, model);
    this._dataGrid.markColumnAsSortedBy("total", WebInspector.DataGrid.Order.Descending);
}

WebInspector.CallTreeTimelineTreeView.prototype = {
    /**
     * @override
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildTree: function()
    {
        var topDown = WebInspector.TimelineModel.buildTopDownTree(this._model.mainThreadEvents(), this._startTime, this._endTime, this._filters, WebInspector.AggregatedTimelineTreeView.eventId);
        return this._performTopDownTreeGrouping(topDown);
    },

    /**
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} topDownTree
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _performTopDownTreeGrouping: function(topDownTree)
    {
        var nodeToGroupId = this._nodeToGroupIdFunction();
        if (nodeToGroupId) {
            this._groupNodes = new Map();
            for (var node of topDownTree.children.values()) {
                var groupNode = this._nodeToGroupNode(nodeToGroupId, node);
                groupNode.selfTime += node.selfTime;
                groupNode.totalTime += node.totalTime;
                groupNode.children.set(node.id, node);
            }
            topDownTree.children = this._groupNodes;
            this._groupNodes = null;
        }
        return topDownTree;
    },

    __proto__: WebInspector.AggregatedTimelineTreeView.prototype
};

/**
 * @constructor
 * @extends {WebInspector.AggregatedTimelineTreeView}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.BottomUpTimelineTreeView = function(model)
{
    WebInspector.AggregatedTimelineTreeView.call(this, model);
    this._dataGrid.markColumnAsSortedBy("self", WebInspector.DataGrid.Order.Descending);
}

WebInspector.BottomUpTimelineTreeView.prototype = {
    /**
     * @override
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildTree: function()
    {
        var topDown = WebInspector.TimelineModel.buildTopDownTree(this._model.mainThreadEvents(), this._startTime, this._endTime, this._filters, WebInspector.AggregatedTimelineTreeView.eventId);
        return this._buildBottomUpTree(topDown);
    },

    /**
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} topDownTree
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildBottomUpTree: function(topDownTree)
    {
        this._groupNodes = new Map();
        var nodeToGroupId = this._nodeToGroupIdFunction();
        var nodeToGroupNode = nodeToGroupId ? this._nodeToGroupNode.bind(this, nodeToGroupId) : null;
        return WebInspector.TimelineModel.buildBottomUpTree(topDownTree, nodeToGroupNode);
    },

    __proto__: WebInspector.AggregatedTimelineTreeView.prototype
};

/**
 * @constructor
 * @extends {WebInspector.TimelineTreeView}
 * @param {!WebInspector.TimelineModel} model
 */
WebInspector.EventsTimelineTreeView = function(model)
{
    this._filtersControl = new WebInspector.TimelineFilters();
    this._filtersControl.addEventListener(WebInspector.TimelineFilters.Events.FilterChanged, this._onFilterChanged, this);
    WebInspector.TimelineTreeView.call(this, model);
    this._filters.push.apply(this._filters, this._filtersControl.filters());
    this._dataGrid.markColumnAsSortedBy("startTime", WebInspector.DataGrid.Order.Ascending);
}

WebInspector.EventsTimelineTreeView.prototype = {
    /**
     * @override
     * @param {!WebInspector.TimelineSelection} selection
     */
    updateContents: function(selection)
    {
        WebInspector.TimelineTreeView.prototype.updateContents.call(this, selection);
        if (selection.type() === WebInspector.TimelineSelection.Type.TraceEvent)
            this._revealEvent(/** @type {!WebInspector.TracingModel.Event} */ (selection.object()));
    },

    /**
     * @override
     * @return {!WebInspector.TimelineModel.ProfileTreeNode}
     */
    _buildTree: function()
    {
        this._currentTree = WebInspector.TimelineModel.buildTopDownTree(this._model.mainThreadEvents(), this._startTime, this._endTime, this._filters);
        return this._currentTree;
    },

    _onFilterChanged: function()
    {
        var selectedEvent = this._lastSelectedNode && this._lastSelectedNode.event;
        this._refreshTree();
        if (selectedEvent)
            this._revealEvent(selectedEvent);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {?Array<!WebInspector.TimelineModel.ProfileTreeNode>}
     */
    _findPathToNodeWithEvent: function(event)
    {
        var stack = [this._currentTree];
        var iterators = [this._currentTree.children.values()];

        while (stack.length) {
            var iterator = iterators.peekLast().next();
            if (iterator.done) {
                stack.pop();
                iterators.pop();
                continue;
            }
            var child = /** @type {!WebInspector.TimelineModel.ProfileTreeNode} */ (iterator.value);
            if (child.event === event) {
                stack.push(child);
                return stack;
            }
            if (child.children) {
                stack.push(child);
                iterators.push(child.children.values());
            }
        }
        return null;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     */
    _revealEvent: function(event)
    {
        var pathToSelectedEvent = this._findPathToNodeWithEvent(event);
        if (!pathToSelectedEvent)
            return;
        for (var i = 1; i < pathToSelectedEvent.length - 1; ++i)
            pathToSelectedEvent[i][WebInspector.TimelineTreeView._gridNodeSymbol].expand();
        pathToSelectedEvent.peekLast()[WebInspector.TimelineTreeView._gridNodeSymbol].revealAndSelect();
    },

    /**
     * @override
     * @param {!Array<!WebInspector.DataGrid.ColumnDescriptor>} columns
     */
    _populateColumns: function(columns)
    {
        columns.push({id: "startTime", title: WebInspector.UIString("Start Time"), width: "80px", sortable: true});
        WebInspector.TimelineTreeView.prototype._populateColumns.call(this, columns);
    },

    /**
     * @override
     * @param {!Element} parent
     */
    _populateToolbar: function(parent)
    {
        var filtersElement = this._filtersControl.filtersElement();
        filtersElement.classList.remove("hidden");
        parent.appendChild(filtersElement);
    },

    /**
     * @override
     * @param {!WebInspector.TimelineModel.ProfileTreeNode} node
     * @return {boolean}
     */
    _showDetailsForNode: function(node)
    {
        var traceEvent = node.event;
        if (!traceEvent)
            return false;
        WebInspector.TimelineUIUtils.buildTraceEventDetails(traceEvent, this._model, this._linkifier, false, showDetails.bind(this));
        return true;

        /**
         * @param {!DocumentFragment} fragment
         * @this {WebInspector.EventsTimelineTreeView}
         */
        function showDetails(fragment)
        {
            this._detailsView.element.appendChild(fragment);
        }
    },

    __proto__: WebInspector.TimelineTreeView.prototype
}
