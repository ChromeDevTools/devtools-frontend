'use strict';
exports.onRegexpError = undefined;
exports.onRegexpParse = undefined;
const { addError } = require('./utils.cjs');
/**
 * Adds error of parsing regexp literal.
 */
const onRegexpError = exports.onRegexpError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of regexp literal', start, end);
/**
 * Parses `/.../` statement (regular expression literal).
 */
const onRegexpParse = exports.onRegexpParse = (_importsExports, source, parsedToken, { end, token }) => {
    if (token !== '/') {
        return parsedToken.end;
    }
    if (source[end] === '*') {
        return end - 1;
    }
    return;
};
