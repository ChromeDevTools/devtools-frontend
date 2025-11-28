import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import { type Icon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import { CookieReportView } from './CookieReportView.js';
import { type PageVisibleSecurityState, SecurityModel } from './SecurityModel.js';
import { SecurityPanelSidebar } from './SecurityPanelSidebar.js';
export declare function getSecurityStateIconForDetailedView(securityState: Protocol.Security.SecurityState, className: string): Icon;
export declare function getSecurityStateIconForOverview(securityState: Protocol.Security.SecurityState, className: string): Icon;
export declare function createHighlightedUrl(url: Platform.DevToolsPath.UrlString, securityState: string): Element;
export interface ViewInput {
    panel: SecurityPanel;
}
export interface ViewOutput {
    setVisibleView: (view: UI.Widget.VBox) => void;
    splitWidget: UI.SplitWidget.SplitWidget;
    mainView: SecurityMainView;
    visibleView: UI.Widget.VBox | null;
    sidebar: SecurityPanelSidebar;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare class SecurityPanel extends UI.Panel.Panel implements SDK.TargetManager.SDKModelObserver<SecurityModel> {
    private view;
    readonly mainView: SecurityMainView;
    readonly sidebar: SecurityPanelSidebar;
    private readonly lastResponseReceivedForLoaderId;
    private readonly origins;
    private readonly filterRequestCounts;
    visibleView: UI.Widget.VBox | null;
    private eventListeners;
    private securityModel;
    readonly splitWidget: UI.SplitWidget.SplitWidget;
    constructor(view?: View);
    static instance(opts?: {
        forceNew: boolean | null;
    }): SecurityPanel;
    static createCertificateViewerButtonForOrigin(text: string, origin: string): Element;
    static createCertificateViewerButtonForCert(text: string, names: string[]): Element;
    update(): void;
    private updateVisibleSecurityState;
    private onVisibleSecurityStateChanged;
    showOrigin(origin: Platform.DevToolsPath.UrlString): void;
    wasShown(): void;
    focus(): void;
    setVisibleView(view: UI.Widget.VBox): void;
    private onResponseReceived;
    private processRequest;
    private onRequestFinished;
    private updateFilterRequestCounts;
    filterRequestCount(filterKey: string): number;
    modelAdded(securityModel: SecurityModel): void;
    modelRemoved(securityModel: SecurityModel): void;
    private onPrimaryPageChanged;
    private onInterstitialShown;
    private onInterstitialHidden;
}
export declare enum OriginGroup {
    MainOrigin = "MainOrigin",
    NonSecure = "NonSecure",
    Secure = "Secure",
    Unknown = "Unknown"
}
export declare class SecurityMainView extends UI.Widget.VBox {
    panel: SecurityPanel;
    private readonly summarySection;
    private readonly securityExplanationsMain;
    private readonly securityExplanationsExtra;
    private readonly lockSpectrum;
    private summaryText;
    private explanations;
    private securityState;
    constructor(element?: HTMLElement);
    getLockSpectrumDiv(securityState: Protocol.Security.SecurityState): HTMLElement;
    private addExplanation;
    updateVisibleSecurityState(visibleSecurityState: PageVisibleSecurityState): void;
    private getSecuritySummaryAndExplanations;
    private explainSafetyTipSecurity;
    private explainCertificateSecurity;
    private explainConnectionSecurity;
    private explainContentSecurity;
    private orderExplanations;
    refreshExplanations(): void;
    private addMixedContentExplanation;
    showNetworkFilter(filterKey: string, e: Event): void;
}
export declare class SecurityOriginView extends UI.Widget.VBox {
    private readonly originLockIcon;
    constructor(origin: Platform.DevToolsPath.UrlString, originState: OriginState);
    private createSanDiv;
    setSecurityState(newSecurityState: Protocol.Security.SecurityState): void;
}
export declare class SecurityDetailsTable {
    #private;
    constructor();
    element(): HTMLTableElement;
    addRow(key: string, value: string | Node): void;
}
export interface OriginState {
    securityState: Protocol.Security.SecurityState;
    securityDetails: Protocol.Network.SecurityDetails | null;
    loadedFromCache: boolean;
    originView?: SecurityOriginView | null;
}
export type Origin = Platform.DevToolsPath.UrlString;
export declare class SecurityRevealer implements Common.Revealer.Revealer<CookieReportView> {
    reveal(): Promise<void>;
}
