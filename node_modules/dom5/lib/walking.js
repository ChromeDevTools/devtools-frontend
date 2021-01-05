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
const iteration = require("./iteration");
const predicates_1 = require("./predicates");
const util_1 = require("./util");
/**
 * Applies `mapfn` to `node` and the tree below `node`, returning a flattened
 * list of results.
 */
function treeMap(node, mapfn) {
    return Array.from(iteration.treeMap(node, mapfn));
}
exports.treeMap = treeMap;
function find(iter, predicate) {
    for (const value of iter) {
        if (predicate(value)) {
            return value;
        }
    }
    return null;
}
function filter(iter, predicate, matches = []) {
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
function nodeWalk(node, predicate, getChildNodes = util_1.defaultChildNodes) {
    return find(iteration.depthFirst(node, getChildNodes), predicate);
}
exports.nodeWalk = nodeWalk;
/**
 * Walk the tree down from `node`, applying the `predicate` function.
 * All nodes matching the predicate function from `node` to leaves will be
 * returned.
 */
function nodeWalkAll(node, predicate, matches, getChildNodes = util_1.defaultChildNodes) {
    return filter(iteration.depthFirst(node, getChildNodes), predicate, matches);
}
exports.nodeWalkAll = nodeWalkAll;
/**
 * Equivalent to `nodeWalk`, but only returns nodes that are either
 * ancestors or earlier siblings in the document.
 *
 * Nodes are searched in reverse document order, starting from the sibling
 * prior to `node`.
 */
function nodeWalkPrior(node, predicate) {
    const result = find(iteration.prior(node), predicate);
    if (result === null) {
        return undefined;
    }
    return result;
}
exports.nodeWalkPrior = nodeWalkPrior;
function* iteratePriorIncludingNode(node) {
    yield node;
    yield* iteration.prior(node);
}
/**
 * Equivalent to `nodeWalkAll`, but only returns nodes that are either
 * ancestors or earlier cousins/siblings in the document.
 *
 * Nodes are returned in reverse document order, starting from `node`.
 */
function nodeWalkAllPrior(node, predicate, matches) {
    return filter(iteratePriorIncludingNode(node), predicate, matches);
}
exports.nodeWalkAllPrior = nodeWalkAllPrior;
/**
 * Walk the tree up from the parent of `node`, to its grandparent and so on to
 * the root of the tree.  Return the first ancestor that matches the given
 * predicate.
 */
function nodeWalkAncestors(node, predicate) {
    const result = find(iteration.ancestors(node), predicate);
    if (result === null) {
        return undefined;
    }
    return result;
}
exports.nodeWalkAncestors = nodeWalkAncestors;
/**
 * Equivalent to `nodeWalk`, but only matches elements
 */
function query(node, predicate, getChildNodes = util_1.defaultChildNodes) {
    const elementPredicate = predicates_1.predicates.AND(predicates_1.isElement, predicate);
    return nodeWalk(node, elementPredicate, getChildNodes);
}
exports.query = query;
/**
 * Equivalent to `nodeWalkAll`, but only matches elements
 */
function queryAll(node, predicate, matches, getChildNodes = util_1.defaultChildNodes) {
    const elementPredicate = predicates_1.predicates.AND(predicates_1.isElement, predicate);
    return nodeWalkAll(node, elementPredicate, matches, getChildNodes);
}
exports.queryAll = queryAll;
//# sourceMappingURL=walking.js.map