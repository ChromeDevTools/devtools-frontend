import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as LayerViewer from '../layer_viewer/layer_viewer.js';
import type { TracingFrameLayerTree } from './TracingLayerTree.js';
export interface ViewInput {
    layerViewHost: LayerViewer.LayerViewHost.LayerViewHost;
    onPaintProfilerRequested: (selection: LayerViewer.LayerViewHost.Selection) => void;
}
export interface ViewOutput {
    snapshotForSelection?: (selection: LayerViewer.LayerViewHost.Selection) => Promise<SDK.PaintProfiler.SnapshotWithRect | null>;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class TimelineLayersView extends UI.Widget.VBox {
    #private;
    constructor(showPaintProfilerCallback?: HTMLElement | ((arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void), view?: View);
    get showPaintProfilerCallback(): ((arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void) | undefined;
    set showPaintProfilerCallback(callback: ((arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void) | undefined);
    performUpdate(): void;
    showLayerTree(frameLayerTree: TracingFrameLayerTree): void;
    wasShown(): void;
    update(): void;
}
