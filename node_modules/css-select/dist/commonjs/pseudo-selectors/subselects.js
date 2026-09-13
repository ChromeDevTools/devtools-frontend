"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.subselects = exports.PLACEHOLDER_ELEMENT = void 0;
const boolbase = __importStar(require("boolbase"));
const cache_js_1 = require("../helpers/cache.js");
const querying_js_1 = require("../helpers/querying.js");
const selectors_js_1 = require("../helpers/selectors.js");
/** Used as a placeholder for :has. Will be replaced with the actual element. */
exports.PLACEHOLDER_ELEMENT = {};
/**
 * Check if the selector has any properties that rely on the current element.
 * If not, we can cache the result of the selector.
 *
 * We can't cache selectors that start with a traversal (e.g. `>`, `+`, `~`),
 * or include a `:scope`.
 *
 * @param selector - The selector to check.
 * @returns Whether the selector has any properties that rely on the current element.
 */
function hasDependsOnCurrentElement(selector) {
    return selector.some((sel) => sel.length > 0 &&
        ((0, selectors_js_1.isTraversal)(sel[0]) || sel.some(selectors_js_1.includesScopePseudo)));
}
function copyOptions(options) {
    // Not copied: context, rootFunc
    return {
        xmlMode: !!options.xmlMode,
        lowerCaseAttributeNames: !!options.lowerCaseAttributeNames,
        lowerCaseTags: !!options.lowerCaseTags,
        quirksMode: !!options.quirksMode,
        cacheResults: !!options.cacheResults,
        pseudos: options.pseudos,
        adapter: options.adapter,
        equals: options.equals,
    };
}
const is = (next, token, options, context, compileToken) => {
    const func = compileToken(token, copyOptions(options), context);
    return func === boolbase.trueFunc
        ? next
        : func === boolbase.falseFunc
            ? boolbase.falseFunc
            : (elem) => func(elem) && next(elem);
};
/*
 * :not, :has, :is, :matches and :where have to compile selectors
 * doing this in src/pseudos.ts would lead to circular dependencies,
 * so we add them here
 */
exports.subselects = {
    is,
    /**
     * `:matches` and `:where` are aliases for `:is`.
     */
    matches: is,
    where: is,
    not(next, token, options, context, compileToken) {
        const func = compileToken(token, copyOptions(options), context);
        return func === boolbase.falseFunc
            ? next
            : func === boolbase.trueFunc
                ? boolbase.falseFunc
                : (elem) => !func(elem) && next(elem);
    },
    has(next, subselect, options, _context, compileToken) {
        const { adapter } = options;
        const opts = copyOptions(options);
        opts.relativeSelector = true;
        const context = subselect.some((s) => s.some(selectors_js_1.isTraversal))
            ? // Used as a placeholder. Will be replaced with the actual element.
                [exports.PLACEHOLDER_ELEMENT]
            : undefined;
        const skipCache = hasDependsOnCurrentElement(subselect);
        const compiled = compileToken(subselect, opts, context);
        if (compiled === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        // If `compiled` is `trueFunc`, we can skip this.
        if (context && compiled !== boolbase.trueFunc) {
            return skipCache
                ? (elem) => {
                    if (!next(elem)) {
                        return false;
                    }
                    context[0] = elem;
                    const childs = adapter.getChildren(elem);
                    return ((0, querying_js_1.findOne)(compiled, compiled.shouldTestNextSiblings
                        ? [
                            ...childs,
                            ...(0, querying_js_1.getNextSiblings)(elem, adapter),
                        ]
                        : childs, options) !== null);
                }
                : (0, cache_js_1.cacheParentResults)(next, options, (elem) => {
                    context[0] = elem;
                    return ((0, querying_js_1.findOne)(compiled, adapter.getChildren(elem), options) !== null);
                });
        }
        const hasOne = (elem) => (0, querying_js_1.findOne)(compiled, adapter.getChildren(elem), options) !== null;
        return skipCache
            ? (elem) => next(elem) && hasOne(elem)
            : (0, cache_js_1.cacheParentResults)(next, options, hasOne);
    },
};
//# sourceMappingURL=subselects.js.map