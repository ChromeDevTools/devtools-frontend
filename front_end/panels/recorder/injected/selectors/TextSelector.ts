// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  createTextContent,
} from '../../../../third_party/puppeteer/package/lib/esm/puppeteer/injected/TextContent.js';
import {
  textQuerySelectorAll,
} from '../../../../third_party/puppeteer/package/lib/esm/puppeteer/injected/TextQuerySelector.js';

import type {Selector} from './Selector.js';

const MINIMUM_TEXT_LENGTH = 12;
const MAXIMUM_TEXT_LENGTH = 64;

const collect = <T>(iter: Iterable<T>, max = Infinity): T[] => {
  const results = [];
  for (const value of iter) {
    if (max <= 0) {
      break;
    }
    results.push(value);
    --max;
  }
  return results;
};

/**
 * Computes the text selector for a node.
 *
 * @param node - The node to compute.
 * @returns The computed text selector.
 *
 * @internal
 */
export const computeTextSelector = (node: Node): Selector|undefined => {
  const content = createTextContent(node).full.trim();
  if (!content) {
    return;
  }

  // If it's short, just return it.
  if (content.length <= MINIMUM_TEXT_LENGTH) {
    const elements = collect(textQuerySelectorAll(document, content), 2);
    if (elements.length !== 1 || elements[0] !== node) {
      return;
    }
    return [content];
  }

  // If it's too long, it's probably irrelevant.
  if (content.length > MAXIMUM_TEXT_LENGTH) {
    return;
  }

  // We do a binary search for the optimal length of a substring starting at 0.
  let left = MINIMUM_TEXT_LENGTH;
  let right = content.length;
  while (left <= right) {
    const center = left + ((right - left) >> 2);
    const elements = collect(
        textQuerySelectorAll(document, content.slice(0, center)),
        2,
    );
    if (elements.length !== 1 || elements[0] !== node) {
      left = center + 1;
    } else {
      right = center - 1;
    }
  }

  // Never matched.
  if (right === content.length) {
    return;
  }

  // We attempt to round the word in the event we are in the middle of a word.
  const length = right + 1;
  const remainder = content.slice(length, length + MAXIMUM_TEXT_LENGTH);
  return [content.slice(0, length + remainder.search(/ |$/))];
};
