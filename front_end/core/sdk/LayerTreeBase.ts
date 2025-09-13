// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Protocol from '../../generated/protocol.js';

import {DOMModel, type DOMNode} from './DOMModel.js';
import type {SnapshotWithRect} from './PaintProfiler.js';
import type {Target} from './Target.js';

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
  requestCompositingReasons(): Promise<string[]>;
  requestCompositingReasonIds(): Promise<string[]>;
  drawsContent(): boolean;
  snapshots(): Array<Promise<SnapshotWithRect|null>>;
}

export namespace Layer {
  export const enum ScrollRectType {
    NON_FAST_SCROLLABLE = 'NonFastScrollable',
    TOUCH_EVENT_HANDLER = 'TouchEventHandler',
    WHEEL_EVENT_HANDLER = 'WheelEventHandler',
    REPAINTS_ON_SCROLL = 'RepaintsOnScroll',
    MAIN_THREAD_SCROLL_REASON = 'MainThreadScrollingReason',
  }
}

export class StickyPositionConstraint {
  readonly #stickyBoxRect: Protocol.DOM.Rect;
  readonly #containingBlockRect: Protocol.DOM.Rect;
  readonly #nearestLayerShiftingStickyBox: Layer|null;
  readonly #nearestLayerShiftingContainingBlock: Layer|null;

  constructor(layerTree: LayerTreeBase|null, constraint: Protocol.LayerTree.StickyPositionConstraint) {
    this.#stickyBoxRect = constraint.stickyBoxRect;
    this.#containingBlockRect = constraint.containingBlockRect;
    this.#nearestLayerShiftingStickyBox = null;
    if (layerTree && constraint.nearestLayerShiftingStickyBox) {
      this.#nearestLayerShiftingStickyBox = layerTree.layerById(constraint.nearestLayerShiftingStickyBox);
    }

    this.#nearestLayerShiftingContainingBlock = null;
    if (layerTree && constraint.nearestLayerShiftingContainingBlock) {
      this.#nearestLayerShiftingContainingBlock = layerTree.layerById(constraint.nearestLayerShiftingContainingBlock);
    }
  }

  stickyBoxRect(): Protocol.DOM.Rect {
    return this.#stickyBoxRect;
  }

  containingBlockRect(): Protocol.DOM.Rect {
    return this.#containingBlockRect;
  }

  nearestLayerShiftingStickyBox(): Layer|null {
    return this.#nearestLayerShiftingStickyBox;
  }

  nearestLayerShiftingContainingBlock(): Layer|null {
    return this.#nearestLayerShiftingContainingBlock;
  }
}

export class LayerTreeBase {
  readonly #target: Target|null;
  #domModel: DOMModel|null;
  layersById = new Map<string|number, Layer>();
  #root: Layer|null = null;
  #contentRoot: Layer|null = null;
  readonly #backendNodeIdToNode = new Map<Protocol.DOM.BackendNodeId, DOMNode|null>();
  #viewportSize?: {
    width: number,
    height: number,
  };

  constructor(target: Target|null) {
    this.#target = target;
    this.#domModel = target ? target.model(DOMModel) : null;
  }

  target(): Target|null {
    return this.#target;
  }

  root(): Layer|null {
    return this.#root;
  }

  setRoot(root: Layer|null): void {
    this.#root = root;
  }

  contentRoot(): Layer|null {
    return this.#contentRoot;
  }

  setContentRoot(contentRoot: Layer|null): void {
    this.#contentRoot = contentRoot;
  }

  forEachLayer<T>(callback: (arg0: Layer) => T, root?: Layer|null): T|boolean {
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

  async resolveBackendNodeIds(requestedNodeIds: Set<Protocol.DOM.BackendNodeId>): Promise<void> {
    if (!requestedNodeIds.size || !this.#domModel) {
      return;
    }

    const nodesMap = await this.#domModel.pushNodesByBackendIdsToFrontend(requestedNodeIds);

    if (!nodesMap) {
      return;
    }
    for (const nodeId of nodesMap.keys()) {
      this.#backendNodeIdToNode.set(nodeId, nodesMap.get(nodeId) || null);
    }
  }

  backendNodeIdToNode(): Map<Protocol.DOM.BackendNodeId, DOMNode|null> {
    return this.#backendNodeIdToNode;
  }

  setViewportSize(viewportSize: {
    width: number,
    height: number,
  }): void {
    this.#viewportSize = viewportSize;
  }

  viewportSize(): {
    width: number,
    height: number,
  }|undefined {
    return this.#viewportSize;
  }
}
