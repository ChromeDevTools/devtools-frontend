import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LayerView, type LayerViewHost, type Selection } from './LayerViewHost.js';
declare const LayerTreeOutline_base: (new (...args: any[]) => {
    addEventListener<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.PAINT_PROFILER_REQUESTED): boolean;
    dispatchEventToListeners<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.TreeOutline.TreeOutline;
export declare class LayerTreeOutline extends LayerTreeOutline_base implements Common.EventTarget.EventTarget<EventTypes>, LayerView {
    private layerViewHost;
    private treeOutline;
    private lastHoveredNode;
    private layerCountElement;
    private layerMemoryElement;
    element: HTMLElement;
    private layerTree?;
    private layerSnapshotMap?;
    constructor(layerViewHost: LayerViewHost);
    focus(): void;
    selectObject(selection: Selection | null): void;
    hoverObject(selection: Selection | null): void;
    setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase | null): void;
    private update;
    private onMouseMove;
    selectedNodeChanged(node: LayerTreeElement): void;
    private onContextMenu;
    private selectionForNode;
}
export declare const enum Events {
    PAINT_PROFILER_REQUESTED = "PaintProfilerRequested"
}
export interface EventTypes {
    [Events.PAINT_PROFILER_REQUESTED]: Selection;
}
export declare class LayerTreeElement extends UI.TreeOutline.TreeElement {
    #private;
    layer: SDK.LayerTreeBase.Layer;
    constructor(tree: LayerTreeOutline, layer: SDK.LayerTreeBase.Layer);
    update(): void;
    onselect(): boolean;
    setHovered(hovered: boolean): void;
}
export declare const layerToTreeElement: WeakMap<SDK.LayerTreeBase.Layer, LayerTreeElement>;
export {};
