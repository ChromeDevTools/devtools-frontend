import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
import { DeviceModeToolbar } from './DeviceModeToolbar.js';
export interface DeviceModeViewRefs {
    toolbar: DeviceModeToolbar;
    bottomRightResizerElement: HTMLElement;
    bottomLeftResizerElement: HTMLElement;
    rightResizerElement: HTMLElement;
    leftResizerElement: HTMLElement;
    bottomResizerElement: HTMLElement;
    pageArea: HTMLElement;
}
export interface DeviceModeViewInput {
    model: EmulationModel.DeviceModeModel.DeviceModeModel;
    showMediaInspectorSetting: Common.Settings.Setting<boolean>;
    showRulersSetting: Common.Settings.Setting<boolean>;
    outlineImage: string;
    outlineImageLoaded: boolean;
    screenImage: string;
    screenImageLoaded: boolean;
    showRulers: boolean;
    showMediaInspector: boolean;
    scale: number;
    cachedCssScreenRect?: EmulationModel.DeviceModeModel.Rect;
    cachedOutlineRect?: EmulationModel.DeviceModeModel.Rect;
    onApplyPresetSize: (size: number, e: Event) => void;
    bottomRightResizer: UI.ResizerWidget.ResizerWidget;
    bottomLeftResizer: UI.ResizerWidget.ResizerWidget;
    rightResizer: UI.ResizerWidget.ResizerWidget;
    leftResizer: UI.ResizerWidget.ResizerWidget;
    bottomResizer: UI.ResizerWidget.ResizerWidget;
    bottomRightResizerRef: (el?: Element) => void;
    bottomLeftResizerRef: (el?: Element) => void;
    rightResizerRef: (el?: Element) => void;
    leftResizerRef: (el?: Element) => void;
    bottomResizerRef: (el?: Element) => void;
    onDoubleclickBottomResizer: () => void;
    onOutlineImageLoaded: (success: boolean) => void;
    onScreenImageLoaded: (success: boolean) => void;
}
export type DeviceModeViewView = (input: DeviceModeViewInput, output: DeviceModeViewRefs, target: HTMLElement) => void;
export declare const DEFAULT_DEVICE_MODE_VIEW: DeviceModeViewView;
export declare class DeviceModeView extends UI.Widget.VBox {
    #private;
    wrapperInstance: UI.Widget.VBox | null;
    private model;
    private showMediaInspectorSetting;
    private showRulersSetting;
    pageArea: HTMLElement;
    rightResizerElement: HTMLElement;
    leftResizerElement: HTMLElement;
    bottomResizerElement: HTMLElement;
    bottomRightResizerElement: HTMLElement;
    bottomLeftResizerElement: HTMLElement;
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
    private cachedResizable;
    toolbar: DeviceModeToolbar;
    private slowPositionStart?;
    private resizeStart?;
    private cachedCssScreenRect?;
    private cachedCssVisiblePageRect?;
    private cachedOutlineRect?;
    private cachedMediaInspectorVisible?;
    private cachedShowRulers?;
    private cachedScale?;
    private handleWidth?;
    private handleHeight?;
    constructor(view?: DeviceModeViewView);
    performUpdate(): void;
    private onOutlineImageLoaded;
    private onScreenImageLoaded;
    private createResizer;
    private onResizeStart;
    private onResizeUpdate;
    exitHingeMode(): void;
    private onResizeEnd;
    private updateUI;
    setNonEmulatedAvailableSize(element: Element): void;
    private contentAreaResized;
    private measureHandles;
    private zoomChanged;
    onResize(): void;
    wasShown(): void;
    willHide(): void;
    captureScreenshot(): Promise<void>;
    captureFullSizeScreenshot(): Promise<void>;
    captureAreaScreenshot(clip?: Protocol.Page.Viewport): Promise<void>;
    private saveScreenshotBase64;
    private paintImage;
    private saveScreenshot;
}
export interface RulerViewInput {
    horizontal: boolean;
    scale: number;
    onMarkerClick: (size: number) => void;
}
export type RulerView = (input: RulerViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_RULER_VIEW: RulerView;
export declare const enum RulerEvents {
    MARKER_SELECTED = "MarkerSelected"
}
export interface RulerEventTypes {
    [RulerEvents.MARKER_SELECTED]: number;
}
declare const Ruler_base: (new (...args: any[]) => {
    __events: Common.ObjectWrapper.ObjectWrapper<RulerEventTypes>;
    addEventListener<T extends RulerEvents.MARKER_SELECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<RulerEventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<RulerEventTypes, T>;
    once<T extends RulerEvents.MARKER_SELECTED>(eventType: T): Promise<RulerEventTypes[T]>;
    removeEventListener<T extends RulerEvents.MARKER_SELECTED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<RulerEventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: RulerEvents.MARKER_SELECTED): boolean;
    dispatchEventToListeners<T extends RulerEvents.MARKER_SELECTED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<RulerEventTypes, T>): void;
    dispatchDOMEvent?(event: Event): void;
}) & typeof UI.Widget.Widget;
export declare class Ruler extends Ruler_base {
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
export {};
