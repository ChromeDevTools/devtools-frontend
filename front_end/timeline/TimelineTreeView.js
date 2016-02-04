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

    this._filters = [];
    if (!Runtime.experiments.isEnabled("timelineShowAllEvents")) {
        this._filters.push(WebInspector.TimelineUIUtils.visibleEventsFilter());
        this._filters.push(new WebInspector.ExcludeTopLevelFilter());
    }

    var columns = [];
    this._populateColumns(columns);

    var mainView = new WebInspector.VBox();
    this._populateToolbar(mainView.element);
    this._dataGrid = new WebInspector.SortableDataGrid(columns);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SortingChanged, this._sortingChanged, this);
    this._dataGrid.element.addEventListener("mousemove", this._onMouseMove.bind(this), true)
    this._dataGrid.setResizeMethod(WebInspector.DataGrid.ResizeMethod.Last);
    this._dataGrid.asWidget().show(mainView.element);

    this._splitWidget = new WebInspector.SplitWidget(true, true, "timelineTreeViewDetailsSplitWidget");
    this._splitWidget.show(this.element);
    this._splitWidget.setMainWidget(mainView);

    this._detailsView = new WebInspector.VBox();
    this._detailsView.element.classList.add("timeline-details-view", "timeline-details-view-body");
    this._splitWidget.setSidebarWidget(this._detailsView);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._updateDetailsForSelection, this);

    /** @type {?WebInspector.TimelineTreeView.ProfileTreeNode|undefined} */
    this._lastSelectedNode;
}

/**
 * @constructor
 */
