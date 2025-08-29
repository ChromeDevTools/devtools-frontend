import { onBacktickError, onBacktickParse } from './backtickString.js';
import { onCommonJsExportError, onCommonJsExportParse } from './commonJsExport.js';
import { onDeclarationExportError, onDeclarationExportParse } from './declarationExport.js';
import { onDynamicImportError, onDynamicImportParse } from './dynamicImport.js';
import { onImportError, onImportParse } from './import.js';
import { onNamedExportError, onNamedExportParse } from './namedExport.js';
import { onDoubleQuoteError, onMultilineCommentError, onSinglelineCommentError, onSingleQuoteError, } from './onErrors.js';
import { onRegexpError, onRegexpParse } from './regexp.js';
import { onRequireError, onRequireParse } from './require.js';
/**
 * Statements of ECMAScript comments.
 */
export const comments = [
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
export const getStatements = (options) => {
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
