import '../../../ui/components/icon_button/icon_button.js';
import type * as Platform from '../../../core/platform/platform.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import type * as Logs from '../../../models/logs/logs.js';
import * as NetworkForward from '../../../panels/network/forward/forward.js';
export interface RequestLinkIconData {
    linkToPreflight?: boolean;
    request?: SDK.NetworkRequest.NetworkRequest | null;
    affectedRequest?: {
        requestId?: Protocol.Network.RequestId;
        url?: string;
    };
    highlightHeader?: {
        section: NetworkForward.UIRequestLocation.UIHeaderSection;
        name: string;
    };
    networkTab?: NetworkForward.UIRequestLocation.UIRequestTabs;
    requestResolver?: Logs.RequestResolver.RequestResolver;
    displayURL?: boolean;
    urlToDisplay?: string;
    additionalOnClickAction?: () => void;
    revealOverride?: (revealable: unknown, omitFocus?: boolean) => Promise<void>;
}
export declare const extractShortPath: (path: Platform.DevToolsPath.UrlString) => string;
export declare class RequestLinkIcon extends HTMLElement {
    #private;
    set data(data: RequestLinkIconData);
    get data(): RequestLinkIconData;
    handleClick(event: MouseEvent): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'devtools-request-link-icon': RequestLinkIcon;
    }
}