WebInspector.TimelineTreeView.ProfileTreeNode = function()
{
    /** @type {number} */
    this.totalTime;
    /** @type {number} */
    this.selfTime;
    /** @type {string} */
    this.name;
    /** @type {string} */
    this.color;
    /** @type {string} */
    this.id;
    /** @type {!WebInspector.TracingModel.Event} */
    this.event;
    /** @type {?Map<string|symbol,!WebInspector.TimelineTreeView.ProfileTreeNode>} */
    this.children;
    /** @type {?WebInspector.TimelineTreeView.ProfileTreeNode} */
    this.parent;
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
     * @param {?WebInspector.TimelineTreeView.ProfileTreeNode} node
     */
    _onHover: function(node) { },

    /**
     * @param {!RuntimeAgent.CallFrame} frame
     * @return {!Element}
     */
    linkifyLocation: function(frame)
    {
        return this._linkifier.linkifyConsoleCallFrame(this._model.target(), frame);
    },

    /**
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} treeNode
     * @param {boolean} suppressSelectedEvent
     */
    selectProfileNode: function(treeNode, suppressSelectedEvent)
    {
        var pathToRoot = [];
        for (var node = treeNode; node; node = node.parent)
            pathToRoot.push(node);
        for (var i = pathToRoot.length - 1; i > 0; --i) {
            var gridNode = this._dataGridNodeForTreeNode(pathToRoot[i]);
            if (gridNode && gridNode.dataGrid)
                gridNode.expand();
        }
        var gridNode = this._dataGridNodeForTreeNode(treeNode);
        if (gridNode.dataGrid) {
            gridNode.reveal();
            gridNode.select(suppressSelectedEvent);
        }
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
            var gridNode = new WebInspector.TimelineTreeView.TreeGridNode(child, tree.totalTime, maxSelfTime, maxTotalTime, this);
            this._dataGrid.insertChild(gridNode);
        }
        this._sortingChanged();
        this._updateDetailsForSelection();
    },

    /**
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildTree: function()
    {
        throw new Error("Not Implemented");
    },

    /**
     * @param {function(!WebInspector.TracingModel.Event):(string|symbol)=} eventIdCallback
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildTopDownTree: function(eventIdCallback)
    {
        // Temporarily deposit a big enough value that exceeds the max recording time.
        var /** @const */ initialTime = 1e7;
        var root = new WebInspector.TimelineTreeView.ProfileTreeNode();
        root.totalTime = initialTime;
        root.selfTime = initialTime;
        root.name = WebInspector.UIString("Top-Down Chart");
        root.children = /** @type {!Map<string, !WebInspector.TimelineTreeView.ProfileTreeNode>} */ (new Map());
        var parent = root;

        /**
         * @this {WebInspector.TimelineTreeView}
         * @param {!WebInspector.TracingModel.Event} e
         */
        function onStartEvent(e)
        {
            if (!WebInspector.TimelineModel.isVisible(this._filters, e))
                return;
            var time = e.endTime ? Math.min(this._endTime, e.endTime) - Math.max(this._startTime, e.startTime) : 0;
            var id = eventIdCallback ? eventIdCallback(e) : Symbol("uniqueEventId");
            if (!parent.children)
                parent.children = /** @type {!Map<string,!WebInspector.TimelineTreeView.ProfileTreeNode>} */ (new Map());
            var node = parent.children.get(id);
            if (node) {
                node.selfTime += time;
                node.totalTime += time;
            } else {
                node = new WebInspector.TimelineTreeView.ProfileTreeNode();
                node.totalTime = time;
                node.selfTime = time;
                node.parent = parent;
                node.id = id;
                node.event = e;
                parent.children.set(id, node);
            }
            parent.selfTime -= time;
            if (parent.selfTime < 0) {
                console.log("Error: Negative self of " + parent.selfTime, e);
                parent.selfTime = 0;
            }
            if (e.endTime)
                parent = node;
        }

        /**
         * @this {WebInspector.TimelineTreeView}
         * @param {!WebInspector.TracingModel.Event} e
         */
        function onEndEvent(e)
        {
            if (!WebInspector.TimelineModel.isVisible(this._filters, e))
                return;
            parent = parent.parent;
        }

        var instantEventCallback = eventIdCallback ? undefined : onStartEvent.bind(this); // Ignore instant events when aggregating.
        var events = this._model.mainThreadEvents();
        WebInspector.TimelineModel.forEachEvent(events, onStartEvent.bind(this), onEndEvent.bind(this), instantEventCallback, this._startTime, this._endTime);
        root.totalTime -= root.selfTime;
        root.selfTime = 0;
        return root;
    },

    /**
     * @param {!Array.<!WebInspector.DataGrid.ColumnDescriptor>} columns
     */
    _populateColumns: function(columns)
    {
        columns.push({id: "self", title: WebInspector.UIString("Self Time"), width: "110px", fixedWidth: true, sortable: true});
        columns.push({id: "total", title: WebInspector.UIString("Total Time"), width: "110px", fixedWidth: true, sortable: true});
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
            var nodeA = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (b);
            return nodeA._profileNode[field] - nodeB._profileNode[field];
        }

        /**
         * @param {!WebInspector.DataGridNode} a
         * @param {!WebInspector.DataGridNode} b
         * @return {number}
         */
        function compareStartTime(a, b)
        {
            var nodeA = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (b);
            return nodeA._profileNode.event.startTime - nodeB._profileNode.event.startTime;
        }

        /**
         * @param {!WebInspector.DataGridNode} a
         * @param {!WebInspector.DataGridNode} b
         * @return {number}
         */
        function compareName(a, b)
        {
            var nodeA = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (a);
            var nodeB = /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (b);
            var nameA = WebInspector.TimelineTreeView.eventNameForSorting(nodeA._profileNode.event);
            var nameB = WebInspector.TimelineTreeView.eventNameForSorting(nodeB._profileNode.event);
            return nameA.localeCompare(nameB);
        }
    },

    _updateDetailsForSelection: function()
    {
        var selectedNode = this._dataGrid.selectedNode ? /** @type {!WebInspector.TimelineTreeView.TreeGridNode} */ (this._dataGrid.selectedNode)._profileNode : null;
        if (selectedNode === this._lastSelectedNode)
            return;
        this._lastSelectedNode = selectedNode;
        this._detailsView.detachChildWidgets();
        this._detailsView.element.removeChildren();
        if (!selectedNode || !this._showDetailsForNode(selectedNode)) {
            var banner = this._detailsView.element.createChild("div", "banner");
            banner.createTextChild(WebInspector.UIString("Select item for details."));
        }
    },

    /**
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
     * @return {boolean}
     */
    _showDetailsForNode: function(node)
    {
        return false;
    },

    /**
     * @param {!Event} event
     */
    _onMouseMove: function(event)
    {
        var gridNode = event.target && (event.target instanceof Node)
            ? /** @type {?WebInspector.TimelineTreeView.TreeGridNode} */ (this._dataGrid.dataGridNodeFromNode(/** @type {!Node} */ (event.target)))
            : null;
        var profileNode = gridNode && gridNode._profileNode;
        if (profileNode === this._lastHoveredProfileNode)
            return;
        this._lastHoveredProfileNode = profileNode;
        this._onHover(profileNode);
    },

    /**
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} treeNode
     * @return {?WebInspector.TimelineTreeView.GridNode}
     */
    _dataGridNodeForTreeNode: function(treeNode)
    {
        return treeNode[WebInspector.TimelineTreeView.TreeGridNode._gridNodeSymbol] || null;
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

/**
 * @constructor
 * @extends {WebInspector.SortableDataGridNode}
 * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} profileNode
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
    WebInspector.SortableDataGridNode.call(this, null, false);
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
                var callFrame = /** @type {!RuntimeAgent.CallFrame} */ (frame);
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

    __proto__: WebInspector.SortableDataGridNode.prototype
}

