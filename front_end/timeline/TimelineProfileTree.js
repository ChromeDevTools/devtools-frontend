// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

WebInspector.TimelineProfileTree = { };

/**
 * @constructor
 */
WebInspector.TimelineProfileTree.Node = function()
{
    /** @type {number} */
    this.totalTime;
    /** @type {number} */
    this.selfTime;
    /** @type {string} */
    this.id;
    /** @type {!WebInspector.TracingModel.Event} */
    this.event;
    /** @type {?Map<string|symbol,!WebInspector.TimelineProfileTree.Node>} */
    this.children;
    /** @type {?WebInspector.TimelineProfileTree.Node} */
    this.parent;
    this._isGroupNode = false;
}

WebInspector.TimelineProfileTree.Node.prototype = {
    /**
     * @return {boolean}
     */
    isGroupNode: function()
    {
        return this._isGroupNode;
    }
}

/**
 * @param {!Array<!WebInspector.TracingModel.Event>} events
 * @param {!Array<!WebInspector.TimelineModel.Filter>} filters
 * @param {number} startTime
 * @param {number} endTime
 * @param {function(!WebInspector.TracingModel.Event):(string|symbol)=} eventIdCallback
 * @return {!WebInspector.TimelineProfileTree.Node}
 */
WebInspector.TimelineProfileTree.buildTopDown = function(events, filters, startTime, endTime, eventIdCallback)
{
    // Temporarily deposit a big enough value that exceeds the max recording time.
    var /** @const */ initialTime = 1e7;
    var root = new WebInspector.TimelineProfileTree.Node();
    root.totalTime = initialTime;
    root.selfTime = initialTime;
    root.children = /** @type {!Map<string, !WebInspector.TimelineProfileTree.Node>} */ (new Map());
    var parent = root;

    /**
     * @param {!WebInspector.TracingModel.Event} e
     */
    function onStartEvent(e)
    {
        if (!WebInspector.TimelineModel.isVisible(filters, e))
            return;
        var time = e.endTime ? Math.min(endTime, e.endTime) - Math.max(startTime, e.startTime) : 0;
        var id = eventIdCallback ? eventIdCallback(e) : Symbol("uniqueEventId");
        if (!parent.children)
            parent.children = /** @type {!Map<string,!WebInspector.TimelineProfileTree.Node>} */ (new Map());
        var node = parent.children.get(id);
        if (node) {
            node.selfTime += time;
            node.totalTime += time;
        } else {
            node = new WebInspector.TimelineProfileTree.Node();
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
     * @param {!WebInspector.TracingModel.Event} e
     */
    function onEndEvent(e)
    {
        if (!WebInspector.TimelineModel.isVisible(filters, e))
            return;
        parent = parent.parent;
    }

    var instantEventCallback = eventIdCallback ? undefined : onStartEvent; // Ignore instant events when aggregating.
    WebInspector.TimelineModel.forEachEvent(events, onStartEvent, onEndEvent, instantEventCallback, startTime, endTime);
    root.totalTime -= root.selfTime;
    root.selfTime = 0;
    return root;
}

/**
 * @param {!WebInspector.TimelineProfileTree.Node} topDownTree
 * @param {?function(!WebInspector.TimelineProfileTree.Node):!WebInspector.TimelineProfileTree.Node=} groupingCallback
 * @return {!WebInspector.TimelineProfileTree.Node}
 */
WebInspector.TimelineProfileTree.buildBottomUp = function(topDownTree, groupingCallback)
{
    var buRoot = new WebInspector.TimelineProfileTree.Node();
    buRoot.selfTime = 0;
    buRoot.totalTime = 0;
    /** @type {!Map<string, !WebInspector.TimelineProfileTree.Node>} */
    buRoot.children = new Map();
    var nodesOnStack = /** @type {!Set<string>} */ (new Set());
    if (topDownTree.children)
        topDownTree.children.forEach(processNode);
    buRoot.totalTime = topDownTree.totalTime;

    /**
     * @param {!WebInspector.TimelineProfileTree.Node} tdNode
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
     * @param {!WebInspector.TimelineProfileTree.Node} tdNode
     * @param {!WebInspector.TimelineProfileTree.Node} buParent
     */
    function appendNode(tdNode, buParent)
    {
        var selfTime = tdNode.selfTime;
        var totalTime = tdNode.totalTime;
        buParent.selfTime += selfTime;
        buParent.totalTime += selfTime;
        while (tdNode.parent) {
            if (!buParent.children)
                buParent.children = /** @type {!Map<string,!WebInspector.TimelineProfileTree.Node>} */ (new Map());
            var id = tdNode.id;
            var buNode = buParent.children.get(id);
            if (!buNode) {
                buNode = new WebInspector.TimelineProfileTree.Node();
                buNode.selfTime = selfTime;
                buNode.totalTime = totalTime;
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
            rootChildren.delete(/** @type {string} */(item[0]));
    }

    return buRoot;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?string}
 */
WebInspector.TimelineProfileTree.eventURL = function(event)
{
    var data = event.args["data"] || event.args["beginData"];
    if (data && data["url"])
        return data["url"];
    var frame = WebInspector.TimelineProfileTree.eventStackFrame(event);
    while (frame) {
        var url = frame["url"];
        if (url)
            return url;
        frame = frame.parent;
    }
    return null;
}

/**
 * @param {!WebInspector.TracingModel.Event} event
 * @return {?Object}
 */
WebInspector.TimelineProfileTree.eventStackFrame = function(event)
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
 * @constructor
 * @param {function(!WebInspector.TracingModel.Event):string} categoryMapper
 */
WebInspector.TimelineAggregator = function(categoryMapper)
{
    this._categoryMapper = categoryMapper;
    /** @type {!Map<string, !WebInspector.TimelineProfileTree.Node>} */
    this._groupNodes = new Map();
}

/**
 * @enum {string}
 */
WebInspector.TimelineAggregator.GroupBy = {
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
WebInspector.TimelineAggregator.eventId = function(event)
{
    if (event.name === WebInspector.TimelineModel.RecordType.JSFrame) {
        var data = event.args["data"];
        return "f:" + data["functionName"] + "@" + (data["scriptId"] || data["url"] || "");
    }
    return event.name + ":@" + WebInspector.TimelineProfileTree.eventURL(event);
}

WebInspector.TimelineAggregator._extensionInternalPrefix = "extensions::";
WebInspector.TimelineAggregator._groupNodeFlag = Symbol("groupNode");

/**
 * @param {string} url
 * @return {boolean}
 */
WebInspector.TimelineAggregator.isExtensionInternalURL = function(url)
{
    return url.startsWith(WebInspector.TimelineAggregator._extensionInternalPrefix);
}

WebInspector.TimelineAggregator.prototype = {
    /**
     * @param {!WebInspector.TimelineAggregator.GroupBy} groupBy
     * @return {?function(!WebInspector.TimelineProfileTree.Node):!WebInspector.TimelineProfileTree.Node}
     */
    groupFunction: function(groupBy)
    {
        var idMapper = this._nodeToGroupIdFunction(groupBy);
        return idMapper && this._nodeToGroupNode.bind(this, idMapper);
    },

    /**
     * @param {!WebInspector.TimelineProfileTree.Node} root
     * @param {!WebInspector.TimelineAggregator.GroupBy} groupBy
     * @return {!WebInspector.TimelineProfileTree.Node}
     */
    performGrouping: function(root, groupBy)
    {
        var nodeMapper = this.groupFunction(groupBy);
        if (!nodeMapper)
            return root;
        for (var node of root.children.values()) {
            var groupNode = nodeMapper(node);
            groupNode.parent = root;
            groupNode.selfTime += node.selfTime;
            groupNode.totalTime += node.totalTime;
            groupNode.children.set(node.id, node);
            node.parent = root;
        }
        root.children = this._groupNodes;
        return root;
    },

    /**
     * @param {!WebInspector.TimelineAggregator.GroupBy} groupBy
     * @return {?function(!WebInspector.TimelineProfileTree.Node):string}
     */
    _nodeToGroupIdFunction: function(groupBy)
    {
        /**
         * @param {!WebInspector.TimelineProfileTree.Node} node
         * @return {string}
         */
        function groupByURL(node)
        {
            return WebInspector.TimelineProfileTree.eventURL(node.event) || "";
        }

        /**
         * @param {boolean} groupSubdomains
         * @param {!WebInspector.TimelineProfileTree.Node} node
         * @return {string}
         */
        function groupByDomain(groupSubdomains, node)
        {
            var url = WebInspector.TimelineProfileTree.eventURL(node.event) || "";
            if (WebInspector.TimelineAggregator.isExtensionInternalURL(url))
                return WebInspector.TimelineAggregator._extensionInternalPrefix;
            var parsedURL = url.asParsedURL();
            if (!parsedURL)
                return "";
            if (parsedURL.scheme === "chrome-extension")
                return parsedURL.scheme + "://" + parsedURL.host;
            if (!groupSubdomains)
                return parsedURL.host;
            if (/^[.0-9]+$/.test(parsedURL.host))
                return parsedURL.host;
            var domainMatch = /([^.]*\.)?[^.]*$/.exec(parsedURL.host);
            return domainMatch && domainMatch[0] || "";
        }

        switch (groupBy) {
        case WebInspector.TimelineAggregator.GroupBy.None: return null;
        case WebInspector.TimelineAggregator.GroupBy.Category: return node => node.event ? this._categoryMapper(node.event) : "";
        case WebInspector.TimelineAggregator.GroupBy.Subdomain: return groupByDomain.bind(null, false);
        case WebInspector.TimelineAggregator.GroupBy.Domain: return groupByDomain.bind(null, true);
        case WebInspector.TimelineAggregator.GroupBy.URL: return groupByURL;
        default: return null;
        }
    },

    /**
     * @param {string} id
     * @param {!WebInspector.TracingModel.Event} event
     * @return {!WebInspector.TimelineProfileTree.Node}
     */
    _buildGroupNode: function(id, event)
    {
        var groupNode = new WebInspector.TimelineProfileTree.Node();
        groupNode.id = id;
        groupNode.selfTime = 0;
        groupNode.totalTime = 0;
        groupNode.children = new Map();
        groupNode.event = event;
        groupNode._isGroupNode = true;
        this._groupNodes.set(id, groupNode);
        return groupNode;
    },

    /**
     * @param {function(!WebInspector.TimelineProfileTree.Node):string} nodeToGroupId
     * @param {!WebInspector.TimelineProfileTree.Node} node
     * @return {!WebInspector.TimelineProfileTree.Node}
     */
    _nodeToGroupNode: function(nodeToGroupId, node)
    {
        var id = nodeToGroupId(node);
        return this._groupNodes.get(id) || this._buildGroupNode(id, node.event);
    },
}
