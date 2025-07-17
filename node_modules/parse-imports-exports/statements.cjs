'use strict';
exports.comments = undefined;
exports.getStatements = undefined;
const { onBacktickError, onBacktickParse } = require('./backtickString.cjs');
const { onCommonJsExportError, onCommonJsExportParse } = require('./commonJsExport.cjs');
const { onDeclarationExportError, onDeclarationExportParse } = require('./declarationExport.cjs');
const { onDynamicImportError, onDynamicImportParse } = require('./dynamicImport.cjs');
const { onImportError, onImportParse } = require('./import.cjs');
const { onNamedExportError, onNamedExportParse } = require('./namedExport.cjs');
const { onDoubleQuoteError, onMultilineCommentError, onSinglelineCommentError, onSingleQuoteError, } = require('./onErrors.cjs');
const { onRegexpError, onRegexpParse } = require('./regexp.cjs');
const { onRequireError, onRequireParse } = require('./require.cjs');
/**
 * Statements of ECMAScript comments.
 */
const comments = exports.comments = [
    {
        onError: onSinglelineCommentError,
        tokens: ['\\/\\/', '$'],
    },
    {
        onError: onMultilineCommentError,
        tokens: ['\\/\\*', '\\*\\/'],
    },
];
/**
 * Get statements for parsing by options.
 */
const getStatements = exports.getStatements = (options) => {
    const statements = [...baseStatements];
    if (!(options === null || options === void 0 ? void 0 : options.ignoreDynamicImports)) {
        statements.push(dynamicImportStatement);
    }
    if (!(options === null || options === void 0 ? void 0 : options.ignoreRequires)) {
        statements.push(requireStatement);
    }
    if (!(options === null || options === void 0 ? void 0 : options.ignoreCommonJsExports)) {
        statements.push(commonJsExportStatement);
    }
    if (!(options === null || options === void 0 ? void 0 : options.ignoreRegexpLiterals)) {
        statements.push(regexpLiteralStatement);
    }
    if (!(options === null || options === void 0 ? void 0 : options.ignoreStringLiterals)) {
        statements.unshift(...stringLiteralStatements);
    }
    return statements;
};
/**
 * Base statements for parsing `import`/`export` declarations.
 */
const baseStatements = [
    {
        canIncludeComments: true,
        onError: onImportError,
        onParse: onImportParse,
        tokens: ['^import ', '([\'"];?$)|(?<with>[\'"] with \\{)'],
        shouldSearchBeforeComments: true,
    },
    {
        canIncludeComments: true,
        onError: onNamedExportError,
        onParse: onNamedExportParse,
        tokens: ['^export (?<type>type )?\\{', '(\\};?$)|(?<quote>[\'"];?$)|(?<with>[\'"] with \\{)'],
        shouldSearchBeforeComments: true,
    },
    {
        canIncludeComments: true,
        onError: onDeclarationExportError,
        onParse: onDeclarationExportParse,
        tokens: ['^export ', '($)|(?<with>[\'"] with \\{)'],
        shouldSearchBeforeComments: true,
    },
];
/**
 * Statement for parsing CommonJS exports (`module.exports = ...`/`(module.)exports.foo = ...`).
 */
const commonJsExportStatement = {
    canIncludeComments: true,
    onError: onCommonJsExportError,
    onParse: onCommonJsExportParse,
    tokens: ['^(module\\.)?exports\\b', '='],
    shouldSearchBeforeComments: true,
};
/**
 * Statement for parsing dynamic import call (`import(...)`).
 */
const dynamicImportStatement = {
    canIncludeComments: true,
    onError: onDynamicImportError,
    onParse: onDynamicImportParse,
    tokens: ['\\bimport\\(', '[\'"]', '([\'"])|($)'],
    shouldSearchBeforeComments: true,
};
/**
 * Statement for parsing regexp literal (`/.../`).
 */
const regexpLiteralStatement = {
    canIncludeComments: false,
    onError: onRegexpError,
    onParse: onRegexpParse,
    tokens: ['/', '((?<!\\\\)/)|($)'],
    shouldSearchBeforeComments: false,
};
/**
 * Statement for parsing require call (`require(...)`).
 */
const requireStatement = {
    canIncludeComments: true,
    onError: onRequireError,
    onParse: onRequireParse,
    tokens: ['\\brequire\\(', '[\'"]', '([\'"])|($)'],
    shouldSearchBeforeComments: true,
};
/**
 * Statements for parsing string literals.
 */
const stringLiteralStatements = [
    {
        canIncludeComments: false,
        onError: onSingleQuoteError,
        tokens: ["'", "((?<!\\\\)')|($)"],
        shouldSearchBeforeComments: true,
    },
    {
        canIncludeComments: false,
        onError: onDoubleQuoteError,
        tokens: ['"', '((?<!\\\\)")|($)'],
        shouldSearchBeforeComments: true,
    },
    {
        canIncludeComments: false,
        onError: onBacktickError,
        onParse: onBacktickParse,
        tokens: ['`', '(?<!\\\\)`'],
        shouldSearchBeforeComments: true,
    },
];
