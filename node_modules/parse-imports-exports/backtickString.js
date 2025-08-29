import { addError } from './utils.js';
/**
 * Adds error of parsing string literal started with backtick.
 */
export const onBacktickError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of string literal started with backtick', start, end);
/**
 * Parses string literal started with backtick.
 */
export const onBacktickParse = (importsExports, source, parsedToken) => {
    var depth = 0;
    var index = parsedToken.end;
    for (; index < source.length; index += 1) {
        const char = source[index];
        if (char === '$') {
            if (source[index + 1] === '{' && source[index - 1] !== '\\') {
                depth += 1;
                index += 1;
            }
        }
        else if (char === '}') {
            if (depth !== 0) {
                depth -= 1;
            }
        }
        else if (depth === 0 && char === '`' && source[index - 1] !== '\\') {
            return index + 1;
        }
    }
    return addError(importsExports, 'Cannot find end of nested string literal started with backtick', parsedToken.start, source.length);
};
