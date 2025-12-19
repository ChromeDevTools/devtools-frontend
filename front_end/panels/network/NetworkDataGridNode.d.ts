import * as Common from '../../core/common/common.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as HAR from '../../models/har/har.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare const enum Events {
    RequestSelected = "RequestSelected",
    RequestActivated = "RequestActivated"
}
export declare const enum RequestPanelBehavior {
    ShowPanel = "ShowPanel",
    HidePanel = "HidePanel",
    Unchanged = "Unchanged"
}
export interface RequestActivatedEvent {
    showPanel: RequestPanelBehavior;
    takeFocus?: boolean;
    tab?: NetworkForward.UIRequestLocation.UIRequestTabs;
}
export interface EventTypes {
    [Events.RequestSelected]: SDK.NetworkRequest.NetworkRequest;
    [Events.RequestActivated]: RequestActivatedEvent;
}
export interface NetworkLogViewInterface extends Common.EventTarget.EventTarget<EventTypes> {
    onLoadFromFile(file: File): Promise<void>;
    nodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkRequestNode | null;
    headerHeight(): number;
    setRecording(recording: boolean): void;
    setWindow(start: number, end: number): void;
    resetFocus(): void;
    columnExtensionResolved(): void;
    hoveredNode(): NetworkNode | null;
    scheduleRefresh(): void;
    addFilmStripFrames(times: number[]): void;
    selectFilmStripFrame(time: number): void;
    clearFilmStripFrame(): void;
    timeCalculator(): NetworkTimeCalculator.NetworkTimeCalculator;
    calculator(): NetworkTimeCalculator.NetworkTimeCalculator;
    setCalculator(x: NetworkTimeCalculator.NetworkTimeCalculator): void;
    flatNodesList(): NetworkNode[];
    updateNodeBackground(): void;
    updateNodeSelectedClass(isSelected: boolean): void;
    stylesChanged(): void;
    setTextFilterValue(filterString: string): void;
    rowHeight(): number;
    switchViewMode(gridMode: boolean): void;
    handleContextMenuForRequest(contextMenu: UI.ContextMenu.ContextMenu, request: SDK.NetworkRequest.NetworkRequest): void;
    exportAll(options: HAR.Log.BuildOptions): Promise<void>;
    revealAndHighlightRequest(request: SDK.NetworkRequest.NetworkRequest): void;
    selectRequest(request: SDK.NetworkRequest.NetworkRequest): void;
    removeAllNodeHighlights(): void;
    modelAdded(model: SDK.NetworkManager.NetworkManager): void;
    modelRemoved(model: SDK.NetworkManager.NetworkManager): void;
    linkifier(): Components.Linkifier.Linkifier;
}
export declare class NetworkNode extends DataGrid.SortableDataGrid.SortableDataGridNode<NetworkNode> {
    private readonly parentViewInternal;
    private isHovered;
    private showingInitiatorChainInternal;
    private requestOrFirstKnownChildRequestInternal;
    constructor(parentView: NetworkLogViewInterface);
    displayName(): string;
    displayType(): string;
    createCell(columnId: string): HTMLElement;
    renderCell(_cell: Element, _columnId: string): void;
    isError(): boolean;
    isWarning(): boolean;
    backgroundColor(): string;
    updateBackgroundColor(): void;
    setStriped(isStriped: boolean): void;
    select(suppressSelectedEvent?: boolean): void;
    deselect(suppressSelectedEvent?: boolean): void;
    parentView(): NetworkLogViewInterface;
    hovered(): boolean;
    showingInitiatorChain(): boolean;
    nodeSelfHeight(): number;
    setHovered(hovered: boolean, showInitiatorChain: boolean): void;
    showingInitiatorChainChanged(): void;
    isOnInitiatorPath(): boolean;
    isOnInitiatedPath(): boolean;
    request(): SDK.NetworkRequest.NetworkRequest | null;
    isNavigationRequest(): boolean;
    clearFlatNodes(): void;
    requestOrFirstKnownChildRequest(): SDK.NetworkRequest.NetworkRequest | null;
}
export declare const _backgroundColors: Record<string, string>;
export declare class NetworkRequestNode extends NetworkNode {
    #private;
    private initiatorCell;
    private requestInternal;
    private readonly isNavigationRequestInternal;
    selectable: boolean;
    private isOnInitiatorPathInternal;
    private isOnInitiatedPathInternal;
    private linkifiedInitiatorAnchor?;
    constructor(parentView: NetworkLogViewInterface, request: SDK.NetworkRequest.NetworkRequest);
    static NameComparator(a: NetworkNode, b: NetworkNode): number;
    static RemoteAddressComparator(a: NetworkNode, b: NetworkNode): number;
    static SizeComparator(a: NetworkNode, b: NetworkNode): number;
    static TypeComparator(a: NetworkNode, b: NetworkNode): number;
    static InitiatorComparator(a: NetworkNode, b: NetworkNode): number;
    static InitiatorAddressSpaceComparator(a: NetworkNode, b: NetworkNode): number;
    static RemoteAddressSpaceComparator(a: NetworkNode, b: NetworkNode): number;
    static RequestCookiesCountComparator(a: NetworkNode, b: NetworkNode): number;
    static ResponseCookiesCountComparator(a: NetworkNode, b: NetworkNode): number;
    static PriorityComparator(a: NetworkNode, b: NetworkNode): number;
    static IsAdRelatedComparator(a: NetworkNode, b: NetworkNode): number;
    static RenderBlockingComparator(a: NetworkNode, b: NetworkNode): number;
    static RequestPropertyComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number;
    static RequestURLComparator(a: NetworkNode, b: NetworkNode): number;
    static HeaderStringComparator(getHeaderValue: (request: SDK.NetworkRequest.NetworkRequest, propertyName: string) => string | undefined, propertyName: string, a: NetworkNode, b: NetworkNode): number;
    static readonly ResponseHeaderStringComparator: (propertyName: string, a: NetworkNode, b: NetworkNode) => number;
    static readonly RequestHeaderStringComparator: (propertyName: string, a: NetworkNode, b: NetworkNode) => number;
    static ResponseHeaderNumberComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number;
    static ResponseHeaderDateComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number;
    showingInitiatorChainChanged(): void;
    private setIsOnInitiatorPath;
    isOnInitiatorPath(): boolean;
    private setIsOnInitiatedPath;
    isOnInitiatedPath(): boolean;
    displayType(): string;
    displayName(): string;
    request(): SDK.NetworkRequest.NetworkRequest;
    isNavigationRequest(): boolean;
    nodeSelfHeight(): number;
    private isPrefetch;
    throttlingConditions(): SDK.NetworkManager.AppliedNetworkConditions | undefined;
    isWarning(): boolean;
    isError(): boolean;
    createCells(trElement: HTMLElement): void;
    private setTextAndTitle;
    private setTextAndTitleAsLink;
    renderCell(c: Element, columnId: string): void;
    private arrayLength;
    select(suppressSelectedEvent?: boolean): void;
    private openInNewTab;
    private isFailed;
    private renderPrimaryCell;
    private renderStatusCell;
    private renderProtocolCell;
    private renderRenderBlockingCell;
    private renderInitiatorCell;
    private renderAddressSpaceCell;
    private renderSizeCell;
    private renderTimeCell;
    private appendSubtitle;
    private createAiButtonIfAvailable;
}
export declare class NetworkGroupNode extends NetworkNode {
    createCells(element: Element): void;
    renderCell(c: Element, columnId: string): void;
    select(suppressSelectedEvent?: boolean): void;
}
