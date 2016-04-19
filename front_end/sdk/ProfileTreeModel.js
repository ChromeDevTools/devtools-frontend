// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 */
WebInspector.ProfileNode = function(functionName, scriptId, url, lineNumber, columnNumber)
{
    /** @type {!RuntimeAgent.CallFrame} */
    this.frame = {
        functionName: functionName,
        scriptId: scriptId,
        url: url,
        lineNumber: lineNumber,
        columnNumber: columnNumber
    };
    /** @type {number} */
    this.callUID;
    /** @type {number} */
    this.self = 0;
    /** @type {number} */
    this.total = 0;
    /** @type {number} */
    this.id = 0;
    /** @type {?WebInspector.ProfileNode} */
    this.parent = null;
    /** @type {!Array<!WebInspector.ProfileNode>} */
    this.children = [];
}

WebInspector.ProfileNode.prototype = {
    /**
     * @return {string}
     */
    get functionName()
    {
        return this.frame.functionName;
    },

    /**
     * @return {string}
     */
    get scriptId()
    {
        return this.frame.scriptId;
    },

    /**
     * @return {string}
     */
    get url()
    {
        return this.frame.url;
    },

    /**
     * @return {number}
     */
    get lineNumber()
    {
        return this.frame.lineNumber;
    },

    /**
     * @return {number}
     */
    get columnNumber()
    {
        return this.frame.columnNumber;
    }
}

/**
 * @constructor
 * @param {!WebInspector.ProfileNode} root
 * @param {number} begin
 * @param {number} end
 */
WebInspector.ProfileTreeModel = function(root, begin, end)
{
    this.root = root;
    this.begin = begin;
    this.end = end;
    this._assignDepthsAndParents();
    this._calculateTotals(this.root);
}

WebInspector.ProfileTreeModel.prototype = {
    _assignDepthsAndParents: function()
    {
        var root = this.root;
        root.depth = -1;
        root.parent = null;
        this.maxDepth = 0;
        var nodesToTraverse = [root];
        while (nodesToTraverse.length) {
            var parent = nodesToTraverse.pop();
            var depth = parent.depth + 1;
            if (depth > this.maxDepth)
                this.maxDepth = depth;
            var children = parent.children;
            var length = children.length;
            for (var i = 0; i < length; ++i) {
                var child = children[i];
                child.depth = depth;
                child.parent = parent;
                if (child.children.length)
                    nodesToTraverse.push(child);
            }
        }
    },

    /**
     * @param {!WebInspector.ProfileNode} node
     * @return {number}
     */
    _calculateTotals: function(node)
    {
        node.total = node.children.reduce((acc, child) => acc + this._calculateTotals(child), node.self);
        return node.total;
    }
}
