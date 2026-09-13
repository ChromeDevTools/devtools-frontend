import { type Selector } from "css-what";
import type { Adapter, CompiledQuery, Options, Query } from "./types.js";
export type { Options };
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
export declare function compile<Node, ElementNode extends Node>(selector: string | Selector[][], options?: Options<Node, ElementNode>, context?: Node[] | Node): CompiledQuery<Node>;
/**
 * Like `compile`, but does not add a check if elements are tags.
 */
export declare function _compileUnsafe<Node, ElementNode extends Node>(selector: string | Selector[][], options?: Options<Node, ElementNode>, context?: Node[] | Node): CompiledQuery<ElementNode>;
/**
 * @deprecated Use `_compileUnsafe` instead.
 */
export declare function _compileToken<Node, ElementNode extends Node>(selector: Selector[][], options?: Options<Node, ElementNode>, context?: Node[] | Node): CompiledQuery<ElementNode>;
export declare function prepareContext<Node, ElementNode extends Node>(elems: Node | Node[], adapter: Adapter<Node, ElementNode>, shouldTestNextSiblings?: boolean): Node[];
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
export declare const selectAll: <Node, ElementNode extends Node>(query: Query<ElementNode>, elements: Node | Node[], options?: Options<Node, ElementNode> | undefined) => ElementNode[];
/**
 * @template Node The generic Node type for the DOM adapter being used.
 * @template ElementNode The Node type for elements for the DOM adapter being used.
 * @param elems Elements to query. If it is an element, its children will be queried.
 * @param query can be either a CSS selector string or a compiled query function.
 * @param [options] options for querying the document.
 * @see compile for supported selector queries.
 * @returns the first match, or null if there was no match.
 */
export declare const selectOne: <Node, ElementNode extends Node>(query: Query<ElementNode>, elements: Node | Node[], options?: Options<Node, ElementNode> | undefined) => ElementNode | null;
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
export declare function is<Node, ElementNode extends Node>(elem: ElementNode, query: Query<ElementNode>, options?: Options<Node, ElementNode>): boolean;
/**
 * Alias for selectAll(query, elems, options).
 * @see [compile] for supported selector queries.
 */
export default selectAll;
/** @deprecated Use the `pseudos` option instead. */
export { aliases, filters, pseudos } from "./pseudo-selectors/index.js";
//# sourceMappingURL=index.d.ts.map