/**
 * @constructor
 * @extends {WebInspector.TimelineTreeView.GridNode}
 * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} profileNode
 * @param {number} grandTotalTime
 * @param {number} maxSelfTime
 * @param {number} maxTotalTime
 * @param {!WebInspector.TimelineTreeView} treeView
 */
WebInspector.TimelineTreeView.TreeGridNode = function(profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView)
{
    WebInspector.TimelineTreeView.GridNode.call(this, profileNode, grandTotalTime, maxSelfTime, maxTotalTime, treeView);
    this.hasChildren = this._profileNode.children ? this._profileNode.children.size > 0 : false;
    profileNode[WebInspector.TimelineTreeView.TreeGridNode._gridNodeSymbol] = this;
}

WebInspector.TimelineTreeView.TreeGridNode._gridNodeSymbol = Symbol("treeGridNode");

WebInspector.TimelineTreeView.TreeGridNode.prototype = {
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
            var gridNode = new WebInspector.TimelineTreeView.TreeGridNode(node, this._grandTotalTime, this._maxSelfTime, this._maxTotalTime, this._treeView);
            this.insertChildOrdered(gridNode);
        }
    },

    __proto__: WebInspector.TimelineTreeView.GridNode.prototype
};


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
    this._stackView = new WebInspector.TimelineStackView(this);
    this._stackView.addEventListener(WebInspector.TimelineStackView.Events.SelectionChanged, this._onStackViewSelectionChanged, this);
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
     * @param {!WebInspector.TimelineSelection} selection
     */
    updateContents: function(selection)
    {
        WebInspector.TimelineTreeView.prototype.updateContents.call(this, selection);
        var rootNode = this._dataGrid.rootNode();
        if (rootNode.children.length)
            rootNode.children[0].revealAndSelect();
    },

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
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} treeNode
     * @return {!Array<!WebInspector.TimelineTreeView.ProfileTreeNode>}
     */
    _buildHeaviestStack: function(treeNode)
    {
        console.assert(!!treeNode.parent, "Attempt to build stack for tree root");
        var result = [];
        // Do not add root to the stack, as it's the tree itself.
        for (var node = treeNode; node && node.parent; node = node.parent)
            result.push(node);
        result = result.reverse();
        for (node = treeNode; node && node.children && node.children.size;) {
            var children = Array.from(node.children.values());
            node = children.reduce((a, b) => a.totalTime > b.totalTime ? a : b);
            result.push(node);
        }
        return result;
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

    _onStackViewSelectionChanged: function()
    {
        var treeNode = this._stackView.selectedTreeNode();
        if (treeNode)
            this.selectProfileNode(treeNode, true);
    },

    /**
     * @param {function(!WebInspector.TimelineTreeView.ProfileTreeNode):string} nodeToGroupId
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _nodeToGroupNode: function(nodeToGroupId, node)
    {
        var id = nodeToGroupId(node);
        return this._groupNodes.get(id) || this._buildGroupNode(id, node.event);
    },

    /**
     * @param {string} id
     * @param {!WebInspector.TracingModel.Event} event
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildGroupNode: function(id, event)
    {
        var groupNode = new WebInspector.TimelineTreeView.ProfileTreeNode();
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
            groupNode.color = category.color;
            break;
        case WebInspector.AggregatedTimelineTreeView.GroupBy.Domain:
        case WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain:
        case WebInspector.AggregatedTimelineTreeView.GroupBy.URL:
            groupNode.name = id || WebInspector.UIString("unattributed");
            groupNode.color = id ? WebInspector.TimelineUIUtils.eventColor(event) : categories["other"].color;
            break;
        }
        return groupNode;
    },

    /**
     * @return {?function(!WebInspector.TimelineTreeView.ProfileTreeNode):string}
     */
    _nodeToGroupIdFunction: function()
    {
        /**
         * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
         * @return {string}
         */
        function groupByCategory(node)
        {
            return node.event ? WebInspector.TimelineUIUtils.eventStyle(node.event).category.name : "";
        }

        /**
         * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
         * @return {string}
         */
        function groupByURL(node)
        {
            return WebInspector.TimelineTreeView.eventURL(node.event) || "";
        }

        /**
         * @param {boolean} groupSubdomains
         * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
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
        var groupByMap = /** @type {!Map<!WebInspector.AggregatedTimelineTreeView.GroupBy,?function(!WebInspector.TimelineTreeView.ProfileTreeNode):string>} */ (new Map([
            [WebInspector.AggregatedTimelineTreeView.GroupBy.None, null],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.Category, groupByCategory],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.Subdomain, groupByDomain.bind(null, false)],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.Domain, groupByDomain.bind(null, true)],
            [WebInspector.AggregatedTimelineTreeView.GroupBy.URL, groupByURL]
        ]));
        return groupByMap.get(this._groupBySetting.get()) || null;
    },

    /**
     * @override
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
     * @return {boolean}
     */
    _showDetailsForNode: function(node)
    {
        var stack = this._buildHeaviestStack(node);
        this._stackView.setStack(stack, node);
        this._stackView.show(this._detailsView.element);
        return true;
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
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildTree: function()
    {
        var topDown = this._buildTopDownTree(WebInspector.AggregatedTimelineTreeView.eventId);
        return this._performTopDownTreeGrouping(topDown);
    },

    /**
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} topDownTree
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _performTopDownTreeGrouping: function(topDownTree)
    {
        var nodeToGroupId = this._nodeToGroupIdFunction();
        if (nodeToGroupId) {
            this._groupNodes = new Map();
            for (var node of topDownTree.children.values()) {
                var groupNode = this._nodeToGroupNode(nodeToGroupId, node);
                groupNode.parent = topDownTree;
                groupNode.selfTime += node.selfTime;
                groupNode.totalTime += node.totalTime;
                groupNode.children.set(node.id, node);
                node.parent = groupNode;
            }
            topDownTree.children = this._groupNodes;
            this._groupNodes = null;
        }
        return topDownTree;
    },

    __proto__: WebInspector.AggregatedTimelineTreeView.prototype,
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
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildTree: function()
    {
        var topDown = this._buildTopDownTree(WebInspector.AggregatedTimelineTreeView.eventId);
        this._groupNodes = new Map();
        var nodeToGroupId = this._nodeToGroupIdFunction();
        var nodeToGroupNode = nodeToGroupId ? this._nodeToGroupNode.bind(this, nodeToGroupId) : null;
        return this._buildBottomUpTree(topDown, nodeToGroupNode);
    },

    /**
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} topDownTree
     * @param {?function(!WebInspector.TimelineTreeView.ProfileTreeNode):!WebInspector.TimelineTreeView.ProfileTreeNode=} groupingCallback
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildBottomUpTree: function(topDownTree, groupingCallback)
    {
        var buRoot = new WebInspector.TimelineTreeView.ProfileTreeNode();
        buRoot.selfTime = 0;
        buRoot.totalTime = 0;
        buRoot.name = WebInspector.UIString("Bottom-Up Chart");
        /** @type {!Map<string, !WebInspector.TimelineTreeView.ProfileTreeNode>} */
        buRoot.children = new Map();
        var nodesOnStack = /** @type {!Set<string>} */ (new Set());
        if (topDownTree.children)
            topDownTree.children.forEach(processNode);
        buRoot.totalTime = topDownTree.totalTime;

        /**
         * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} tdNode
         */
        function processNode(tdNode)
        {
            var buParent = groupingCallback && groupingCallback(tdNode) || buRoot;
            if (buParent !== buRoot) {
                buRoot.children.set(buParent.id, buParent);
                buParent.parent = buRoot;
            }
            appendNode(tdNode, buParent);
            var hadNode = nodesOnStack.has(tdNode.id);
            if (!hadNode)
                nodesOnStack.add(tdNode.id);
            if (tdNode.children)
                tdNode.children.forEach(processNode);
            if (!hadNode)
                nodesOnStack.delete(tdNode.id);
        }

        /**
         * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} tdNode
         * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} buParent
         */
        function appendNode(tdNode, buParent)
        {
            var selfTime = tdNode.selfTime;
            var totalTime = tdNode.totalTime;
            buParent.selfTime += selfTime;
            buParent.totalTime += selfTime;
            while (tdNode.parent) {
                if (!buParent.children)
                    buParent.children = /** @type {!Map<string,!WebInspector.TimelineTreeView.ProfileTreeNode>} */ (new Map());
                var id = tdNode.id;
                var buNode = buParent.children.get(id);
                if (!buNode) {
                    buNode = new WebInspector.TimelineTreeView.ProfileTreeNode();
                    buNode.selfTime = selfTime;
                    buNode.totalTime = totalTime;
                    buNode.name = tdNode.name;
                    buNode.event = tdNode.event;
                    buNode.id = id;
                    buNode.parent = buParent;
                    buParent.children.set(id, buNode);
                } else {
                    buNode.selfTime += selfTime;
                    if (!nodesOnStack.has(id))
                        buNode.totalTime += totalTime;
                }
                tdNode = tdNode.parent;
                buParent = buNode;
            }
        }

        // Purge zero self time nodes.
        var rootChildren = buRoot.children;
        for (var item of rootChildren.entries()) {
            if (item[1].selfTime === 0)
                rootChildren.delete(item[0]);
        }

        return buRoot;
    },

    __proto__: WebInspector.AggregatedTimelineTreeView.prototype
};

