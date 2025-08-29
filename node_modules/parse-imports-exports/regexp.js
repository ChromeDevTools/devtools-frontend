import { addError } from './utils.js';
/**
 * Adds error of parsing regexp literal.
 */
export const onRegexpError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of regexp literal', start, end);
/**
 * Parses `/.../` statement (regular expression literal).
 */
export const onRegexpParse = (_importsExports, source, parsedToken, { end, token }) => {
    if (token !== '/') {
        return parsedToken.end;
    }
    if (source[end] === '*') {
        return end - 1;
    }
    return;
};
