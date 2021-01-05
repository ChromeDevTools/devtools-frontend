/**
 * @license
 * Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at
 * http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at
 * http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { ASTNode as Node } from 'parse5';
import { Predicate } from './predicates';
import { GetChildNodes } from './util';
export { ASTNode as Node } from 'parse5';
/**
 * Applies `mapfn` to `node` and the tree below `node`, yielding a flattened
 * list of results.
 */
export declare function treeMap<U>(node: Node, mapfn: (node: Node) => Iterable<U>, getChildNodes?: GetChildNodes): IterableIterator<U>;
/**
 * Yields `node` and all of its children, recursively.
 *
 * Yields `node` first, then yields each descendent in depth first order.
 */
export declare function depthFirst(node: Node, getChildNodes?: GetChildNodes): IterableIterator<Node>;
/**
 * Yields node and all its descendents in reverse document order.
 *
 * Equivalent to:
 *    yield* [...depthFirst(node)].reverse()
 */
export declare function depthFirstReversed(node: Node, getChildNodes?: GetChildNodes): IterableIterator<Node>;
/**
 * Like `depthFirst`, but descends into the bodies of `<template>`s.
 */
export declare function depthFirstIncludingTemplates(node: Node): IterableIterator<Node>;
/**
 * Yields `node` and each of its ancestors leading up the tree.
 */
export declare function ancestors(node: Node): IterableIterator<Node>;
/**
 * Yields each element that has the same parent as `node` but that
 * comes before it in the document.
 *
 * Nodes are yielded in reverse document order (i.e. starting with the one
 * closest to `node`)
 */
export declare function previousSiblings(node: Node): IterableIterator<Node>;
/**
 * Yields every node in the document that comes before `node`, in reverse
 * document order.
 *
 * So if you have a tree like:
 * ```html
 *   <body>
 *     <nav>
 *       <li></li>
 *     </nav>
 *     <div>
 *       <span></span>
 *       <b></b>
 *       <em></em>
 *       ...
 * ```
 *
 * Then `prior(<b>)` will yield:
 *
 *     <span>, <div>, <li>, <nav>, <body>, <head>, #document
 *
 * (`<head>` and `#document` are hallucinated by the html parser)
 */
export declare function prior(node: Node): IterableIterator<Node>;
/**
 * Like queryAll, but just returns the first result.
 */
export declare function query(node: Node, predicate: Predicate, getChildNodes?: GetChildNodes): Node | null;
/**
 * Applies `depthFirst` to node and yields each Element that matches the given
 * predicate.
 */
export declare function queryAll(node: Node, predicate: Predicate, getChildNodes?: GetChildNodes): IterableIterator<Node>;
