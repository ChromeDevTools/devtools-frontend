import './CSSAngleEditor.js';
import './CSSAngleSwatch.js';
import { type Angle } from './CSSAngleUtils.js';
import { ValueChangedEvent } from './InlineEditorUtils.js';
export declare class PopoverToggledEvent extends Event {
    static readonly eventName = "popovertoggled";
    data: {
        open: boolean;
    };
    constructor(open: boolean);
}
export declare class UnitChangedEvent extends Event {
    static readonly eventName = "unitchanged";
    data: {
        value: string;
    };
    constructor(value: string);
}
interface EventTypes {
    [PopoverToggledEvent.eventName]: PopoverToggledEvent;
    [UnitChangedEvent.eventName]: UnitChangedEvent;
    [ValueChangedEvent.eventName]: ValueChangedEvent;
}
export interface CSSAngleData {
    angleText: string;
    containingPane: HTMLElement;
}
export declare class CSSAngle extends HTMLElement {
    private angle;
    private displayedAngle;
    private propertyValue;
    private containingPane?;
    private angleElement;
    private swatchElement;
    private popoverOpen;
    private popoverStyleTop;
    private popoverStyleLeft;
    private onMinifyingAction;
    set data(data: CSSAngleData);
    disconnectedCallback(): void;
    popOver(): void;
    addEventListener<K extends keyof EventTypes>(type: K, listener: (this: CSSAngle, ev: EventTypes[K]) => void, options?: boolean | AddEventListenerOptions | undefined): void;
    addEventListener<K extends keyof HTMLElementEventMap>(type: K, listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => void, options?: boolean | AddEventListenerOptions | undefined): void;
    minify(): void;
    updateProperty(value: string): void;
    updateAngle(angle: Angle): void;
    private displayNextUnit;
    private bindMinifyingAction;
    private unbindMinifyingAction;
    private onMiniIconClick;
    private consume;
    private onKeydown;
    private render;
    private renderPopover;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-css-angle': CSSAngle;
    }
}
export {};
