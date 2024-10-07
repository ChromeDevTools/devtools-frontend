"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.markdownTable = exports.markdownHeader = exports.markdownHighlight = void 0;
/**
 * Highlights some text
 * @param text
 */
function markdownHighlight(text) {
    return "`".concat(text, "`");
}
exports.markdownHighlight = markdownHighlight;
/**
 * Returns a markdown header with a specific level
 * @param level
 * @param title
 */
function markdownHeader(level, title) {
    return "".concat("#".repeat(level), " ").concat(title);
}
exports.markdownHeader = markdownHeader;
var DEFAULT_MARKDOWN_TABLE_OPTIONS = {
    removeEmptyColumns: true,
    minCellWidth: 3,
    maxCellWidth: 50,
    cellPadding: 1
};
/**
 * Returns a markdown table representation of the rows.
 * Strips unused columns.
 * @param rows
 * @param options
 */
function markdownTable(rows, options) {
    if (options === void 0) { options = {}; }
    // Constants for pretty printing the markdown tables
    var MIN_CELL_WIDTH = options.minCellWidth || DEFAULT_MARKDOWN_TABLE_OPTIONS.minCellWidth;
    var MAX_CELL_WIDTH = options.maxCellWidth || DEFAULT_MARKDOWN_TABLE_OPTIONS.maxCellWidth;
    var CELL_PADDING = options.cellPadding || DEFAULT_MARKDOWN_TABLE_OPTIONS.cellPadding;
    // Count the number of columns
    var columnCount = Math.max.apply(Math, __spreadArray([], __read(rows.map(function (r) { return r.length; })), false));
    if (options.removeEmptyColumns) {
        // Create a boolean array where each entry tells if a column is used or not (excluding the header)
        var emptyColumns_1 = Array(columnCount)
            .fill(false)
            .map(function (b, i) { return i !== 0 && rows.slice(1).find(function (r) { return r[i] != null && r[i].length > 0; }) == null; });
        // Remove unused columns if necessary
        if (emptyColumns_1.includes(true)) {
            // Filter out the unused columns in each row
            rows = rows.map(function (row) { return row.filter(function (column, i) { return !emptyColumns_1[i]; }); });
            // Adjust the column count
            columnCount = Math.max.apply(Math, __spreadArray([], __read(rows.map(function (r) { return r.length; })), false));
        }
    }
    // Escape all cells in the markdown output
    rows = rows.map(function (r) { return r.map(markdownEscapeTableCell); });
    // Create a boolean array where each entry corresponds to the preferred column width.
    // This is done by taking the largest width of all cells in each column.
    var columnWidths = Array(columnCount)
        .fill(0)
        .map(function (c, i) { return Math.min(MAX_CELL_WIDTH, Math.max.apply(Math, __spreadArray([MIN_CELL_WIDTH], __read(rows.map(function (r) { return (r[i] || "").length; })), false)) + CELL_PADDING * 2); });
    // Build up the table
    return "\n|".concat(rows[0].map(function (r, i) { return fillWidth(r, columnWidths[i], CELL_PADDING); }).join("|"), "|\n|").concat(columnWidths.map(function (c) { return "-".repeat(c); }).join("|"), "|\n").concat(rows
        .slice(1)
        .map(function (r) { return "|".concat(r.map(function (r, i) { return fillWidth(r, columnWidths[i], CELL_PADDING); }).join("|"), "|"); })
        .join("\n"), "\n");
}
exports.markdownTable = markdownTable;
/**
 * Escape a text so it can be used in a markdown table
 * @param text
 */
function markdownEscapeTableCell(text) {
    return (text
        // Change newlines
        .replace(/\n/g, "<br />")
        // Change "@property" to "`@property`" (so eg. Github doesn't treat it as tagging a user)
        .replace(/(@\S+)/g, "`$1`")
        // Escape |, < and >
        .replace(/([|<>])/g, "\\$1"));
}
/**
 * Creates padding around some text with a target width.
 * @param text
 * @param width
 * @param paddingStart
 */
function fillWidth(text, width, paddingStart) {
    return " ".repeat(paddingStart) + text + " ".repeat(Math.max(1, width - text.length - paddingStart));
}
