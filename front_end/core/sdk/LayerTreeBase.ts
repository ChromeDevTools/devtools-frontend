// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import type * as Protocol from '../../generated/protocol.js';

import type {DOMNode} from './DOMModel.js';
import {DOMModel} from './DOMModel.js';                   // eslint-disable-line no-unused-vars
import type {SnapshotWithRect} from './PaintProfiler.js'; // eslint-disable-line no-unused-vars
import type {Target} from './SDKModel.js';                // eslint-disable-line no-unused-vars

export interface Layer {
  id(): string;

  parentId(): string|null;

  parent(): Layer|null;

  isRoot(): boolean;

  children(): Layer[];

  addChild(child: Layer): void;

  node(): DOMNode|null;

  nodeForSelfOrAncestor(): DOMNode|null;

  offsetX(): number;

  offsetY(): number;

  width(): number;

  height(): number;

  transform(): number[]|null;

  quad(): number[];

  anchorPoint(): number[];

  invisible(): boolean;

  paintCount(): number;

  lastPaintRect(): Protocol.DOM.Rect|null;

  scrollRects(): Protocol.LayerTree.ScrollRect[];

  stickyPositionConstraint(): StickyPositionConstraint|null;

  gpuMemoryUsage(): number;

  requestCompositingReasonIds(): Promise<string[]>;

  drawsContent(): boolean;

  snapshots(): Promise<SnapshotWithRect|null>[];
}

export namespace Layer {
  // TODO(crbug.com/1167717): Make this a const enum again
  // eslint-disable-next-line rulesdir/const_enum
  export enum ScrollRectType {
    NonFastScrollable = 'NonFastScrollable',
    TouchEventHandler = 'TouchEventHandler',
    WheelEventHandler = 'WheelEventHandler',
    RepaintsOnScroll = 'RepaintsOnScroll',
    MainThreadScrollingReason = 'MainThreadScrollingReason',
  }
}

export class StickyPositionConstraint {
  _stickyBoxRect: Protocol.DOM.Rect;
  _containingBlockRect: Protocol.DOM.Rect;
  _nearestLayerShiftingStickyBox: Layer|null;
  _nearestLayerShiftingContainingBlock: Layer|null;

  constructor(layerTree: LayerTreeBase|null, constraint: Protocol.LayerTree.StickyPositionConstraint) {
    this._stickyBoxRect = constraint.stickyBoxRect;
    this._containingBlockRect = constraint.containingBlockRect;
    this._nearestLayerShiftingStickyBox = null;
    if (layerTree && constraint.nearestLayerShiftingStickyBox) {
      this._nearestLayerShiftingStickyBox = layerTree.layerById(constraint.nearestLayerShiftingStickyBox);
    }

    this._nearestLayerShiftingContainingBlock = null;
    if (layerTree && constraint.nearestLayerShiftingContainingBlock) {
      this._nearestLayerShiftingContainingBlock = layerTree.layerById(constraint.nearestLayerShiftingContainingBlock);
    }
  }

  stickyBoxRect(): Protocol.DOM.Rect {
    return this._stickyBoxRect;
  }

  containingBlockRect(): Protocol.DOM.Rect {
    return this._containingBlockRect;
  }

  nearestLayerShiftingStickyBox(): Layer|null {
    return this._nearestLayerShiftingStickyBox;
  }

  nearestLayerShiftingContainingBlock(): Layer|null {
    return this._nearestLayerShiftingContainingBlock;
  }
}

export class LayerTreeBase {
  _target: Target|null;
  _domModel: DOMModel|null;
  layersById: Map<string|number, Layer>;
  _root: Layer|null;
  _contentRoot: Layer|null;
  _backendNodeIdToNode: Map<number, DOMNode|null>;
  _viewportSize?: {
    width: number,
    height: number,
  };

  constructor(target: Target|null) {
    this._target = target;
    this._domModel = target ? target.model(DOMModel) : null;
    this.layersById = new Map();
    this._root = null;
    this._contentRoot = null;
    this._backendNodeIdToNode = new Map();
  }

  target(): Target|null {
    return this._target;
  }

  root(): Layer|null {
    return this._root;
  }

  setRoot(root: Layer|null): void {
    this._root = root;
  }

  contentRoot(): Layer|null {
    return this._contentRoot;
  }

  setContentRoot(contentRoot: Layer|null): void {
    this._contentRoot = contentRoot;
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  forEachLayer(callback: (arg0: Layer) => any, root?: Layer|null): any {
    if (!root) {
      root = this.root();
      if (!root) {
        return false;
      }
    }
    return callback(root) || root.children().some(this.forEachLayer.bind(this, callback));
  }

  layerById(id: string): Layer|null {
    return this.layersById.get(id) || null;
  }

  async resolveBackendNodeIds(requestedNodeIds: Set<number>): Promise<void> {
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

  backendNodeIdToNode(): Map<number, DOMNode|null> {
    return this._backendNodeIdToNode;
  }

  setViewportSize(viewportSize: {
    width: number,
    height: number,
  }): void {
    this._viewportSize = viewportSize;
  }

  viewportSize(): {
    width: number,
    height: number,
  }|undefined {
    return this._viewportSize;
  }

  _nodeForId(id: number): DOMNode|null {
    return this._domModel ? this._domModel.nodeForId(id) : null;
  }
}
