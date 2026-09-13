import * as boolbase from "boolbase";
import type { Selector } from "css-what";
import { SelectorType } from "css-what";
import { compileGeneralSelector } from "./general.js";
import { getElementParent } from "./helpers/querying.js";
import {
    getQuality,
    includesScopePseudo,
    isTraversal,
    sortRules,
} from "./helpers/selectors.js";
import { PLACEHOLDER_ELEMENT } from "./pseudo-selectors/subselects.js";
import type {
    CompiledQuery,
    InternalOptions,
    InternalSelector,
    Predicate,
} from "./types.js";

const DESCENDANT_TOKEN: Selector = { type: SelectorType.Descendant };
const FLEXIBLE_DESCENDANT_TOKEN: InternalSelector = {
    type: "_flexibleDescendant",
};
const SCOPE_TOKEN: Selector = {
    type: SelectorType.Pseudo,
    name: "scope",
    data: null,
};

/*
 * CSS 4 Spec (Draft): 3.4.1. Absolutizing a Relative Selector
 * http://www.w3.org/TR/selectors4/#absolutizing
 */
function absolutize<Node, ElementNode extends Node>(
    token: InternalSelector[][],
    { adapter }: InternalOptions<Node, ElementNode>,
    context?: Node[],
) {
    // TODO Use better check if the context is a document
    const hasContext = !!context?.every(
        (e) =>
            e === PLACEHOLDER_ELEMENT ||
            (adapter.isTag(e) && getElementParent(e, adapter) !== null),
    );

    for (const t of token) {
        if (
            t.length > 0 &&
            isTraversal(t[0]) &&
            t[0].type !== SelectorType.Descendant
        ) {
            // Don't continue in else branch
        } else if (hasContext && !t.some(includesScopePseudo)) {
            t.unshift(DESCENDANT_TOKEN);
        } else {
            continue;
        }

        t.unshift(SCOPE_TOKEN);
    }
}

export function compileToken<Node, ElementNode extends Node>(
    token: InternalSelector[][],
    options: InternalOptions<Node, ElementNode>,
    ctx?: Node[] | Node,
): CompiledQuery<ElementNode> {
    token.forEach(sortRules);

    const { context = ctx, rootFunc = boolbase.trueFunc } = options;

    const isArrayContext = Array.isArray(context);

    const finalContext =
        context && (Array.isArray(context) ? context : [context]);

    // Check if the selector is relative
    if (options.relativeSelector !== false) {
        absolutize(token, options, finalContext);
    } else if (token.some((t) => t.length > 0 && isTraversal(t[0]))) {
        throw new Error(
            "Relative selectors are not allowed when the `relativeSelector` option is disabled",
        );
    }

    let shouldTestNextSiblings = false;
    let query: CompiledQuery<ElementNode> = boolbase.falseFunc;

    combineLoop: for (const rules of token) {
        if (rules.length >= 2) {
            const [first, second] = rules;

            if (first.type !== SelectorType.Pseudo || first.name !== "scope") {
                // Ignore
            } else if (
                isArrayContext &&
                second.type === SelectorType.Descendant
            ) {
                rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
            } else if (
                second.type === SelectorType.Adjacent ||
                second.type === SelectorType.Sibling
            ) {
                shouldTestNextSiblings = true;
            }
        }

        let next = rootFunc;
        let hasExpensiveSubselector = false;

        for (const rule of rules) {
            next = compileGeneralSelector(
                next,
                rule,
                options,
                finalContext,
                compileToken,
                hasExpensiveSubselector,
            );

            const quality = getQuality(rule);

            if (quality === 0) {
                hasExpensiveSubselector = true;
            }

            // If the sub-selector won't match any elements, skip it.
            if (next === boolbase.falseFunc) {
                continue combineLoop;
            }
        }

        // If we have a function that always returns true, we can stop here.
        if (next === rootFunc) {
            return rootFunc;
        }

        query = query === boolbase.falseFunc ? next : or(query, next);
    }

    query.shouldTestNextSiblings = shouldTestNextSiblings;

    return query;
}

function or<T>(a: Predicate<T>, b: Predicate<T>): Predicate<T> {
    return (elem) => a(elem) || b(elem);
}
