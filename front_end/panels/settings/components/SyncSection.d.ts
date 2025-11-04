import '../../../ui/components/chrome_link/chrome_link.js';
import '../../../ui/components/settings/settings.js';
import '../../../ui/components/tooltips/tooltips.js';
import type * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
export interface SyncSectionData {
    syncInfo: Host.InspectorFrontendHostAPI.SyncInformation;
    syncSetting: Common.Settings.Setting<boolean>;
    receiveBadgesSetting: Common.Settings.Setting<boolean>;
}
export declare class SyncSection extends HTMLElement {
    #private;
    set data(data: SyncSectionData);
    highlightReceiveBadgesSetting(): Promise<void>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-sync-section': SyncSection;
    }
}
