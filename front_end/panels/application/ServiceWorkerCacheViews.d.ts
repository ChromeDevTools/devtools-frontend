import '../../ui/legacy/legacy.js';
import '../../ui/legacy/components/data_grid/data_grid.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
export interface CacheEntry {
    entry: Protocol.CacheStorage.DataEntry;
    request: SDK.NetworkRequest.NetworkRequest;
}
export interface ViewInput {
    entries: CacheEntry[];
    selectedRequest: SDK.NetworkRequest.NetworkRequest | null;
    refreshEnabled: boolean;
    entryPathFilter: string;
    returnCount: number | null;
    bucketInfo?: Protocol.Storage.StorageBucketInfo | null;
    storageKey?: string;
    onRefresh: () => void;
    onDeleteSelected: () => void;
    onFilterChanged: (filter: string) => void;
    onSelect: (request: SDK.NetworkRequest.NetworkRequest | null) => void;
    onDelete: (request: SDK.NetworkRequest.NetworkRequest) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class ServiceWorkerCacheView extends UI.View.SimpleView {
    #private;
    private model;
    protected entriesForTest: Protocol.CacheStorage.DataEntry[] | null;
    private cache;
    private entryPathFilter;
    private returnCount;
    constructor(model: SDK.ServiceWorkerCacheModel.ServiceWorkerCacheModel, cache: SDK.ServiceWorkerCacheModel.Cache, view?: View);
    wasShown(): void;
    willHide(): void;
    update(cache?: SDK.ServiceWorkerCacheModel.Cache | null): void;
    performUpdate(): void;
    private updateDataCallback;
    private updateData;
    private createRequest;
    private requestContent;
    private updatedForTest;
}
export interface RequestViewInput {
    request: SDK.NetworkRequest.NetworkRequest;
    selectedTabId: string;
    onTabSelected: (tabId: string, isUserGesture: boolean) => void;
}
export type RequestViewFunction = (input: RequestViewInput, output: undefined, target: HTMLElement) => void;
export declare const REQUEST_VIEW_DEFAULT_VIEW: RequestViewFunction;
export declare class RequestView extends UI.Widget.VBox {
    #private;
    constructor(requestOrElement?: SDK.NetworkRequest.NetworkRequest | HTMLElement, view?: RequestViewFunction);
    set request(request: SDK.NetworkRequest.NetworkRequest);
    wasShown(): void;
    performUpdate(): void;
}
