// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

function isTruthyAssertion(node: TSESTree.Expression) {
  if (node.type === 'Identifier' && node.name === 'assert') {
    return true;
  }
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && TRUTHY_ASSERTIONS.has(node.property.name);
}

function isFalsyAssertion(node: TSESTree.Expression) {
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && FALSY_ASSERTIONS.has(node.property.name);
}

function isInstanceofExpression(node: TSESTree.CallExpressionArgument) {
  return node.type === 'BinaryExpression' && node.operator === 'instanceof';
}

export default createRule({
  name: 'prefer-assert-instance-of',
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Prefer `assert.instanceOf` to assert that a value is an instance of a class',
      category: 'Best Practices',
    },
    messages: {
      useAssertInstanceOf: 'Use `assert.instanceOf` to assert that a value is an instance of a class',
      useAssertNotInstanceOf: 'Use `assert.notInstanceOf` to assert that a value is not an instance of a class',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function reportError(
        node: TSESTree.CallExpression, calleeText: string, messageId: 'useAssertInstanceOf'|'useAssertNotInstanceOf') {
      context.report({
        node,
        messageId,
        fix(fixer) {
          const {sourceCode} = context;
          const calleeNode = node.callee;
          const [argumentNode] = node.arguments;
          if (!('left' in argumentNode && 'right' in argumentNode)) {
            return [];
          }
          const argumentText = `${sourceCode.getText(argumentNode.left)}, ${sourceCode.getText(argumentNode.right)}`;
          return [
            fixer.replaceText(calleeNode, calleeText),
            fixer.replaceText(argumentNode, argumentText),
          ];
        }
      });
    }

    return {
      CallExpression(node) {
        if (node.arguments.length >= 1 && isInstanceofExpression(node.arguments[0])) {
          if (isTruthyAssertion(node.callee)) {
            reportError(node, 'assert.instanceOf', 'useAssertInstanceOf');
          } else if (isFalsyAssertion(node.callee)) {
            reportError(node, 'assert.notInstanceOf', 'useAssertNotInstanceOf');
          }
        }
      }
    };
  },
});
