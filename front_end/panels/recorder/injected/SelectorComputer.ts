// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/es_modules_import */

import {type SelectorType} from '../../../third_party/puppeteer-replay/puppeteer-replay.js';
import {type Logger} from './Logger.js';
import {MonotonicArray} from './MonotonicArray.js';

import {
  computeARIASelector,
  type AccessibilityBindings,
} from './selectors/ARIASelector.js';
import {computeCSSSelector} from './selectors/CSSSelector.js';
import {computePierceSelector} from './selectors/PierceSelector.js';
import {type Selector} from './selectors/Selector.js';
import {computeTextSelector} from './selectors/TextSelector.js';
import {computeXPath} from './selectors/XPath.js';

const prefixSelector = (
    selector: Selector|undefined,
    prefix: string,
    ): Selector|undefined => {
  if (selector === undefined) {
    return;
  }
  if (typeof selector === 'string') {
    return `${prefix}/${selector}`;
  }
  return selector.map(selector => `${prefix}/${selector}`);
};

export class SelectorComputer {
  #customAttributes = [
    // Most common attributes first.
    'data-testid',
    'data-test',
    'data-qa',
    'data-cy',
    'data-test-id',
    'data-qa-id',
    'data-testing',
  ];

  #bindings: AccessibilityBindings;
  #logger: Logger;
  #nodes = new MonotonicArray<Node>();
  #selectorFunctionsInOrder: Array<(node: Node) => Selector | undefined>;

  constructor(
      bindings: AccessibilityBindings,
      logger: Logger,
      customAttribute = '',
      selectorTypesToRecord?: SelectorType[],
  ) {
    this.#bindings = bindings;
    this.#logger = logger;

    let selectorOrder = [
      'aria',
      'css',
      'xpath',
      'pierce',
      'text',
    ] as SelectorType[];
    if (customAttribute) {
      // Custom DOM attributes indicate a preference for CSS/XPath selectors.
      this.#customAttributes.unshift(customAttribute);
      selectorOrder = [
        'css',
        'xpath',
        'pierce',
        'aria',
        'text',
      ] as SelectorType[];
    }

    this.#selectorFunctionsInOrder = selectorOrder
                                         .filter(type => {
                                           if (selectorTypesToRecord) {
                                             return selectorTypesToRecord.includes(type);
                                           }
                                           return true;
                                         })
                                         .map(selectorType => {
                                           switch (selectorType) {
                                             case 'css':
                                               return this.getCSSSelector.bind(this);
                                             case 'xpath':
                                               return this.getXPathSelector.bind(this);
                                             case 'pierce':
                                               return this.getPierceSelector.bind(this);
                                             case 'aria':
                                               return this.getARIASelector.bind(this);
                                             case 'text':
                                               return this.getTextSelector.bind(this);
                                             default:
                                               throw new Error('Unknown selector type: ' + selectorType);
                                           }
                                         });
  }

  getSelectors(node: Node): Selector[] {
    const selectors: Selector[] = [];
    for (const getSelector of this.#selectorFunctionsInOrder) {
      const selector = getSelector(node);
      if (selector) {
        selectors.push(selector);
      }
    }
    return selectors;
  }

  getCSSSelector(node: Node): Selector|undefined {
    return this.#logger.timed(`getCSSSelector: ${this.#nodes.getOrInsert(node)} ${node.nodeName}`, () => {
      return computeCSSSelector(node, this.#customAttributes);
    });
  }

  getTextSelector(node: Node): Selector|undefined {
    return this.#logger.timed(`getTextSelector: ${this.#nodes.getOrInsert(node)} ${node.nodeName}`, () => {
      return prefixSelector(computeTextSelector(node), 'text');
    });
  }

  getXPathSelector(node: Node): Selector|undefined {
    return this.#logger.timed(`getXPathSelector: ${this.#nodes.getOrInsert(node)} ${node.nodeName}`, () => {
      return prefixSelector(
          computeXPath(node, true, this.#customAttributes),
          'xpath',
      );
    });
  }

  getPierceSelector(node: Node): Selector|undefined {
    return this.#logger.timed(`getPierceSelector: ${this.#nodes.getOrInsert(node)} ${node.nodeName}`, () => {
      return prefixSelector(
          computePierceSelector(node, this.#customAttributes),
          'pierce',
      );
    });
  }

  getARIASelector(node: Node): Selector|undefined {
    return this.#logger.timed(`getARIASelector: ${this.#nodes.getOrInsert(node)} ${node.nodeName}`, () => {
      return prefixSelector(computeARIASelector(node, this.#bindings), 'aria');
    });
  }
}
