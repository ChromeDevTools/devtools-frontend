import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export interface TrustTokensViewData {
    tokens: Protocol.Storage.TrustTokens[];
    deleteClickHandler: (issuerOrigin: string) => void;
}
export declare class TrustTokensView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
    #private;
    connectedCallback(): void;
    render(): Promise<void>;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-trust-tokens-storage-view': TrustTokensView;
    }
}
