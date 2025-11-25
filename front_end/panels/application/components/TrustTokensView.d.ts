import '../../../ui/components/icon_button/icon_button.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../../core/i18n/i18nTypes.js").Values | undefined) => import("../../../core/platform/UIString.js").LocalizedString;
export interface TrustTokensViewInput {
    tokens: Protocol.Storage.TrustTokens[];
    deleteClickHandler: (issuerOrigin: string) => void;
}
type View = (input: TrustTokensViewInput, output: undefined, target: HTMLElement) => void;
export declare class TrustTokensView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): void;
    willHide(): void;
    performUpdate(): Promise<void>;
}
export {};
