import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface ViewInput {
    request: SDK.NetworkRequest.NetworkRequest;
    calculator: NetworkTimeCalculator.NetworkTimeCalculator;
    selectedTab: NetworkForward.UIRequestLocation.UIRequestTabs;
    isDirectSocket: boolean;
    isWebSocket: boolean;
    isEventStream: boolean;
    hasPayload: boolean;
    hasTrustTokens: boolean;
    hasUnsuccessfulTrustToken: boolean;
    hasCookies: boolean;
    hasThirdPartyCookiePhaseoutIssue: boolean;
    hasDeviceBoundSessions: boolean;
    hasOverriddenHeaders: boolean;
    hasSignedExchangeErrors: boolean;
    hasOverriddenContent: boolean;
    onTabSelect: (tabId: NetworkForward.UIRequestLocation.UIRequestTabs) => void;
    onClose: () => void;
}
export interface ViewOutput {
    revealHeader?: (section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string | undefined) => void;
    revealResponseBody?: (position: SourceFrame.SourceFrame.RevealPosition) => Promise<void>;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class NetworkItemView extends UI.Widget.VBox {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator, initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs, view?: View);
    shouldHideOnDetach(): boolean;
    wasShown(): void;
    willHide(): void;
    performUpdate(): void;
    request(): SDK.NetworkRequest.NetworkRequest;
    revealResponseBody(position: SourceFrame.SourceFrame.RevealPosition): Promise<void>;
    revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string | undefined): void;
}
