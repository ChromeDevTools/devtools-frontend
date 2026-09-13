"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compileGeneralSelector = compileGeneralSelector;
const css_what_1 = require("css-what");
const attributes_js_1 = require("./attributes.js");
const querying_js_1 = require("./helpers/querying.js");
const index_js_1 = require("./pseudo-selectors/index.js");
/*
 * All available rules
 */
function compileGeneralSelector(next, selector, options, context, compileToken, hasExpensiveSubselector) {
    const { adapter, equals, cacheResults } = options;
    switch (selector.type) {
        case css_what_1.SelectorType.PseudoElement: {
            throw new Error("Pseudo-elements are not supported by css-select");
        }
        case css_what_1.SelectorType.ColumnCombinator: {
            throw new Error("Column combinators are not yet supported by css-select");
        }
        case css_what_1.SelectorType.Attribute: {
            if (selector.namespace != null) {
                throw new Error("Namespaced attributes are not yet supported by css-select");
            }
            if (!options.xmlMode || options.lowerCaseAttributeNames) {
                selector.name = selector.name.toLowerCase();
            }
            return attributes_js_1.attributeRules[selector.action](next, selector, options);
        }
        case css_what_1.SelectorType.Pseudo: {
            return (0, index_js_1.compilePseudoSelector)(next, selector, options, context, compileToken);
        }
        // Tags
        case css_what_1.SelectorType.Tag: {
            if (selector.namespace != null) {
                throw new Error("Namespaced tag names are not yet supported by css-select");
            }
            let { name } = selector;
            if (!options.xmlMode || options.lowerCaseTags) {
                name = name.toLowerCase();
            }
            return function tag(elem) {
                return adapter.getName(elem) === name && next(elem);
            };
        }
        // Traversal
        case css_what_1.SelectorType.Descendant: {
            if (!hasExpensiveSubselector ||
                cacheResults === false ||
                typeof WeakMap === "undefined") {
                return function descendant(elem) {
                    let current = elem;
                    // biome-ignore lint/suspicious/noAssignInExpressions: TODO
                    while ((current = (0, querying_js_1.getElementParent)(current, adapter))) {
                        if (next(current)) {
                            return true;
                        }
                    }
                    return false;
                };
            }
            const resultCache = new WeakMap();
            return function cachedDescendant(elem) {
                let current = elem;
                let result;
                // biome-ignore lint/suspicious/noAssignInExpressions: TODO
                while ((current = (0, querying_js_1.getElementParent)(current, adapter))) {
                    const cached = resultCache.get(current);
                    if (cached === undefined) {
                        result ?? (result = { matches: false });
                        result.matches = next(current);
                        resultCache.set(current, result);
                        if (result.matches) {
                            return true;
                        }
                    }
                    else {
                        if (result) {
                            result.matches = cached.matches;
                        }
                        return cached.matches;
                    }
                }
                return false;
            };
        }
        case "_flexibleDescendant": {
            // Include element itself, only used while querying an array
            return function flexibleDescendant(elem) {
                let current = elem;
                do {
                    if (next(current)) {
                        return true;
                    }
                    current = (0, querying_js_1.getElementParent)(current, adapter);
                } while (current);
                return false;
            };
        }
        case css_what_1.SelectorType.Parent: {
            return function parent(elem) {
                return adapter
                    .getChildren(elem)
                    .some((elem) => adapter.isTag(elem) && next(elem));
            };
        }
        case css_what_1.SelectorType.Child: {
            return function child(elem) {
                const parent = (0, querying_js_1.getElementParent)(elem, adapter);
                return parent !== null && next(parent);
            };
        }
        case css_what_1.SelectorType.Sibling: {
            return function sibling(elem) {
                const siblings = adapter.getSiblings(elem);
                for (let i = 0; i < siblings.length; i++) {
                    const currentSibling = siblings[i];
                    if (equals(elem, currentSibling)) {
                        break;
                    }
                    if (adapter.isTag(currentSibling) && next(currentSibling)) {
                        return true;
                    }
                }
                return false;
            };
        }
        case css_what_1.SelectorType.Adjacent: {
            if (adapter.prevElementSibling) {
                return function adjacent(elem) {
                    const previous = adapter.prevElementSibling(elem);
                    return previous != null && next(previous);
                };
            }
            return function adjacent(elem) {
                const siblings = adapter.getSiblings(elem);
                let lastElement;
                for (let i = 0; i < siblings.length; i++) {
                    const currentSibling = siblings[i];
                    if (equals(elem, currentSibling)) {
                        break;
                    }
                    if (adapter.isTag(currentSibling)) {
                        lastElement = currentSibling;
                    }
                }
                return !!lastElement && next(lastElement);
            };
        }
        case css_what_1.SelectorType.Universal: {
            if (selector.namespace != null && selector.namespace !== "*") {
                throw new Error("Namespaced universal selectors are not yet supported by css-select");
            }
            return next;
        }
    }
}
//# sourceMappingURL=general.js.map