import * as SDK from '../../core/sdk/sdk.js';
import * as CookieTable from '../../ui/legacy/components/cookie_table/cookie_table.js';
import * as UI from '../../ui/legacy/legacy.js';
import { StorageItemsToolbar } from './StorageItemsToolbar.js';
interface CookiePreviewWidgetInput {
    cookie: SDK.Cookie.Cookie | null;
    showDecoded: boolean;
    onShowDecodedChanged: (showDecoded: boolean) => void;
}
type CookiePreviewWidgetView = (input: CookiePreviewWidgetInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_COOKIE_PREVIEW_WIDGET_VIEW: CookiePreviewWidgetView;
interface CookieItemsViewInput {
    cookieDomain: string;
    cookiesData: CookieTable.CookiesTable.CookiesTableData;
    onSaveCookie: (arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie | null) => Promise<boolean>;
    onRefresh: () => void;
    onSelect: (arg0: SDK.Cookie.Cookie | null) => void;
    onDelete: (arg0: SDK.Cookie.Cookie, arg1: () => void) => void;
    onDeleteSelectedItems: () => void;
    onDeleteAllItems: () => void;
    onRefreshItems: () => void;
    selectedCookie: SDK.Cookie.Cookie | null;
}
interface CookieItemsViewOutput {
    toolbar: StorageItemsToolbar;
}
type View = (input: CookieItemsViewInput, output: CookieItemsViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class CookieItemsView extends UI.Widget.VBox {
    #private;
    private view;
    private model;
    private cookieDomain;
    private onlyIssuesFilterUI;
    private allCookies;
    private shownCookies;
    private selectedCookie;
    constructor(model: SDK.CookieModel.CookieModel, cookieDomain: string, view?: View);
    setCookiesDomain(model: SDK.CookieModel.CookieModel, domain: string): void;
    performUpdate(): void;
    wasShown(): void;
    private showPreview;
    private handleCookieSelected;
    private saveCookie;
    private deleteCookie;
    private updateWithCookies;
    filter<T>(items: T[], keyFunction: (arg0: T) => string): T[];
    /**
     * This will only delete the currently visible cookies.
     */
    deleteAllItems(): void;
    deleteSelectedItem(): void;
    private onCookieListUpdate;
    refreshItems(): void;
}
export {};
