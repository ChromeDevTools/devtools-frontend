// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @typescript-eslint/naming-convention */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';

import {type LayerPaintEvent} from './TimelineFrameModel.js';

export class TracingLayerTree extends SDK.LayerTreeBase.LayerTreeBase {
  private tileById: Map<string, TracingLayerTile>;
  private paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null;

  constructor(target: SDK.Target.Target|null) {
    super(target);
    this.tileById = new Map();
    this.paintProfilerModel = target && target.model(SDK.PaintProfiler.PaintProfilerModel);
  }

  async setLayers(root: TracingLayerPayload|null, layers: TracingLayerPayload[]|null, paints: LayerPaintEvent[]):
      Promise<void> {
    const idsToResolve = new Set<Protocol.DOM.BackendNodeId>();
    if (root) {
      // This is a legacy code path for compatibility, as cc is removing
      // layer tree hierarchy, this code will eventually be removed.
      this.extractNodeIdsToResolve(idsToResolve, {}, root);
    } else if (layers) {
      for (let i = 0; i < layers.length; ++i) {
        this.extractNodeIdsToResolve(idsToResolve, {}, layers[i]);
      }
    }

    await this.resolveBackendNodeIds(idsToResolve);

    const oldLayersById = this.layersById;
    this.layersById = new Map();
    this.setContentRoot(null);
    if (root) {
      const convertedLayers = this.innerSetLayers(oldLayersById, root);
      this.setRoot(convertedLayers);
    } else if (layers) {
      const processedLayers = layers.map(this.innerSetLayers.bind(this, oldLayersById));
      const contentRoot = this.contentRoot();
      if (!contentRoot) {
        throw new Error('Content root is not set.');
      }
      this.setRoot(contentRoot);
      for (let i = 0; i < processedLayers.length; ++i) {
        if (processedLayers[i].id() !== contentRoot.id()) {
          contentRoot.addChild(processedLayers[i]);
        }
      }
    }
    this.setPaints(paints);
  }

  setTiles(tiles: TracingLayerTile[]): void {
    this.tileById = new Map();
    for (const tile of tiles) {
      this.tileById.set(tile.id, tile);
    }
  }

  pictureForRasterTile(tileId: string): Promise<SDK.PaintProfiler.SnapshotWithRect|null> {
    const tile = this.tileById.get('cc::Tile/' + tileId);
    if (!tile) {
      Common.Console.Console.instance().error(`Tile ${tileId} is missing`);
      return Promise.resolve(null) as Promise<SDK.PaintProfiler.SnapshotWithRect|null>;
    }
    const layer = (this.layerById(tile.layer_id) as TracingLayer | null);
    if (!layer) {
      Common.Console.Console.instance().error(`Layer ${tile.layer_id} for tile ${tileId} is not found`);
      return Promise.resolve(null) as Promise<SDK.PaintProfiler.SnapshotWithRect|null>;
    }
    return layer.pictureForRect(tile.content_rect);
  }

  private setPaints(paints: LayerPaintEvent[]): void {
    for (let i = 0; i < paints.length; ++i) {
      const layer = (this.layersById.get(paints[i].layerId()) as TracingLayer | null);
      if (layer) {
        layer.addPaintEvent(paints[i]);
      }
    }
  }

  private innerSetLayers(oldLayersById: Map<string|number, SDK.LayerTreeBase.Layer>, payload: TracingLayerPayload):
      TracingLayer {
    let layer = (oldLayersById.get(payload.layer_id) as TracingLayer | null);
    if (layer) {
      layer.reset(payload);
    } else {
      layer = new TracingLayer(this.paintProfilerModel, payload);
    }
    this.layersById.set(payload.layer_id, layer);
    if (payload.owner_node) {
      layer.setNode(this.backendNodeIdToNode().get(payload.owner_node) || null);
    }
    if (!this.contentRoot() && layer.drawsContent()) {
      this.setContentRoot(layer);
    }
    for (let i = 0; payload.children && i < payload.children.length; ++i) {
      layer.addChild(this.innerSetLayers(oldLayersById, payload.children[i]));
    }
    return layer;
  }

  private extractNodeIdsToResolve(
      nodeIdsToResolve: Set<Protocol.DOM.BackendNodeId>, seenNodeIds: Object, payload: TracingLayerPayload): void {
    const backendNodeId = payload.owner_node;
    if (backendNodeId && !this.backendNodeIdToNode().has(backendNodeId)) {
      nodeIdsToResolve.add(backendNodeId);
    }
    for (let i = 0; payload.children && i < payload.children.length; ++i) {
      this.extractNodeIdsToResolve(nodeIdsToResolve, seenNodeIds, payload.children[i]);
    }
  }
}

