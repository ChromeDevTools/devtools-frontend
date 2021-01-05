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

import {ASTNode as Node} from 'parse5';

import * as iteration from './iteration';
import {isElement, Predicate, predicates as p} from './predicates';
import {defaultChildNodes, GetChildNodes} from './util';

export {ASTNode as Node} from 'parse5';

/**
 * Applies `mapfn` to `node` and the tree below `node`, returning a flattened
 * list of results.
 */
export function treeMap<U>(node: Node, mapfn: (node: Node) => U[]): U[] {
  return Array.from(iteration.treeMap(node, mapfn));
}

function find<U>(iter: Iterable<U>, predicate: (u: U) => boolean) {
  for (const value of iter) {
    if (predicate(value)) {
      return value;
    }
  }
  return null;
}

function filter<U>(
    iter: Iterable<U>, predicate: (u: U) => boolean, matches: U[] = []) {
  for (const value of iter) {
    if (predicate(value)) {
      matches.push(value);
    }
  }
  return matches;
}

/**
 * Walk the tree down from `node`, applying the `predicate` function.
 * Return the first node that matches the given predicate.
 *
 * @returns `null` if no node matches, parse5 node object if a node matches.
 */
export function nodeWalk(
    node: Node,
    predicate: Predicate,
    getChildNodes: GetChildNodes = defaultChildNodes): Node|null {
  return find(iteration.depthFirst(node, getChildNodes), predicate);
}

/**
 * Walk the tree down from `node`, applying the `predicate` function.
 * All nodes matching the predicate function from `node` to leaves will be
 * returned.
 */
export function nodeWalkAll(
    node: Node,
    predicate: Predicate,
    matches?: Node[],
    getChildNodes: GetChildNodes = defaultChildNodes): Node[] {
  return filter(iteration.depthFirst(node, getChildNodes), predicate, matches);
}

/**
 * Equivalent to `nodeWalk`, but only returns nodes that are either
 * ancestors or earlier siblings in the document.
 *
 * Nodes are searched in reverse document order, starting from the sibling
 * prior to `node`.
 */
export function nodeWalkPrior(node: Node, predicate: Predicate): Node|
    undefined {
  const result = find(iteration.prior(node), predicate);
  if (result === null) {
    return undefined;
  }
  return result;
}

function* iteratePriorIncludingNode(node: Node) {
  yield node;
  yield* iteration.prior(node);
}

/**
 * Equivalent to `nodeWalkAll`, but only returns nodes that are either
 * ancestors or earlier cousins/siblings in the document.
 *
 * Nodes are returned in reverse document order, starting from `node`.
 */
export function nodeWalkAllPrior(
    node: Node, predicate: Predicate, matches?: Node[]): Node[] {
  return filter(iteratePriorIncludingNode(node), predicate, matches);
}

/**
 * Walk the tree up from the parent of `node`, to its grandparent and so on to
 * the root of the tree.  Return the first ancestor that matches the given
 * predicate.
 */
export function nodeWalkAncestors(node: Node, predicate: Predicate): Node|
    undefined {
  const result = find(iteration.ancestors(node), predicate);
  if (result === null) {
    return undefined;
  }
  return result;
}

/**
 * Equivalent to `nodeWalk`, but only matches elements
 */
export function query(
    node: Node,
    predicate: Predicate,
    getChildNodes: GetChildNodes = defaultChildNodes): Node|null {
  const elementPredicate = p.AND(isElement, predicate);
  return nodeWalk(node, elementPredicate, getChildNodes);
}

/**
 * Equivalent to `nodeWalkAll`, but only matches elements
 */
export function queryAll(
    node: Node,
    predicate: Predicate,
    matches?: Node[],
    getChildNodes: GetChildNodes = defaultChildNodes): Node[] {
  const elementPredicate = p.AND(isElement, predicate);
  return nodeWalkAll(node, elementPredicate, matches, getChildNodes);
}
