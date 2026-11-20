import * as Common from '../../core/common/common.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    model: EmulationModel.DeviceModeModel.DeviceModeModel;
    showDeviceMode: boolean;
    resizable: boolean;
    showRulers: boolean;
    showMediaInspector: boolean;
    scale: number;
    cachedCssScreenRect?: EmulationModel.DeviceModeModel.Rect;
    cachedCssVisiblePageRect?: EmulationModel.DeviceModeModel.Rect;
    getAppliedDeviceWidth: () => number;
    onSetWidth: (width: number) => void;
    onApplyPresetSize: (size: number) => void;
    onWidthMarkerSelected: (width: number) => void;
    onHeightMarkerSelected: (height: number) => void;
    bottomRightResizerRef: (el?: Element) => void;
    bottomLeftResizerRef: (el?: Element) => void;
    rightResizerRef: (el?: Element) => void;
    leftResizerRef: (el?: Element) => void;
    bottomResizerRef: (el?: Element) => void;
    onDoubleclickBottomResizer: () => void;
}
export interface ViewOutput {
    measureContentArea?: () => {
        rect: DOMRect;
        handleWidth: number;
        handleHeight: number;
    } | null;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export { DEFAULT_VIEW as DEFAULT_DEVICE_MODE_VIEW };
export declare class DeviceModeView extends UI.Widget.VBox {
    #private;
    wrapperInstance: UI.Widget.VBox | null;
    private model;
    private showMediaInspectorSetting;
    private showRulersSetting;
    private readonly bottomRightResizer;
    private readonly bottomLeftResizer;
    private readonly rightResizer;
    private readonly leftResizer;
    private readonly bottomResizer;
    private readonly bottomRightResizerRef;
    private readonly bottomLeftResizerRef;
    private readonly rightResizerRef;
    private readonly leftResizerRef;
    private readonly bottomResizerRef;
    private slowPositionStart?;
    private resizeStart?;
    private cachedCssScreenRect?;
    private cachedCssVisiblePageRect?;
    private cachedMediaInspectorVisible?;
    private cachedShowRulers?;
    private cachedScale?;
    constructor(element?: HTMLElement, view?: View);
    private screenshotCopied;
    private screenshotCopyFailed;
    performUpdate(): void;
    static captureScreenshot(fullSize?: boolean, clip?: Protocol.Page.Viewport): boolean;
    private screenshotRequestedFromOverlay;
    private createResizer;
    private onResizeStart;
    private onResizeUpdate;
    exitHingeMode(): void;
    private onResizeEnd;
    private updateUI;
    private contentAreaResized;
    private zoomChanged;
    onResize(): void;
    wasShown(): void;
    willHide(): void;
}
export interface RulerViewInput {
    horizontal: boolean;
    scale: number;
    zoomFactor: number;
    onMarkerClick: (size: number) => void;
}
export type RulerView = (input: RulerViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_RULER_VIEW: RulerView;
export declare const enum RulerEvents {
    MARKER_SELECTED = "device-mode-ruler-marker-selected"
}
export interface RulerEventTypes {
    [RulerEvents.MARKER_SELECTED]: number;
}
declare const RulerBase: Common.ObjectWrapper.EventMixin<RulerEventTypes, typeof UI.Widget.Widget>;
export declare class Ruler extends RulerBase {
    #private;
    constructor(element?: HTMLElement, view?: RulerView);
    get horizontal(): boolean;
    set horizontal(horizontal: boolean);
    get scale(): number;
    set scale(scale: number);
    wasShown(): void;
    onResize(): void;
    performUpdate(): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
