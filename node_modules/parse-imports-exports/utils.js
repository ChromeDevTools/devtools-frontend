/**
 * Adds some parse error to parse results.
 */
export const addError = (importsExports, message, start, end) => {
    const { source } = importsExports[CONTEXT_KEY];
    var { errors } = importsExports;
    errors !== null && errors !== void 0 ? errors : (errors = importsExports.errors = { __proto__: null });
    const additionalOffset = end !== undefined && end < start + 2 ? 100 : 0;
    const fullMessage = end === undefined
        ? message
        : `${message}:\n${source.slice(start, Math.min(end + additionalOffset, start + 200))}`;
    const lineColumn = getLineColumnByIndex(importsExports, start);
    const currentError = errors[lineColumn];
    errors[lineColumn] = currentError === undefined ? fullMessage : `${currentError}\n${fullMessage}`;
};
/**
 * Internal key for `Context` in `MutableImportsExports`.
 */
export const CONTEXT_KEY = Symbol.for('parse-imports-exports:context-key');
export { createParseFunction } from 'parse-statements';
/**
 * Get key for cache of parse functions by options.
 */
export const getCacheKey = (options) => {
    if (options === undefined) {
        return '';
    }
    var cacheKey = '';
    if (options.ignoreCommonJsExports === true) {
        cacheKey += 'ignoreCommonJsExports';
    }
    if (options.ignoreDynamicImports === true) {
        cacheKey += 'ignoreDynamicImports';
    }
    if (options.ignoreRegexpLiterals === true) {
        cacheKey += 'ignoreRegexpLiterals';
    }
    if (options.ignoreRequires === true) {
        cacheKey += 'ignoreRequires';
    }
    if (options.ignoreStringLiterals === true) {
        cacheKey += 'ignoreStringLiterals';
    }
    return cacheKey;
};
/**
 * Get position object by start and end indexes.
 */
export const getPosition = (importsExports, start, end) => {
    var _a;
    return ((_a = importsExports[CONTEXT_KEY].options) === null || _a === void 0 ? void 0 : _a.includeLineColumn)
        ? {
            start,
            startLineColumn: getLineColumnByIndex(importsExports, start),
            end,
            endLineColumn: getLineColumnByIndex(importsExports, end),
        }
        : { start, end };
};
/**
 * Removes errors, caused by function overloading.
 * Re-declarations when overloading functions are not an error, so we remove them.
 */
export const removeErrorsCausedByOverloading = (importsExports) => {
    const { errors } = importsExports;
    if (errors === undefined) {
        return;
    }
    var previousError;
    var previousLineColumn;
    for (const lineColumn of Object.keys(errors)) {
        const error = errors[lineColumn];
        if ((error.startsWith('Duplicate exported declaration `function') ||
            error.startsWith('Duplicate exported declaration `async function') ||
            error.startsWith('Duplicate exported declaration `declare function')) &&
            error.split(':')[0] === (previousError === null || previousError === void 0 ? void 0 : previousError.split(':')[0])) {
            delete errors[previousLineColumn];
            delete errors[lineColumn];
        }
        previousError = error;
        previousLineColumn = lineColumn;
    }
    if (Object.keys(errors).length === 0) {
        importsExports.errors = undefined;
    }
};
/**
 * Regexp that find all spaces.
 */
export const spacesRegExp = /\s+/g;
/**
 * Strips comments from string interval from source.
 */
export const stripComments = (source, intervalStart, intervalEnd, comments) => {
    if (comments === undefined) {
        return source.slice(intervalStart, intervalEnd);
    }
    var currentStart = intervalStart;
    const parts = [];
    for (const [{ start }, { end }] of comments) {
        parts.push(source.slice(currentStart, start));
        currentStart = end;
    }
    parts.push(source.slice(currentStart, intervalEnd));
    return parts.join('');
};
/**
 * Get `LineColumn` string by index in source.
 */
const getLineColumnByIndex = ({ [CONTEXT_KEY]: context }, index) => {
    var { lineColumnCache, linesIndexes } = context;
    lineColumnCache !== null && lineColumnCache !== void 0 ? lineColumnCache : (lineColumnCache = context.lineColumnCache = { __proto__: null });
    var lineColumn = lineColumnCache[index];
    if (lineColumn !== undefined) {
        return lineColumn;
    }
    linesIndexes !== null && linesIndexes !== void 0 ? linesIndexes : (linesIndexes = context.linesIndexes = getLinesIndexes(context.source));
    const numberOfLine = getNumberOfLine(index, linesIndexes);
    const line = numberOfLine + 1;
    const column = index - linesIndexes[numberOfLine] + 1;
    lineColumn = `${line}:${column}`;
    lineColumnCache[index] = lineColumn;
    return lineColumn;
};
/**
 * Get number of line where in which the character with the specified index is located.
 */
const getNumberOfLine = (index, linesIndexes) => {
    const { length } = linesIndexes;
    if (index >= linesIndexes[length - 1]) {
        return length - 1;
    }
    var min = 0;
    var max = length - 2;
    while (min < max) {
        var middle = min + ((max - min) >> 1);
        if (index < linesIndexes[middle]) {
            max = middle - 1;
        }
        else if (index >= linesIndexes[middle + 1]) {
            min = middle + 1;
        }
        else {
            min = middle;
            break;
        }
    }
    return min;
};
/**
 * Get array of indexes of lines first symbols in source.
 */
const getLinesIndexes = (source) => {
    var index = 0;
    const lines = source.split('\n');
    const indexes = new Array(lines.length);
    for (var lineNumber = 0; lineNumber < lines.length; lineNumber += 1) {
        indexes[lineNumber] = index;
        index += lines[lineNumber].length + 1;
    }
    return indexes;
};
