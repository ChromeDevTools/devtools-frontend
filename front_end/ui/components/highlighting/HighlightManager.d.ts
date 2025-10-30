import type * as TextUtils from '../../../models/text_utils/text_utils.js';
export declare class RangeWalker {
    #private;
    readonly root: Node;
    constructor(root: Node);
    nextRange(start: number, length: number): Range | null;
    goToTextNode(node: Text): void;
    get offset(): number;
}
export declare const HIGHLIGHT_REGISTRY = "highlighted-search-result";
export declare const CURRENT_HIGHLIGHT_REGISTRY = "current-search-result";
export declare class HighlightManager {
    #private;
    constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    } | undefined): HighlightManager;
    addHighlights(ranges: Range[]): void;
    removeHighlights(ranges: Range[]): void;
    addCurrentHighlight(range: Range): void;
    addCurrentHighlights(ranges: Range[]): void;
    addHighlight(range: Range): void;
    removeHighlight(range: Range): void;
    highlightOrderedTextRanges(root: Node, sourceRanges: TextUtils.TextRange.SourceRange[], isCurrent?: boolean): Range[];
    apply(node: Node): void;
    set(element: Node, ranges: TextUtils.TextRange.SourceRange[], currentRange: TextUtils.TextRange.SourceRange | undefined): void;
}
