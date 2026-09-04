// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isAssertMethodCall} from './helpers/helpers.ts';
import {createRule} from './utils/ruleCreator.ts';

/**
 * @file Disallow usage of `assert.deepStrictEqual`.
 *
 * In chai, `deepStrictEqual` is an alias for `deepEqual`, and we want to
 * consistently use the latter to not leave developers wondering what's
 * the difference between these two. Also the `strict` part in the name might
 * lead to the wrong conclusion that this is about strict equality.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

export default createRule({
  name: 'no-assert-deep-strict-equal',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow usage of `assert.deepStrictEqual` in favor of `assert.deepEqual`.',
      category: 'Best Practices',
    },
    messages: {
      unexpectedAssertDeepStrictEqual: 'Unexpected assert.deepStrictEqual. Use assert.deepEqual instead.',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (isAssertMethodCall(node, 'deepStrictEqual')) {
          context.report({
            node,
            messageId: 'unexpectedAssertDeepStrictEqual',
            fix(fixer) {
              return fixer.replaceText(node.callee.property, 'deepEqual');
            },
          });
        }
      },
    };
  },
});
