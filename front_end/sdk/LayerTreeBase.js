// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
WebInspector.Layer = function()
{
}

WebInspector.Layer.prototype = {
    /**
     * @return {string}
     */
    id: function() { },

    /**
     * @return {?string}
     */
    parentId: function() { },

    /**
     * @return {?WebInspector.Layer}
     */
    parent: function() { },

    /**
     * @return {boolean}
     */
    isRoot: function() { },

    /**
     * @return {!Array.<!WebInspector.Layer>}
     */
    children: function() { },

    /**
     * @param {!WebInspector.Layer} child
     */
    addChild: function(child) { },

    /**
     * @return {?WebInspector.DOMNode}
     */
    node: function() { },

    /**
     * @return {?WebInspector.DOMNode}
     */
    nodeForSelfOrAncestor: function() { },

    /**
     * @return {number}
     */
    offsetX: function() { },

    /**
     * @return {number}
     */
    offsetY: function() { },

    /**
     * @return {number}
     */
    width: function() { },

    /**
     * @return {number}
     */
    height: function() { },

    /**
     * @return {?Array.<number>}
     */
    transform: function() { },

    /**
     * @return {!Array.<number>}
     */
    quad: function() { },

    /**
     * @return {!Array.<number>}
     */
    anchorPoint: function() { },

    /**
     * @return {boolean}
     */
    invisible: function() { },

    /**
     * @return {number}
     */
    paintCount: function() { },

    /**
     * @return {?DOMAgent.Rect}
     */
    lastPaintRect: function() { },

    /**
     * @return {!Array.<!LayerTreeAgent.ScrollRect>}
     */
    scrollRects: function() { },

    /**
     * @return {number}
     */
    gpuMemoryUsage: function() { },

    /**
     * @param {function(!Array.<string>)} callback
     */
    requestCompositingReasons: function(callback) { },

    /**
     * @return {boolean}
     */
    drawsContent: function() { }
}

WebInspector.Layer.ScrollRectType = {
    NonFastScrollable: "NonFastScrollable",
    TouchEventHandler: "TouchEventHandler",
    WheelEventHandler: "WheelEventHandler",
    RepaintsOnScroll: "RepaintsOnScroll"
}

/**
  * @constructor
  * @param {?WebInspector.Target} target
  */
WebInspector.LayerTreeBase = function(target)
{
    this._target = target;
    this._domModel = target ? WebInspector.DOMModel.fromTarget(target) : null;
    this._layersById = {};
    this._root = null;
    this._contentRoot = null;
    /** @type Map<number, ?WebInspector.DOMNode> */
    this._backendNodeIdToNode = new Map();
}

WebInspector.LayerTreeBase.prototype = {
    /**
     * @return {?WebInspector.Target}
     */
    target: function()
    {
        return this._target;
    },

    /**
     * @return {?WebInspector.Layer}
     */
    root: function()
    {
        return this._root;
    },

    /**
     * @param {?WebInspector.Layer} root
     * @protected
     */
    setRoot: function(root)
    {
        this._root = root;
    },

    /**
     * @return {?WebInspector.Layer}
     */
    contentRoot: function()
    {
        return this._contentRoot;
    },

    /**
     * @param {?WebInspector.Layer} contentRoot
     * @protected
     */
    setContentRoot: function(contentRoot)
    {
        this._contentRoot = contentRoot;
    },

    /**
     * @param {function(!WebInspector.Layer)} callback
     * @param {?WebInspector.Layer=} root
     * @return {boolean}
     */
    forEachLayer: function(callback, root)
    {
        if (!root) {
            root = this.root();
            if (!root)
                return false;
        }
        return callback(root) || root.children().some(this.forEachLayer.bind(this, callback));
    },

    /**
     * @param {string} id
     * @return {?WebInspector.Layer}
     */
    layerById: function(id)
    {
        return this._layersById[id] || null;
    },

    /**
     * @param {!Set<number>} requestedNodeIds
     * @param {function()} callback
     */
    _resolveBackendNodeIds: function(requestedNodeIds, callback)
    {
        if (!requestedNodeIds.size || !this._domModel) {
            callback();
            return;
        }
        if (this._domModel)
            this._domModel.pushNodesByBackendIdsToFrontend(requestedNodeIds, populateBackendNodeMap.bind(this));

        /**
         * @this {WebInspector.LayerTreeBase}
         * @param {?Map<number, ?WebInspector.DOMNode>} nodesMap
         */
        function populateBackendNodeMap(nodesMap)
        {
            if (nodesMap) {
                for (var nodeId of nodesMap.keysArray())
                    this._backendNodeIdToNode.set(nodeId, nodesMap.get(nodeId) || null);
            }
            callback();
        }
    },

    /**
     * @param {!Object} viewportSize
     */
    setViewportSize: function(viewportSize)
    {
        this._viewportSize = viewportSize;
    },

    /**
     * @return {!Object | undefined}
     */
    viewportSize: function()
    {
        return this._viewportSize;
    },

    /**
     * @param {number} id
     * @return {?WebInspector.DOMNode}
     */
    _nodeForId: function(id)
    {
        return this._domModel ? this._domModel.nodeForId(id) : null;
    }
}
