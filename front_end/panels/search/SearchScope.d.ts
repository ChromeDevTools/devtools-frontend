import type * as Common from '../../core/common/common.js';
import type * as Workspace from '../../models/workspace/workspace.js';
export interface SearchResult {
    label(): string;
    description(): string;
    matchesCount(): number;
    matchLabel(index: number): string;
    matchLineContent(index: number): string;
    matchRevealable(index: number): Object;
    matchColumn(index: number): number | undefined;
    matchLength(index: number): number | undefined;
}
export interface SearchScope {
    performSearch(searchConfig: Workspace.SearchConfig.SearchConfig, progress: Common.Progress.Progress, searchResultCallback: (arg0: SearchResult) => void, searchFinishedCallback: (arg0: boolean) => void): void | Promise<void>;
    performIndexing(progress: Common.Progress.Progress): void;
    stopSearch(): void;
}
