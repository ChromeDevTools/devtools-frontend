import type * as Common from '../../core/common/common.js';
import type * as SDK from '../../core/sdk/sdk.js';
import type * as Logs from '../../models/logs/logs.js';
import type * as Workspace from '../../models/workspace/workspace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as Search from '../search/search.js';
export declare class NetworkSearchScope implements Search.SearchScope.SearchScope {
    #private;
    constructor(networkLog: Logs.NetworkLog.NetworkLog);
    performIndexing(progress: Common.Progress.Progress): void;
    performSearch(searchConfig: Workspace.SearchConfig.SearchConfig, progress: Common.Progress.Progress, searchResultCallback: (arg0: Search.SearchScope.SearchResult) => void, searchFinishedCallback: (arg0: boolean) => void): Promise<void>;
    private searchRequest;
    stopSearch(): void;
}
export declare class NetworkSearchResult implements Search.SearchScope.SearchResult {
    private readonly request;
    private readonly locations;
    constructor(request: SDK.NetworkRequest.NetworkRequest, locations: NetworkForward.UIRequestLocation.UIRequestLocation[]);
    matchesCount(): number;
    label(): string;
    description(): string;
    matchLineContent(index: number): string;
    matchRevealable(index: number): Object;
    matchLabel(index: number): string;
    matchColumn(index: number): number | undefined;
    matchLength(index: number): number | undefined;
}
