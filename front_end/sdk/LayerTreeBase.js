// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {DOMModel, DOMNode} from './DOMModel.js';      // eslint-disable-line no-unused-vars
import {SnapshotWithRect} from './PaintProfiler.js';  // eslint-disable-line no-unused-vars
import {Target} from './SDKModel.js';                 // eslint-disable-line no-unused-vars

/**
 * @interface
 */
export class Layer {
  /**
   * @return {string}
   */
  id() {
    throw new Error('Not implemented');
  }

  /**
   * @return {?string}
   */
  parentId() {
    throw new Error('Not implemented');
  }

  /**
   * @return {?Layer}
   */
  parent() {
    throw new Error('Not implemented');
  }

  /**
   * @return {boolean}
   */
  isRoot() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Array.<!Layer>}
   */
  children() {
    throw new Error('Not implemented');
  }

  /**
   * @param {!Layer} child
   */
  addChild(child) {
  }

  /**
   * @return {?DOMNode}
   */
  node() {
    throw new Error('Not implemented');
  }

  /**
   * @return {?DOMNode}
   */
  nodeForSelfOrAncestor() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  offsetX() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  offsetY() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  width() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  height() {
    throw new Error('Not implemented');
  }

  /**
   * @return {?Array.<number>}
   */
  transform() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Array.<number>}
   */
  quad() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Array.<number>}
   */
  anchorPoint() {
    throw new Error('Not implemented');
  }

  /**
   * @return {boolean}
   */
  invisible() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  paintCount() {
    throw new Error('Not implemented');
  }

  /**
   * @return {?Protocol.DOM.Rect}
   */
  lastPaintRect() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Array.<!Protocol.LayerTree.ScrollRect>}
   */
  scrollRects() {
    throw new Error('Not implemented');
  }

  /**
   * @return {?StickyPositionConstraint}
   */
  stickyPositionConstraint() {
    throw new Error('Not implemented');
  }

  /**
   * @return {number}
   */
  gpuMemoryUsage() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Promise<!Array<string>>}
   */
  requestCompositingReasonIds() {
    throw new Error('Not implemented');
  }

  /**
   * @return {boolean}
   */
  drawsContent() {
    throw new Error('Not implemented');
  }

  /**
   * @return {!Array<!Promise<?SnapshotWithRect>>}
   */
  snapshots() {
    throw new Error('Not implemented');
  }
}

Layer.ScrollRectType = {
  NonFastScrollable: 'NonFastScrollable',
  TouchEventHandler: 'TouchEventHandler',
  WheelEventHandler: 'WheelEventHandler',
  RepaintsOnScroll: 'RepaintsOnScroll',
  MainThreadScrollingReason: 'MainThreadScrollingReason'
};

export class StickyPositionConstraint {
  /**
   * @param {?LayerTreeBase} layerTree
   * @param {!Protocol.LayerTree.StickyPositionConstraint} constraint
   * @struct
   */
  constructor(layerTree, constraint) {
    /** @type {!Protocol.DOM.Rect} */
    this._stickyBoxRect = constraint.stickyBoxRect;
    /** @type {!Protocol.DOM.Rect} */
    this._containingBlockRect = constraint.containingBlockRect;
    /** @type {?Layer} */
    this._nearestLayerShiftingStickyBox = null;
    if (layerTree && constraint.nearestLayerShiftingStickyBox) {
      this._nearestLayerShiftingStickyBox = layerTree.layerById(constraint.nearestLayerShiftingStickyBox);
    }

    /** @type {?Layer} */
    this._nearestLayerShiftingContainingBlock = null;
    if (layerTree && constraint.nearestLayerShiftingContainingBlock) {
      this._nearestLayerShiftingContainingBlock = layerTree.layerById(constraint.nearestLayerShiftingContainingBlock);
    }
  }

  /**
   * @return {!Protocol.DOM.Rect}
   */
  stickyBoxRect() {
    return this._stickyBoxRect;
  }

  /**
   * @return {!Protocol.DOM.Rect}
   */
  containingBlockRect() {
    return this._containingBlockRect;
  }

  /**
   * @return {?Layer}
   */
  nearestLayerShiftingStickyBox() {
    return this._nearestLayerShiftingStickyBox;
  }

  /**
   * @return {?Layer}
   */
  nearestLayerShiftingContainingBlock() {
    return this._nearestLayerShiftingContainingBlock;
  }
}

/**
 * @unrestricted
 */
export class LayerTreeBase {
  /**
   * @param {?Target} target
   */
  constructor(target) {
    this._target = target;
    this._domModel = target ? target.model(DOMModel) : null;
    /** @type {!Map<(string|number), !Layer>} */
    this.layersById = new Map();
    this._root = null;
    this._contentRoot = null;
    /** @type {!Map<number, ?DOMNode>} */
    this._backendNodeIdToNode = new Map();
  }

  /**
   * @return {?Target}
   */
  target() {
    return this._target;
  }

  /**
   * @return {?Layer}
   */
  root() {
    return this._root;
  }

  /**
   * @param {?Layer} root
   * @protected
   */
  setRoot(root) {
    this._root = root;
  }

  /**
   * @return {?Layer}
   */
  contentRoot() {
    return this._contentRoot;
  }

  /**
   * @param {?Layer} contentRoot
   * @protected
   */
  setContentRoot(contentRoot) {
    this._contentRoot = contentRoot;
  }

  /**
   * @param {function(!Layer):*} callback
   * @param {?Layer=} root
   * @return {*}
   */
  forEachLayer(callback, root) {
    if (!root) {
      root = this.root();
      if (!root) {
        return false;
      }
    }
    return callback(root) || root.children().some(this.forEachLayer.bind(this, callback));
  }

  /**
   * @param {string} id
   * @return {?Layer}
   */
  layerById(id) {
    return this.layersById.get(id) || null;
  }

  /**
   * @param {!Set<number>} requestedNodeIds
   * @return {!Promise<void>}
   */
  async resolveBackendNodeIds(requestedNodeIds) {
    if (!requestedNodeIds.size || !this._domModel) {
      return;
    }

    const nodesMap = await this._domModel.pushNodesByBackendIdsToFrontend(requestedNodeIds);

    if (!nodesMap) {
      return;
    }
    for (const nodeId of nodesMap.keys()) {
      this._backendNodeIdToNode.set(nodeId, nodesMap.get(nodeId) || null);
    }
  }

  /**
   * @return {!Map<number, ?DOMNode>}
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
   * @return {?DOMNode}
   */
  _nodeForId(id) {
    return this._domModel ? this._domModel.nodeForId(id) : null;
  }
}
