// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

import {type Selector} from './Selector.js';

import {
  findMinMax,
  SelectorRangeOps,
  type RangeOps,
  type QueryableNode,
} from './CSSSelector.js';
import {
  pierceQuerySelectorAll,
} from
    '../../../../third_party/puppeteer/package/lib/esm/puppeteer/injected/PierceQuerySelector.js';

class PierceSelectorRangeOpts implements RangeOps<QueryableNode, string[][]> {
  #selector: string[][] = [[]];
  #attributes: string[];
  #depth = 0;

  constructor(attributes: string[] = []) {
    this.#attributes = attributes;
  }

  inc(node: Node): Document|ShadowRoot {
    return node.getRootNode() as Document | ShadowRoot;
  }
  self(node: Document|ShadowRoot): QueryableNode {
    return node instanceof ShadowRoot ? node.host : node;
  }
  valueOf(node: QueryableNode): string[][] {
    const selector = findMinMax(
        [node, node.getRootNode()],
        new SelectorRangeOps(this.#attributes),
    );
    if (this.#depth > 1) {
      this.#selector.unshift([selector]);
    } else {
      this.#selector[0].unshift(selector);
    }
    this.#depth = 0;
    return this.#selector;
  }
  gte(selector: string[][], node: Node): boolean {
    ++this.#depth;
    // Note we use some insider logic here. `valueOf(node)` will always
    // correspond to `selector.flat().slice(1)`, so it suffices to check
    // uniqueness for `selector.flat()[0]`.
    return pierceQuerySelectorAll(node, selector[0][0]).length === 1;
  }
}

/**
 * Computes the pierce CSS selector for a node.
 *
 * @param node - The node to compute.
 * @returns The computed pierce CSS selector.
 *
 * @internal
 */
export const computePierceSelector = (
    node: Node,
    attributes?: string[],
    ): string[]|undefined => {
  try {
    const ops = new PierceSelectorRangeOpts(attributes);
    return findMinMax([node, document], ops).flat();
  } catch {
    return undefined;
  }
};

export const queryPierceSelectorAll = (selectors: Selector): Element[] => {
  if (typeof selectors === 'string') {
    selectors = [selectors];
  } else if (selectors.length === 0) {
    return [];
  }
  let lists: Element[][] = [[document.documentElement]];
  do {
    const selector = selectors.shift() as string;
    const roots: Element[][] = [];
    for (const nodes of lists) {
      for (const node of nodes) {
        const list = pierceQuerySelectorAll(node.shadowRoot ?? node, selector);
        if (list.length > 0) {
          roots.push(list);
        }
      }
    }
    lists = roots;
  } while (selectors.length > 0 && lists.length > 0);
  return lists.flatMap(list => [...list]);
};
