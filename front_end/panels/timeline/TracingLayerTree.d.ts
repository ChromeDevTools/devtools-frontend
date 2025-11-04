import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as Trace from '../../models/trace/trace.js';
export declare class TracingLayerTree extends SDK.LayerTreeBase.LayerTreeBase {
    #private;
    private tileById;
    private paintProfilerModel;
    constructor(target: SDK.Target.Target | null);
    setLayers(root: TracingLayerPayload | null, layers: TracingLayerPayload[] | null, paints: Trace.Types.Events.LegacyLayerPaintEvent[]): Promise<void>;
    setTiles(tiles: TracingLayerTile[]): void;
    pictureForRasterTile(tileId: string): Promise<SDK.PaintProfiler.SnapshotWithRect | null>;
    private setPaints;
    private extractNodeIdsToResolve;
}
export declare class TracingFrameLayerTree {
    #private;
    constructor(target: SDK.Target.Target | null, data: Trace.Types.Events.LegacyFrameLayerTreeData);
    layerTreePromise(): Promise<TracingLayerTree | null>;
    paints(): Trace.Types.Events.LegacyLayerPaintEvent[];
}
export declare class TracingLayer implements SDK.LayerTreeBase.Layer {
    #private;
    private parentLayerId;
    parentInternal: SDK.LayerTreeBase.Layer | null;
    private layerId;
    private paints;
    private compositingReasons;
    private compositingReasonIds;
    private paintProfilerModel;
    constructor(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel | null, payload: TracingLayerPayload);
    reset(payload: TracingLayerPayload): void;
    id(): string;
    parentId(): string | null;
    parent(): SDK.LayerTreeBase.Layer | null;
    isRoot(): boolean;
    children(): SDK.LayerTreeBase.Layer[];
    addChild(childParam: SDK.LayerTreeBase.Layer): void;
    setNode(node: SDK.DOMModel.DOMNode | null): void;
    node(): SDK.DOMModel.DOMNode | null;
    nodeForSelfOrAncestor(): SDK.DOMModel.DOMNode | null;
    offsetX(): number;
    offsetY(): number;
    width(): number;
    height(): number;
    transform(): number[] | null;
    quad(): number[];
    anchorPoint(): number[];
    invisible(): boolean;
    paintCount(): number;
    lastPaintRect(): Protocol.DOM.Rect | null;
    scrollRects(): Protocol.LayerTree.ScrollRect[];
    stickyPositionConstraint(): SDK.LayerTreeBase.StickyPositionConstraint | null;
    gpuMemoryUsage(): number;
    snapshots(): Array<Promise<SDK.PaintProfiler.SnapshotWithRect | null>>;
    pictureForRect(targetRect: number[]): Promise<SDK.PaintProfiler.SnapshotWithRect | null>;
    private scrollRectsFromParams;
    private createScrollRects;
    addPaintEvent(paint: Trace.Types.Events.LegacyLayerPaintEvent): void;
    requestCompositingReasons(): Promise<string[]>;
    requestCompositingReasonIds(): Promise<string[]>;
    drawsContent(): boolean;
}
export interface TracingLayerPayload {
    bounds: {
        height: number;
        width: number;
    };
    children: TracingLayerPayload[];
    layer_id: number;
    position: number[];
    scroll_offset: number[];
    layer_quad: number[];
    draws_content: number;
    gpu_memory_usage: number;
    transform: number[];
    owner_node: Protocol.DOM.BackendNodeId;
    compositing_reasons: string[];
    compositing_reason_ids: string[];
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