/**
 * @constructor
 * @extends {WebInspector.TimelineTreeView}
 * @param {!WebInspector.TimelineModel} model
 * @param {!WebInspector.TimelineModeViewDelegate} delegate
 */
WebInspector.EventsTimelineTreeView = function(model, delegate)
{
    this._filtersControl = new WebInspector.TimelineFilters();
    this._filtersControl.addEventListener(WebInspector.TimelineFilters.Events.FilterChanged, this._onFilterChanged, this);
    WebInspector.TimelineTreeView.call(this, model);
    this._delegate = delegate;
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
        if (selection.type() === WebInspector.TimelineSelection.Type.TraceEvent) {
            var event = /** @type {!WebInspector.TracingModel.Event} */ (selection.object());
            this._selectEvent(event, true);
        }
    },

    /**
     * @override
     * @return {!WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _buildTree: function()
    {
        this._currentTree = this._buildTopDownTree();
        return this._currentTree;
    },

    _onFilterChanged: function()
    {
        var selectedEvent = this._lastSelectedNode && this._lastSelectedNode.event;
        this._refreshTree();
        if (selectedEvent)
            this._selectEvent(selectedEvent, false);
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @return {?WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    _findNodeWithEvent: function(event)
    {
        var iterators = [this._currentTree.children.values()];

        while (iterators.length) {
            var iterator = iterators.peekLast().next();
            if (iterator.done) {
                iterators.pop();
                continue;
            }
            var child = /** @type {!WebInspector.TimelineTreeView.ProfileTreeNode} */ (iterator.value);
            if (child.event === event)
                return child;
            if (child.children)
                iterators.push(child.children.values());
        }
        return null;
    },

    /**
     * @param {!WebInspector.TracingModel.Event} event
     * @param {boolean=} expand
     */
    _selectEvent: function(event, expand)
    {
        var node = this._findNodeWithEvent(event);
        if (!node)
            return;
        this.selectProfileNode(node, false);
        if (expand)
            this._dataGridNodeForTreeNode(node).expand();
    },

    /**
     * @override
     * @param {!Array<!WebInspector.DataGrid.ColumnDescriptor>} columns
     */
    _populateColumns: function(columns)
    {
        columns.push({id: "startTime", title: WebInspector.UIString("Start Time"), width: "110px", fixedWidth: true, sortable: true});
        WebInspector.TimelineTreeView.prototype._populateColumns.call(this, columns);
    },

    /**
     * @override
     * @param {!Element} parent
     */
    _populateToolbar: function(parent)
    {
        var filtersWidget = this._filtersControl.filtersWidget();
        filtersWidget.forceShowFilterBar();
        filtersWidget.show(parent);
    },

    /**
     * @override
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} node
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

    /**
     * @override
     * @param {?WebInspector.TimelineTreeView.ProfileTreeNode} node
     */
    _onHover: function(node)
    {
        this._delegate.highlightEvent(node && node.event);
    },

    __proto__: WebInspector.TimelineTreeView.prototype
}

