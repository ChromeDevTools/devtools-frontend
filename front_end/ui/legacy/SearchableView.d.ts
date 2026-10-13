import './Toolbar.js';
import { VBox } from './Widget.js';
export interface ViewInput {
    searchIsVisible: boolean;
    replaceable: boolean;
    secondRowVisible: boolean;
    placeholder: string;
    searchAriaLabel?: string;
    supportsCaseSensitive: boolean;
    caseSensitiveToggled: boolean;
    supportsWholeWord: boolean;
    wholeWordToggled: boolean;
    supportsRegex: boolean;
    regexToggled: boolean;
    matchesText: string;
    matchesAriaLabel: string;
    navEnabled: boolean;
    replaceEnabled: boolean;
    onToggleReplace: () => void;
    onSearchKeyDown: (event: KeyboardEvent) => void;
    onSearchInput: () => void;
    onClearSearchInput: () => void;
    onReplaceKeyDown: (event: KeyboardEvent) => void;
    onClearReplaceInput: () => void;
    onToggleCaseSensitive: () => void;
    onToggleWholeWord: () => void;
    onToggleRegex: () => void;
    onPrevClick: () => void;
    onNextClick: () => void;
    onCloseClick: () => void;
    onReplaceClick: () => void;
    onReplaceAllClick: () => void;
}
export interface ViewOutput {
    searchInputElement?: HTMLInputElement;
    replaceInputElement?: HTMLInputElement;
    footerElementContainer?: HTMLElement;
}
export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class SearchableView extends VBox implements SearchResultsListener {
    #private;
    replaceProvider: Replaceable | null;
    minimalSearchQuerySize: number;
    private searchIsVisible?;
    private currentQuery?;
    private valueChangedTimeoutId?;
    constructor(element?: HTMLElement, view?: View);
    constructor(searchable: Searchable, replaceable: Replaceable | null, settingName?: string, element?: HTMLElement, view?: View);
    private get footerElementContainer();
    private get searchInputElement();
    private get replaceInputElement();
    performUpdate(): void;
    get searchProvider(): Searchable;
    set searchProvider(searchable: Searchable);
    get searchTarget(): SearchTarget | null;
    set searchTarget(target: SearchTarget | null);
    set settingName(settingName: string | undefined);
    get replaceable(): boolean;
    set replaceable(replaceable: boolean);
    static fromElement(element: Element | null): SearchableView | null;
    private toggleReplace;
    setMinimalSearchQuerySize(minimalSearchQuerySize: number): void;
    setPlaceholder(placeholder: string, ariaLabel?: string): void;
    get placeholder(): string;
    set placeholder(placeholder: string);
    setReplaceable(replaceable: boolean): void;
    updateSearchMatchesCount(matches: number): void;
    updateCurrentMatchIndex(currentMatchIndex: number): void;
    closeSearch(): void;
    private toggleSearchBar;
    cancelSearch(): void;
    resetSearch(): void;
    refreshSearch(): void;
    handleFindNextShortcut(): boolean;
    handleFindPreviousShortcut(): boolean;
    handleFindShortcut(): boolean;
    handleCancelSearchShortcut(): boolean;
    private updateSearchMatchesCountAndCurrentMatchIndex;
    showSearchField(): void;
    private updateReplaceVisibility;
    private onSearchKeyDown;
    private onReplaceKeyDown;
    private jumpToNextSearchResult;
    private onNextButtonSearch;
    private onPrevButtonSearch;
    private clearSearch;
    private performSearch;
    private currentSearchConfig;
    private updateSecondRowVisibility;
    private replace;
    private replaceAll;
    private onInput;
    private onValueChanged;
}
export interface SearchResultsListener {
    updateSearchMatchesCount(matches: number): void;
    updateCurrentMatchIndex(currentMatchIndex: number): void;
}
export interface SearchTarget {
    setSearchableView?(view: SearchResultsListener | null): void;
}
export interface Searchable {
    supportsMatchCounts?(): boolean;
    currentQuery?: string;
    currentSearchMatches?: number;
    onSearchCanceled(): void;
    onSearchClosed?: () => void;
    performSearch(searchConfig: SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
}
export interface Replaceable {
    replaceSelectionWith(searchConfig: SearchConfig, replacement: string): void;
    replaceAllWith(searchConfig: SearchConfig, replacement: string): void;
}
export interface SearchRegexResult {
    regex: RegExp;
    fromQuery: boolean;
}
export declare class SearchConfig {
    query: string;
    caseSensitive: boolean;
    wholeWord: boolean;
    isRegex: boolean;
    constructor(query: string, caseSensitive: boolean, wholeWord: boolean, isRegex: boolean);
    toSearchRegex(global?: boolean): SearchRegexResult;
}
