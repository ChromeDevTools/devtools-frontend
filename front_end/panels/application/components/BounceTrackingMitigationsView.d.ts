import '../../../ui/components/report_view/report_view.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export interface BounceTrackingMitigationsViewData {
    trackingSites: string[];
}
export declare class BounceTrackingMitigationsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    connectedCallback(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-bounce-tracking-mitigations-view': BounceTrackingMitigationsView;
    }
}
