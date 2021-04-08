// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */
/* eslint-disable @typescript-eslint/naming-convention */

import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';

import type {LayerPaintEvent} from './TimelineFrameModel.js';


export class TracingLayerTree extends SDK.LayerTreeBase.LayerTreeBase {
  _tileById: Map<string, TracingLayerTile>;
  _paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null;

  constructor(target: SDK.SDKModel.Target|null) {
    super(target);
    this._tileById = new Map();
    this._paintProfilerModel = target && target.model(SDK.PaintProfiler.PaintProfilerModel);
  }

  async setLayers(root: TracingLayerPayload|null, layers: TracingLayerPayload[]|null, paints: LayerPaintEvent[]):
      Promise<void> {
    const idsToResolve = new Set<number>();
    if (root) {
      // This is a legacy code path for compatibility, as cc is removing
      // layer tree hierarchy, this code will eventually be removed.
      this._extractNodeIdsToResolve(idsToResolve, {}, root);
    } else if (layers) {
      for (let i = 0; i < layers.length; ++i) {
        this._extractNodeIdsToResolve(idsToResolve, {}, layers[i]);
      }
    }

    await this.resolveBackendNodeIds(idsToResolve);

    const oldLayersById = this.layersById;
    this.layersById = new Map();
    this.setContentRoot(null);
    if (root) {
      const convertedLayers = this._innerSetLayers(oldLayersById, root);
      this.setRoot(convertedLayers);
    } else if (layers) {
      const processedLayers = layers.map(this._innerSetLayers.bind(this, oldLayersById));
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
    this._setPaints(paints);
  }

  setTiles(tiles: TracingLayerTile[]): void {
    this._tileById = new Map();
    for (const tile of tiles) {
      this._tileById.set(tile.id, tile);
    }
  }

  pictureForRasterTile(tileId: string): Promise<SDK.PaintProfiler.SnapshotWithRect|null> {
    const tile = this._tileById.get('cc::Tile/' + tileId);
    if (!tile) {
      Common.Console.Console.instance().error(`Tile ${tileId} is missing`);
      return Promise.resolve(null) as Promise<SDK.PaintProfiler.SnapshotWithRect|null>;
    }
    const layer = (this.layerById(tile.layer_id) as TracingLayer | null);
    if (!layer) {
      Common.Console.Console.instance().error(`Layer ${tile.layer_id} for tile ${tileId} is not found`);
      return Promise.resolve(null) as Promise<SDK.PaintProfiler.SnapshotWithRect|null>;
    }
    return layer._pictureForRect(tile.content_rect);
  }

  _setPaints(paints: LayerPaintEvent[]): void {
    for (let i = 0; i < paints.length; ++i) {
      const layer = (this.layersById.get(paints[i].layerId()) as TracingLayer | null);
      if (layer) {
        layer._addPaintEvent(paints[i]);
      }
    }
  }

  _innerSetLayers(oldLayersById: Map<string|number, SDK.LayerTreeBase.Layer>, payload: TracingLayerPayload):
      TracingLayer {
    let layer = (oldLayersById.get(payload.layer_id) as TracingLayer | null);
    if (layer) {
      layer._reset(payload);
    } else {
      layer = new TracingLayer(this._paintProfilerModel, payload);
    }
    this.layersById.set(payload.layer_id, layer);
    if (payload.owner_node) {
      layer._setNode(this.backendNodeIdToNode().get(payload.owner_node) || null);
    }
    if (!this.contentRoot() && layer.drawsContent()) {
      this.setContentRoot(layer);
    }
    for (let i = 0; payload.children && i < payload.children.length; ++i) {
      layer.addChild(this._innerSetLayers(oldLayersById, payload.children[i]));
    }
    return layer;
  }

  _extractNodeIdsToResolve(nodeIdsToResolve: Set<number>, seenNodeIds: Object, payload: TracingLayerPayload): void {
    const backendNodeId = payload.owner_node;
    if (backendNodeId && !this.backendNodeIdToNode().has(backendNodeId)) {
      nodeIdsToResolve.add(backendNodeId);
    }
    for (let i = 0; payload.children && i < payload.children.length; ++i) {
      this._extractNodeIdsToResolve(nodeIdsToResolve, seenNodeIds, payload.children[i]);
    }
  }
}

export class TracingLayer implements SDK.LayerTreeBase.Layer {
  _parentLayerId: string|null;
  _parent: SDK.LayerTreeBase.Layer|null;
  _layerId: string;
  _node: SDK.DOMModel.DOMNode|null;
  _offsetX: number;
  _offsetY: number;
  _width: number;
  _height: number;
  _children: SDK.LayerTreeBase.Layer[];
  _quad: number[];
  _scrollRects: Protocol.LayerTree.ScrollRect[];
  _gpuMemoryUsage: number;
  _paints: LayerPaintEvent[];
  _compositingReasonIds: string[];
  _drawsContent: boolean;
  _paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null;
  constructor(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel|null, payload: TracingLayerPayload) {
    this._parentLayerId = null;
    this._parent = null;
    this._layerId = '';
    this._node = null;
    this._offsetX = -1;
    this._offsetY = -1;
    this._width = -1;
    this._height = -1;
    this._children = [];
    this._quad = [];
    this._scrollRects = [];
    this._gpuMemoryUsage = -1;
    this._paints = [];
    this._compositingReasonIds = [];
    this._drawsContent = false;

    this._paintProfilerModel = paintProfilerModel;
    this._reset(payload);
  }

