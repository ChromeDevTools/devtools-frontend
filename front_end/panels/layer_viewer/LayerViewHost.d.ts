import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as UI from '../../ui/legacy/legacy.js';
export declare abstract class LayerView {
    abstract hoverObject(selection: Selection | null): void;
    abstract selectObject(selection: Selection | null): void;
    abstract setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase | null): void;
}
export declare class Selection {
    #private;
    readonly typeInternal: Type;
    constructor(type: Type, layer: SDK.LayerTreeBase.Layer);
    static isEqual(a: Selection | null, b: Selection | null): boolean;
    type(): Type;
    layer(): SDK.LayerTreeBase.Layer;
    isEqual(_other: Selection): boolean;
}
export declare const enum Type {
    LAYER = "Layer",
    SCROLL_RECT = "ScrollRect",
    SNAPSHOT = "Snapshot"
}
export declare class LayerSelection extends Selection {
    constructor(layer: SDK.LayerTreeBase.Layer);
    isEqual(other: Selection): boolean;
}
export declare class ScrollRectSelection extends Selection {
    scrollRectIndex: number;
    constructor(layer: SDK.LayerTreeBase.Layer, scrollRectIndex: number);
    isEqual(other: Selection): boolean;
}
export declare class SnapshotSelection extends Selection {
    #private;
    constructor(layer: SDK.LayerTreeBase.Layer, snapshot: SDK.PaintProfiler.SnapshotWithRect);
    isEqual(other: Selection): boolean;
    snapshot(): SDK.PaintProfiler.SnapshotWithRect;
}
export declare class LayerViewHost {
    #private;
    private readonly views;
    private selectedObject;
    private hoveredObject;
    private snapshotLayers;
    constructor();
    registerView(layerView: LayerView): void;
    setLayerSnapshotMap(snapshotLayers: Map<SDK.LayerTreeBase.Layer, SnapshotSelection>): void;
    getLayerSnapshotMap(): Map<SDK.LayerTreeBase.Layer, SnapshotSelection>;
    setLayerTree(layerTree: SDK.LayerTreeBase.LayerTreeBase | null): void;
    hoverObject(selection: Selection | null): void;
    selectObject(selection: Selection | null): void;
    selection(): Selection | null;
    showContextMenu(contextMenu: UI.ContextMenu.ContextMenu, selection: Selection | null): void;
    showInternalLayersSetting(): Common.Settings.Setting<boolean>;
    private toggleShowInternalLayers;
    private toggleNodeHighlight;
}
