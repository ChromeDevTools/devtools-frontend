import '../../ui/legacy/legacy.js';
import '../../ui/components/icon_button/icon_button.js';
import * as Common from '../../core/common/common.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as UI from '../../ui/legacy/legacy.js';
import type { SearchResult, SearchScope } from './SearchScope.js';
export interface SearchViewInput {
    query: string;
    matchCase: boolean;
    isRegex: boolean;
    searchConfig: Workspace.SearchConfig.SearchConfig | null;
    searchMessage: string;
    searchResultsMessage: string;
    searchResults: SearchResult[];
    progress: Common.Progress.Progress | null;
    onQueryChange: (query: string) => void;
    onQueryKeyDown: (evt: KeyboardEvent) => void;
    onPanelKeyDown: (evt: KeyboardEvent) => void;
    onClearSearchInput: () => void;
    onToggleRegex: () => void;
    onToggleMatchCase: () => void;
    onRefresh: () => void;
    onClearSearch: () => void;
}
export interface SearchViewOutput {
    focusSearchInput: () => void;
    showAllMatches: () => void;
    collapseAllResults: () => void;
}
export type View = (input: SearchViewInput, output: SearchViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SearchView extends UI.Widget.VBox {
    #private;
    constructor(settingKey: string, view?: View);
    performUpdate(): void;
    toggle(queryCandidate: string, searchImmediately?: boolean): void;
    createScope(): SearchScope;
    focus(): void;
    willHide(): void;
}
