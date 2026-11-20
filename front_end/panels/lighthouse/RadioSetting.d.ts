import type * as Common from '../../core/common/common.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface RadioOption {
    value: string;
    label: () => Common.UIString.LocalizedString;
    tooltip?: () => Common.UIString.LocalizedString;
}
export interface ViewInput {
    options: RadioOption[];
    name: string;
    value: string;
    description: string;
    label?: string;
    onChange: (value: string) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class RadioSetting extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    set options(options: RadioOption[]);
    set setting(setting: Common.Settings.Setting<string> | undefined);
    set description(description: string);
    set label(label: string | undefined);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
