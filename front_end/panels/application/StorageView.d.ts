import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const storagePieColors: Map<Protocol.Storage.StorageType, string>;
export interface ClearSiteDataViewInput {
    settings: Map<Protocol.Storage.StorageType, Common.Settings.Setting<boolean>>;
    includeThirdPartyCookiesSetting: Common.Settings.Setting<boolean>;
    includeThirdPartyCookiesDisabled: boolean;
    clearing: boolean;
    onClear: () => void;
}
export interface ClearSiteDataViewOutput {
    focusClearButton?: () => void;
}
export type ClearSiteDataView = (input: ClearSiteDataViewInput, output: ClearSiteDataViewOutput, target: HTMLElement) => void;
export declare const CLEAR_SITE_DATA_DEFAULT_VIEW: ClearSiteDataView;
/**
 * @implements {SDK.TargetManager.Observer}
 */
export declare class StorageView extends UI.Widget.VBox {
    private pieColors;
    private reportView;
    private target;
    private securityOrigin;
    private storageKey;
    private subtitle;
    private settings;
    private includeThirdPartyCookiesSetting;
    private readonly clearSiteDataView;
    private readonly clearSiteDataViewOutput;
    private readonly clearSiteDataFieldList;
    private quotaRow;
    private quotaUsage;
    private quotaQuota;
    private quotaOverrideActive;
    private pieChartSlices;
    private pieChart;
    private previousOverrideFieldValue;
    private quotaOverrideEnabled;
    private quotaOverrideError;
    private quotaOverrideCheckbox;
    private quotaOverrideControlRow;
    private quotaOverrideEditor;
    private quotaOverrideErrorMessage;
    private clearing;
    private clearTimerId?;
    private readonly throttler;
    private readonly boundOnCookiesSettingChanged;
    private readonly boundOnIncludeThirdPartyCookiesSettingChanged;
    constructor(clearSiteDataView?: ClearSiteDataView);
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
    private renderQuotaRow;
    private populatePieChart;
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
