import '../../ui/components/switch/switch.js';
import '../../ui/components/cards/cards.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import '../../ui/components/buttons/buttons.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const i18nString: (id: string, values?: import("../../core/i18n/i18nTypes.js").Values | undefined) => Platform.UIString.LocalizedString;
/** A simplified representation of a network request for mock data. **/
interface MockNetworkRequest {
    requestId: string;
    url: string;
    requestMethod: string;
    statusCode: number;
}
export interface ViewInput {
    status: Protocol.Network.IpProxyStatus | null;
    proxyRequests: readonly MockNetworkRequest[];
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class IPProtectionView extends UI.Widget.VBox {
    #private;
    constructor(element?: HTMLElement, view?: View);
    wasShown(): Promise<void>;
    willHide(): void;
    get proxyRequests(): readonly MockNetworkRequest[];
    performUpdate(): void;
}
export {};
