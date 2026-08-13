import '../../ui/legacy/legacy.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as UI from '../../ui/legacy/legacy.js';
export declare class ServiceWorkerCacheView extends UI.View.SimpleView {
    private model;
    protected entriesForTest: Protocol.CacheStorage.DataEntry[] | null;
    private readonly splitWidget;
    private readonly previewPanel;
    private preview;
    private cache;
    private dataGrid;
    private readonly refreshThrottler;
    private readonly refreshButton;
    private readonly deleteSelectedButton;
    private entryPathFilter;
    private returnCount;
    private summaryBarElement;
    private loadingPromise;
    private readonly metadataView;
    constructor(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache);
    private resetDataGrid;
    wasShown(): void;
    willHide(): void;
    private showPreview;
    private createDataGrid;
    private sortingChanged;
    private deleteButtonClicked;
    update(cache?: SDK.ServiceWorkerCacheModel.Cache | null): void;
    private updateSummaryBar;
    private updateDataCallback;
    private updateData;
    private refreshButtonClicked;
    private cacheContentUpdated;
    private previewCachedResponse;
    private createRequest;
    private requestContent;
    private updatedForTest;
}
export declare class DataGridNode extends DataGrid.DataGrid.DataGridNode<DataGridNode> {
    private number;
    name: string;
    private request;
    responseType: Protocol.CacheStorage.CachedResponseType;
    varyHeader: string;
    constructor(number: number, request: SDK.NetworkRequest.NetworkRequest, responseType: Protocol.CacheStorage.CachedResponseType);
    createCell(columnId: string): HTMLElement;
}
export declare class RequestView extends UI.Widget.VBox {
    private tabbedPane;
    private resourceViewTabSetting;
    constructor(request: SDK.NetworkRequest.NetworkRequest);
    wasShown(): void;
    private selectTab;
    private tabSelected;
}
