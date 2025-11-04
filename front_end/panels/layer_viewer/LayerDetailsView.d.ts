import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LayerView, type LayerViewHost, type Selection } from './LayerViewHost.js';
declare const LayerDetailsView_base: (new (...args: any[]) => {
    addEventListener<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.PAINT_PROFILER_REQUESTED): boolean;
    dispatchEventToListeners<T extends Events.PAINT_PROFILER_REQUESTED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.Widget;
export declare class LayerDetailsView extends LayerDetailsView_base implements LayerView {
    private readonly layerViewHost;
    private readonly emptyWidget;
    private layerSnapshotMap;
    private tableElement;
    private tbodyElement;
    private sizeCell;
    private compositingReasonsCell;
    private memoryEstimateCell;
    private paintCountCell;
    private scrollRectsCell;
    private stickyPositionConstraintCell;
    private paintProfilerLink;
    private selection;
    constructor(layerViewHost: LayerViewHost);
    hoverObject(_selection: Selection | null): void;
    selectObject(selection: Selection | null): void;
    setLayerTree(_layerTree: SDK.LayerTreeBase.LayerTreeBase | null): void;
    wasShown(): void;
    private onScrollRectClicked;
    private invokeProfilerLink;
    private createScrollRectElement;
    private formatStickyAncestorLayer;
    private createStickyAncestorChild;
    private populateStickyPositionConstraintCell;
    update(): void;
    private buildContent;
    private createRow;
    private updateCompositingReasons;
}
export declare const enum Events {
    PAINT_PROFILER_REQUESTED = "PaintProfilerRequested"
}
export interface EventTypes {
    [Events.PAINT_PROFILER_REQUESTED]: Selection;
}
export declare const slowScrollRectNames: Map<SDK.LayerTreeBase.Layer.ScrollRectType, () => Common.UIString.LocalizedString>;
export {};
