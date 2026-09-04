// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to ban usage of assert.equal
 * @author Jack Franklin
 */

import {isAssertMethodCall} from './helpers/helpers.ts';
import {createRule} from './utils/ruleCreator.ts';

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
        if (!isAssertMethodCall(node, 'equal')) {
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