export class TracingLayer implements SDK.LayerTreeBase.Layer {
  private parentLayerId: string|null;
  private parentInternal: SDK.LayerTreeBase.Layer|null;
  private layerId: string;
  private nodeInternal: SDK.DOMModel.DOMNode|null;
  private offsetXInternal: number;
  private offsetYInternal: number;
  private widthInternal: number;
  private heightInternal: number;
  private childrenInternal: SDK.LayerTreeBase.Layer[];
  private quadInternal: number[];
  private scrollRectsInternal: Protocol.LayerTree.ScrollRect[];
  private gpuMemoryUsageInternal: number;
  private paints: LayerPaintEvent[];
  private compositingReasonIds: string[];
  private drawsContentInternal: boolean;
  private paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null;
  constructor(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null, payload: TracingLayerPayload) {
    this.parentLayerId = null;
    this.parentInternal = null;
    this.layerId = '';
    this.nodeInternal = null;
    this.offsetXInternal = -1;
    this.offsetYInternal = -1;
    this.widthInternal = -1;
    this.heightInternal = -1;
    this.childrenInternal = [];
    this.quadInternal = [];
    this.scrollRectsInternal = [];
    this.gpuMemoryUsageInternal = -1;
    this.paints = [];
    this.compositingReasonIds = [];
    this.drawsContentInternal = false;

    this.paintProfilerModel = paintProfilerModel;
    this.reset(payload);
  }

  reset(payload: TracingLayerPayload): void {
    this.nodeInternal = null;
    this.layerId = String(payload.layer_id);
    this.offsetXInternal = payload.position[0];
    this.offsetYInternal = payload.position[1];
    this.widthInternal = payload.bounds.width;
    this.heightInternal = payload.bounds.height;
    this.childrenInternal = [];
    this.parentLayerId = null;
    this.parentInternal = null;
    this.quadInternal = payload.layer_quad || [];
    this.createScrollRects(payload);

    // Keep payload.compositing_reasons as a default
    // but use the newer payload.debug_info.compositing_reasons
    // if the first one is not set.
    this.compositingReasonIds =
        payload.compositing_reason_ids || (payload.debug_info && payload.debug_info.compositing_reason_ids) || [];
    this.drawsContentInternal = Boolean(payload.draws_content);
    this.gpuMemoryUsageInternal = payload.gpu_memory_usage;
    this.paints = [];
  }

  id(): string {
    return this.layerId;
  }

  parentId(): string|null {
    return this.parentLayerId;
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
    const child = (childParam as TracingLayer);
    if (child.parentInternal) {
      console.assert(false, 'Child already has a parent');
    }
    this.childrenInternal.push(child);
    child.parentInternal = this;
    child.parentLayerId = this.layerId;
  }

  setNode(node: SDK.DOMModel.DOMNode|null): void {
    this.nodeInternal = node;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this.nodeInternal;
  }

  nodeForSelfOrAncestor(): SDK.DOMModel.DOMNode|null {
    let layer: (SDK.LayerTreeBase.Layer|null)|this = this;
    for (; layer; layer = layer.parent()) {
      if (layer.node()) {
        return layer.node();
      }
    }
    return null;
  }

  offsetX(): number {
    return this.offsetXInternal;
  }

  offsetY(): number {
    return this.offsetYInternal;
  }

  width(): number {
    return this.widthInternal;
  }

  height(): number {
    return this.heightInternal;
  }

  transform(): number[]|null {
    return null;
  }

  quad(): number[] {
    return this.quadInternal;
  }

  anchorPoint(): number[] {
    return [0.5, 0.5, 0];
  }

  invisible(): boolean {
    return false;
  }

  paintCount(): number {
    return 0;
  }

  lastPaintRect(): Protocol.DOM.Rect|null {
    return null;
  }

  scrollRects(): Protocol.LayerTree.ScrollRect[] {
    return this.scrollRectsInternal;
  }

  stickyPositionConstraint(): SDK.LayerTreeBase.StickyPositionConstraint|null {
    // TODO(smcgruer): Provide sticky layer information in traces.
    return null;
  }

  gpuMemoryUsage(): number {
    return this.gpuMemoryUsageInternal;
  }

