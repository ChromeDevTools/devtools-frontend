import * as SDK from '../../core/sdk/sdk.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as UI from '../../ui/legacy/legacy.js';
interface ViewInput {
    requestCookies: CookieTable.CookiesTable.CookiesTableData;
    responseCookies: CookieTable.CookiesTable.CookiesTableData;
    malformedResponseCookies: SDK.NetworkRequest.BlockedSetCookieWithReason[];
    showFilteredOutCookies: boolean;
    hasBlockedCookies: boolean;
    gotCookies: boolean;
    onShowFilteredOutCookiesChange: (checked: boolean) => void;
    siteHasCookieInOtherPartition: boolean;
}
type ViewFunction = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: ViewFunction;
export declare class RequestCookiesView extends UI.Widget.Widget {
    private request;
    private readonly showFilteredOutCookiesSetting;
    private readonly view;
    constructor(request: SDK.NetworkRequest.NetworkRequest, view?: ViewFunction);
    private getRequestCookies;
    private getResponseCookies;
    performUpdate(): void;
    wasShown(): void;
    willHide(): void;
}
export {};
