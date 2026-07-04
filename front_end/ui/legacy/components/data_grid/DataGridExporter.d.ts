import type { DataGridImpl } from './DataGrid.js';
/**
 * Exports the visual contents of a DataGrid as a GitHub Flavored Markdown table.
 */
export declare function exportToMarkdown(dataGrid: DataGridImpl<unknown>): string;
export declare function exportToCSV(dataGrid: DataGridImpl<unknown>): string;
