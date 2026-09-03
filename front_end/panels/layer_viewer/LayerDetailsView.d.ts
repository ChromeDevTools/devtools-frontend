import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LayerView, type LayerViewHost, type Selection, type SnapshotSelection } from './LayerViewHost.js';
export interface ViewInput {
    layer: SDK.LayerTreeBase.Layer | null;
    snapshotSelection: SnapshotSelection | null;
    compositingReasons: string[];
    onScrollRectClick: (index: number, event: Event) => void;
    onPaintProfilerRequested: () => void;
}
export type ViewOutput = undefined;
export declare const DEFAULT_VIEW: (input: ViewInput, _output: ViewOutput, target: DocumentFragment) => void;
declare const LayerDetailsViewBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.Widget<ShadowRoot>>;
export declare class LayerDetailsView extends LayerDetailsViewBase implements LayerView {
    private readonly layerViewHost;
    private layerSnapshotMap;
    private selection;
    private compositingReasons;
    private readonly view;
    constructor(layerViewHost: LayerViewHost, view?: typeof DEFAULT_VIEW);
    hoverObject(_selection: Selection | null): void;
    selectObject(selection: Selection | null): void;
    setLayerTree(_layerTree: SDK.LayerTreeBase.LayerTreeBase | null): void;
    wasShown(): void;
    private onScrollRectClicked;
    private invokeProfilerLink;
    update(): void;
    private updateCompositingReasons;
    performUpdate(): void;
}
export declare const enum Events {
    PAINT_PROFILER_REQUESTED = "PaintProfilerRequested"
}
export interface EventTypes {
    [Events.PAINT_PROFILER_REQUESTED]: Selection;
}
export declare const slowScrollRectNames: Map<SDK.LayerTreeBase.Layer.ScrollRectType, () => Common.UIString.LocalizedString>;
export {};
