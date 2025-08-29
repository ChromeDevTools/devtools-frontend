// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Disallow `assert.strictEqual` and `assert.notStrictEqual`
 * with array or object literals.
 */

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'unexpectedAssertStrictEqual'|'unexpectedAssertNotStrictEqual';

type AssertCallExpression = TSESTree.CallExpression&{
  callee: TSESTree.MemberExpression & {
    object: TSESTree.Identifier & {name: 'assert'},
    property: TSESTree.Identifier & {name: 'strictEqual' | 'notStrictEqual'},
  },
};

// Type guard for assert.strictEqual/notStrictEqual member expressions
function isAssertStrictMemberExpression(
    node: TSESTree.CallExpression, methodName: 'strictEqual'|'notStrictEqual'): node is AssertCallExpression {
  const callee = node.callee;
  return callee.type === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.name === 'assert' &&
      callee.property.type === 'Identifier' && callee.property.name === methodName;
}

// Type guard for ArrayExpression or ObjectExpression
function isArrayOrObjectExpression(node: TSESTree.Node): node is TSESTree.ArrayExpression|TSESTree.ObjectExpression {
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
        node: AssertCallExpression,
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
        const hasArrayOrObjectLiteralArg = node.arguments.some(isArrayOrObjectExpression);
        if (!hasArrayOrObjectLiteralArg) {
          return;
        }

        if (isAssertStrictMemberExpression(node, 'strictEqual')) {
          reportError(node, 'deepEqual', 'unexpectedAssertStrictEqual');
        } else if (isAssertStrictMemberExpression(node, 'notStrictEqual')) {
          reportError(node, 'notDeepEqual', 'unexpectedAssertNotStrictEqual');
        }
      },
    };
  },
});
