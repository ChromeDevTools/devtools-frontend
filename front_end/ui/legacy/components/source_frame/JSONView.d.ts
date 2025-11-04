import * as UI from '../../legacy.js';
export declare class JSONView extends UI.Widget.VBox implements UI.SearchableView.Searchable {
    private initialized;
    private readonly parsedJSON;
    private startCollapsed;
    private searchableView;
    private treeOutline;
    private currentSearchFocusIndex;
    private currentSearchTreeElements;
    private searchRegex;
    constructor(parsedJSON: ParsedJSON, startCollapsed?: boolean);
    static createView(content: string): Promise<UI.SearchableView.SearchableView | null>;
    static createViewSync(obj: Object | null, element?: HTMLElement): UI.SearchableView.SearchableView;
    setSearchableView(searchableView: UI.SearchableView.SearchableView): void;
    private static parseJSON;
    private static extractJSON;
    private static findBrackets;
    wasShown(): void;
    private initialize;
    private jumpToMatch;
    private updateSearchCount;
    private updateSearchIndex;
    onSearchCanceled(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, _shouldJump: boolean, jumpBackwards?: boolean): void;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
}
export declare class ParsedJSON<T extends unknown = unknown> {
    data: T;
    prefix: string;
    suffix: string;
    constructor(data: T, prefix: string, suffix: string);
}
export declare class SearchableJsonView extends UI.SearchableView.SearchableView {
    #private;
    constructor(element: HTMLElement);
    set jsonObject(obj: Object);
}
