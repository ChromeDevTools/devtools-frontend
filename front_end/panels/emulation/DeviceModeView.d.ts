import * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class DeviceModeView extends UI.Widget.VBox {
    wrapperInstance: UI.Widget.VBox | null;
    private model;
    private readonly mediaInspector;
    private showMediaInspectorSetting;
    private showRulersSetting;
    private readonly topRuler;
    private readonly leftRuler;
    private responsivePresetsContainer;
    private screenArea;
    private pageArea;
    private outlineImage;
    private contentClip;
    private contentArea;
    private rightResizerElement;
    private leftResizerElement;
    private bottomResizerElement;
    private bottomRightResizerElement;
    private bottomLeftResizerElement;
    private cachedResizable;
    private mediaInspectorContainer;
    private screenImage;
    private toolbar;
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
    constructor();
    private createUI;
    private renderPresets;
    private createResizer;
    private onResizeStart;
    private onResizeUpdate;
    exitHingeMode(): void;
    private onResizeEnd;
    private updateUI;
    private loadImage;
    private onImageLoaded;
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
    render(scale: number): void;
    wasShown(): void;
    onResize(): void;
    performUpdate(): void;
}
export {};
