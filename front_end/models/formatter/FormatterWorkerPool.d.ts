import * as FormatterActions from '../../entrypoints/formatter_worker/FormatterActions.js';
export { DefinitionKind, ScopeKind, type ScopeTreeNode } from '../../entrypoints/formatter_worker/FormatterActions.js';
export declare class FormatterWorkerPool {
    private taskQueue;
    private workerTasks;
    constructor();
    static instance(): FormatterWorkerPool;
    dispose(): void;
    static removeInstance(): void;
    private createWorker;
    private processNextTask;
    private onWorkerMessage;
    private onWorkerError;
    private runChunkedTask;
    private runTask;
    format(mimeType: string, content: string, indentString: string): Promise<FormatterActions.FormatResult>;
    javaScriptSubstitute(expression: string, mapping: Map<string, string | null>): Promise<string>;
    javaScriptScopeTree(expression: string, sourceType?: 'module' | 'script'): Promise<FormatterActions.ScopeTreeNode | null>;
    parseCSS(content: string, callback: (arg0: boolean, arg1: CSSRule[]) => void): void;
}
interface CSSProperty {
    name: string;
    nameRange: TextRange;
    value: string;
    valueRange: TextRange;
    range: TextRange;
    disabled?: boolean;
}
export declare function formatterWorkerPool(): FormatterWorkerPool;
export interface OutlineItem {
    line: number;
    column: number;
    title: string;
    subtitle?: string;
}
export interface CSSStyleRule {
    selectorText: string;
    styleRange: TextRange;
    lineNumber: number;
    columnNumber: number;
    properties: CSSProperty[];
}
export interface CSSAtRule {
    atRule: string;
    lineNumber: number;
    columnNumber: number;
}
export type CSSRule = CSSStyleRule | CSSAtRule;
export interface TextRange {
    startLine: number;
    startColumn: number;
    endLine: number;
    endColumn: number;
}
