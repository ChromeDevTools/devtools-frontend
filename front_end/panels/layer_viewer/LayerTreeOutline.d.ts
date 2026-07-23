import * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LayerView, type LayerViewHost, type Selection } from './LayerViewHost.js';
export interface LayerTreeNode {
    layer: SDK.LayerTreeBase.Layer;
    isExpanded: boolean;
    children: LayerTreeNode[];
}
export interface ViewInput {
    treeData: LayerTreeNode[];
    selectedLayer: SDK.LayerTreeBase.Layer | null;
    hoveredLayer: SDK.LayerTreeBase.Layer | null;
    layerCount: number;
    totalLayerMemory: number;
    onSelect: (layer: SDK.LayerTreeBase.Layer) => void;
    onHover: (layer: SDK.LayerTreeBase.Layer | null) => void;
    onContextMenu: (event: MouseEvent, layer: SDK.LayerTreeBase.Layer | null) => void;
}
export interface ViewOutput {
    focusTree?: () => void;
    revealLayer?: (layer: SDK.LayerTreeBase.Layer) => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
declare const LayerTreeOutline_base: (new (...args: any[]) => {
    __events: Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.PAINT_PROFILER_REQUESTED): boolean;
    dispatchEventToListeners<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
    dispatchDOMEvent?(event: Event): void;
}) & typeof UI.Widget.Widget;
export declare class LayerTreeOutline extends LayerTreeOutline_base implements Common.EventTarget.EventTarget<EventTypes>, LayerView {
    #private;
    private layerViewHost;
    private layerTree?;
    private layerSnapshotMap?;
    constructor(layerViewHost: LayerViewHost, view?: View);
    wasShown(): void;
    performUpdate(): void;
    focus(): void;
    selectObject(selection: Selection | null): void;
    hoverObject(selection: Selection | null): void;
    setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase | null): void;
    private update;
    private onHover;
    private onSelect;
    private onContextMenu;
}
export declare const enum Events {
    PAINT_PROFILER_REQUESTED = "PaintProfilerRequested"
}
export interface EventTypes {
    [Events.PAINT_PROFILER_REQUESTED]: Selection;
}
export {};
