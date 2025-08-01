// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to ban usage of assert.equal
 * @author Jack Franklin
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Helper type guard to check for assert.equal calls
function isAssertEqualCall(node: TSESTree.Node): node is TSESTree.CallExpression&{
  callee: TSESTree.MemberExpression&{
    object: TSESTree.Identifier & {name: 'assert'},
    property: TSESTree.Identifier & {name: 'equal'},
  },
}
{
  return node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
      node.callee.object.type === 'Identifier' && node.callee.object.name === 'assert' &&
      node.callee.property.type === 'Identifier' && node.callee.property.name === 'equal';
}

export default createRule({
  name: 'no-assert-equal',
  meta: {
    type: 'problem',

    docs: {
      description: 'Disallow usage of assert.equal',
      category: 'Possible Errors',
    },
    messages: {
      noAssertEqual:
          'assert.equal is non-strict. Use assert.strictEqual for primitives or assert.deepEqual for objects/arrays.',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node) {
        if (!isAssertEqualCall(node)) {
          return;
        }

        const calleeProperty = node.callee.property;

        context.report({
          node,
          messageId: 'noAssertEqual',
          fix(fixer) {
            // Get the second argument node. Need at least two arguments for comparison.
            const arg1 = node.arguments[1];
            if (!arg1) {
              // Cannot determine the type to fix, so don't fix.
              return null;
            }

            const compareToType = arg1.type;

            if (
                // Match number, string, boolean, null literals
                compareToType === 'Literal' ||
                // Match template literals (`` string)
                compareToType === 'TemplateLiteral') {
              return fixer.replaceText(calleeProperty, 'strictEqual');
            }

            if (
                // Match any object `{...}`
                compareToType === 'ObjectExpression' ||
                // Match any array `[...]`
                compareToType === 'ArrayExpression') {
              return fixer.replaceText(calleeProperty, 'deepEqual');
            }

            return null;
          },
        });
      },
    };
  },
});
