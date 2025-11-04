import * as Common from '../../core/common/common.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Workspace from '../../models/workspace/workspace.js';
import type * as Search from '../search/search.js';
export declare class SourcesSearchScope implements Search.SearchScope.SearchScope {
    private searchId;
    private searchResultCandidates;
    private searchResultCallback;
    private searchFinishedCallback;
    private searchConfig;
    constructor();
    private static filesComparator;
    private static urlComparator;
    performIndexing(progress: Common.Progress.Progress): void;
    private projects;
    performSearch(searchConfig: Workspace.SearchConfig.SearchConfig, progress: Common.Progress.Progress, searchResultCallback: (arg0: Search.SearchScope.SearchResult) => void, searchFinishedCallback: (arg0: boolean) => void): void;
    private projectFilesMatchingFileQuery;
    private processMatchingFilesForProject;
    private processMatchingFiles;
    stopSearch(): void;
}
export declare class FileBasedSearchResult implements Search.SearchScope.SearchResult {
    private readonly uiSourceCode;
    private readonly searchMatches;
    constructor(uiSourceCode: Workspace.UISourceCode.UISourceCode, searchMatches: TextUtils.ContentProvider.SearchMatch[]);
    label(): string;
    description(): string;
    matchesCount(): number;
    matchLineContent(index: number): string;
    matchRevealable(index: number): Object;
    matchLabel(index: number): string;
    matchColumn(index: number): number;
    matchLength(index: number): number;
}