  snapshots(): Promise<SDK.PaintProfiler.SnapshotWithRect|null>[] {
    return this.paints.map(paint => paint.snapshotPromise().then(snapshot => {
      if (!snapshot) {
        return null;
      }
      const rect = {x: snapshot.rect[0], y: snapshot.rect[1], width: snapshot.rect[2], height: snapshot.rect[3]};
      return {rect: rect, snapshot: snapshot.snapshot};
    }));
  }

  pictureForRect(targetRect: number[]): Promise<SDK.PaintProfiler.SnapshotWithRect|null> {
    return Promise.all(this.paints.map(paint => paint.picturePromise())).then(pictures => {
      const filteredPictures = (pictures.filter(picture => picture && rectsOverlap(picture.rect, targetRect)) as {
        rect: Array<number>,
        serializedPicture: string,
      }[]);

      const fragments = filteredPictures.map(
          picture => ({x: picture.rect[0], y: picture.rect[1], picture: picture.serializedPicture}));

      if (!fragments.length || !this.paintProfilerModel) {
        return null;
      }
      const x0 = fragments.reduce((min, item) => Math.min(min, item.x), Infinity);
      const y0 = fragments.reduce((min, item) => Math.min(min, item.y), Infinity);
      // Rect is in layer content coordinates, make it relative to picture by offsetting to the top left corner.
      const rect = {x: targetRect[0] - x0, y: targetRect[1] - y0, width: targetRect[2], height: targetRect[3]};
      return this.paintProfilerModel.loadSnapshotFromFragments(fragments).then(
          snapshot => snapshot ? {rect: rect, snapshot: snapshot} : null);
    });

    function segmentsOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
      console.assert(a1 <= a2 && b1 <= b2, 'segments should be specified as ordered pairs');
      return a2 > b1 && a1 < b2;
    }

    function rectsOverlap(a: number[], b: number[]): boolean {
      return segmentsOverlap(a[0], a[0] + a[2], b[0], b[0] + b[2]) &&
          segmentsOverlap(a[1], a[1] + a[3], b[1], b[1] + b[3]);
    }
  }

  private scrollRectsFromParams(params: number[], type: Protocol.LayerTree.ScrollRectType):
      Protocol.LayerTree.ScrollRect {
    return {rect: {x: params[0], y: params[1], width: params[2], height: params[3]}, type: type};
  }

  private createScrollRects(payload: TracingLayerPayload): void {
    const nonPayloadScrollRects: Protocol.LayerTree.ScrollRect[] = [];
    if (payload.non_fast_scrollable_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
          payload.non_fast_scrollable_region, 'NonFastScrollable' as Protocol.LayerTree.ScrollRectType));
    }
    if (payload.touch_event_handler_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
          payload.touch_event_handler_region, Protocol.LayerTree.ScrollRectType.TouchEventHandler));
    }
    if (payload.wheel_event_handler_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
          payload.wheel_event_handler_region, Protocol.LayerTree.ScrollRectType.WheelEventHandler));
    }
    if (payload.scroll_event_handler_region) {
      nonPayloadScrollRects.push(this.scrollRectsFromParams(
          payload.scroll_event_handler_region, Protocol.LayerTree.ScrollRectType.RepaintsOnScroll));
    }

    // SDK.LayerBaseTree.Layer.ScrollRectType and Protocol.LayerTree.ScrollRectType are the
    // same type, but we need to use the indirection of the nonPayloadScrollRects since
    // the ScrollRectType is defined as a string in SDK.LayerBaseTree.Layer.ScrollRectType.
    this.scrollRectsInternal = nonPayloadScrollRects;
  }

  addPaintEvent(paint: LayerPaintEvent): void {
    this.paints.push(paint);
  }

  requestCompositingReasonIds(): Promise<string[]> {
    return Promise.resolve(this.compositingReasonIds);
  }

  drawsContent(): boolean {
    return this.drawsContentInternal;
  }
}

export interface TracingLayerPayload {
  bounds: {height: number, width: number};
  children: TracingLayerPayload[];
  layer_id: number;
  position: number[];
  scroll_offset: number[];
  layer_quad: number[];
  draws_content: number;
  gpu_memory_usage: number;
  transform: number[];
  owner_node: Protocol.DOM.BackendNodeId;
  reasons: string[];
  compositing_reason: string[];
  compositing_reason_ids: string[];
  debug_info: {compositing_reason_ids: string[]};
  non_fast_scrollable_region: number[];
  touch_event_handler_region: number[];
  wheel_event_handler_region: number[];
  scroll_event_handler_region: number[];
}

export interface TracingLayerTile {
  id: string;
  layer_id: string;
  gpu_memory_usage: number;
  content_rect: number[];
}
