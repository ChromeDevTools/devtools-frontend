import * as UI from '../../legacy.js';
import { AnimationTimingModel } from './AnimationTimingModel.js';
export declare class BezierEditor extends UI.Widget.VBox {
    #private;
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
    constructor(modelOrElement?: AnimationTimingModel | HTMLElement, element?: HTMLElement);
    get model(): AnimationTimingModel;
    set model(model: AnimationTimingModel);
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
export declare const Presets: Array<Array<{
    name: string;
    value: string;
}>>;
export interface PresetCategory {
    presets: Array<{
        name: string;
        value: string;
    }>;
    icon: Element;
    presetIndex: number;
}
export declare class BezierChangedEvent extends Event {
    static readonly eventName = "bezierchanged";
    data: string;
    constructor(bezier: string);
}
declare global {
    interface HTMLElementEventMap {
        [BezierChangedEvent.eventName]: BezierChangedEvent;
    }
}
