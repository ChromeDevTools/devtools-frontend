import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface CPUThrottlingSelectorWrapper {
    control: UI.Toolbar.ToolbarComboBox;
    updateRecommendedOption(recommendedOption: SDK.CPUThrottlingManager.CPUThrottlingOption | null): void;
}
export declare class ThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<ThrottlingManager.EventTypes> {
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
    }): ThrottlingManager;
    createOfflineToolbarCheckbox(): UI.Toolbar.ToolbarCheckbox;
    createMobileThrottlingButton(): UI.Toolbar.ToolbarMenuButton;
    private updatePanelIcon;
    setCPUThrottlingOption(option: SDK.CPUThrottlingManager.CPUThrottlingOption): void;
    onCPUThrottlingRateChangedOnSDK(rate: number): void;
    createCPUThrottlingSelector(): CPUThrottlingSelectorWrapper;
    setSaveDataOverride(selectedIndex: number): void;
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
    selectedIndex: number;
    onSelect: (index: number) => void;
}
export type SaveDataOverrideViewFunction = (input: SaveDataOverrideViewInput, output: undefined, target: HTMLSelectElement) => void;
export declare const DEFAULT_SAVE_DATA_VIEW: SaveDataOverrideViewFunction;
declare const SaveDataOverrideSelect_base: (new (...args: any[]) => {
    __events: Common.ObjectWrapper.ObjectWrapper<ThrottlingManager.EventTypes>;
    addEventListener<T extends ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<ThrottlingManager.EventTypes[T], any>) => void, thisObject?: Object): Common.EventTarget.EventDescriptor<ThrottlingManager.EventTypes, T>;
    once<T extends ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED>(eventType: T): Promise<ThrottlingManager.EventTypes[T]>;
    removeEventListener<T extends ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED>(eventType: T, listener: (arg0: Common.EventTarget.EventTargetEvent<ThrottlingManager.EventTypes[T], any>) => void, thisObject?: Object): void;
    hasEventListeners(eventType: ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED): boolean;
    dispatchEventToListeners<T extends ThrottlingManager.Events.SAVE_DATA_OVERRIDE_CHANGED>(eventType: import("../../core/platform/TypescriptUtilities.js").NoUnion<T>, ...eventData: Common.EventTarget.EventPayloadToRestParameters<ThrottlingManager.EventTypes, T>): void;
    dispatchDOMEvent?(event: Event): void;
}) & typeof UI.Widget.Widget<HTMLSelectElement>;
export declare class SaveDataOverrideSelect extends SaveDataOverrideSelect_base {
    #private;
    constructor(element: HTMLElement, view?: SaveDataOverrideViewFunction);
    performUpdate(): void;
}
export declare namespace ThrottlingManager {
    const enum Events {
        SAVE_DATA_OVERRIDE_CHANGED = "SaveDataOverrideChanged"
    }
    interface EventTypes {
        [Events.SAVE_DATA_OVERRIDE_CHANGED]: number;
    }
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
}
export declare function throttlingManager(): ThrottlingManager;
export {};
