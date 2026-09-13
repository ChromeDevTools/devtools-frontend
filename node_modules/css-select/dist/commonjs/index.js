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
exports.pseudos = exports.filters = exports.aliases = exports.selectOne = exports.selectAll = void 0;
exports.compile = compile;
exports._compileUnsafe = _compileUnsafe;
exports._compileToken = _compileToken;
exports.prepareContext = prepareContext;
exports.is = is;
const boolbase = __importStar(require("boolbase"));
const css_what_1 = require("css-what");
const DomUtils = __importStar(require("domutils"));
const compile_js_1 = require("./compile.js");
const querying_js_1 = require("./helpers/querying.js");
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
function compile(selector, options, context) {
    const opts = convertOptionFormats(options);
    const next = _compileUnsafe(selector, opts, context);
    return next === boolbase.falseFunc
        ? boolbase.falseFunc
        : (elem) => opts.adapter.isTag(elem) && next(elem);
}
/**
 * Like `compile`, but does not add a check if elements are tags.
 */
function _compileUnsafe(selector, options, context) {
    return _compileToken(typeof selector === "string" ? (0, css_what_1.parse)(selector) : selector, options, context);
}
/**
 * @deprecated Use `_compileUnsafe` instead.
 */
function _compileToken(selector, options, context) {
    return (0, compile_js_1.compileToken)(selector, convertOptionFormats(options), context);
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
function prepareContext(elems, adapter, shouldTestNextSiblings = false) {
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
        const nextSiblings = (0, querying_js_1.getNextSiblings)(elems[i], adapter);
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
exports.selectAll = getSelectorFunc((query, elems, options) => query === boolbase.falseFunc || !elems || elems.length === 0
    ? []
    : (0, querying_js_1.findAll)(query, elems, options));
/**
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elems Elements to query. If it is an element, its children will be queried.
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns the first match, or null if there was no match.
 */
exports.selectOne = getSelectorFunc((query, elems, options) => query === boolbase.falseFunc || !elems || elems.length === 0
    ? null
    : (0, querying_js_1.findOne)(query, elems, options));
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
function is(elem, query, options) {
    return (typeof query === "function" ? query : compile(query, options))(elem);
}
/**
 * Alias for selectAll(query, elems, options).
 * @see [compile] for supported selector queries.
 */
exports.default = exports.selectAll;
// Export filters, pseudos and aliases to allow users to supply their own.
/** @deprecated Use the `pseudos` option instead. */
var index_js_1 = require("./pseudo-selectors/index.js");
Object.defineProperty(exports, "aliases", { enumerable: true, get: function () { return index_js_1.aliases; } });
Object.defineProperty(exports, "filters", { enumerable: true, get: function () { return index_js_1.filters; } });
Object.defineProperty(exports, "pseudos", { enumerable: true, get: function () { return index_js_1.pseudos; } });
//# sourceMappingURL=index.js.map