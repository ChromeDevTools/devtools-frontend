import * as boolbase from "boolbase";
import { parse } from "css-what";
import * as DomUtils from "domutils";
import { compileToken } from "./compile.js";
import { findAll, findOne, getNextSiblings } from "./helpers/querying.js";
const defaultEquals = (a, b) => a === b;
const defaultOptions = {
    adapter: DomUtils,
    equals: defaultEquals,
};
function convertOptionFormats(options) {
    /*
     * We force one format of options to the other one.
     */
    // @ts-expect-error Default options may have incompatible `Node` / `ElementNode`.
    const opts = options ?? defaultOptions;
    // @ts-expect-error Same as above.
    opts.adapter ?? (opts.adapter = DomUtils);
    // @ts-expect-error `equals` does not exist on `Options`
    opts.equals ?? (opts.equals = opts.adapter?.equals ?? defaultEquals);
    return opts;
}
/**
 * Compiles a selector to an executable function.
 *
 * The returned function checks if each passed node is an element. Use
 * `_compileUnsafe` to skip this check.
 *
 * @param selector Selector to compile.
 * @param options Compilation options.
 * @param context Optional context for the selector.
 */
export function compile(selector, options, context) {
    const opts = convertOptionFormats(options);
    const next = _compileUnsafe(selector, opts, context);
    return next === boolbase.falseFunc
        ? boolbase.falseFunc
        : (elem) => opts.adapter.isTag(elem) && next(elem);
}
/**
 * Like `compile`, but does not add a check if elements are tags.
 */
export function _compileUnsafe(selector, options, context) {
    return _compileToken(typeof selector === "string" ? parse(selector) : selector, options, context);
}
/**
 * @deprecated Use `_compileUnsafe` instead.
 */
export function _compileToken(selector, options, context) {
    return compileToken(selector, convertOptionFormats(options), context);
}
function getSelectorFunc(searchFunc) {
    return function select(query, elements, options) {
        const opts = convertOptionFormats(options);
        if (typeof query !== "function") {
            query = _compileUnsafe(query, opts, elements);
        }
        const filteredElements = prepareContext(elements, opts.adapter, query.shouldTestNextSiblings);
        return searchFunc(query, filteredElements, opts);
    };
}
export function prepareContext(elems, adapter, shouldTestNextSiblings = false) {
    /*
     * Add siblings if the query requires them.
     * See https://github.com/fb55/css-select/pull/43#issuecomment-225414692
     */
    if (shouldTestNextSiblings) {
        elems = appendNextSiblings(elems, adapter);
    }
    return Array.isArray(elems)
        ? adapter.removeSubsets(elems)
        : adapter.getChildren(elems);
}
function appendNextSiblings(elem, adapter) {
    // Order matters because jQuery seems to check the children before the siblings
    const elems = Array.isArray(elem) ? elem.slice(0) : [elem];
    const elemsLength = elems.length;
    for (let i = 0; i < elemsLength; i++) {
        const nextSiblings = getNextSiblings(elems[i], adapter);
        elems.push(...nextSiblings);
    }
    return elems;
}
/**
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elems Elements to query. If it is an element, its children will be queried.
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns All matching elements.
 *
 */
export const selectAll = getSelectorFunc((query, elems, options) => query === boolbase.falseFunc || !elems || elems.length === 0
    ? []
    : findAll(query, elems, options));
/**
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elems Elements to query. If it is an element, its children will be queried.
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns the first match, or null if there was no match.
 */
export const selectOne = getSelectorFunc((query, elems, options) => query === boolbase.falseFunc || !elems || elems.length === 0
    ? null
    : findOne(query, elems, options));
/**
 * Tests whether or not an element is matched by query.
 *
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elem The element to test if it matches the query.
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns
 */
export function is(elem, query, options) {
    return (typeof query === "function" ? query : compile(query, options))(elem);
}
/**
 * Alias for selectAll(query, elems, options).
 * @see [compile] for supported selector queries.
 */
export default selectAll;
// Export filters, pseudos and aliases to allow users to supply their own.
/** @deprecated Use the `pseudos` option instead. */
export { aliases, filters, pseudos } from "./pseudo-selectors/index.js";
//# sourceMappingURL=index.js.map