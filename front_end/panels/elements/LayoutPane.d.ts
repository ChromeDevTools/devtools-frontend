import '../../ui/components/node_text/node_text.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
interface BaseSettingOption {
    title: string;
}
interface BooleanSettingOption extends BaseSettingOption {
    value: boolean;
}
interface EnumSettingOption extends BaseSettingOption {
    value: string;
}
interface BaseSetting {
    name: string;
    type: Common.Settings.SettingType.BOOLEAN | Common.Settings.SettingType.ENUM;
    title: string;
}
type BooleanSetting = BaseSetting & {
    options: BooleanSettingOption[];
    value: boolean;
};
type EnumSetting = BaseSetting & {
    options: EnumSettingOption[];
    value: string;
};
type Setting = EnumSetting | BooleanSetting;
interface LayoutElement {
    id: number;
    color: string;
    name: string;
    domId?: string;
    domClasses?: string[];
    enabled: boolean;
    reveal: () => void;
    toggle: (value: boolean) => void;
    setColor: (value: string) => void;
    highlight: () => void;
    hideHighlight: () => void;
}
export interface LayoutPaneData {
    settings: Setting[];
    gridElements: LayoutElement[];
    flexContainerElements?: LayoutElement[];
}
interface ViewInput {
    onEnumSettingChange(setting: EnumSetting, e: Event): unknown;
    flexContainerElements: LayoutElement[] | undefined;
    onElementClick(element: LayoutElement, e: MouseEvent): unknown;
    onColorChange(element: LayoutElement, e: Event): unknown;
    onMouseLeave(element: LayoutElement, e: MouseEvent): unknown;
    onMouseEnter(element: LayoutElement, e: MouseEvent): unknown;
    onElementToggle(element: LayoutElement, e: Event): unknown;
    onBooleanSettingChange(setting: BooleanSetting, e: Event): unknown;
    enumSettings: EnumSetting[];
    booleanSettings: BooleanSetting[];
    gridElements: LayoutElement[] | undefined;
    onSummaryKeyDown(e: KeyboardEvent): unknown;
}
type View = (input: ViewInput, output: object, element: HTMLElement) => void;
export declare class LayoutPane extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    static instance(): LayoutPane;
    modelAdded(domModel: SDK.DOMModel.DOMModel): void;
    modelRemoved(domModel: SDK.DOMModel.DOMModel): void;
    onSettingChanged(setting: string, value: string | boolean): void;
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
}
export {};
