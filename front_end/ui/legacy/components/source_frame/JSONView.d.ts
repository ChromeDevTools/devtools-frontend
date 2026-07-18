import * as UI from '../../legacy.js';
import * as ObjectUI from '../object_ui/object_ui.js';
export interface ViewInput {
    objectTree: ObjectUI.ObjectPropertiesSection.ObjectTree;
    parsedJSON: ParsedJSON;
}
export type ViewOutput = undefined;
declare const DEFAULT_VIEW: (input: ViewInput, _output: ViewOutput, target: HTMLElement) => void;
type View = typeof DEFAULT_VIEW;
export declare class JSONView extends UI.Widget.VBox implements UI.SearchableView.Searchable {
    #private;
    private readonly startCollapsed;
    private searchableView;
    private objectTree;
    private readonly search;
    private readonly view;
    constructor(parsedJSON: ParsedJSON, startCollapsed?: boolean, element?: HTMLElement, view?: View);
    static createView(content: string): Promise<UI.SearchableView.SearchableView | null>;
    static createViewSync(obj: Object | null, element?: HTMLElement): UI.SearchableView.SearchableView;
    set parsedJSON(parsedJSON: ParsedJSON);
    setSearchableView(searchableView: UI.SearchableView.SearchableView): void;
    private static parseJSON;
    private static extractJSON;
    private static findBrackets;
    wasShown(): void;
    private initialize;
    performUpdate(): void;
    private jumpToMatch;
    onSearchCanceled(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
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
    set jsonObject(obj: Object | null | undefined);
}
export {};
