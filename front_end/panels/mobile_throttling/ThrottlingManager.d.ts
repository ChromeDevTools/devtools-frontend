import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';
export interface CPUThrottlingSelectorWrapper {
    control: UI.Toolbar.ToolbarComboBox;
    updateRecommendedOption(recommendedOption: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption | null): void;
}
export declare class ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<void> {
    #private;
    private readonly cpuThrottlingControls;
    private readonly cpuThrottlingOptions;
    private readonly customNetworkConditionsSetting;
    private readonly currentNetworkThrottlingConditionKeySetting;
    private readonly calibratedCpuThrottlingSetting;
    private lastNetworkThrottlingConditions;
    private readonly cpuThrottlingManager;
    get hardwareConcurrencyOverrideEnabled(): boolean;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
        settings?: Common.Settings.Settings;
    }): ThrottlingManager;
    createOfflineToolbarCheckbox(): UI.Toolbar.ToolbarCheckbox;
    private updatePanelIcon;
    cpuThrottlingOption(): PanelsCommon.CPUThrottlingOption.CPUThrottlingOption;
    setCPUThrottlingOption(option: PanelsCommon.CPUThrottlingOption.CPUThrottlingOption): void;
    private onCalibratedSettingChanged;
    onCPUThrottlingRateChangedOnSDK(rate: number): void;
    createCPUThrottlingSelector(): CPUThrottlingSelectorWrapper;
    createSaveDataOverrideSelector(className?: string): HTMLSelectElement;
    /** Hardware Concurrency doesn't store state in a setting. */
    createHardwareConcurrencySelector(): {
        numericInput: UI.Toolbar.ToolbarItem;
        reset: UI.Toolbar.ToolbarButton;
        warning: UI.Toolbar.ToolbarItem;
        checkbox: UI.UIUtils.CheckboxLabel;
    };
    setHardwareConcurrency(concurrency: number): void;
    private isDirty;
}
export interface SaveDataOverrideViewInput {
    selectedOption: SDK.EmulationModel.DataSaverOverride;
    onSelect: (selectedOption: SDK.EmulationModel.DataSaverOverride) => void;
}
export type SaveDataOverrideViewFunction = (input: SaveDataOverrideViewInput, output: undefined, target: HTMLSelectElement) => void;
export declare const DEFAULT_SAVE_DATA_VIEW: SaveDataOverrideViewFunction;
export declare class SaveDataOverrideSelect extends UI.Widget.Widget<HTMLSelectElement> {
    #private;
    constructor(element: HTMLElement, view?: SaveDataOverrideViewFunction);
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare function throttlingManager(): ThrottlingManager;
