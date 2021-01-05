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

import {isElement, Predicate, predicates as p} from './predicates';
import {childNodesIncludeTemplate, defaultChildNodes, GetChildNodes} from './util';

export {ASTNode as Node} from 'parse5';

/**
 * Applies `mapfn` to `node` and the tree below `node`, yielding a flattened
 * list of results.
 */
export function*
    treeMap<U>(
        node: Node,
        mapfn: (node: Node) => Iterable<U>,
        getChildNodes?: GetChildNodes): IterableIterator<U> {
  for (const child of depthFirst(node, getChildNodes)) {
    yield* mapfn(child);
  }
}


/**
 * Yields `node` and all of its children, recursively.
 *
 * Yields `node` first, then yields each descendent in depth first order.
 */
export function*
    depthFirst(node: Node, getChildNodes: GetChildNodes = defaultChildNodes):
        IterableIterator<Node> {
  yield node;
  const childNodes = getChildNodes(node);
  if (childNodes === undefined) {
    return;
  }
  for (const child of childNodes) {
    yield* depthFirst(child, getChildNodes);
  }
}

/**
 * Yields node and all its descendents in reverse document order.
 *
 * Equivalent to:
 *    yield* [...depthFirst(node)].reverse()
 */
export function*
    depthFirstReversed(
        node: Node, getChildNodes: GetChildNodes = defaultChildNodes):
        IterableIterator<Node> {
  const childNodes = getChildNodes(node);
  if (childNodes !== undefined) {
    for (const child of reversedView(childNodes)) {
      yield* depthFirstReversed(child, getChildNodes);
    }
  }
  yield node;
}

/**
 * Like `depthFirst`, but descends into the bodies of `<template>`s.
 */
export function depthFirstIncludingTemplates(node: Node) {
  return depthFirst(node, childNodesIncludeTemplate);
}

/**
 * Yields `node` and each of its ancestors leading up the tree.
 */
export function* ancestors(node: Node): IterableIterator<Node> {
  let currNode: Node|undefined = node;
  while (currNode !== undefined) {
    yield currNode;
    currNode = currNode.parentNode;
  }
}

/**
 * Yields each element that has the same parent as `node` but that
 * comes before it in the document.
 *
 * Nodes are yielded in reverse document order (i.e. starting with the one
 * closest to `node`)
 */
export function* previousSiblings(node: Node): IterableIterator<Node> {
  const parent = node.parentNode;
  if (parent === undefined) {
    return;
  }
  const siblings = parent.childNodes;
  if (siblings === undefined) {
    throw new Error(`Inconsistent parse5 tree: parent does not have children`);
  }
  const index = siblings.indexOf(node);
  if (index === -1) {
    throw new Error(
        `Inconsistent parse5 tree: parent does not know about child`);
  }
  yield* reversedView(siblings, index - 1);
}

/** Iterate arr in reverse, optionally starting at a given index. */
function* reversedView<U>(arr: U[], initialIndex = arr.length - 1) {
  for (let index = initialIndex; index >= 0; index--) {
    yield arr[index];
  }
}

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
export function* prior(node: Node): IterableIterator<Node> {
  for (const previousSibling of previousSiblings(node)) {
    yield* depthFirstReversed(previousSibling);
  }
  const parent = node.parentNode;
  if (parent) {
    yield parent;
    yield* prior(parent);
  }
}

/**
 * Like queryAll, but just returns the first result.
 */
export function query(
    node: Node,
    predicate: Predicate,
    getChildNodes: GetChildNodes = defaultChildNodes): Node|null {
  for (const result of queryAll(node, predicate, getChildNodes)) {
    return result;
  }
  return null;
}

/**
 * Applies `depthFirst` to node and yields each Element that matches the given
 * predicate.
 */
export function*
    queryAll(
        node: Node,
        predicate: Predicate,
        getChildNodes: GetChildNodes = defaultChildNodes) {
  const elementPredicate = p.AND(isElement, predicate);
  for (const desc of depthFirst(node, getChildNodes)) {
    if (elementPredicate(desc)) {
      yield desc;
    }
  }
}
