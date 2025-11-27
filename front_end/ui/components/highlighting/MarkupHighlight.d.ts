import * as TextUtils from '../../../models/text_utils/text_utils.js';
export declare const highlightedSearchResultClassName = "highlighted-search-result";
export declare const highlightedCurrentSearchResultClassName = "current-search-result";
export interface HighlightChange {
    node: Element | Text;
    type: string;
    oldText?: string;
    newText?: string;
    nextSibling?: Node;
    parent?: Node;
}
export declare function highlightRangesWithStyleClass(element: Element, resultRanges: TextUtils.TextRange.SourceRange[], styleClass: string, changes?: HighlightChange[]): Element[];
export declare function revertDomChanges(domChanges: HighlightChange[]): void;
