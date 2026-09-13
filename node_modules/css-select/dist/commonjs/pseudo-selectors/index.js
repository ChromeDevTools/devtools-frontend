"use strict";
/*
 * Pseudo selectors
 *
 * Pseudo selectors are available in three forms:
 *
 * 1. Filters are called when the selector is compiled and return a function
 *  that has to return either false, or the results of `next()`.
 * 2. Pseudos are called on execution. They have to return a boolean.
 * 3. Subselects work like filters, but have an embedded selector that will be run separately.
 *
 * Filters are great if you want to do some pre-processing, or change the call order
 * of `next()` and your code.
 * Pseudos should be used to implement simple checks.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.aliases = exports.pseudos = exports.filters = void 0;
exports.compilePseudoSelector = compilePseudoSelector;
const css_what_1 = require("css-what");
const aliases_js_1 = require("./aliases.js");
Object.defineProperty(exports, "aliases", { enumerable: true, get: function () { return aliases_js_1.aliases; } });
const filters_js_1 = require("./filters.js");
Object.defineProperty(exports, "filters", { enumerable: true, get: function () { return filters_js_1.filters; } });
const pseudos_js_1 = require("./pseudos.js");
Object.defineProperty(exports, "pseudos", { enumerable: true, get: function () { return pseudos_js_1.pseudos; } });
const subselects_js_1 = require("./subselects.js");
function compilePseudoSelector(next, selector, options, context, compileToken) {
    const { name, data } = selector;
    if (Array.isArray(data)) {
        if (!(name in subselects_js_1.subselects)) {
            throw new Error(`Unknown pseudo-class :${name}(${data})`);
        }
        return subselects_js_1.subselects[name](next, data, options, context, compileToken);
    }
    const userPseudo = options.pseudos?.[name];
    const stringPseudo = typeof userPseudo === "string" ? userPseudo : aliases_js_1.aliases[name];
    if (typeof stringPseudo === "string") {
        if (data != null) {
            throw new Error(`Pseudo ${name} doesn't have any arguments`);
        }
        // The alias has to be parsed here, to make sure options are respected.
        const alias = (0, css_what_1.parse)(stringPseudo);
        return subselects_js_1.subselects["is"](next, alias, options, context, compileToken);
    }
    if (typeof userPseudo === "function") {
        (0, pseudos_js_1.verifyPseudoArgs)(userPseudo, name, data, 1);
        return (elem) => userPseudo(elem, data) && next(elem);
    }
    if (name in filters_js_1.filters) {
        return filters_js_1.filters[name](next, data, options, context);
    }
    if (name in pseudos_js_1.pseudos) {
        const pseudo = pseudos_js_1.pseudos[name];
        (0, pseudos_js_1.verifyPseudoArgs)(pseudo, name, data, 2);
        return (elem) => pseudo(elem, options, data) && next(elem);
    }
    throw new Error(`Unknown pseudo-class :${name}`);
}
//# sourceMappingURL=index.js.map