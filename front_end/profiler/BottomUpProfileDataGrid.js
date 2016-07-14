/*
 * Copyright (C) 2009 280 North Inc. All Rights Reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 * 1. Redistributions of source code must retain the above copyright
 *    notice, this list of conditions and the following disclaimer.
 * 2. Redistributions in binary form must reproduce the above copyright
 *    notice, this list of conditions and the following disclaimer in the
 *    documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE INC. ``AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL APPLE INC. OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY
 * OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

// Bottom Up Profiling shows the entire callstack backwards:
// The root node is a representation of each individual function called, and each child of that node represents
// a reverse-callstack showing how many of those calls came from it. So, unlike top-down, the statistics in
// each child still represent the root node. We have to be particularly careful of recursion with this mode
// because a root node can represent itself AND an ancestor.

/**
 * @constructor
 * @extends {WebInspector.ProfileDataGridNode}
 * @param {!WebInspector.ProfileNode} profileNode
 * @param {!WebInspector.TopDownProfileDataGridTree} owningTree
 */
WebInspector.BottomUpProfileDataGridNode = function(profileNode, owningTree)
{
    WebInspector.ProfileDataGridNode.call(this, profileNode, owningTree, this._willHaveChildren(profileNode));
    this._remainingNodeInfos = [];
}

WebInspector.BottomUpProfileDataGridNode.prototype = {
    /**
     * @param {!WebInspector.ProfileDataGridNode} profileDataGridNode
     */
    _takePropertiesFromProfileDataGridNode: function(profileDataGridNode)
    {
        this.save();
        this.self = profileDataGridNode.self;
        this.total = profileDataGridNode.total;
    },

    /**
     * When focusing, we keep just the members of the callstack.
     * @param {!WebInspector.ProfileDataGridNode} child
     */
    _keepOnlyChild: function(child)
    {
        this.save();

        this.removeChildren();
        this.appendChild(child);
    },

    /**
     * @param {string} aCallUID
     */
    _exclude: function(aCallUID)
    {
        if (this._remainingNodeInfos)
            this.populate();

        this.save();

        var children = this.children;
        var index = this.children.length;

        while (index--)
            children[index]._exclude(aCallUID);

        var child = this.childrenByCallUID.get(aCallUID);

        if (child)
            this.merge(child, true);
    },

    /**
     * @override
     */
    restore: function()
    {
        WebInspector.ProfileDataGridNode.prototype.restore.call(this);

        if (!this.children.length)
            this.hasChildren = this._willHaveChildren(this.profileNode);
    },

    /**
     * @override
     * @param {!WebInspector.ProfileDataGridNode} child
     * @param {boolean} shouldAbsorb
     */
    merge: function(child, shouldAbsorb)
    {
        this.self -= child.self;
        WebInspector.ProfileDataGridNode.prototype.merge.call(this, child, shouldAbsorb);
    },

    /**
     * @override
     */
    populateChildren: function()
    {
        WebInspector.BottomUpProfileDataGridNode._sharedPopulate(this);
    },

    _willHaveChildren: function(profileNode)
    {
        // In bottom up mode, our parents are our children since we display an inverted tree.
        // However, we don't want to show the very top parent since it is redundant.
        return !!(profileNode.parent && profileNode.parent.parent);
    },

    __proto__: WebInspector.ProfileDataGridNode.prototype
}

/**
 * @param {!WebInspector.BottomUpProfileDataGridNode|!WebInspector.BottomUpProfileDataGridTree} container
 */
WebInspector.BottomUpProfileDataGridNode._sharedPopulate = function(container)
{
    var remainingNodeInfos = container._remainingNodeInfos;
    var count = remainingNodeInfos.length;

    for (var index = 0; index < count; ++index) {
        var nodeInfo = remainingNodeInfos[index];
        var ancestor = nodeInfo.ancestor;
        var focusNode = nodeInfo.focusNode;
        var child = container.findChild(ancestor);

        // If we already have this child, then merge the data together.
        if (child) {
            var totalAccountedFor = nodeInfo.totalAccountedFor;

            child.self += focusNode.self;

            if (!totalAccountedFor)
                child.total += focusNode.total;
        } else {
            // If not, add it as a true ancestor.
            // In heavy mode, we take our visual identity from ancestor node...
            child = new WebInspector.BottomUpProfileDataGridNode(ancestor, /** @type {!WebInspector.TopDownProfileDataGridTree} */ (container.tree));

            if (ancestor !== focusNode) {
                // But the actual statistics from the "root" node (bottom of the callstack).
                child.self = focusNode.self;
                child.total = focusNode.total;
            }

            container.appendChild(child);
        }

        var parent = ancestor.parent;
        if (parent && parent.parent) {
            nodeInfo.ancestor = parent;
            child._remainingNodeInfos.push(nodeInfo);
        }
    }

    delete container._remainingNodeInfos;
}

/**
 * @constructor
 * @extends {WebInspector.ProfileDataGridTree}
 * @param {!WebInspector.ProfileDataGridNode.Formatter} formatter
 * @param {!WebInspector.SearchableView} searchableView
 * @param {!WebInspector.ProfileNode} rootProfileNode
 * @param {number} total
 */
