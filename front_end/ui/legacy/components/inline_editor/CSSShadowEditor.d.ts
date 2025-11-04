import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';
export interface CSSShadowModel {
    setInset(inset: boolean): void;
    setOffsetX(offsetX: CSSLength): void;
    setOffsetY(offsetY: CSSLength): void;
    setBlurRadius(blurRadius: CSSLength): void;
    setSpreadRadius(spreadRadius: CSSLength): void;
    isBoxShadow(): boolean;
    inset(): boolean;
    offsetX(): CSSLength;
    offsetY(): CSSLength;
    blurRadius(): CSSLength;
    spreadRadius(): CSSLength;
}
export declare class CSSLength {
    amount: number;
    unit: string;
    constructor(amount: number, unit: string);
    static parse(text: string): CSSLength | null;
    static zero(): CSSLength;
    asCSSText(): string;
}
declare const CSSShadowEditor_base: (new (...args: any[]) => {
    addEventListener<T extends Events.SHADOW_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.SHADOW_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.SHADOW_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.SHADOW_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.SHADOW_CHANGED>(eventType: Platform.TypeScriptUtilities.NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class CSSShadowEditor extends CSSShadowEditor_base {
    private readonly typeField;
    private readonly outsetButton;
    private readonly insetButton;
    private xInput;
    private yInput;
    private xySlider;
    private halfCanvasSize;
    private readonly innerCanvasSize;
    private blurInput;
    private blurSlider;
    private readonly spreadField;
    private spreadInput;
    private spreadSlider;
    private model;
    private canvasOrigin;
    private changedElement?;
    constructor();
    private createTextInput;
    private createSlider;
    wasShown(): void;
    setModel(model: CSSShadowModel): void;
    private updateUI;
    private updateButtons;
    private updateCanvas;
    private onButtonClick;
    private handleValueModification;
    private onTextInput;
    private onTextBlur;
    private onSliderInput;
    private dragStart;
    private dragMove;
    private onCanvasBlur;
    private onCanvasArrowKey;
    private constrainPoint;
    private snapToClosestDirection;
    private sliderThumbPosition;
}
export declare const enum Events {
    SHADOW_CHANGED = "ShadowChanged"
}
export interface EventTypes {
    [Events.SHADOW_CHANGED]: CSSShadowModel;
}
export {};
