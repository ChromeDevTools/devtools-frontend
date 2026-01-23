// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file A library to identify and templatize Link and related calls.
 */

import {isIdentifier, isIdentifierChain, type RuleCreator} from './ast.ts';
import {DomFragment} from './dom-fragment.ts';

export const Link: RuleCreator = {
  create(context) {
    const sourceCode = context.sourceCode;

    return {
      CallExpression(node) {
        if (isIdentifierChain(node.callee, ['Link', 'create'])) {
          const domFragment = DomFragment.getOrCreate(node, sourceCode);
          domFragment.tagName = 'devtools-link';
          const url = node.arguments[0];
          if (url) {
            domFragment.attributes.push({
              key: 'href',
              value: url,
            });
          }
          const text = node.arguments[1];
          if (text && !isIdentifier(text, 'undefined')) {
            domFragment.textContent = text;
          }
          const className = node.arguments[2];
          if (className && !isIdentifier(className, 'undefined')) {
            domFragment.classList.push(className);
          }
          const jslogContext = node.arguments[3];
          if (jslogContext && !isIdentifier(jslogContext, 'undefined')) {
            domFragment.bindings.push({
              key: 'jslogContext',
              value: jslogContext,
            });
          }
          const tabIndex = node.arguments[4];
          if (tabIndex && (tabIndex.type !== 'Literal' || tabIndex.value !== 0)) {
            domFragment.attributes.push({
              key: 'tabindex',
              value: tabIndex,
            });
          }
        }
      }
    };
  }
};
