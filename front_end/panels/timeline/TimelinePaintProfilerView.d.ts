import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class TimelinePaintProfilerView extends UI.SplitWidget.SplitWidget {
    #private;
    private readonly logAndImageSplitWidget;
    private readonly imageView;
    private readonly paintProfilerView;
    private readonly logTreeView;
    private needsUpdateWhenVisible;
    private pendingSnapshot;
    private event;
    private paintProfilerModel;
    private lastLoadedSnapshot;
    constructor(parsedTrace: Trace.TraceModel.ParsedTrace);
    wasShown(): void;
    setSnapshot(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void;
    setEvent(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel, event: Trace.Types.Events.Event): boolean;
    private updateWhenVisible;
    update(): void;
    private releaseSnapshot;
    private onWindowChanged;
}
export interface TimelinePaintImageViewInput {
    maskElementHidden: boolean;
    imageContainerHidden: boolean;
    imageURL: string;
    imageContainerWebKitTransform: string;
    maskElementStyle: {
        width?: string;
        height?: string;
        borderLeftWidth?: string;
        borderTopWidth?: string;
        borderRightWidth?: string;
        borderBottomWidth?: string;
    };
}
export declare const DEFAULT_VIEW: (input: TimelinePaintImageViewInput, output: undefined, target: HTMLElement) => {
    imageElementNaturalHeight: number;
    imageElementNaturalWidth: number;
};
export declare class TimelinePaintImageView extends UI.Widget.Widget {
    #private;
    private transformController;
    private maskRectangle?;
    constructor(view?: (input: TimelinePaintImageViewInput, output: undefined, target: HTMLElement) => {
        imageElementNaturalHeight: number;
        imageElementNaturalWidth: number;
    });
    onResize(): void;
    private updateImagePosition;
    showImage(imageURL?: string): void;
    setMask(maskRectangle: Protocol.DOM.Rect | null): void;
    performUpdate(): void;
}
