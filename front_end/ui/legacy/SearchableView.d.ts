import './Toolbar.js';
import { VBox } from './Widget.js';
export declare class SearchableView extends VBox {
    protected searchProvider: Searchable;
    private replaceProvider;
    private setting;
    private replaceable;
    private readonly footerElementContainer;
    private readonly footerElement;
    private replaceToggleButton;
    private searchInputElement;
    private matchesElement;
    private matchesElementValue;
    private searchNavigationPrevElement;
    private searchNavigationNextElement;
    private readonly replaceInputElement;
    private caseSensitiveButton;
    private wholeWordButton;
    private regexButton;
    private replaceButtonElement;
    private replaceAllButtonElement;
    private minimalSearchQuerySize;
    private searchIsVisible?;
    private currentQuery?;
    private valueChangedTimeoutId?;
    constructor(searchable: Searchable, replaceable: Replaceable | null, settingName?: string, element?: HTMLElement);
    static fromElement(element: Element | null): SearchableView | null;
    private toggleReplace;
    private saveSetting;
    private loadSetting;
    setMinimalSearchQuerySize(minimalSearchQuerySize: number): void;
    setPlaceholder(placeholder: string, ariaLabel?: string): void;
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
    private updateSearchNavigationButtonState;
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
export interface Searchable {
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
