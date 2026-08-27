import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';
import { AnimationTimingModel } from './AnimationTimingModel.js';
declare const BezierEditor_base: Platform.Constructor.Constructor<Common.EventTarget.EventTarget<EventTypes>, any[]> & typeof UI.Widget.VBox;
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
