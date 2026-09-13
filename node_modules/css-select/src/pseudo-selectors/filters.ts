import * as boolbase from "boolbase";
import getNCheck from "nth-check";
import { cacheParentResults } from "../helpers/cache.js";
import { getElementParent } from "../helpers/querying.js";
import type { CompiledQuery, InternalOptions } from "../types.js";

type Filter = <Node, ElementNode extends Node>(
    next: CompiledQuery<ElementNode>,
    text: string,
    options: InternalOptions<Node, ElementNode>,
    context?: Node[],
) => CompiledQuery<ElementNode>;

export const filters: Record<string, Filter> = {
    contains(next, text, options) {
        const { getText } = options.adapter;

        return cacheParentResults(next, options, (elem) =>
            getText(elem).includes(text),
        );
    },
    icontains(next, text, options) {
        const itext = text.toLowerCase();
        const { getText } = options.adapter;

        return cacheParentResults(next, options, (elem) =>
            getText(elem).toLowerCase().includes(itext),
        );
    },

    // Location specific methods
    "nth-child"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) =>
                getElementParent(elem, adapter) !== null && next(elem);
        }

        return function nthChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = 0; i < siblings.length; i++) {
                if (equals(elem, siblings[i])) {
                    break;
                }
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },
    "nth-last-child"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) =>
                getElementParent(elem, adapter) !== null && next(elem);
        }

        return function nthLastChild(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = siblings.length - 1; i >= 0; i--) {
                if (equals(elem, siblings[i])) {
                    break;
                }
                if (adapter.isTag(siblings[i])) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },
    "nth-of-type"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) =>
                getElementParent(elem, adapter) !== null && next(elem);
        }

        return function nthOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = 0; i < siblings.length; i++) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling)) {
                    break;
                }
                if (
                    adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)
                ) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },
    "nth-last-of-type"(next, rule, { adapter, equals }) {
        const func = getNCheck(rule);

        if (func === boolbase.falseFunc) {
            return boolbase.falseFunc;
        }
        if (func === boolbase.trueFunc) {
            return (elem) =>
                getElementParent(elem, adapter) !== null && next(elem);
        }

        return function nthLastOfType(elem) {
            const siblings = adapter.getSiblings(elem);
            let pos = 0;

            for (let i = siblings.length - 1; i >= 0; i--) {
                const currentSibling = siblings[i];
                if (equals(elem, currentSibling)) {
                    break;
                }
                if (
                    adapter.isTag(currentSibling) &&
                    adapter.getName(currentSibling) === adapter.getName(elem)
                ) {
                    pos++;
                }
            }

            return func(pos) && next(elem);
        };
    },

    // TODO determine the actual root element
    root(next, _rule, { adapter }) {
        return (elem) => getElementParent(elem, adapter) === null && next(elem);
    },

    scope<Node, ElementNode extends Node>(
        next: CompiledQuery<ElementNode>,
        rule: string,
        options: InternalOptions<Node, ElementNode>,
        context?: Node[],
    ): CompiledQuery<ElementNode> {
        const { equals } = options;

        if (!context || context.length === 0) {
            // Equivalent to :root
            return filters["root"](next, rule, options);
        }

        if (context.length === 1) {
            // NOTE: can't be unpacked, as :has uses this for side-effects
            return (elem) => equals(context[0], elem) && next(elem);
        }

        return (elem) => context.includes(elem) && next(elem);
    },

    hover: dynamicStatePseudo("isHovered"),
    visited: dynamicStatePseudo("isVisited"),
    active: dynamicStatePseudo("isActive"),
};

/**
 * Dynamic state pseudos. These depend on optional Adapter methods.
 *
 * @param name The name of the adapter method to call.
 * @returns Pseudo for the `filters` object.
 */
function dynamicStatePseudo(
    name: "isHovered" | "isVisited" | "isActive",
): Filter {
    return function dynamicPseudo(next, _rule, { adapter }) {
        const func = adapter[name];

        if (typeof func !== "function") {
            return boolbase.falseFunc;
        }

        return function active(elem) {
            return func(elem) && next(elem);
        };
    };
}
