import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';
import type * as Common from '../../core/common/common.js';
import * as Platform from '../../core/platform/platform.js';
import type * as LHModel from '../../models/lighthouse/lighthouse.js';
import * as UI from '../../ui/legacy/legacy.js';
import { type LighthouseController } from './LighthouseController.js';
import type { LighthousePanel } from './LighthousePanel.js';
declare function getRuntimeSetting(settingName: string): LHModel.RunTypes.RuntimeSetting;
export declare class StartView extends UI.Widget.Widget {
    #private;
    private controller;
    private panel;
    private startButton;
    private helpText?;
    private warningText?;
    constructor(controller: LighthouseController, panel: LighthousePanel);
    private render;
    private populateStartButton;
    refresh(): void;
    onResize(): void;
    focusStartButton(): void;
    setStartButtonEnabled(isEnabled: boolean): void;
    setUnauditableExplanation(text: string | null): void;
    setWarningText(text: string | null): void;
    wasShown(): void;
    willHide(): void;
    settingsToolbar(): HTMLElement;
}
export interface ToolbarCheckboxInput {
    setting: Common.Settings.Setting<boolean>;
    title: Platform.UIString.LocalizedString;
    description: Platform.UIString.LocalizedString;
    learnMore?: Platform.DevToolsPath.UrlString;
}
/**
 * A string runtime setting that is rendered as a toolbar dropdown.
 */
export interface ToolbarDropdownInput {
    name: string;
    title: Platform.UIString.LocalizedString;
    description: Platform.UIString.LocalizedString;
    options: Array<{
        label: Platform.UIString.LocalizedString;
        value: string;
    }>;
    value: string;
    learnMore?: Platform.DevToolsPath.UrlString;
    onChange: (value: string) => void;
}
export declare function renderSettingsToolbarInto(input: {
    checkboxes: readonly ToolbarCheckboxInput[];
    dropdowns: readonly ToolbarDropdownInput[];
}, _output: undefined, target: HTMLElement): void;
export declare const TOOLBAR_CHECKBOX_SETTINGS: readonly string[];
export declare const TOOLBAR_DROPDOWN_SETTINGS: readonly string[];
export declare function getToolbarCheckboxInput(settingName: string): ToolbarCheckboxInput;
export declare function getToolbarDropdownInput(settingName: string): ToolbarDropdownInput;
export { getRuntimeSetting };
