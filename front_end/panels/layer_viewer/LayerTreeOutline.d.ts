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
declare const LayerTreeOutlineBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget>;
export declare class LayerTreeOutline extends LayerTreeOutlineBase implements Common.EventTarget.EventTarget<EventTypes>, LayerView {
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
