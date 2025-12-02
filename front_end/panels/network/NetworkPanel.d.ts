import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as Trace from '../../models/trace/trace.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Tracing from '../../services/tracing/tracing.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Search from '../search/search.js';
import { NetworkItemView } from './NetworkItemView.js';
import { NetworkLogView } from './NetworkLogView.js';
export declare class NetworkPanel extends UI.Panel.Panel implements UI.ContextMenu
    .Provider<SDK.NetworkRequest.NetworkRequest | SDK.Resource.Resource | Workspace.UISourceCode.UISourceCode>, UI.View.ViewLocationResolver {
    private readonly networkLogShowOverviewSetting;
    private readonly networkLogLargeRowsSetting;
    private readonly networkRecordFilmStripSetting;
    private readonly toggleRecordAction;
    private pendingStopTimer;
    networkItemView: NetworkItemView | null;
    private filmStripView;
    private filmStripRecorder;
    private currentRequest;
    private readonly panelToolbar;
    private readonly rightToolbar;
    private readonly filterBar;
    private showSettingsPaneSetting;
    private readonly filmStripPlaceholderElement;
    private readonly overviewPane;
    private readonly networkOverview;
    private readonly overviewPlaceholderElement;
    private readonly calculator;
    private splitWidget;
    private readonly sidebarLocation;
    private readonly progressBarContainer;
    networkLogView: NetworkLogView;
    private readonly fileSelectorElement;
    private readonly detailsWidget;
    private readonly closeButtonElement;
    private preserveLogSetting;
    recordLogSetting: Common.Settings.Setting<boolean>;
    private readonly throttlingSelect;
    private readonly displayScreenshotDelay;
    constructor(displayScreenshotDelay: number);
    static instance(opts?: {
        forceNew: boolean;
        displayScreenshotDelay?: number;
    }): NetworkPanel;
    static revealAndFilter(filters: Array<{
        filterType: NetworkForward.UIFilter.FilterType | null;
        filterValue: string;
    }>): Promise<void>;
    throttlingSelectForTest(): UI.Toolbar.ToolbarItem;
    private onWindowChanged;
    private searchToggleClick;
    private setupToolbarButtons;
    private createThrottlingConditionsSelect;
    toggleRecord(toggled: boolean): void;
    private filmStripAvailable;
    private onNetworkLogReset;
    private willReloadPage;
    private load;
    private stopFilmStripRecording;
    private toggleLargerRequests;
    private toggleShowOverview;
    private toggleRecordFilmStrip;
    private resetFilmStripView;
    elementsToRestoreScrollPositionsFor(): Element[];
    wasShown(): void;
    willHide(): void;
    revealAndHighlightRequest(request: SDK.NetworkRequest.NetworkRequest): void;
    revealAndHighlightRequestWithId(request: NetworkForward.NetworkRequestId.NetworkRequestId): void;
    selectAndActivateRequest(request: SDK.NetworkRequest.NetworkRequest, shownTab?: NetworkForward.UIRequestLocation.UIRequestTabs, options?: NetworkForward.UIRequestLocation.FilterOptions): Promise<NetworkItemView | null>;
    private handleFilterChanged;
    private onRequestSelected;
    private onRequestActivated;
    private showRequestPanel;
    hideRequestPanel(): void;
    private updateNetworkItemView;
    private clearNetworkItemView;
    private createNetworkItemView;
    resolveInitialState(parentElement: Element, reveal: boolean, lookupId: string, anchor?: SDK.DOMModel.DOMNode | SDK.NetworkRequest.NetworkRequest): Promise<{
        x: number;
        y: number;
    } | null>;
    private updateUI;
    appendApplicableItems(this: NetworkPanel, event: Event, contextMenu: UI.ContextMenu.ContextMenu, target: SDK.NetworkRequest.NetworkRequest | SDK.Resource.Resource | Workspace.UISourceCode.UISourceCode | SDK.TraceObject.RevealableNetworkRequest): void;
    private onFilmFrameSelected;
    private onFilmFrameEnter;
    private onFilmFrameExit;
    private onUpdateRequest;
    resolveLocation(locationName: string): UI.View.ViewLocation | null;
}
export declare class RequestRevealer implements Common.Revealer.Revealer<SDK.NetworkRequest.NetworkRequest> {
    reveal(request: SDK.NetworkRequest.NetworkRequest): Promise<void>;
}
export declare class RequestIdRevealer implements Common.Revealer.Revealer<NetworkForward.NetworkRequestId.NetworkRequestId> {
    reveal(requestId: NetworkForward.NetworkRequestId.NetworkRequestId): Promise<void>;
}
export declare class NetworkLogWithFilterRevealer implements Common.Revealer
    .Revealer<PanelCommon.ExtensionServer.RevealableNetworkRequestFilter | NetworkForward.UIFilter.UIRequestFilter> {
    reveal(request: PanelCommon.ExtensionServer.RevealableNetworkRequestFilter | NetworkForward.UIFilter.UIRequestFilter): Promise<void>;
}
export declare class FilmStripRecorder implements Tracing.TracingManager.TracingManagerClient {
    #private;
    constructor(timeCalculator: NetworkTimeCalculator.NetworkTimeCalculator, filmStripView: PerfUI.FilmStripView.FilmStripView);
    traceEventsCollected(events: Trace.Types.Events.Event[]): void;
    tracingComplete(): Promise<void>;
    tracingBufferUsage(): void;
    eventsRetrievalProgress(_progress: number): void;
    startRecording(): void;
    isRecording(): boolean;
    stopRecording(callback: (filmStrip: Trace.Extras.FilmStrip.Data) => void): void;
}
export declare class ActionDelegate implements UI.ActionRegistration.ActionDelegate {
    handleAction(context: UI.Context.Context, actionId: string): boolean;
}
export declare class RequestLocationRevealer implements Common.Revealer.Revealer<NetworkForward.UIRequestLocation.UIRequestLocation> {
    reveal(location: NetworkForward.UIRequestLocation.UIRequestLocation): Promise<void>;
}
export declare class SearchNetworkView extends Search.SearchView.SearchView {
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): SearchNetworkView;
    static openSearch(query: string, searchImmediately?: boolean): Promise<Search.SearchView.SearchView>;
    createScope(): Search.SearchScope.SearchScope;
}
