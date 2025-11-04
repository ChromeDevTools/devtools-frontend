import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { TracingFrameLayerTree } from './TracingLayerTree.js';
export declare class TimelineLayersView extends UI.SplitWidget.SplitWidget {
    private readonly showPaintProfilerCallback;
    private readonly rightSplitWidget;
    private readonly layerViewHost;
    private readonly layers3DView;
    private frameLayerTree?;
    private updateWhenVisible?;
    constructor(showPaintProfilerCallback: (arg0: SDK.PaintProfiler.PaintProfilerSnapshot) => void);
    showLayerTree(frameLayerTree: TracingFrameLayerTree): void;
    wasShown(): void;
    private onPaintProfilerRequested;
    update(): void;
}
