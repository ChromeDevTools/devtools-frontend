import * as SDK from '../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as NetworkComponents from './components/components.js';
export declare class NetworkItemView extends UI.TabbedPane.TabbedPane {
    #private;
    constructor(request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator, initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs);
    wasShown(): void;
    willHide(): void;
    private requestHeadersChanged;
    private maybeAppendCookiesPanel;
    private maybeAppendPayloadPanel;
    private maybeShowErrorIconInTrustTokenTabHeader;
    resolveInitialState(parentElement: Element, reveal: boolean, lookupId: string, anchor?: SDK.DOMModel.DOMNode | SDK.NetworkRequest.NetworkRequest): Promise<{
        x: number;
        y: number;
    } | null>;
    private tabSelected;
    request(): SDK.NetworkRequest.NetworkRequest;
    revealResponseBody(position: SourceFrame.SourceFrame.RevealPosition): Promise<void>;
    revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string | undefined): void;
    getHeadersViewComponent(): NetworkComponents.RequestHeadersView.RequestHeadersView | undefined;
}
