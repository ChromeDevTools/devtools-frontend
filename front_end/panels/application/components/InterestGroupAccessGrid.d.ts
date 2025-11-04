import '../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Protocol from '../../../generated/protocol.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export declare class InterestGroupAccessGrid extends HTMLElement {
    #private;
    connectedCallback(): void;
    set data(data: Protocol.Storage.InterestGroupAccessedEvent[]);
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-interest-group-access-grid': InterestGroupAccessGrid;
    }
}
