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
 * Applies `mapfn` to `node` and the tree below `node`, returning a flattened
 * list of results.
 */
export declare function treeMap<U>(node: Node, mapfn: (node: Node) => U[]): U[];
/**
 * Walk the tree down from `node`, applying the `predicate` function.
 * Return the first node that matches the given predicate.
 *
 * @returns `null` if no node matches, parse5 node object if a node matches.
 */
export declare function nodeWalk(node: Node, predicate: Predicate, getChildNodes?: GetChildNodes): Node | null;
/**
 * Walk the tree down from `node`, applying the `predicate` function.
 * All nodes matching the predicate function from `node` to leaves will be
 * returned.
 */
export declare function nodeWalkAll(node: Node, predicate: Predicate, matches?: Node[], getChildNodes?: GetChildNodes): Node[];
/**
 * Equivalent to `nodeWalk`, but only returns nodes that are either
 * ancestors or earlier siblings in the document.
 *
 * Nodes are searched in reverse document order, starting from the sibling
 * prior to `node`.
 */
export declare function nodeWalkPrior(node: Node, predicate: Predicate): Node | undefined;
/**
 * Equivalent to `nodeWalkAll`, but only returns nodes that are either
 * ancestors or earlier cousins/siblings in the document.
 *
 * Nodes are returned in reverse document order, starting from `node`.
 */
export declare function nodeWalkAllPrior(node: Node, predicate: Predicate, matches?: Node[]): Node[];
/**
 * Walk the tree up from the parent of `node`, to its grandparent and so on to
 * the root of the tree.  Return the first ancestor that matches the given
 * predicate.
 */
export declare function nodeWalkAncestors(node: Node, predicate: Predicate): Node | undefined;
/**
 * Equivalent to `nodeWalk`, but only matches elements
 */
export declare function query(node: Node, predicate: Predicate, getChildNodes?: GetChildNodes): Node | null;
/**
 * Equivalent to `nodeWalkAll`, but only matches elements
 */
export declare function queryAll(node: Node, predicate: Predicate, matches?: Node[], getChildNodes?: GetChildNodes): Node[];
