import * as Diff from '../../../third_party/diff/diff.js';
interface Token {
    text: string;
    className: string;
}
interface Row {
    originalLineNumber: number;
    currentLineNumber: number;
    tokens: Token[];
    type: RowType;
}
export declare const enum RowType {
    DELETION = "deletion",
    ADDITION = "addition",
    EQUAL = "equal",
    SPACER = "spacer"
}
export declare function buildDiffRows(diff: Diff.Diff.DiffArray): {
    originalLines: readonly string[];
    currentLines: readonly string[];
    rows: readonly Row[];
};
declare global {
    interface HTMLElementTagNameMap {
        'devtools-diff-view': DiffView;
    }
}
export interface DiffViewData {
    diff: Diff.Diff.DiffArray;
    mimeType: string;
}
export declare class DiffView extends HTMLElement {
    #private;
    loaded: Promise<void>;
    constructor(data?: DiffViewData);
    set data(data: DiffViewData);
}
export {};
