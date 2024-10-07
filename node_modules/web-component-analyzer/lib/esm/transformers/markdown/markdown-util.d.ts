import { TransformerConfig } from "../transformer-config";
/**
 * Returns a markdown header with a specific level taking global start title level into account.
 * @param title
 * @param level
 * @param config
 */
export declare function markdownHeader(title: string, level: number, config: TransformerConfig): string;
/**
 * Returns a markdown table representation of the rows.
 * Strips unused columns.
 * @param rows
 * @param removeEmptyColumns
 */
export declare function markdownTable(rows: string[][], { removeEmptyColumns }?: {
    removeEmptyColumns: boolean;
}): string;
/**
 * Escape a text so it can be used in a markdown table
 * @param text
 */
export declare function markdownEscapeTableCell(text: string): string;
/**
 * Highlights some text
 * @param text
 */
export declare function markdownHighlight(text: string | undefined): string;
/**
 * Creates padding around some text with a target width.
 * @param text
 * @param width
 * @param paddingStart
 */
export declare function fillWidth(text: string, width: number, paddingStart: number): string;
//# sourceMappingURL=markdown-util.d.ts.map