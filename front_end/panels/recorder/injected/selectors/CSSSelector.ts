// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {SelectorPart, type Selector} from './Selector.js';

export interface QueryableNode extends Node {
  querySelectorAll(selectors: string): NodeListOf<Element>;
}

const idSelector = (id: string): string => {
  return `#${CSS.escape(id)}`;
};

const attributeSelector = (name: string, value: string): string => {
  return `[${name}='${CSS.escape(value)}']`;
};

const classSelector = (selector: string, className: string): string => {
  return `${selector}.${CSS.escape(className)}`;
};

const nthTypeSelector = (selector: string, index: number): string => {
  return `${selector}:nth-of-type(${index + 1})`;
};

const typeSelector = (selector: string, type: string): string => {
  return `${selector}${attributeSelector('type', type)}`;
};

const hasUniqueId = (node: Element): boolean => {
  return (Boolean(node.id) && (node.getRootNode() as QueryableNode).querySelectorAll(idSelector(node.id)).length === 1);
};

const isUniqueAmongTagNames = (
    node: Element,
    children: Iterable<Element>,
    ): boolean => {
  for (const child of children) {
    if (child !== node && child.tagName === node.tagName) {
      return false;
    }
  }
  return true;
};

const isUniqueAmongInputTypes = (
    node: HTMLInputElement,
    children: Iterable<Element>,
    ): boolean => {
  for (const child of children) {
    if (child !== node && child instanceof HTMLInputElement && child.type === node.type) {
      return false;
    }
  }
  return true;
};

const getUniqueClassName = (
    node: Element,
    children: Iterable<Element>,
    ): string|undefined => {
  const classNames = new Set(node.classList);
  for (const child of children) {
    if (child !== node) {
      for (const className of child.classList) {
        classNames.delete(className);
      }
      if (classNames.size === 0) {
        break;
      }
    }
  }
  if (classNames.size > 0) {
    return classNames.values().next().value;
  }
  return undefined;
};

const getTypeIndex = (node: Element, children: Iterable<Element>): number => {
  let nthTypeIndex = 0;
  for (const child of children) {
    if (child === node) {
      return nthTypeIndex;
    }
    if (child.tagName === node.tagName) {
      ++nthTypeIndex;
    }
  }
  throw new Error('Node not found in children');
};

export const getSelectorPart = (
    node: Node,
    attributes: string[] = [],
    ): SelectorPart|undefined => {
  if (!(node instanceof Element)) {
    return;
  }

  // Declared attibutes have the greatest priority.
  for (const attribute of attributes) {
    const value = node.getAttribute(attribute);
    if (value) {
      return new SelectorPart(attributeSelector(attribute, value), true);
    }
  }

  // IDs are supposed to be globally unique, so this has second priority.
  if (hasUniqueId(node)) {
    return new SelectorPart(idSelector(node.id), true);
  }

  // All selectors will be prefixed with the tag name starting here.
  const selector = node.tagName.toLowerCase();

  // These can only appear once in the entire document, so handle this fast.
  switch (node.tagName) {
    case 'BODY':
    case 'HEAD':
    case 'HTML':
      return new SelectorPart(selector, true);
  }

  const parent = node.parentNode;
  // If the node has no parent, then the node must be detached. We handle this
  // gracefully.
  if (!parent) {
    return new SelectorPart(selector, true);
  }

  const children = parent.children;

  // Determine if the child has a unique node name among all children.
  if (isUniqueAmongTagNames(node, children)) {
    return new SelectorPart(selector, true);
  }

  // If it's an input, check uniqueness among types.
  if (node instanceof HTMLInputElement && isUniqueAmongInputTypes(node, children)) {
    return new SelectorPart(typeSelector(selector, node.type), true);
  }

  // Determine if the child has a unique class name.
  const className = getUniqueClassName(node, children);
  if (className !== undefined) {
    return new SelectorPart(classSelector(selector, className), true);
  }

  // Last resort. Just use the nth-type index. A priori, this will always exists.
  return new SelectorPart(
      nthTypeSelector(selector, getTypeIndex(node, children)),
      false,
  );
};

/**
 * This interface represents operations on an ordered range of indices of type
 * `I`. Implementations must have the following assumptions:
 *
 *  1. `self(self(i)) = self(i)`, i.e. `self` must be idempotent.
 *  2. `inc(i) > i`.
 *  3. `j >= i` implies `gte(valueOf(j), i)`, i.e. `gte` preserves the order of
 *     the range.
 *
 */
