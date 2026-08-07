import * as Common from '../../core/common/common.js';
import type * as Protocol from '../../generated/protocol.js';
import * as EmulationModel from '../../models/emulation/emulation.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface DeviceModeViewInput {
    model: EmulationModel.DeviceModeModel.DeviceModeModel;
    showDeviceMode: boolean;
    showMediaInspectorSetting: Common.Settings.Setting<boolean>;
    showRulersSetting: Common.Settings.Setting<boolean>;
    resizable: boolean;
    showRulers: boolean;
    showMediaInspector: boolean;
    scale: number;
    cachedCssScreenRect?: EmulationModel.DeviceModeModel.Rect;
    cachedCssVisiblePageRect?: EmulationModel.DeviceModeModel.Rect;
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
}
export type DeviceModeViewView = (input: DeviceModeViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_DEVICE_MODE_VIEW: DeviceModeViewView;
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
    constructor(element?: HTMLElement, view?: DeviceModeViewView);
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
    dispatchEventToListeners<T extends RulerEvents.MARKER_SELECTED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<RulerEventTypes, T>): void;
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
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export {};