/**
 * @constructor
 * @extends {WebInspector.VBox}
 */
WebInspector.TimelineStackView = function(treeView)
{
    WebInspector.VBox.call(this);
    var header = this.element.createChild("div", "timeline-stack-view-header");
    header.textContent = WebInspector.UIString("Heaviest stack");
    this._treeView = treeView;
    var columns = [
        {id: "total", title: WebInspector.UIString("Total Time"), fixedWidth: true, width: "110px"},
        {id: "activity", title: WebInspector.UIString("Activity")}
    ];
    this._dataGrid = new WebInspector.ViewportDataGrid(columns);
    this._dataGrid.setResizeMethod(WebInspector.DataGrid.ResizeMethod.Last);
    this._dataGrid.addEventListener(WebInspector.DataGrid.Events.SelectedNode, this._onSelectionChanged, this);
    this._dataGrid.asWidget().show(this.element);
}

/**
 * @enum {symbol}
 */
WebInspector.TimelineStackView.Events = {
    SelectionChanged: Symbol("SelectionChanged")
}

WebInspector.TimelineStackView.prototype = {
    /**
     * @param {!Array<!WebInspector.TimelineTreeView.ProfileTreeNode>} stack
     * @param {!WebInspector.TimelineTreeView.ProfileTreeNode} selectedNode
     */
    setStack: function(stack, selectedNode)
    {
        var rootNode = this._dataGrid.rootNode();
        rootNode.removeChildren();
        var nodeToReveal = null;
        var totalTime = Math.max.apply(Math, stack.map(node => node.totalTime));
        for (var node of stack) {
            var gridNode = new WebInspector.TimelineTreeView.GridNode(node, totalTime, totalTime, totalTime, this._treeView);
            rootNode.appendChild(gridNode);
            if (node === selectedNode)
                nodeToReveal = gridNode;
        }
        nodeToReveal.revealAndSelect();
    },

    /**
     * @return {?WebInspector.TimelineTreeView.ProfileTreeNode}
     */
    selectedTreeNode: function()
    {
        var selectedNode = this._dataGrid.selectedNode;
        return selectedNode && /** @type {!WebInspector.TimelineTreeView.GridNode} */ (selectedNode)._profileNode;
    },

    _onSelectionChanged: function()
    {
        this.dispatchEventToListeners(WebInspector.TimelineStackView.Events.SelectionChanged);
    },

    __proto__: WebInspector.VBox.prototype
}
