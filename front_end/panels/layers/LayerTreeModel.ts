// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Geometry from '../../models/geometry/geometry.js';

export class LayerTreeModel extends SDK.SDKModel.SDKModel<EventTypes> {
  readonly layerTreeAgent: ProtocolProxyApi.LayerTreeApi;
  readonly paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel;
  #layerTree: SDK.LayerTreeBase.LayerTreeBase|null;
  private readonly throttler: Common.Throttler.Throttler;
  private enabled?: boolean;
  private lastPaintRectByLayerId?: Map<string, Protocol.DOM.Rect>;

  constructor(target: SDK.Target.Target) {
    super(target);
    this.layerTreeAgent = target.layerTreeAgent();
    target.registerLayerTreeDispatcher(new LayerTreeDispatcher(this));
    this.paintProfilerModel =
        target.model(SDK.PaintProfiler.PaintProfilerModel) as SDK.PaintProfiler.PaintProfilerModel;
    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    if (resourceTreeModel) {
      resourceTreeModel.addEventListener(
          SDK.ResourceTreeModel.Events.PrimaryPageChanged, this.onPrimaryPageChanged, this);
    }
    this.#layerTree = null;
    this.throttler = new Common.Throttler.Throttler(20);
  }

  async disable(): Promise<void> {
    if (!this.enabled) {
      return;
    }
    this.enabled = false;
    await this.layerTreeAgent.invoke_disable();
  }

  enable(): void {
    if (this.enabled) {
      return;
    }
    this.enabled = true;
    void this.forceEnable();
  }

  private async forceEnable(): Promise<void> {
    this.lastPaintRectByLayerId = new Map();
    if (!this.#layerTree) {
      this.#layerTree = new AgentLayerTree(this);
    }
    await this.layerTreeAgent.invoke_enable();
  }

  layerTree(): SDK.LayerTreeBase.LayerTreeBase|null {
    return this.#layerTree;
  }

  async layerTreeChanged(layers: Protocol.LayerTree.Layer[]|null): Promise<void> {
    if (!this.enabled) {
      return;
    }
    void this.throttler.schedule(this.innerSetLayers.bind(this, layers));
  }

  private async innerSetLayers(layers: Protocol.LayerTree.Layer[]|null): Promise<void> {
    const layerTree = this.#layerTree as AgentLayerTree;

    await layerTree.setLayers(layers);

    if (!this.lastPaintRectByLayerId) {
      this.lastPaintRectByLayerId = new Map();
    }

    for (const layerId of this.lastPaintRectByLayerId.keys()) {
      const lastPaintRect = this.lastPaintRectByLayerId.get(layerId);
      const layer = layerTree.layerById(layerId);
      if (layer) {
        (layer as AgentLayer).setLastPaintRect(lastPaintRect);
      }
    }

    this.lastPaintRectByLayerId = new Map();

    this.dispatchEventToListeners(Events.LayerTreeChanged);
  }

  layerPainted(layerId: string, clipRect: Protocol.DOM.Rect): void {
    if (!this.enabled) {
      return;
    }
    const layerTree = this.#layerTree as AgentLayerTree;
    const layer = layerTree.layerById(layerId) as AgentLayer;
    if (!layer) {
      if (!this.lastPaintRectByLayerId) {
        this.lastPaintRectByLayerId = new Map();
      }

      this.lastPaintRectByLayerId.set(layerId, clipRect);
      return;
    }
    layer.didPaint(clipRect);
    this.dispatchEventToListeners(Events.LayerPainted, layer);
  }

  private onPrimaryPageChanged(): void {
    this.#layerTree = null;
    if (this.enabled) {
      void this.forceEnable();
    }
  }
}

SDK.SDKModel.SDKModel.register(LayerTreeModel, {capabilities: SDK.Target.Capability.DOM, autostart: false});

export enum Events {
  /* eslint-disable @typescript-eslint/naming-convention -- Used by web_tests. */
  LayerTreeChanged = 'LayerTreeChanged',
  LayerPainted = 'LayerPainted',
  /* eslint-enable @typescript-eslint/naming-convention */
}

export interface EventTypes {
  [Events.LayerTreeChanged]: void;
  [Events.LayerPainted]: AgentLayer;
}

export class AgentLayerTree extends SDK.LayerTreeBase.LayerTreeBase {
  private layerTreeModel: LayerTreeModel;

  constructor(layerTreeModel: LayerTreeModel) {
    super(layerTreeModel.target());
    this.layerTreeModel = layerTreeModel;
  }

