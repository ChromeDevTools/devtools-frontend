import '../../../components/highlighting/highlighting.js';
import * as UI from '../../legacy.js';
interface ViewInput {
    onExpand(node: XMLTreeViewNode, expanded: boolean): void;
    xml: XMLTreeViewNode;
    search: UI.TreeOutline.TreeSearch<XMLTreeViewNode, SearchResult> | undefined;
    jumpToNextSearchResult: SearchResult | undefined;
}
export type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export declare const DEFAULT_VIEW: View;
export declare class XMLTreeViewNode {
    #private;
    readonly node: Node | ParentNode;
    expanded: boolean;
    constructor(node: Node | ParentNode);
    children(): XMLTreeViewNode[];
    match(regex: RegExp, closeTag: boolean): RegExpStringIterator<RegExpExecArray>;
}
export declare class XMLTreeViewModel {
    readonly xmlDocument: Document;
    readonly root: XMLTreeViewNode;
    constructor(parsedXML: Document);
}
interface SearchResult extends UI.TreeOutline.TreeSearchResult<XMLTreeViewNode> {
    match: RegExpExecArray;
}
export declare class XMLView extends UI.Widget.Widget implements UI.SearchableView.Searchable {
    #private;
    private searchableView;
    constructor(target?: HTMLElement, view?: View);
    set parsedXML(parsedXML: Document);
    performUpdate(): void;
    static createSearchableView(parsedXML: Document): UI.SearchableView.SearchableView;
    static parseXML(text: string, mimeType: string): Document | null;
    onSearchCanceled(): void;
    performSearch(searchConfig: UI.SearchableView.SearchConfig, shouldJump: boolean, jumpBackwards?: boolean): void;
    jumpToNextSearchResult(): void;
    jumpToPreviousSearchResult(): void;
    supportsCaseSensitiveSearch(): boolean;
    supportsWholeWordSearch(): boolean;
    supportsRegexSearch(): boolean;
}
export {};
