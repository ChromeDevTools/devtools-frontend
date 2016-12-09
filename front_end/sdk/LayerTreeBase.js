// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/** @typedef {!{
        rect: !Protocol.DOM.Rect,
        snapshot: !SDK.PaintProfilerSnapshot
    }}
*/
SDK.SnapshotWithRect;

/**
 * @interface
 */
SDK.Layer = function() {};

SDK.Layer.prototype = {
  /**
   * @return {string}
   */
  id() {},

  /**
   * @return {?string}
   */
  parentId() {},

  /**
   * @return {?SDK.Layer}
   */
  parent() {},

  /**
   * @return {boolean}
   */
  isRoot() {},

  /**
   * @return {!Array.<!SDK.Layer>}
   */
  children() {},

  /**
   * @param {!SDK.Layer} child
   */
  addChild(child) {},

  /**
   * @return {?SDK.DOMNode}
   */
  node() {},

  /**
   * @return {?SDK.DOMNode}
   */
  nodeForSelfOrAncestor() {},

  /**
   * @return {number}
   */
  offsetX() {},

  /**
   * @return {number}
   */
  offsetY() {},

  /**
   * @return {number}
   */
  width() {},

  /**
   * @return {number}
   */
  height() {},

  /**
   * @return {?Array.<number>}
   */
  transform() {},

  /**
   * @return {!Array.<number>}
   */
  quad() {},

  /**
   * @return {!Array.<number>}
   */
  anchorPoint() {},

  /**
   * @return {boolean}
   */
  invisible() {},

  /**
   * @return {number}
   */
  paintCount() {},

  /**
   * @return {?Protocol.DOM.Rect}
   */
  lastPaintRect() {},

  /**
   * @return {!Array.<!Protocol.LayerTree.ScrollRect>}
   */
  scrollRects() {},

  /**
   * @return {number}
   */
  gpuMemoryUsage() {},

  /**
   * @param {function(!Array.<string>)} callback
   */
  requestCompositingReasons(callback) {},

  /**
   * @return {boolean}
   */
  drawsContent() {},

  /**
   * @return {!Array<!Promise<?SDK.SnapshotWithRect>>}
   */
  snapshots() {}
};

SDK.Layer.ScrollRectType = {
  NonFastScrollable: 'NonFastScrollable',
  TouchEventHandler: 'TouchEventHandler',
  WheelEventHandler: 'WheelEventHandler',
  RepaintsOnScroll: 'RepaintsOnScroll'
};

/**
 * @unrestricted
 */
SDK.LayerTreeBase = class {
  /**
   * @param {?SDK.Target} target
   */
  constructor(target) {
    this._target = target;
    this._domModel = target ? SDK.DOMModel.fromTarget(target) : null;
    this._layersById = {};
    this._root = null;
    this._contentRoot = null;
    /** @type {!Map<number, ?SDK.DOMNode>} */
    this._backendNodeIdToNode = new Map();
  }

  /**
   * @return {?SDK.Target}
   */
  target() {
    return this._target;
  }

  /**
   * @return {?SDK.Layer}
   */
  root() {
    return this._root;
  }

  /**
   * @param {?SDK.Layer} root
   * @protected
   */
  setRoot(root) {
    this._root = root;
  }

  /**
   * @return {?SDK.Layer}
   */
  contentRoot() {
    return this._contentRoot;
  }

  /**
   * @param {?SDK.Layer} contentRoot
   * @protected
   */
  setContentRoot(contentRoot) {
    this._contentRoot = contentRoot;
  }

  /**
   * @param {function(!SDK.Layer)} callback
   * @param {?SDK.Layer=} root
   * @return {boolean}
   */
  forEachLayer(callback, root) {
    if (!root) {
      root = this.root();
      if (!root)
        return false;
    }
    return callback(root) || root.children().some(this.forEachLayer.bind(this, callback));
  }

  /**
   * @param {string} id
   * @return {?SDK.Layer}
   */
  layerById(id) {
    return this._layersById[id] || null;
  }

  /**
   * @param {!Set<number>} requestedNodeIds
   * @param {function()} callback
   */
  resolveBackendNodeIds(requestedNodeIds, callback) {
    if (!requestedNodeIds.size || !this._domModel) {
      callback();
      return;
    }
    if (this._domModel)
      this._domModel.pushNodesByBackendIdsToFrontend(requestedNodeIds, populateBackendNodeMap.bind(this));

    /**
     * @this {SDK.LayerTreeBase}
     * @param {?Map<number, ?SDK.DOMNode>} nodesMap
     */
    function populateBackendNodeMap(nodesMap) {
      if (nodesMap) {
        for (var nodeId of nodesMap.keysArray())
          this._backendNodeIdToNode.set(nodeId, nodesMap.get(nodeId) || null);
      }
      callback();
    }
  }

  /**
   * @return {!Map<number, ?SDK.DOMNode>}
   */
  backendNodeIdToNode() {
    return this._backendNodeIdToNode;
  }

  /**
   * @param {!{width: number, height: number}} viewportSize
   */
  setViewportSize(viewportSize) {
    this._viewportSize = viewportSize;
  }

  /**
   * @return {!{width: number, height: number}|undefined}
   */
  viewportSize() {
    return this._viewportSize;
  }

  /**
   * @param {number} id
   * @return {?SDK.DOMNode}
   */
  _nodeForId(id) {
    return this._domModel ? this._domModel.nodeForId(id) : null;
  }
};
