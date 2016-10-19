// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/** @typedef {!{
        bounds: {height: number, width: number},
        children: Array.<!WebInspector.TracingLayerPayload>,
        layer_id: number,
        position: Array.<number>,
        scroll_offset: Array.<number>,
        layer_quad: Array.<number>,
        draws_content: number,
        gpu_memory_usage: number,
        transform: Array.<number>,
        owner_node: number,
        compositing_reasons: Array.<string>
    }}
*/
WebInspector.TracingLayerPayload;

/** @typedef {!{
        id: string,
        layer_id: string,
        gpu_memory_usage: number,
        content_rect: !Array.<number>
    }}
*/
WebInspector.TracingLayerTile;

/**
  * @constructor
  * @extends {WebInspector.LayerTreeBase}
  * @param {?WebInspector.Target} target
  */
WebInspector.TracingLayerTree = function(target)
{
    WebInspector.LayerTreeBase.call(this, target);
    /** @type {!Map.<string, !WebInspector.TracingLayerTile>} */
    this._tileById = new Map();
}

WebInspector.TracingLayerTree.prototype = {
    /**
     * @param {?WebInspector.TracingLayerPayload} root
     * @param {?Array<!WebInspector.TracingLayerPayload>} layers
     * @param {!Array<!WebInspector.LayerPaintEvent>} paints
     * @param {function()} callback
     */
    setLayers: function(root, layers, paints, callback)
    {
        var idsToResolve = new Set();
        if (root) {
            // This is a legacy code path for compatibility, as cc is removing
            // layer tree hierarchy, this code will eventually be removed.
            this._extractNodeIdsToResolve(idsToResolve, {}, root);
        } else {
            for (var i = 0; i < layers.length; ++i)
                this._extractNodeIdsToResolve(idsToResolve, {}, layers[i]);
        }
        this._resolveBackendNodeIds(idsToResolve, onBackendNodeIdsResolved.bind(this));

        /**
         * @this {WebInspector.TracingLayerTree}
         */
        function onBackendNodeIdsResolved()
        {
            var oldLayersById = this._layersById;
            this._layersById = {};
            this.setContentRoot(null);
            if (root) {
                var convertedLayers = this._innerSetLayers(oldLayersById, root);
                this.setRoot(convertedLayers);
            } else {
                var processedLayers = layers.map(this._innerSetLayers.bind(this, oldLayersById));
                var contentRoot = this.contentRoot();
                this.setRoot(contentRoot);
                for (var i = 0; i < processedLayers.length; ++i) {
                    if (processedLayers[i].id() !== contentRoot.id())
                        contentRoot.addChild(processedLayers[i]);
                }
            }
            this._setPaints(paints);
            callback();
        }
    },

    /**
     * @param {!Array.<!WebInspector.TracingLayerTile>} tiles
     */
    setTiles: function(tiles)
    {
        this._tileById = new Map();
        for (var tile of tiles)
            this._tileById.set(tile.id, tile);
    },

    /**
     * @param {string} tileId
     * @param {function(?DOMAgent.Rect, ?WebInspector.PaintProfilerSnapshot)} callback
     */
    pictureForRasterTile: function(tileId, callback)
    {
        var tile = this._tileById.get("cc::Tile/" + tileId);
        if (!tile) {
            WebInspector.console.error(`Tile ${tileId} is missing`);
            callback(null, null);
            return;
        }
        var layer = this.layerById(tile.layer_id);
        if (!layer) {
            WebInspector.console.error(`Layer ${tile.layer_id} for tile ${tileId} is not found`);
            callback(null, null);
            return;
        }
        layer.pictureForRect(this.target(), tile.content_rect, callback);
    },

    /**
     * @param {!Array<!WebInspector.LayerPaintEvent>} paints
     */
    _setPaints: function(paints)
    {
        for (var i = 0; i < paints.length; ++i) {
            var layer = this._layersById[paints[i].layerId()];
            if (layer)
                layer._addPaintEvent(paints[i]);
        }
    },

    /**
     * @param {!Object<(string|number), !WebInspector.Layer>} oldLayersById
     * @param {!WebInspector.TracingLayerPayload} payload
     * @return {!WebInspector.TracingLayer}
     */
    _innerSetLayers: function(oldLayersById, payload)
    {
        var layer = /** @type {?WebInspector.TracingLayer} */ (oldLayersById[payload.layer_id]);
        if (layer)
            layer._reset(payload);
        else
            layer = new WebInspector.TracingLayer(payload);
        this._layersById[payload.layer_id] = layer;
        if (payload.owner_node)
            layer._setNode(this._backendNodeIdToNode.get(payload.owner_node) || null);
        if (!this.contentRoot() && layer.drawsContent())
            this.setContentRoot(layer);
        for (var i = 0; payload.children && i < payload.children.length; ++i)
            layer.addChild(this._innerSetLayers(oldLayersById, payload.children[i]));
        return layer;
    },

    /**
     * @param {!Set<number>} nodeIdsToResolve
     * @param {!Object} seenNodeIds
     * @param {!WebInspector.TracingLayerPayload} payload
     */
    _extractNodeIdsToResolve: function(nodeIdsToResolve, seenNodeIds, payload)
    {
        var backendNodeId = payload.owner_node;
        if (backendNodeId && !this._backendNodeIdToNode.has(backendNodeId))
            nodeIdsToResolve.add(backendNodeId);
        for (var i = 0; payload.children && i < payload.children.length; ++i)
            this._extractNodeIdsToResolve(nodeIdsToResolve, seenNodeIds, payload.children[i]);
    },

    __proto__: WebInspector.LayerTreeBase.prototype
}

