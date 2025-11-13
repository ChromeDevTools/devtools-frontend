import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/settings/settings.js';
import '../../../ui/components/tooltips/tooltips.js';
import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as UI from '../../../ui/legacy/legacy.js';
declare const DEFAULT_VIEW: (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare const enum WarningType {
    SYNC_DISABLED = "SYNC_DISABLED",
    PREFERENCES_SYNC_DISABLED = "PREFERENCES_SYNC_DISABLED"
}
export interface SyncSectionData {
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
    syncSetting: Common.Settings.Setting<boolean>;
    receiveBadgesSetting: Common.Settings.Setting<boolean>;
}
export interface ViewInput {
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
    syncSetting: Common.Settings.Setting<boolean>;
    receiveBadgesSetting?: Common.Settings.Setting<boolean>;
    isEligibleToCreateGdpProfile: boolean;
    gdpProfile?: Host.GdpClient.Profile;
    onSignUpClick: () => void;
    onReceiveBadgesSettingClick: (e: Event) => void;
    onWarningClick: (e: Event) => void;
    warningType?: WarningType;
}
export interface ViewOutput {
    highlightReceiveBadgesSetting?: () => void;
}
export declare class SyncSection extends UI.Widget.Widget {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    set syncInfo(syncInfo: Host.InspectorFrontendHostAPI.SyncInformation);
    highlightReceiveBadgesSetting(): Promise<void>;
    performUpdate(): void;
}
export {};
