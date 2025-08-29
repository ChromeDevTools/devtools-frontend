// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

const EQUALITY_ASSERTIONS = new Set(['deepEqual', 'deepStrictEqual', 'equal', 'strictEqual']);

function isAssertEquality(node: TSESTree.Expression) {
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && EQUALITY_ASSERTIONS.has(node.property.name);
}

function isLengthProperty(node: TSESTree.CallExpressionArgument): node is TSESTree.MemberExpression {
  return node.type === 'MemberExpression' && node.property.type === 'Identifier' && node.property.name === 'length';
}

function isNumberLiteral(node: TSESTree.Node) {
  return node.type === 'Literal' && typeof node.value === 'number';
}

export default createRule({
  name: 'prefer-assert-length-of',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer `assert.lengthOf` to check `length` of an array-like.',
      category: 'Best Practices',
    },
    messages: {
      useAssertLengthOf: 'Use `assert.lengthOf` to check `length` of an array-like',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function reportError(node: TSESTree.CallExpression) {
      context.report({
        node,
        messageId: 'useAssertLengthOf',
        fix(fixer) {
          const {sourceCode} = context;
          const calleeNode = node.callee;
          const [firstArgNode, secondArgNode] = node.arguments;

          const objectParentNode = isLengthProperty(firstArgNode) ? firstArgNode : secondArgNode;
          const objectNode = objectParentNode.type === 'MemberExpression' ? objectParentNode.object : null;

          if (!objectNode) {
            return [];
          }

          const lengthNode = isNumberLiteral(firstArgNode) ? firstArgNode : secondArgNode;
          return [
            fixer.replaceText(calleeNode, 'assert.lengthOf'),
            fixer.replaceText(firstArgNode, sourceCode.getText(objectNode)),
            fixer.replaceText(secondArgNode, sourceCode.getText(lengthNode)),
          ];
        }
      });
    }

    return {
      CallExpression(node) {
        if (isAssertEquality(node.callee) && node.arguments.length >= 2 &&
            (isLengthProperty(node.arguments[0]) && isNumberLiteral(node.arguments[1]) ||
             (isNumberLiteral(node.arguments[0]) && isLengthProperty(node.arguments[1])))) {
          reportError(node);
        }
      }
    };
  },
});
