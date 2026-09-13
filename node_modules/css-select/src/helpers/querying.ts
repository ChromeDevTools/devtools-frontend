import type { Adapter, InternalOptions, Predicate } from "../types.js";

/**
 * Find all elements matching the query. If not in XML mode, the query will ignore
 * the contents of `<template>` elements.
 *
 * @param query - Function that returns true if the element matches the query.
 * @param elems - Nodes to query. If a node is an element, its children will be queried.
 * @param options - Options for querying the document.
 * @returns All matching elements.
 */
export function findAll<Node, ElementNode extends Node>(
    query: Predicate<ElementNode>,
    elems: Node[],
    options: InternalOptions<Node, ElementNode>,
): ElementNode[] {
    const { adapter, xmlMode = false } = options;
    const result: ElementNode[] = [];
    /** Stack of the arrays we are looking at. */
    const nodeStack = [elems];
    /** Stack of the indices within the arrays. */
    const indexStack = [0];

    for (;;) {
        // First, check if the current array has any more elements to look at.
        if (indexStack[0] >= nodeStack[0].length) {
            // If we have no more arrays to look at, we are done.
            if (nodeStack.length === 1) {
                return result;
            }

            nodeStack.shift();
            indexStack.shift();

            // Loop back to the start to continue with the next array.
            continue;
        }

        const elem = nodeStack[0][indexStack[0]++];

        if (!adapter.isTag(elem)) {
            continue;
        }
        if (query(elem)) {
            result.push(elem);
        }

        if (xmlMode || adapter.getName(elem) !== "template") {
            /*
             * Add the children to the stack. We are depth-first, so this is
             * the next array we look at.
             */
            const children = adapter.getChildren(elem);

            if (children.length > 0) {
                nodeStack.unshift(children);
                indexStack.unshift(0);
            }
        }
    }
}

/**
 * Find the first element matching the query. If not in XML mode, the query will ignore
 * the contents of `<template>` elements.
 *
 * @param query - Function that returns true if the element matches the query.
 * @param elems - Nodes to query. If a node is an element, its children will be queried.
 * @param options - Options for querying the document.
 * @returns The first matching element, or null if there was no match.
 */
export function findOne<Node, ElementNode extends Node>(
    query: Predicate<ElementNode>,
    elems: Node[],
    options: InternalOptions<Node, ElementNode>,
): ElementNode | null {
    const { adapter, xmlMode = false } = options;
    /** Stack of the arrays we are looking at. */
    const nodeStack = [elems];
    /** Stack of the indices within the arrays. */
    const indexStack = [0];

    for (;;) {
        // First, check if the current array has any more elements to look at.
        if (indexStack[0] >= nodeStack[0].length) {
            // If we have no more arrays to look at, we are done.
            if (nodeStack.length === 1) {
                return null;
            }

            nodeStack.shift();
            indexStack.shift();

            // Loop back to the start to continue with the next array.
            continue;
        }

        const elem = nodeStack[0][indexStack[0]++];

        if (!adapter.isTag(elem)) {
            continue;
        }
        if (query(elem)) {
            return elem;
        }

        if (xmlMode || adapter.getName(elem) !== "template") {
            /*
             * Add the children to the stack. We are depth-first, so this is
             * the next array we look at.
             */
            const children = adapter.getChildren(elem);

            if (children.length > 0) {
                nodeStack.unshift(children);
                indexStack.unshift(0);
            }
        }
    }
}

export function getNextSiblings<Node, ElementNode extends Node>(
    elem: Node,
    adapter: Adapter<Node, ElementNode>,
): ElementNode[] {
    const siblings = adapter.getSiblings(elem);
    if (siblings.length <= 1) {
        return [];
    }
    const elemIndex = siblings.indexOf(elem);
    if (elemIndex < 0 || elemIndex === siblings.length - 1) {
        return [];
    }
    return siblings.slice(elemIndex + 1).filter(adapter.isTag);
}

export function getElementParent<Node, ElementNode extends Node>(
    node: ElementNode,
    adapter: Adapter<Node, ElementNode>,
): ElementNode | null {
    const parent = adapter.getParent(node);
    return parent != null && adapter.isTag(parent) ? parent : null;
}
