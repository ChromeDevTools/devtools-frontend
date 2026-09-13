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

import { type PseudoSelector, parse } from "css-what";
import type { CompiledQuery, CompileToken, InternalOptions } from "../types.js";
import { aliases } from "./aliases.js";
import { filters } from "./filters.js";
import { pseudos, verifyPseudoArgs } from "./pseudos.js";
import { subselects } from "./subselects.js";

export { filters, pseudos, aliases };

export function compilePseudoSelector<Node, ElementNode extends Node>(
    next: CompiledQuery<ElementNode>,
    selector: PseudoSelector,
    options: InternalOptions<Node, ElementNode>,
    context: Node[] | undefined,
    compileToken: CompileToken<Node, ElementNode>,
): CompiledQuery<ElementNode> {
    const { name, data } = selector;

    if (Array.isArray(data)) {
        if (!(name in subselects)) {
            throw new Error(`Unknown pseudo-class :${name}(${data})`);
        }

        return subselects[name](next, data, options, context, compileToken);
    }

    const userPseudo = options.pseudos?.[name];

    const stringPseudo =
        typeof userPseudo === "string" ? userPseudo : aliases[name];

    if (typeof stringPseudo === "string") {
        if (data != null) {
            throw new Error(`Pseudo ${name} doesn't have any arguments`);
        }

        // The alias has to be parsed here, to make sure options are respected.
        const alias = parse(stringPseudo);
        return subselects["is"](next, alias, options, context, compileToken);
    }

    if (typeof userPseudo === "function") {
        verifyPseudoArgs(userPseudo, name, data, 1);

        return (elem) => userPseudo(elem, data) && next(elem);
    }

    if (name in filters) {
        return filters[name](next, data as string, options, context);
    }

    if (name in pseudos) {
        const pseudo = pseudos[name];
        verifyPseudoArgs(pseudo, name, data, 2);

        return (elem) => pseudo(elem, options, data) && next(elem);
    }

    throw new Error(`Unknown pseudo-class :${name}`);
}
