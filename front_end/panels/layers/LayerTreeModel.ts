/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';
import type * as Protocol from '../../generated/protocol.js';

export class LayerTreeModel extends SDK.SDKModel.SDKModel<EventTypes> {
  readonly layerTreeAgent: ProtocolProxyApi.LayerTreeApi;
  readonly paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel;
  private layerTreeInternal: SDK.LayerTreeBase.LayerTreeBase|null;
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
    this.layerTreeInternal = null;
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
    if (!this.layerTreeInternal) {
      this.layerTreeInternal = new AgentLayerTree(this);
    }
    await this.layerTreeAgent.invoke_enable();
  }

  layerTree(): SDK.LayerTreeBase.LayerTreeBase|null {
    return this.layerTreeInternal;
  }

  async layerTreeChanged(layers: Protocol.LayerTree.Layer[]|null): Promise<void> {
    if (!this.enabled) {
      return;
    }
    void this.throttler.schedule(this.innerSetLayers.bind(this, layers));
  }

  private async innerSetLayers(layers: Protocol.LayerTree.Layer[]|null): Promise<void> {
    const layerTree = this.layerTreeInternal as AgentLayerTree;

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
    const layerTree = this.layerTreeInternal as AgentLayerTree;
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
    this.layerTreeInternal = null;
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

export type EventTypes = {
  [Events.LayerTreeChanged]: void,
  [Events.LayerPainted]: AgentLayer,
};

export class AgentLayerTree extends SDK.LayerTreeBase.LayerTreeBase {
  private layerTreeModel: LayerTreeModel;

  constructor(layerTreeModel: LayerTreeModel) {
    super(layerTreeModel.target());
    this.layerTreeModel = layerTreeModel;
  }

  async setLayers(payload: Protocol.LayerTree.Layer[]|null): Promise<void> {
    if (!payload) {
      this.innerSetLayers(payload);
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
    this.innerSetLayers(payload);
  }

  private innerSetLayers(layers: Protocol.LayerTree.Layer[]|null): void {
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
  private scrollRectsInternal!: Protocol.LayerTree.ScrollRect[];
  private quadInternal!: number[];
  private childrenInternal!: AgentLayer[];
  private image!: HTMLImageElement|null;
  private parentInternal!: AgentLayer|null;
  private layerPayload!: Protocol.LayerTree.Layer;
  private layerTreeModel: LayerTreeModel;
  private nodeInternal?: SDK.DOMModel.DOMNode|null;
  lastPaintRectInternal?: Protocol.DOM.Rect;
  private paintCountInternal?: number;
  private stickyPositionConstraintInternal?: SDK.LayerTreeBase.StickyPositionConstraint|null;
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
    return this.parentInternal;
  }

  isRoot(): boolean {
    return !this.parentId();
  }

  children(): SDK.LayerTreeBase.Layer[] {
    return this.childrenInternal;
  }

  addChild(childParam: SDK.LayerTreeBase.Layer): void {
    const child = childParam as AgentLayer;
    if (child.parentInternal) {
      console.assert(false, 'Child already has a parent');
    }
    this.childrenInternal.push(child);
    child.parentInternal = this;
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    this.nodeInternal = node;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.nodeInternal || null;
  }

  nodeForSelfOrAncestor(): SDK.DOMModel.DOMNode|null {
    let layer: (AgentLayer|null)|this = this;
    for (; layer; layer = layer.parentInternal) {
      if (layer.nodeInternal) {
        return layer.nodeInternal;
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
    return this.quadInternal;
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
    return this.paintCountInternal || this.layerPayload.paintCount;
  }

  lastPaintRect(): Protocol.DOM.Rect|null {
    return this.lastPaintRectInternal || null;
  }

  setLastPaintRect(lastPaintRect?: Protocol.DOM.Rect): void {
    this.lastPaintRectInternal = lastPaintRect;
  }

  scrollRects(): Protocol.LayerTree.ScrollRect[] {
    return this.scrollRectsInternal;
  }

  stickyPositionConstraint(): SDK.LayerTreeBase.StickyPositionConstraint|null {
    return this.stickyPositionConstraintInternal || null;
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

  snapshots(): Promise<SDK.PaintProfiler.SnapshotWithRect|null>[] {
    const promise = this.layerTreeModel.paintProfilerModel.makeSnapshot(this.id()).then(snapshot => {
      if (!snapshot) {
        return null;
      }
      return {rect: {x: 0, y: 0, width: this.width(), height: this.height()}, snapshot};
    });
    return [promise];
  }

  didPaint(rect: Protocol.DOM.Rect): void {
    this.lastPaintRectInternal = rect;
    this.paintCountInternal = this.paintCount() + 1;
    this.image = null;
  }

  reset(layerPayload: Protocol.LayerTree.Layer): void {
    this.nodeInternal = null;
    this.childrenInternal = [];
    this.parentInternal = null;
    this.paintCountInternal = 0;
    this.layerPayload = layerPayload;
    this.image = null;
    this.scrollRectsInternal = this.layerPayload.scrollRects || [];
    this.stickyPositionConstraintInternal = this.layerPayload.stickyPositionConstraint ?
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
      const anchorVector = new UI.Geometry.Vector(
          this.layerPayload.width * this.anchorPoint()[0], this.layerPayload.height * this.anchorPoint()[1],
          this.anchorPoint()[2]);
      const anchorPoint = UI.Geometry.multiplyVectorByMatrixAndNormalize(anchorVector, matrix);
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
    this.quadInternal = [];
    const vertices = this.createVertexArrayForRect(this.layerPayload.width, this.layerPayload.height);
    for (let i = 0; i < 4; ++i) {
      const point = UI.Geometry.multiplyVectorByMatrixAndNormalize(
          new UI.Geometry.Vector(vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]), matrix);
      this.quadInternal.push(point.x, point.y);
    }

    function calculateQuadForLayer(layer: AgentLayer): void {
      layer.calculateQuad(matrix);
    }

    this.childrenInternal.forEach(calculateQuadForLayer);
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