WebInspector.BottomUpProfileDataGridTree = function(formatter, searchableView, rootProfileNode, total)
{
    WebInspector.ProfileDataGridTree.call(this, formatter, searchableView, total);

    // Iterate each node in pre-order.
    var profileNodeUIDs = 0;
    var profileNodeGroups = [[], [rootProfileNode]];
    /** @type {!Map<string, !Set<number>>} */
    var visitedProfileNodesForCallUID = new Map();

    this._remainingNodeInfos = [];

    for (var profileNodeGroupIndex = 0; profileNodeGroupIndex < profileNodeGroups.length; ++profileNodeGroupIndex) {
        var parentProfileNodes = profileNodeGroups[profileNodeGroupIndex];
        var profileNodes = profileNodeGroups[++profileNodeGroupIndex];
        var count = profileNodes.length;

        for (var index = 0; index < count; ++index) {
            var profileNode = profileNodes[index];

            if (!profileNode.UID)
                profileNode.UID = ++profileNodeUIDs;

            if (profileNode.parent) {
                // The total time of this ancestor is accounted for if we're in any form of recursive cycle.
                var visitedNodes = visitedProfileNodesForCallUID.get(profileNode.callUID);
                var totalAccountedFor = false;

                if (!visitedNodes) {
                    visitedNodes = new Set();
                    visitedProfileNodesForCallUID.set(profileNode.callUID, visitedNodes);
                } else {
                    // The total time for this node has already been accounted for iff one of it's parents has already been visited.
                    // We can do this check in this style because we are traversing the tree in pre-order.
                    var parentCount = parentProfileNodes.length;
                    for (var parentIndex = 0; parentIndex < parentCount; ++parentIndex) {
                        if (visitedNodes.has(parentProfileNodes[parentIndex].UID)) {
                            totalAccountedFor = true;
                            break;
                        }
                    }
                }

                visitedNodes.add(profileNode.UID);

                this._remainingNodeInfos.push({ ancestor: profileNode, focusNode: profileNode, totalAccountedFor: totalAccountedFor });
            }

            var children = profileNode.children;
            if (children.length) {
                profileNodeGroups.push(parentProfileNodes.concat([profileNode]));
                profileNodeGroups.push(children);
            }
        }
    }

    // Populate the top level nodes.
    WebInspector.ProfileDataGridNode.populate(this);

    return this;
}

WebInspector.BottomUpProfileDataGridTree.prototype = {
    /**
     * When focusing, we keep the entire callstack up to this ancestor.
     * @param {!WebInspector.ProfileDataGridNode} profileDataGridNode
     */
    focus: function(profileDataGridNode)
    {
        if (!profileDataGridNode)
            return;

        this.save();

        var currentNode = profileDataGridNode;
        var focusNode = profileDataGridNode;

        while (currentNode.parent && (currentNode instanceof WebInspector.ProfileDataGridNode)) {
            currentNode._takePropertiesFromProfileDataGridNode(profileDataGridNode);

            focusNode = currentNode;
            currentNode = currentNode.parent;

            if (currentNode instanceof WebInspector.ProfileDataGridNode)
                currentNode._keepOnlyChild(focusNode);
        }

        this.children = [focusNode];
        this.total = profileDataGridNode.total;
    },

    /**
     * @param {!WebInspector.ProfileDataGridNode} profileDataGridNode
     */
    exclude: function(profileDataGridNode)
    {
        if (!profileDataGridNode)
            return;

        this.save();

        var excludedCallUID = profileDataGridNode.callUID;
        var excludedTopLevelChild = this.childrenByCallUID.get(excludedCallUID);

        // If we have a top level node that is excluded, get rid of it completely (not keeping children),
        // since bottom up data relies entirely on the root node.
        if (excludedTopLevelChild)
            this.children.remove(excludedTopLevelChild);

        var children = this.children;
        var count = children.length;

        for (var index = 0; index < count; ++index)
            children[index]._exclude(excludedCallUID);

        if (this.lastComparator)
            this.sort(this.lastComparator, true);
    },

    /**
     * @override
     * @param {!WebInspector.SearchableView.SearchConfig} searchConfig
     * @param {boolean} shouldJump
     * @param {boolean=} jumpBackwards
     */
    performSearch: function(searchConfig, shouldJump, jumpBackwards)
    {
        this.searchCanceled();
        var matchesQuery = this._matchFunction(searchConfig);
        if (!matchesQuery)
            return;

        this._searchResults = [];
        for (var current = this.children[0]; current; current = current.traverseNextNode(true, null, true)) {
            if (matchesQuery(current))
                this._searchResults.push({ profileNode: current });
        }
        this._searchResultIndex = jumpBackwards ? 0 : this._searchResults.length - 1;
        this._searchableView.updateSearchMatchesCount(this._searchResults.length);
        this._searchableView.updateCurrentMatchIndex(this._searchResultIndex);
    },

    /**
     * @override
     */
    populateChildren: function()
    {
        WebInspector.BottomUpProfileDataGridNode._sharedPopulate(this);
    },

    __proto__: WebInspector.ProfileDataGridTree.prototype
}
