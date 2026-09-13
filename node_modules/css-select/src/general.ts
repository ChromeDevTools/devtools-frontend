import { SelectorType } from "css-what";
import { attributeRules } from "./attributes.js";
import { getElementParent } from "./helpers/querying.js";
import { compilePseudoSelector } from "./pseudo-selectors/index.js";
import type {
    CompiledQuery,
    CompileToken,
    InternalOptions,
    InternalSelector,
} from "./types.js";

/*
 * All available rules
 */

export function compileGeneralSelector<Node, ElementNode extends Node>(
    next: CompiledQuery<ElementNode>,
    selector: InternalSelector,
    options: InternalOptions<Node, ElementNode>,
    context: Node[] | undefined,
    compileToken: CompileToken<Node, ElementNode>,
    hasExpensiveSubselector: boolean,
): CompiledQuery<ElementNode> {
    const { adapter, equals, cacheResults } = options;

    switch (selector.type) {
        case SelectorType.PseudoElement: {
            throw new Error("Pseudo-elements are not supported by css-select");
        }
        case SelectorType.ColumnCombinator: {
            throw new Error(
                "Column combinators are not yet supported by css-select",
            );
        }
        case SelectorType.Attribute: {
            if (selector.namespace != null) {
                throw new Error(
                    "Namespaced attributes are not yet supported by css-select",
                );
            }

            if (!options.xmlMode || options.lowerCaseAttributeNames) {
                selector.name = selector.name.toLowerCase();
            }
            return attributeRules[selector.action](next, selector, options);
        }
        case SelectorType.Pseudo: {
            return compilePseudoSelector(
                next,
                selector,
                options,
                context,
                compileToken,
            );
        }
        // Tags
        case SelectorType.Tag: {
            if (selector.namespace != null) {
                throw new Error(
                    "Namespaced tag names are not yet supported by css-select",
                );
            }

            let { name } = selector;

            if (!options.xmlMode || options.lowerCaseTags) {
                name = name.toLowerCase();
            }

            return function tag(elem: ElementNode): boolean {
                return adapter.getName(elem) === name && next(elem);
            };
        }

        // Traversal
        case SelectorType.Descendant: {
            if (
                !hasExpensiveSubselector ||
                cacheResults === false ||
                typeof WeakMap === "undefined"
            ) {
                return function descendant(elem: ElementNode): boolean {
                    let current: ElementNode | null = elem;

                    // biome-ignore lint/suspicious/noAssignInExpressions: TODO
                    while ((current = getElementParent(current, adapter))) {
                        if (next(current)) {
                            return true;
                        }
                    }

                    return false;
                };
            }

            const resultCache = new WeakMap<
                // @ts-expect-error `ElementNode` is not extending object
                ElementNode,
                { matches: boolean }
            >();
            return function cachedDescendant(elem: ElementNode): boolean {
                let current: ElementNode | null = elem;
                let result;

                // biome-ignore lint/suspicious/noAssignInExpressions: TODO
                while ((current = getElementParent(current, adapter))) {
                    const cached = resultCache.get(current);

                    if (cached === undefined) {
                        result ??= { matches: false };
                        result.matches = next(current);
                        resultCache.set(current, result);
                        if (result.matches) {
                            return true;
                        }
                    } else {
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
            return function flexibleDescendant(elem: ElementNode): boolean {
                let current: ElementNode | null = elem;

                do {
                    if (next(current)) {
                        return true;
                    }
                    current = getElementParent(current, adapter);
                } while (current);

                return false;
            };
        }
        case SelectorType.Parent: {
            return function parent(elem: ElementNode): boolean {
                return adapter
                    .getChildren(elem)
                    .some((elem) => adapter.isTag(elem) && next(elem));
            };
        }
        case SelectorType.Child: {
            return function child(elem: ElementNode): boolean {
                const parent = getElementParent(elem, adapter);
                return parent !== null && next(parent);
            };
        }
        case SelectorType.Sibling: {
            return function sibling(elem: ElementNode): boolean {
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
        case SelectorType.Adjacent: {
            if (adapter.prevElementSibling) {
                return function adjacent(elem: ElementNode): boolean {
                    const previous = adapter.prevElementSibling!(elem);
                    return previous != null && next(previous);
                };
            }

            return function adjacent(elem: ElementNode): boolean {
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
        case SelectorType.Universal: {
            if (selector.namespace != null && selector.namespace !== "*") {
                throw new Error(
                    "Namespaced universal selectors are not yet supported by css-select",
                );
            }

            return next;
        }
    }
}
