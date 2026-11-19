import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as PanelsCommon from '../common/common.js';
export import CPUPerformanceTier = SDK.CPUThrottlingManager.CPUPerformanceTier;
export declare class ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<void> {
    #private;
    private readonly customNetworkConditionsSetting;
    private readonly currentNetworkThrottlingConditionKeySetting;
    private readonly calibratedCpuThrottlingSetting;
    private lastNetworkThrottlingConditions;
    private readonly cpuThrottlingManager;
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
    effectiveCPUPerformanceTier(): CPUPerformanceTier | undefined;
    setCPUPerformanceTier(tier?: CPUPerformanceTier): void;
    private isDirty;
}
export interface HardwareConcurrencyViewInput {
    initialized: boolean;
    overrideEnabled: boolean;
    value: number;
    defaultValue: number;
    onToggle: (enabled: boolean) => void;
    onInput: (value: number) => void;
    onReset: () => void;
}
export type HardwareConcurrencyView = (input: HardwareConcurrencyViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_HARDWARE_CONCURRENCY_VIEW: HardwareConcurrencyView;
/** Hardware Concurrency doesn't store state in a setting. */
export declare class HardwareConcurrencySelector extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: HardwareConcurrencyView);
    wasShown(): void;
    performUpdate(): void;
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
