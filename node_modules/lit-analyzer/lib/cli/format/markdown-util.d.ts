/**
 * Highlights some text
 * @param text
 */
export declare function markdownHighlight(text: string): string;
/**
 * Returns a markdown header with a specific level
 * @param level
 * @param title
 */
export declare function markdownHeader(level: number, title: string): string;
export interface MarkdownTableOptions {
    removeEmptyColumns: boolean;
    minCellWidth: number;
    maxCellWidth: number;
    cellPadding: number;
}
/**
 * Returns a markdown table representation of the rows.
 * Strips unused columns.
 * @param rows
 * @param options
 */
export declare function markdownTable(rows: string[][], options?: Partial<MarkdownTableOptions>): string;
//# sourceMappingURL=markdown-util.d.ts.map