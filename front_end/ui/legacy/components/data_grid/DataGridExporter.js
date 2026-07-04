// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * Exports the visual contents of a DataGrid as a GitHub Flavored Markdown table.
 */
export function exportToMarkdown(dataGrid) {
    const grid = serializeGrid(dataGrid, escapeMarkdown);
    if (grid.length === 0) {
        return '';
    }
    const header = '| ' + grid[0].join(' | ') + ' |';
    const separator = '| ' + grid[0].map(() => '---').join(' | ') + ' |';
    const body = grid.slice(1).map(row => '| ' + row.join(' | ') + ' |');
    return [header, separator, ...body].join('\n');
}
export function exportToCSV(dataGrid) {
    const grid = serializeGrid(dataGrid, escapeCSV);
    return grid.map(row => row.join(',')).join('\n');
}
function serializeGrid(dataGrid, cellEscaper) {
    const columns = dataGrid.visibleColumnsArray;
    if (columns.length === 0) {
        return [];
    }
    const rows = dataGrid.rootNode().children;
    const result = [];
    // Header
    result.push(columns.map(col => cellEscaper(String(col.title || ''))));
    // Body
    for (const row of rows) {
        result.push(columns.map(col => {
            const cellValue = row.data[col.id];
            const cellText = extractText(cellValue);
            return cellEscaper(cellText);
        }));
    }
    return result;
}
function extractText(value) {
    if (value instanceof Node) {
        return value.textContent || '';
    }
    if (value === undefined || value === null) {
        return '';
    }
    return String(value);
}
/**
 * Escapes a string so it can be safely rendered within a Markdown table cell.
 *
 * It performs three operations:
 * 1. HTML-escapes `<`, `>`, and `&` to prevent text from being parsed as raw HTML.
 * 2. Backslash-escapes Markdown control characters (e.g., `*`, `_`, `[`) to avoid unexpected formatting.
 * 3. Replaces newlines with `<br>` tags since Markdown tables do not support multiline cells.
 */
function escapeMarkdown(val) {
    return val.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/([\\`*_{}[\]()#+\-.!|])/g, '\\$1')
        .replace(/\r?\n/g, '<br>');
}
function escapeCSV(val) {
    let needQuotes = false;
    let escaped = val;
    if (escaped.includes('"')) {
        escaped = escaped.replace(/"/g, '""');
        needQuotes = true;
    }
    if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('\r')) {
        needQuotes = true;
    }
    if (needQuotes) {
        return `"${escaped}"`;
    }
    return escaped;
}
//# sourceMappingURL=DataGridExporter.js.map