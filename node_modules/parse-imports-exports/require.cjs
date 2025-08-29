'use strict';
exports.onRequireError = undefined;
exports.onRequireParse = undefined;
const { parseFrom } = require('./partParsers.cjs');
const { addError, getPosition } = require('./utils.cjs');
/**
 * Adds error of parsing `require('...')`/`require("...")` statement.
 */
const onRequireError = exports.onRequireError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of `require(...)` statement', start, end);
/**
 * Parses `require('...')`/`require("...")` statement.
 */
const onRequireParse = exports.onRequireParse = (importsExports, source, { start }, { start: unparsedStart }, { start: unparsedEnd, end, token: endToken }) => {
    const unparsed = source.slice(unparsedStart, unparsedEnd);
    const quoteCharacter = endToken[0];
    if (quoteCharacter === undefined) {
        return addError(importsExports, 'Cannot find end of path string literal in `require(...)`', start, end);
    }
    const { from, index } = parseFrom(quoteCharacter, unparsed);
    if (index !== 0) {
        return addError(importsExports, `Cannot find start of path string literal in \`require(${quoteCharacter}...${quoteCharacter})\``, start, end);
    }
    const parsedRequire = getPosition(importsExports, start, end);
    var { requires } = importsExports;
    requires !== null && requires !== void 0 ? requires : (requires = importsExports.requires = { __proto__: null });
    var requiresList = requires[from];
    if (requiresList === undefined) {
        requires[from] = [parsedRequire];
    }
    else {
        requiresList.push(parsedRequire);
    }
};