  async setLayers(payload: Protocol.LayerTree.Layer[]|null): Promise<void> {
    if (!payload) {
      this.#setLayers(payload);
      return;
    }
    const idsToResolve = new Set<Protocol.DOM.BackendNodeId>();
    for (let i = 0; i < payload.length; ++i) {
      const backendNodeId = payload[i].backendNodeId;
      if (!backendNodeId || this.backendNodeIdToNode().has(backendNodeId)) {
        continue;
      }
      idsToResolve.add(backendNodeId);
    }
    await this.resolveBackendNodeIds(idsToResolve);
    this.#setLayers(payload);
  }

  #setLayers(layers: Protocol.LayerTree.Layer[]|null): void {
    this.setRoot(null);
    this.setContentRoot(null);
    // Payload will be null when not in the composited mode.
    if (!layers) {
      return;
    }
    let root;
    const oldLayersById = this.layersById;
    this.layersById = new Map();
    for (let i = 0; i < layers.length; ++i) {
      const layerId = layers[i].layerId;
      let layer: AgentLayer|(AgentLayer | null) = oldLayersById.get(layerId) as AgentLayer | null;
      if (layer) {
        layer.reset(layers[i]);
      } else {
        layer = new AgentLayer(this.layerTreeModel, layers[i]);
      }
      this.layersById.set(layerId, layer);
      const backendNodeId = layers[i].backendNodeId;
      if (backendNodeId) {
        layer.setNode(this.backendNodeIdToNode().get(backendNodeId) || null);
      }
      if (!this.contentRoot() && layer.drawsContent()) {
        this.setContentRoot(layer);
      }
      const parentId = layer.parentId();
      if (parentId) {
        const parent = this.layersById.get(parentId);
        if (!parent) {
          throw new Error(`Missing parent ${parentId} for layer ${layerId}`);
        }
        parent.addChild(layer);
      } else {
        if (root) {
          console.assert(false, 'Multiple root layers');
        }
        root = layer;
      }
    }
    if (root) {
      this.setRoot(root);
      root.calculateQuad(new WebKitCSSMatrix());
    }
  }
}

export class AgentLayer implements SDK.LayerTreeBase.Layer {
  // Used in Web tests
  private scrollRectsInternal!: Protocol.LayerTree.ScrollRect[];
  #quad!: number[];
  #children!: AgentLayer[];
  #parent!: AgentLayer|null;
  private layerPayload!: Protocol.LayerTree.Layer;
  private layerTreeModel: LayerTreeModel;
  #node?: SDK.DOMModel.DOMNode|null;
  #lastPaintRect?: Protocol.DOM.Rect;
  #paintCount?: number;
  #stickyPositionConstraint?: SDK.LayerTreeBase.StickyPositionConstraint|null;
  constructor(layerTreeModel: LayerTreeModel, layerPayload: Protocol.LayerTree.Layer) {
    this.layerTreeModel = layerTreeModel;
    this.reset(layerPayload);
  }

  id(): Protocol.LayerTree.LayerId {
    return this.layerPayload.layerId;
  }

  parentId(): Protocol.LayerTree.LayerId|null {
    return this.layerPayload.parentLayerId || null;
  }

  parent(): SDK.LayerTreeBase.Layer|null {
    return this.#parent;
  }

  isRoot(): boolean {
    return !this.parentId();
  }

  children(): SDK.LayerTreeBase.Layer[] {
    return this.#children;
  }

  addChild(childParam: SDK.LayerTreeBase.Layer): void {
    const child = childParam as AgentLayer;
    if (child.#parent) {
      console.assert(false, 'Child already has a parent');
    }
    this.#children.push(child);
    child.#parent = this;
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    this.#node = node;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.#node || null;
  }

  nodeForSelfOrAncestor(): SDK.DOMModel.DOMNode|null {
    let layer: (AgentLayer|null)|this = this;
    for (; layer; layer = layer.#parent) {
      if (layer.#node) {
        return layer.#node;
      }
    }
    return null;
  }

  offsetX(): number {
    return this.layerPayload.offsetX;
  }

  offsetY(): number {
    return this.layerPayload.offsetY;
  }

  width(): number {
    return this.layerPayload.width;
  }

  height(): number {
    return this.layerPayload.height;
  }

  transform(): number[]|null {
    return this.layerPayload.transform || null;
  }

  quad(): number[] {
    return this.#quad;
  }

  anchorPoint(): number[] {
    return [
      this.layerPayload.anchorX || 0,
      this.layerPayload.anchorY || 0,
      this.layerPayload.anchorZ || 0,
    ];
  }

  invisible(): boolean {
    return this.layerPayload.invisible || false;
  }

  paintCount(): number {
    return this.#paintCount || this.layerPayload.paintCount;
  }

  lastPaintRect(): Protocol.DOM.Rect|null {
    return this.#lastPaintRect || null;
  }

  setLastPaintRect(lastPaintRect?: Protocol.DOM.Rect): void {
    this.#lastPaintRect = lastPaintRect;
  }

  scrollRects(): Protocol.LayerTree.ScrollRect[] {
    return this.scrollRectsInternal;
  }

