import { addError } from './utils.js';
/**
 * Adds error of parsing string literal started with double quote.
 */
export const onDoubleQuoteError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of string literal started with double quote', start, end);
/**
 * Adds global error of parsing source.
 */
export const onGlobalError = (importsExports, _source, message, index) => addError(importsExports, message, index);
/**
 * Adds error of parsing multiline comment.
 */
export const onMultilineCommentError = (importsExports, _source, { start }) => addError(importsExports, 'Cannot find end of multiline comment', start);
/**
 * Adds error of parsing single line comment.
 */
export const onSinglelineCommentError = (importsExports, _source, { start }) => addError(importsExports, 'Cannot find end of single line comment', start);
/**
 * Adds error of parsing string literal started with single quote.
 */
export const onSingleQuoteError = (importsExports, _source, { start, end }) => addError(importsExports, 'Cannot find end of string literal started with single quote', start, end);