  _reset(payload: TracingLayerPayload): void {
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

    // Keep payload.compositing_reasons as a default
    // but use the newer payload.debug_info.compositing_reasons
    // if the first one is not set.
    this._compositingReasonIds =
        payload.compositing_reason_ids || (payload.debug_info && payload.debug_info.compositing_reason_ids) || [];
    this._drawsContent = Boolean(payload.draws_content);
    this._gpuMemoryUsage = payload.gpu_memory_usage;
    /** @type {!Array<!LayerPaintEvent>} */
    this._paints = [];
  }

  id(): string {
    return this._layerId;
  }

  parentId(): string|null {
    return this._parentLayerId;
  }

  parent(): SDK.LayerTreeBase.Layer|null {
    return this._parent;
  }

  isRoot(): boolean {
    return !this.parentId();
  }

  children(): SDK.LayerTreeBase.Layer[] {
    return this._children;
  }

  addChild(childParam: SDK.LayerTreeBase.Layer): void {
    const child = (childParam as TracingLayer);
    if (child._parent) {
      console.assert(false, 'Child already has a parent');
    }
    this._children.push(child);
    child._parent = this;
    child._parentLayerId = this._layerId;
  }

  _setNode(node: SDK.DOMModel.DOMNode|null): void {
    this._node = node;
  }

  node(): SDK.DOMModel.DOMNode|null {
    return this._node;
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
    return this._offsetX;
  }

  offsetY(): number {
    return this._offsetY;
  }

  width(): number {
    return this._width;
  }

  height(): number {
    return this._height;
  }

  transform(): number[]|null {
    return null;
  }

  quad(): number[] {
    return this._quad;
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
    return this._scrollRects;
  }

  stickyPositionConstraint(): SDK.LayerTreeBase.StickyPositionConstraint|null {
    // TODO(smcgruer): Provide sticky layer information in traces.
    return null;
  }

  gpuMemoryUsage(): number {
    return this._gpuMemoryUsage;
  }

  snapshots(): Promise<SDK.PaintProfiler.SnapshotWithRect|null>[] {
    return this._paints.map(paint => paint.snapshotPromise().then(snapshot => {
      if (!snapshot) {
        return null;
      }
      const rect = {x: snapshot.rect[0], y: snapshot.rect[1], width: snapshot.rect[2], height: snapshot.rect[3]};
      return {rect: rect, snapshot: snapshot.snapshot};
    }));
  }

  _pictureForRect(targetRect: number[]): Promise<SDK.PaintProfiler.SnapshotWithRect|null> {
    return Promise.all(this._paints.map(paint => paint.picturePromise())).then(pictures => {
      const filteredPictures = (pictures.filter(picture => picture && rectsOverlap(picture.rect, targetRect)) as {
        rect: Array<number>,
        serializedPicture: string,
      }[]);

      const fragments = filteredPictures.map(
          picture => ({x: picture.rect[0], y: picture.rect[1], picture: picture.serializedPicture}));

      if (!fragments.length || !this._paintProfilerModel) {
        return null;
      }
      const x0 = fragments.reduce((min, item) => Math.min(min, item.x), Infinity);
      const y0 = fragments.reduce((min, item) => Math.min(min, item.y), Infinity);
      // Rect is in layer content coordinates, make it relative to picture by offsetting to the top left corner.
      const rect = {x: targetRect[0] - x0, y: targetRect[1] - y0, width: targetRect[2], height: targetRect[3]};
      return this._paintProfilerModel.loadSnapshotFromFragments(fragments).then(
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

  _scrollRectsFromParams(params: number[], type: Protocol.LayerTree.ScrollRectType): Protocol.LayerTree.ScrollRect {
    return {rect: {x: params[0], y: params[1], width: params[2], height: params[3]}, type: type};
  }

  _createScrollRects(payload: TracingLayerPayload): void {
    const nonPayloadScrollRects: Protocol.LayerTree.ScrollRect[] = [];
    if (payload.non_fast_scrollable_region) {
      nonPayloadScrollRects.push(this._scrollRectsFromParams(
          payload.non_fast_scrollable_region,
          SDK.LayerTreeBase.Layer.ScrollRectType.NonFastScrollable as Protocol.LayerTree.ScrollRectType));
    }
    if (payload.touch_event_handler_region) {
      nonPayloadScrollRects.push(this._scrollRectsFromParams(
          payload.touch_event_handler_region,
          SDK.LayerTreeBase.Layer.ScrollRectType.TouchEventHandler as Protocol.LayerTree.ScrollRectType));
    }
    if (payload.wheel_event_handler_region) {
      nonPayloadScrollRects.push(this._scrollRectsFromParams(
          payload.wheel_event_handler_region,
          SDK.LayerTreeBase.Layer.ScrollRectType.WheelEventHandler as Protocol.LayerTree.ScrollRectType));
    }
    if (payload.scroll_event_handler_region) {
      nonPayloadScrollRects.push(this._scrollRectsFromParams(
          payload.scroll_event_handler_region,
          SDK.LayerTreeBase.Layer.ScrollRectType.RepaintsOnScroll as Protocol.LayerTree.ScrollRectType));
    }

    // SDK.LayerBaseTree.Layer.ScrollRectType and Protocol.LayerTree.ScrollRectType are the
    // same type, but we need to use the indirection of the nonPayloadScrollRects since
    // the ScrollRectType is defined as a string in SDK.LayerBaseTree.Layer.ScrollRectType.
    this._scrollRects = nonPayloadScrollRects;
  }

  _addPaintEvent(paint: LayerPaintEvent): void {
    this._paints.push(paint);
  }

  requestCompositingReasonIds(): Promise<string[]> {
    return Promise.resolve(this._compositingReasonIds);
  }

  drawsContent(): boolean {
    return this._drawsContent;
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
  owner_node: number;
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
