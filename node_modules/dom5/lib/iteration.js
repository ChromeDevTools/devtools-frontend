"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
const predicates_1 = require("./predicates");
const util_1 = require("./util");
/**
 * Applies `mapfn` to `node` and the tree below `node`, yielding a flattened
 * list of results.
 */
function* treeMap(node, mapfn, getChildNodes) {
    for (const child of depthFirst(node, getChildNodes)) {
        yield* mapfn(child);
    }
}
exports.treeMap = treeMap;
/**
 * Yields `node` and all of its children, recursively.
 *
 * Yields `node` first, then yields each descendent in depth first order.
 */
function* depthFirst(node, getChildNodes = util_1.defaultChildNodes) {
    yield node;
    const childNodes = getChildNodes(node);
    if (childNodes === undefined) {
        return;
    }
    for (const child of childNodes) {
        yield* depthFirst(child, getChildNodes);
    }
}
exports.depthFirst = depthFirst;
/**
 * Yields node and all its descendents in reverse document order.
 *
 * Equivalent to:
 *    yield* [...depthFirst(node)].reverse()
 */
function* depthFirstReversed(node, getChildNodes = util_1.defaultChildNodes) {
    const childNodes = getChildNodes(node);
    if (childNodes !== undefined) {
        for (const child of reversedView(childNodes)) {
            yield* depthFirstReversed(child, getChildNodes);
        }
    }
    yield node;
}
exports.depthFirstReversed = depthFirstReversed;
/**
 * Like `depthFirst`, but descends into the bodies of `<template>`s.
 */
function depthFirstIncludingTemplates(node) {
    return depthFirst(node, util_1.childNodesIncludeTemplate);
}
exports.depthFirstIncludingTemplates = depthFirstIncludingTemplates;
/**
 * Yields `node` and each of its ancestors leading up the tree.
 */
function* ancestors(node) {
    let currNode = node;
    while (currNode !== undefined) {
        yield currNode;
        currNode = currNode.parentNode;
    }
}
exports.ancestors = ancestors;
/**
 * Yields each element that has the same parent as `node` but that
 * comes before it in the document.
 *
 * Nodes are yielded in reverse document order (i.e. starting with the one
 * closest to `node`)
 */
function* previousSiblings(node) {
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
        throw new Error(`Inconsistent parse5 tree: parent does not know about child`);
    }
    yield* reversedView(siblings, index - 1);
}
exports.previousSiblings = previousSiblings;
/** Iterate arr in reverse, optionally starting at a given index. */
function* reversedView(arr, initialIndex = arr.length - 1) {
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
function* prior(node) {
    for (const previousSibling of previousSiblings(node)) {
        yield* depthFirstReversed(previousSibling);
    }
    const parent = node.parentNode;
    if (parent) {
        yield parent;
        yield* prior(parent);
    }
}
exports.prior = prior;
/**
 * Like queryAll, but just returns the first result.
 */
function query(node, predicate, getChildNodes = util_1.defaultChildNodes) {
    for (const result of queryAll(node, predicate, getChildNodes)) {
        return result;
    }
    return null;
}
exports.query = query;
/**
 * Applies `depthFirst` to node and yields each Element that matches the given
 * predicate.
 */
function* queryAll(node, predicate, getChildNodes = util_1.defaultChildNodes) {
    const elementPredicate = predicates_1.predicates.AND(predicates_1.isElement, predicate);
    for (const desc of depthFirst(node, getChildNodes)) {
        if (elementPredicate(desc)) {
            yield desc;
        }
    }
}
exports.queryAll = queryAll;
//# sourceMappingURL=iteration.js.map