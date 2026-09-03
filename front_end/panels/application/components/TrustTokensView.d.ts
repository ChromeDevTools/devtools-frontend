import '../../../ui/kit/kit.js';
import '../../../ui/legacy/components/data_grid/data_grid.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
export declare const i18nString: i18n.LocalizeString;
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
