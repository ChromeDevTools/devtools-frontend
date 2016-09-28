// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @constructor
 * @param {!RuntimeAgent.CallFrame} callFrame
 */
WebInspector.ProfileNode = function(callFrame)
{
    /** @type {!RuntimeAgent.CallFrame} */
    this.callFrame = callFrame;
    /** @type {string} */
    this.callUID = `${this.callFrame.functionName}@${this.callFrame.scriptId}:${this.callFrame.lineNumber}`;
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
        return this.callFrame.functionName;
    },

    /**
     * @return {string}
     */
    get scriptId()
    {
        return this.callFrame.scriptId;
    },

    /**
     * @return {string}
     */
    get url()
    {
        return this.callFrame.url;
    },

    /**
     * @return {number}
     */
    get lineNumber()
    {
        return this.callFrame.lineNumber;
    },

    /**
     * @return {number}
     */
    get columnNumber()
    {
        return this.callFrame.columnNumber;
    }
}

/**
 * @constructor
 * @param {!WebInspector.ProfileNode} root
 */
WebInspector.ProfileTreeModel = function(root)
{
    this.root = root;
    this._assignDepthsAndParents();
    this.total = this._calculateTotals(this.root);
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
     * @param {!WebInspector.ProfileNode} root
     * @return {number}
     */
    _calculateTotals: function(root)
    {
        var nodesToTraverse = [root];
        var dfsList = [];
        while (nodesToTraverse.length) {
            var node = nodesToTraverse.pop();
            node.total = node.self;
            dfsList.push(node);
            nodesToTraverse.push(...node.children);
        }
        while (dfsList.length > 1) {
            var node = dfsList.pop();
            node.parent.total += node.total;
        }
        return root.total;
    }
}
