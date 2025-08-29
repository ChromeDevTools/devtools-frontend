'use strict';
exports.onDoubleQuoteError = undefined;
exports.onGlobalError = undefined;
exports.onMultilineCommentError = undefined;
exports.onSinglelineCommentError = undefined;
exports.onSingleQuoteError = undefined;
const { addError } = require('./utils.cjs');
/**
 * Adds error of parsing string literal started with double quote.
 */
const onDoubleQuoteError = exports.onDoubleQuoteError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of string literal started with double quote', start, end);
/**
 * Adds global error of parsing source.
 */
const onGlobalError = exports.onGlobalError = (importsExports, _source, message, index) => addError(importsExports, message, index);
/**
 * Adds error of parsing multiline comment.
 */
const onMultilineCommentError = exports.onMultilineCommentError = (importsExports, _source, { start }) => addError(importsExports, 'Cannot find end of multiline comment', start);
/**
 * Adds error of parsing single line comment.
 */
const onSinglelineCommentError = exports.onSinglelineCommentError = (importsExports, _source, { start }) => addError(importsExports, 'Cannot find end of single line comment', start);
/**
 * Adds error of parsing string literal started with single quote.
 */
const onSingleQuoteError = exports.onSingleQuoteError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of string literal started with single quote', start, end);
