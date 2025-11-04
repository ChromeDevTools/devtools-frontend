import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class CookieItemsView extends UI.Widget.VBox {
    #private;
    private model;
    private cookieDomain;
    private cookiesTable;
    private readonly splitWidget;
    private readonly previewPanel;
    private readonly previewWidget;
    private readonly emptyWidget;
    private onlyIssuesFilterUI;
    private allCookies;
    private shownCookies;
    private selectedCookie;
    constructor(model: SDK.CookieModel.CookieModel, cookieDomain: string);
    setCookiesDomain(model: SDK.CookieModel.CookieModel, domain: string): void;
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