export interface RangeOps<I, V> {
  // Returns a suitable version of an index (e.g. ShadowRoot.host instead of
  // ShadowRoot).
  self?(index: I): I;

  // Increments the given index by 1.
  inc(index: I): I;

  // Gets the value at the given index.
  valueOf(index: I): V;

  // Must preserve `j >= i` if `value === valueOf(j)`.
  gte(value: V, index: I): boolean;
}

/**
 * The goal of this function is to find the smallest index `i` that makes
 * `gte(valueOf(i), j)` true for all `j` in `[min, max)`. We do not use binary
 * search because
 *
 *  1. We expect the min-max to be concentrated towards the minimum (< 10
 *     iterations).
 *  2. We expect `valueOf` to be `O(n)`, so together with (1), the average will
 *     be around `O(n)` which is significantly faster than binary search in this
 *     case.
 */
export const findMinMax = <I, V>(
    [min, max]: [I, I],
    fns: RangeOps<I, V>,
    ): V => {
  fns.self ??= (i): I => i;

  let index = fns.inc(min);
  let value: V;
  let isMax: boolean;
  do {
    value = fns.valueOf(min);
    isMax = true;
    while (index !== max) {
      min = fns.self(index);
      index = fns.inc(min);
      if (!fns.gte(value, index)) {
        isMax = false;
        break;
      }
    }
  } while (!isMax);
  return value;
};

export class SelectorRangeOps implements RangeOps<QueryableNode, string> {
  // Close chains (using `>`) are stored in inner arrays.
  #buffer: SelectorPart[][] = [[]];
  #attributes: string[];
  #depth = 0;

  constructor(attributes: string[] = []) {
    this.#attributes = attributes;
  }

  inc(node: Node): QueryableNode {
    return node.parentNode ?? (node.getRootNode() as QueryableNode);
  }
  valueOf(node: Node): string {
    const part = getSelectorPart(node, this.#attributes);
    if (!part) {
      throw new Error('Node is not an element');
    }
    if (this.#depth > 1) {
      // Implies this selector is for a distant ancestor.
      this.#buffer.unshift([part]);
    } else {
      // Implies this selector is for a parent.
      this.#buffer[0].unshift(part);
    }
    this.#depth = 0;
    return this.#buffer.map(parts => parts.join(' > ')).join(' ');
  }
  gte(selector: string, node: QueryableNode): boolean {
    ++this.#depth;
    return node.querySelectorAll(selector).length === 1;
  }
}

/**
 * Computes the CSS selector for a node.
 *
 * @param node - The node to compute.
 * @returns The computed CSS selector.
 *
 * @internal
 */
export const computeCSSSelector = (
    node: Node,
    attributes?: string[],
    ): Selector|undefined => {
  const selectors = [];

  // We want to find the minimal selector that is unique within a document. We
  // are slightly restricted since selectors cannot cross ShadowRoot borders, so
  // the actual goal is to find the minimal selector that is unique within a
  // root node. We then need to repeat this for each shadow root.
  try {
    let root: Document|ShadowRoot;
    while (node instanceof Element) {
      root = node.getRootNode() as Document | ShadowRoot;
      selectors.unshift(
          findMinMax(
              [node as QueryableNode, root],
              new SelectorRangeOps(attributes),
              ),
      );
      node = root instanceof ShadowRoot ? root.host : root;
    }
  } catch {
    return undefined;
  }

  return selectors;
};

export const queryCSSSelectorAll = (selectors: Selector): Element[] => {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  } else if (selectors.length === 0) {
    return [];
  }
  let lists: NodeListOf<Element>[] = [
    [document.documentElement] as unknown as NodeListOf<Element>,
  ];
  do {
    const selector = selectors.shift() as string;
    const roots: NodeListOf<Element>[] = [];
    for (const nodes of lists) {
      for (const node of nodes) {
        const list = (node.shadowRoot ?? node).querySelectorAll(selector);
        if (list.length > 0) {
          roots.push(list);
        }
      }
    }
    lists = roots;
  } while (selectors.length > 0 && lists.length > 0);
  return lists.flatMap(list => [...list]);
};
