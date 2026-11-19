import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as Trace from '../../models/trace/trace.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    snapshot: SDK.PaintProfiler.PaintProfilerSnapshot | null;
    log: SDK.PaintProfiler.PaintProfilerLogItem[];
    clipRect: Protocol.DOM.Rect | null;
    selectionWindow: {
        left: number;
        right: number;
    } | null;
    imageURL: string | undefined;
    onShowImage: (imageURL?: string) => void;
    onWindowChanged: (selectionWindow: {
        left: number;
        right: number;
    } | null) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class TimelinePaintProfilerView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, parsedTrace?: Trace.TraceModel.ParsedTrace, view?: View);
    wasShown(): void;
    setSnapshot(snapshot: SDK.PaintProfiler.PaintProfilerSnapshot): void;
    setEvent(paintProfilerModel: SDK.PaintProfiler.PaintProfilerModel, event: Trace.Types.Events.Event): boolean;
    performUpdate(): void;
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
    onImageLoaded: (naturalWidth: number, naturalHeight: number) => void;
}
export type TimelinePaintImageViewFunction = (input: TimelinePaintImageViewInput, output: undefined, target: HTMLElement) => void;
export declare const IMAGE_VIEW_DEFAULT_VIEW: TimelinePaintImageViewFunction;
export declare class TimelinePaintImageView extends UI.Widget.Widget {
    #private;
    private transformController;
    constructor(element?: HTMLElement, view?: TimelinePaintImageViewFunction);
    wasShown(): void;
    onResize(): void;
    private updateImagePosition;
    set imageURL(imageURL: string | undefined);
    get imageURL(): string | undefined;
    set maskRectangle(maskRectangle: Protocol.DOM.Rect | null);
    get maskRectangle(): Protocol.DOM.Rect | null;
    showImage(imageURL?: string): void;
    setMask(maskRectangle: Protocol.DOM.Rect | null): void;
    performUpdate(): void;
}
