import * as Common from '../../../../core/common/common.js';
import * as UI from '../../legacy.js';
import { AnimationTimingModel } from './AnimationTimingModel.js';
declare const BezierEditor_base: (new (...args: any[]) => {
    "__#private@#events": Common.ObjectWrapper.ObjectWrapper<EventTypes>;
    addEventListener<T extends Events.BEZIER_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<EventTypes, T>;
    once<T extends Events.BEZIER_CHANGED>(eventType: T): Promise<EventTypes[T]>;
    removeEventListener<T extends Events.BEZIER_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: Events.BEZIER_CHANGED): boolean;
    dispatchEventToListeners<T extends Events.BEZIER_CHANGED>(eventType: import("../../../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<EventTypes, T>): void;
}) & typeof UI.Widget.VBox;
export declare class BezierEditor extends BezierEditor_base {
    private model;
    private previewElement;
    private readonly previewOnion;
    private readonly outerContainer;
    private selectedCategory;
    private readonly presetsContainer;
    private readonly presetUI;
    private readonly presetCategories;
    private animationTimingUI?;
    private readonly header;
    private label;
    private previewAnimation?;
    private debouncedStartPreviewAnimation;
    constructor(model: AnimationTimingModel);
    setModel(model: AnimationTimingModel): void;
    wasShown(): void;
    private onchange;
    private updateUI;
    private createCategory;
    private createPresetModifyIcon;
    private unselectPresets;
    private presetCategorySelected;
    private presetModifyClicked;
    private startPreviewAnimation;
}
export declare const enum Events {
    BEZIER_CHANGED = "BezierChanged"
}
export interface EventTypes {
    [Events.BEZIER_CHANGED]: string;
}
export declare const Presets: {
    name: string;
    value: string;
}[][];
export interface PresetCategory {
    presets: Array<{
        name: string;
        value: string;
    }>;
    icon: Element;
    presetIndex: number;
}
export {};
