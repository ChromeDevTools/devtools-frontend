import '../../ui/components/report_view/report_view.js';
import '../../ui/kit/kit.js';
import '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import type * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const storagePieColors: Map<Protocol.Storage.StorageType, string>;
export interface ViewInput {
    subtitle: string;
    settings: Map<Protocol.Storage.StorageType, Common.Settings.Setting<boolean>>;
    includeThirdPartyCookiesSetting: Common.Settings.Setting<boolean>;
    includeThirdPartyCookiesDisabled: boolean;
    clearing: boolean;
    quotaUsage: number | null;
    quotaQuota: number | null;
    quotaOverrideActive: boolean | null;
    pieChartSlices: PerfUI.PieChart.Slice[];
    quotaOverrideEnabled: boolean;
    quotaOverrideValue: string;
    quotaOverrideError: string;
    onClear: () => void;
    onToggleQuotaOverride: () => void;
    onQuotaOverrideInput: (value: string) => void;
    onApplyQuotaOverride: (value: string) => void;
}
export interface ViewOutput {
    focusClearButton?: () => void;
    focusQuotaOverrideEditor?: () => void;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
/**
 * @implements {SDK.TargetManager.Observer}
 */
export declare class StorageView extends UI.Widget.VBox {
    #private;
    private pieColors;
    private target;
    private securityOrigin;
    private storageKey;
    private subtitle;
    private settings;
    private includeThirdPartyCookiesSetting;
    private quotaUsage;
    private quotaQuota;
    private quotaOverrideActive;
    private pieChartSlices;
    private previousOverrideFieldValue;
    private quotaOverrideFieldValue;
    private quotaOverrideEnabled;
    private quotaOverrideError;
    private clearing;
    private clearTimerId?;
    private readonly throttler;
    private readonly boundOnCookiesSettingChanged;
    private readonly boundOnIncludeThirdPartyCookiesSettingChanged;
    constructor(element?: HTMLElement, view?: View);
    private onCookiesSettingChanged;
    private onIncludeThirdPartyCookiesSettingChanged;
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    willHide(): void;
    wasHidden(): void;
    private originChanged;
    private storageKeyChanged;
    private updateOrigin;
    private updateStorageKey;
    private applyQuotaOverrideFromInputField;
    private clearQuotaForOrigin;
    private onClickCheckbox;
    private clear;
    static clear(target: SDK.Target.Target, storageKey: string | null, originForCookies: string | null, selectedStorageTypes: string[], includeThirdPartyCookies: boolean): void;
    private refreshUsageAndQuota;
    wasShown(): void;
    performUpdate(): void;
    static getStorageTypeName(type: Protocol.Storage.StorageType): string;
    /**
     * Returns the user-facing title of a storage type for the storage breakdown widget in AI assistance.
     * This method accepts arbitrary strings to accommodate custom storage types (like session_storage)
     * that do not exist in the Protocol.Storage.StorageType enum.
     */
    static getStorageTypeNameForWidget(type: string): string;
}
export declare const AllStorageTypes: Protocol.Storage.StorageType[];
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
    private handleClear;
}
export declare class StorageRevealable {
    target: SDK.Target.Target;
    constructor(target: SDK.Target.Target);
}
export declare class StorageRevealer implements Common.Revealer.Revealer<StorageRevealable> {
    reveal(_revealable: StorageRevealable): Promise<void>;
}
