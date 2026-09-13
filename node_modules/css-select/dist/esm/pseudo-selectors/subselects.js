import * as boolbase from "boolbase";
import { cacheParentResults } from "../helpers/cache.js";
import { findOne, getNextSiblings } from "../helpers/querying.js";
import { includesScopePseudo, isTraversal } from "../helpers/selectors.js";
/** Used as a placeholder for :has. Will be replaced with the actual element. */
export const PLACEHOLDER_ELEMENT = {};
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
        (isTraversal(sel[0]) || sel.some(includesScopePseudo)));
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
export const subselects = {
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
        const context = subselect.some((s) => s.some(isTraversal))
            ? // Used as a placeholder. Will be replaced with the actual element.
                [PLACEHOLDER_ELEMENT]
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
                    return (findOne(compiled, compiled.shouldTestNextSiblings
                        ? [
                            ...childs,
                            ...getNextSiblings(elem, adapter),
                        ]
                        : childs, options) !== null);
                }
                : cacheParentResults(next, options, (elem) => {
                    context[0] = elem;
                    return (findOne(compiled, adapter.getChildren(elem), options) !== null);
                });
        }
        const hasOne = (elem) => findOne(compiled, adapter.getChildren(elem), options) !== null;
        return skipCache
            ? (elem) => next(elem) && hasOne(elem)
            : cacheParentResults(next, options, hasOne);
    },
};
//# sourceMappingURL=subselects.js.map