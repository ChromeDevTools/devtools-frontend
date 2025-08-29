// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

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
    function isAssertDeepStrictEqual(node: TSESTree.Expression): node is TSESTree.MemberExpression&{
      property: TSESTree.Identifier,
    }
    {
      return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
          node.property.type === 'Identifier' && node.property.name === 'deepStrictEqual';
    }

    return {
      CallExpression(node) {
        const callee = node.callee;
        if (isAssertDeepStrictEqual(callee)) {
          context.report({
            node,
            messageId: 'unexpectedAssertDeepStrictEqual',
            fix(fixer) {
              return fixer.replaceText(callee.property, 'deepEqual');
            }
          });
        }
      }
    };
  },
});
