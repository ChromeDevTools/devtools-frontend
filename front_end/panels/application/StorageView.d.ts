import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
/**
 * @implements {SDK.TargetManager.Observer}
 */
export declare class StorageView extends UI.Widget.VBox {
    private pieColors;
    private reportView;
    private target;
    private securityOrigin;
    private storageKey;
    private settings;
    private includeThirdPartyCookiesSetting;
    private quotaRow;
    private quotaUsage;
    private pieChart;
    private previousOverrideFieldValue;
    private quotaOverrideCheckbox;
    private quotaOverrideControlRow;
    private quotaOverrideEditor;
    private quotaOverrideErrorMessage;
    private clearButton;
    private readonly throttler;
    constructor();
    private appendItem;
    targetAdded(target: SDK.Target.Target): void;
    targetRemoved(target: SDK.Target.Target): void;
    private originChanged;
    private storageKeyChanged;
    private updateOrigin;
    private updateStorageKey;
    private applyQuotaOverrideFromInputField;
    private clearQuotaForOrigin;
    private onClickCheckbox;
    private clear;
    static clear(target: SDK.Target.Target, storageKey: string | null, originForCookies: string | null, selectedStorageTypes: string[], includeThirdPartyCookies: boolean): void;
    performUpdate(): Promise<void>;
    private populatePieChart;
    private getStorageTypeName;
}
export declare const AllStorageTypes: Protocol.Storage.StorageType[];
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(_context: UI.Context.Context, actionId: string): boolean;
    private handleClear;
}
