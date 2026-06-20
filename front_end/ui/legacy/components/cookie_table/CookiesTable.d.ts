import '../data_grid/data_grid.js';
import '../../../components/buttons/buttons.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import { Icon } from '../../../kit/kit.js';
import * as UI from '../../legacy.js';
export interface ViewInput {
    data: CookieData[];
    selectedKey?: string;
    editable?: boolean;
    renderInline?: boolean;
    portBindingEnabled?: boolean;
    schemeBindingEnabled?: boolean;
    onEdit: (data: CookieData, columnId: string, valueBeforeEditing: string, newText: string) => void;
    onCreate: (data: CookieData) => void;
    onRefresh: () => void;
    onDelete: (data: CookieData) => void;
    onContextMenu: (data: CookieData, menu: UI.ContextMenu.ContextMenu) => void;
    onSelect: (key: string | undefined) => void;
    showAiButton?: boolean;
    aiButtonTitle?: string;
    onAiButtonClick?: (cookie: CookieData, event: Event) => void;
}
type ViewFunction = (input: ViewInput, output: object, target: HTMLElement) => void;
type AttributeWithIcon = SDK.Cookie.Attribute.NAME | SDK.Cookie.Attribute.VALUE | SDK.Cookie.Attribute.DOMAIN | SDK.Cookie.Attribute.PATH | SDK.Cookie.Attribute.SECURE | SDK.Cookie.Attribute.SAME_SITE;
type CookieData = Partial<Record<SDK.Cookie.Attribute, string>> & {
    name: string;
    value: string;
} & {
    key?: string;
    flagged?: boolean;
    icons?: Partial<Record<AttributeWithIcon, Icon>>;
    priorityValue?: number;
    expiresTooltip?: string;
    dirty?: boolean;
    inactive?: boolean;
};
export interface CookiesTableData {
    cookies: SDK.Cookie.Cookie[];
    cookieToBlockedReasons?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>;
    cookieToExemptionReason?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.ExemptionReason>;
}
export declare class CookiesTable extends UI.Widget.VBox {
    #private;
    private lastEditedColumnId;
    private data;
    private cookies;
    private cookieToBlockedReasons;
    private cookieToExemptionReason;
    private readonly view;
    private selectedKey?;
    private renderInline;
    private readonly schemeBindingEnabled;
    private readonly portBindingEnabled;
    constructor(element?: HTMLElement, renderInline?: boolean, saveCallback?: ((arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie | null) => Promise<boolean>), refreshCallback?: (() => void), selectedCallback?: ((arg0: SDK.Cookie.Cookie | null) => void), deleteCallback?: ((arg0: SDK.Cookie.Cookie, arg1: () => void) => void), view?: ViewFunction);
    set cookiesData(data: CookiesTableData);
    set saveCallback(callback: (arg0: SDK.Cookie.Cookie, arg1: SDK.Cookie.Cookie | null) => Promise<boolean>);
    set refreshCallback(callback: () => void);
    set selectedCallback(callback: (arg0: SDK.Cookie.Cookie | null) => void);
    set aiButtonIsEnabled(enabled: boolean);
    get aiButtonIsEnabled(): boolean;
    set onAiButtonClick(callback: (cookie: SDK.Cookie.Cookie, event: Event) => void);
    set onPopulateAiContextMenu(callback: (cookie: SDK.Cookie.Cookie, contextMenu: UI.ContextMenu.ContextMenu) => void);
    set aiButtonTitle(title: string | undefined);
    set deleteCallback(callback: (arg0: SDK.Cookie.Cookie, arg1: () => void) => void);
    set editable(value: boolean);
    set inline(value: boolean);
    setCookies(cookies: SDK.Cookie.Cookie[], cookieToBlockedReasons?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.BlockedReason[]>, cookieToExemptionReason?: ReadonlyMap<SDK.Cookie.Cookie, SDK.CookieModel.ExemptionReason>): void;
    set cookieDomain(cookieDomain: string);
    selectedCookie(): SDK.Cookie.Cookie | null;
    willHide(): void;
    performUpdate(): void;
    private onSelect;
    private onDeleteCookie;
    private onUpdateCookie;
    private onCreateCookie;
    private setDefaults;
    private saveCookie;
    private createCookieFromData;
    private createCookieData;
    private isValidCookieData;
    private isValidDomain;
    private isValidPath;
    private isValidDate;
    private isValidPartitionKey;
    private refresh;
    private populateContextMenu;
}
export {};