  stickyPositionConstraint(): SDK.LayerTreeBase.StickyPositionConstraint|null {
    return this.#stickyPositionConstraint || null;
  }

  async requestCompositingReasons(): Promise<string[]> {
    const reasons = await this.layerTreeModel.layerTreeAgent.invoke_compositingReasons({layerId: this.id()});
    return reasons.compositingReasons || [];
  }

  async requestCompositingReasonIds(): Promise<string[]> {
    const reasons = await this.layerTreeModel.layerTreeAgent.invoke_compositingReasons({layerId: this.id()});
    return reasons.compositingReasonIds || [];
  }

  drawsContent(): boolean {
    return this.layerPayload.drawsContent;
  }

  gpuMemoryUsage(): number {
    const bytesPerPixel = 4;
    return this.drawsContent() ? this.width() * this.height() * bytesPerPixel : 0;
  }

  snapshots(): Array<Promise<SDK.PaintProfiler.SnapshotWithRect|null>> {
    const promise = this.layerTreeModel.paintProfilerModel.makeSnapshot(this.id()).then(snapshot => {
      if (!snapshot) {
        return null;
      }
      return {rect: {x: 0, y: 0, width: this.width(), height: this.height()}, snapshot};
    });
    return [promise];
  }

  didPaint(rect: Protocol.DOM.Rect): void {
    this.#lastPaintRect = rect;
    this.#paintCount = this.paintCount() + 1;
  }

  reset(layerPayload: Protocol.LayerTree.Layer): void {
    this.#node = null;
    this.#children = [];
    this.#parent = null;
    this.#paintCount = 0;
    this.layerPayload = layerPayload;
    this.scrollRectsInternal = this.layerPayload.scrollRects || [];
    this.#stickyPositionConstraint = this.layerPayload.stickyPositionConstraint ?
        new SDK.LayerTreeBase.StickyPositionConstraint(
            this.layerTreeModel.layerTree(), this.layerPayload.stickyPositionConstraint) :
        null;
  }

  private matrixFromArray(a: number[]): DOMMatrix {
    function toFixed9(x: number): string {
      return x.toFixed(9);
    }
    return new WebKitCSSMatrix('matrix3d(' + a.map(toFixed9).join(',') + ')');
  }

  private calculateTransformToViewport(parentTransform: DOMMatrix): DOMMatrix {
    const offsetMatrix = new WebKitCSSMatrix().translate(this.layerPayload.offsetX, this.layerPayload.offsetY);
    let matrix: DOMMatrix = offsetMatrix;

    if (this.layerPayload.transform) {
      const transformMatrix = this.matrixFromArray(this.layerPayload.transform);
      const anchorVector = new Geometry.Vector(
          this.layerPayload.width * this.anchorPoint()[0], this.layerPayload.height * this.anchorPoint()[1],
          this.anchorPoint()[2]);
      const anchorPoint = Geometry.multiplyVectorByMatrixAndNormalize(anchorVector, matrix);
      const anchorMatrix = new WebKitCSSMatrix().translate(-anchorPoint.x, -anchorPoint.y, -anchorPoint.z);
      matrix = anchorMatrix.inverse().multiply(transformMatrix.multiply(anchorMatrix.multiply(matrix)));
    }

    matrix = parentTransform.multiply(matrix);
    return matrix;
  }

  private createVertexArrayForRect(width: number, height: number): number[] {
    return [0, 0, 0, width, 0, 0, width, height, 0, 0, height, 0];
  }

  calculateQuad(parentTransform: DOMMatrix): void {
    const matrix = this.calculateTransformToViewport(parentTransform);
    this.#quad = [];
    const vertices = this.createVertexArrayForRect(this.layerPayload.width, this.layerPayload.height);
    for (let i = 0; i < 4; ++i) {
      const point = Geometry.multiplyVectorByMatrixAndNormalize(
          new Geometry.Vector(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]), matrix);
      this.#quad.push(point.x, point.y);
    }

    function calculateQuadForLayer(layer: AgentLayer): void {
      layer.calculateQuad(matrix);
    }

    this.#children.forEach(calculateQuadForLayer);
  }
}

class LayerTreeDispatcher implements ProtocolProxyApi.LayerTreeDispatcher {
  private readonly layerTreeModel: LayerTreeModel;
  constructor(layerTreeModel: LayerTreeModel) {
    this.layerTreeModel = layerTreeModel;
  }

  layerTreeDidChange({layers}: Protocol.LayerTree.LayerTreeDidChangeEvent): void {
    void this.layerTreeModel.layerTreeChanged(layers || null);
  }

  layerPainted({layerId, clip}: Protocol.LayerTree.LayerPaintedEvent): void {
    this.layerTreeModel.layerPainted(layerId, clip);
  }
}
