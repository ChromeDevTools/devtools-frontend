// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Disallow `assert.strictEqual` and `assert.notStrictEqual`
 * with array or object literals.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {type AssertCallExpression, isAssertMethodCall} from './helpers/helpers.ts';
import {createRule} from './utils/ruleCreator.ts';

type MessageIds =|'unexpectedAssertStrictEqual'|'unexpectedAssertNotStrictEqual';

/** Type guard for ArrayExpression or ObjectExpression **/
function isArrayOrObjectExpression(
    node: TSESTree.Node,
    ): node is TSESTree.ArrayExpression|TSESTree.ObjectExpression {
  return node.type === 'ArrayExpression' || node.type === 'ObjectExpression';
}

export default createRule<[], MessageIds>({
  name: 'no-assert-strict-equal-for-arrays-and-objects',
  meta: {
    type: 'problem',

    docs: {
      description: 'Disallow `assert.strictEqual` and `assert.notStrictEqual` for arrays and objects',
      category: 'Possible Errors',
    },
    messages: {
      unexpectedAssertStrictEqual:
          'Don\'t use `assert.strictEqual` to compare arrays or objects. Use `assert.deepEqual` instead.',
      unexpectedAssertNotStrictEqual:
          'Don\'t use `assert.notStrictEqual` to compare arrays or objects. Use `assert.notDeepEqual` instead.',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function reportError(
        node: AssertCallExpression<'strictEqual'|'notStrictEqual'>,
        calleePropertyText: 'deepEqual'|'notDeepEqual',
        messageId: MessageIds,
        ): void {
      const calleeProperty = node.callee.property;
      context.report({
        node,
        messageId,
        fix(fixer) {
          return fixer.replaceText(calleeProperty, calleePropertyText);
        },
      });
    }

    return {
      CallExpression(node) {
        const hasArrayOrObjectLiteralArg = node.arguments.some(
            isArrayOrObjectExpression,
        );
        if (!hasArrayOrObjectLiteralArg) {
          return;
        }

        if (isAssertMethodCall(node, 'strictEqual')) {
          reportError(node, 'deepEqual', 'unexpectedAssertStrictEqual');
        } else if (isAssertMethodCall(node, 'notStrictEqual')) {
          reportError(node, 'notDeepEqual', 'unexpectedAssertNotStrictEqual');
        }
      },
    };
  },
});
