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
    this.name;
    /** @type {string} */
    this.color;
    /** @type {string} */
    this.id;
    /** @type {!WebInspector.TracingModel.Event} */
    this.event;
    /** @type {?Map<string|symbol,!WebInspector.TimelineProfileTree.Node>} */
    this.children;
    /** @type {?WebInspector.TimelineProfileTree.Node} */
    this.parent;
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
    root.name = WebInspector.UIString("Top-Down Chart");
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
    buRoot.name = WebInspector.UIString("Bottom-Up Chart");
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
            rootChildren.delete(/** @type {string} */(item[0]));
    }

    return buRoot;

}