/**
 * @constructor
 * @param {!WebInspector.TracingLayerPayload} payload
 * @implements {WebInspector.Layer}
 */
WebInspector.TracingLayer = function(payload)
{
    this._reset(payload);
}

WebInspector.TracingLayer.prototype = {
    /**
     * @param {!WebInspector.TracingLayerPayload} payload
     */
    _reset: function(payload)
    {
        /** @type {?WebInspector.DOMNode} */
        this._node = null;
        this._layerId = String(payload.layer_id);
        this._offsetX = payload.position[0];
        this._offsetY = payload.position[1];
        this._width = payload.bounds.width;
        this._height = payload.bounds.height;
        this._children = [];
        this._parentLayerId = null;
        this._parent = null;
        this._quad = payload.layer_quad || [];
        this._createScrollRects(payload);
        this._compositingReasons = payload.compositing_reasons || [];
        this._drawsContent = !!payload.draws_content;
        this._gpuMemoryUsage = payload.gpu_memory_usage;
        this._paints = [];
    },

    /**
     * @override
     * @return {string}
     */
    id: function()
    {
        return this._layerId;
    },

    /**
     * @override
     * @return {?string}
     */
    parentId: function()
    {
        return this._parentLayerId;
    },

    /**
     * @override
     * @return {?WebInspector.Layer}
     */
    parent: function()
    {
        return this._parent;
    },

    /**
     * @override
     * @return {boolean}
     */
    isRoot: function()
    {
        return !this.parentId();
    },

    /**
     * @override
     * @return {!Array.<!WebInspector.Layer>}
     */
    children: function()
    {
        return this._children;
    },

    /**
     * @override
     * @param {!WebInspector.Layer} child
     */
    addChild: function(child)
    {
        if (child._parent)
            console.assert(false, "Child already has a parent");
        this._children.push(child);
        child._parent = this;
        child._parentLayerId = this._layerId;
    },


    /**
     * @param {?WebInspector.DOMNode} node
     */
    _setNode: function(node)
    {
        this._node = node;
    },

    /**
     * @override
     * @return {?WebInspector.DOMNode}
     */
    node: function()
    {
        return this._node;
    },

    /**
     * @override
     * @return {?WebInspector.DOMNode}
     */
    nodeForSelfOrAncestor: function()
    {
        for (var layer = this; layer; layer = layer._parent) {
            if (layer._node)
                return layer._node;
        }
        return null;
    },

    /**
     * @override
     * @return {number}
     */
    offsetX: function()
    {
        return this._offsetX;
    },

    /**
     * @override
     * @return {number}
     */
    offsetY: function()
    {
        return this._offsetY;
    },

    /**
     * @override
     * @return {number}
     */
    width: function()
    {
        return this._width;
    },

    /**
     * @override
     * @return {number}
     */
    height: function()
    {
        return this._height;
    },

    /**
     * @override
     * @return {?Array.<number>}
     */
    transform: function()
    {
        return null;
    },

    /**
     * @override
     * @return {!Array.<number>}
     */
    quad: function()
    {
        return this._quad;
    },

    /**
     * @override
     * @return {!Array.<number>}
     */
    anchorPoint: function()
    {
        return [0.5, 0.5, 0];
    },

    /**
     * @override
     * @return {boolean}
     */
    invisible: function()
    {
        return false;
    },

    /**
     * @override
     * @return {number}
     */
    paintCount: function()
    {
        return 0;
    },

    /**
     * @override
     * @return {?DOMAgent.Rect}
     */
    lastPaintRect: function()
    {
        return null;
    },

    /**
     * @override
     * @return {!Array.<!LayerTreeAgent.ScrollRect>}
     */
    scrollRects: function()
    {
        return this._scrollRects;
    },

    /**
     * @override
     * @return {number}
     */
    gpuMemoryUsage: function()
    {
        return this._gpuMemoryUsage;
    },

    /**
     * @param {!WebInspector.Target} target
     * @param {!Array<number>} targetRect
     * @param {function(?DOMAgent.Rect, ?WebInspector.PaintProfilerSnapshot)} callback
     */
    pictureForRect: function(target, targetRect, callback)
    {
        var fetchPictureFragmentsBarrier = new CallbackBarrier();
        this._paints.forEach(paint => paint.loadPicture(fetchPictureFragmentsBarrier.createCallback(pictureLoaded)));
        fetchPictureFragmentsBarrier.callWhenDone(allPicturesLoaded);

        /**
         * @param {number} a1
         * @param {number} a2
         * @param {number} b1
         * @param {number} b2
         * @return {boolean}
         */
        function segmentsOverlap(a1, a2, b1, b2)
        {
            console.assert(a1 <= a2 && b1 <= b2, "segments should be specified as ordered pairs");
            return a2 > b1 && a1 < b2;
        }
        /**
         * @param {!Array.<number>} a
         * @param {!Array.<number>} b
         * @return {boolean}
         */
        function rectsOverlap(a, b)
        {
            return segmentsOverlap(a[0], a[0] + a[2], b[0], b[0] + b[2]) && segmentsOverlap(a[1], a[1] + a[3], b[1], b[1] + b[3]);
        }

        var x0 = Infinity;
        var y0 = Infinity;
        var fragments = [];
        /**
         * @param {?Array.<number>} rect
         * @param {?string} picture
         */
        function pictureLoaded(rect, picture)
        {
            if (!rect || !picture)
                return;
            if (!rectsOverlap(rect, targetRect))
                return;
            var x = rect[0];
            var y = rect[1];
            x0 = Math.min(x0, x);
            y0 = Math.min(y0, y);
            fragments.push({x: x, y: y, picture: picture});
        }

        function allPicturesLoaded()
        {
            if (!fragments.length) {
                callback(null, null);
                return;
            }
            // Rect is in layer content coordinates, make it relative to picture by offsetting to the top left corner.
            var rect = {x: targetRect[0] - x0, y: targetRect[1] - y0, width: targetRect[2], height: targetRect[3]};
            WebInspector.PaintProfilerSnapshot.loadFromFragments(target, fragments, callback.bind(null, rect));
        }
    },

    /**
     * @param {!Array.<number>} params
     * @param {string} type
     * @return {!Object}
     */
    _scrollRectsFromParams: function(params, type)
    {
        return {rect: {x: params[0], y: params[1], width: params[2], height: params[3]}, type: type};
    },

    /**
     * @param {!WebInspector.TracingLayerPayload} payload
     */
    _createScrollRects: function(payload)
    {
        this._scrollRects = [];
        if (payload.non_fast_scrollable_region)
            this._scrollRects.push(this._scrollRectsFromParams(payload.non_fast_scrollable_region, WebInspector.Layer.ScrollRectType.NonFastScrollable.name));
        if (payload.touch_event_handler_region)
            this._scrollRects.push(this._scrollRectsFromParams(payload.touch_event_handler_region, WebInspector.Layer.ScrollRectType.TouchEventHandler.name));
        if (payload.wheel_event_handler_region)
            this._scrollRects.push(this._scrollRectsFromParams(payload.wheel_event_handler_region, WebInspector.Layer.ScrollRectType.WheelEventHandler.name));
        if (payload.scroll_event_handler_region)
            this._scrollRects.push(this._scrollRectsFromParams(payload.scroll_event_handler_region, WebInspector.Layer.ScrollRectType.RepaintsOnScroll.name));
    },

    /**
     * @param {!WebInspector.LayerPaintEvent} paint
     */
    _addPaintEvent: function(paint)
    {
        this._paints.push(paint);
    },

    /**
     * @override
     * @param {function(!Array.<string>)} callback
     */
    requestCompositingReasons: function(callback)
    {
        callback(this._compositingReasons);
    },

    /**
     * @override
     * @return {boolean}
     */
    drawsContent: function()
    {
        return this._drawsContent;
    }
}
