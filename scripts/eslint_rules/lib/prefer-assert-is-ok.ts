// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

type MessageIds =
    'useAssertIsOk'|'useAssertIsOkInsteadOfNegation'|'useAssertIsNotOk'|'useAssertIsNotOkInsteadOfNegation';

function isAssertOk(node: TSESTree.Expression) {
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && node.property.name === 'ok';
}

function isAssertNotOk(node: TSESTree.Expression) {
  return node.type === 'MemberExpression' && node.object.type === 'Identifier' && node.object.name === 'assert' &&
      node.property.type === 'Identifier' && node.property.name === 'notOk';
}

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

export default createRule<unknown[], MessageIds>({
  name: 'prefer-assert-is-ok',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer `assert.isOk` and `assert.isNotOk` over `assert.ok` and `assert.notOk`.',
      category: 'Best Practices',
    },
    messages: {
      useAssertIsOk: 'Use `assert.isOk(e)` or `assert(e)` instead of `assert.ok(e)`',
      useAssertIsOkInsteadOfNegation: 'Use `assert.isOk(e)` instead of `assert.isNotOk(!e)`',
      useAssertIsNotOk: 'Use `assert.isNotOk(e)` or `assert(!e)` instead of `assert.notOk(e)`',
      useAssertIsNotOkInsteadOfNegation: 'Use `assert.isNotOk(e)` instead of `assert.isOk(!e)`',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    function reportError(
        node: TSESTree.CallExpression,
        calleeText: string,
        firstArgNode: TSESTree.CallExpressionArgument,
        messageId: MessageIds,
    ) {
      context.report({
        node,
        messageId,
        fix(fixer) {
          const {sourceCode} = context;
          return [
            fixer.replaceText(node.callee, calleeText),
            fixer.replaceText(node.arguments[0], sourceCode.getText(firstArgNode)),
          ];
        }
      });
    }

    return {
      CallExpression(node) {
        if (node.arguments.length < 1) {
          return;
        }

        const [argumentNode] = node.arguments;
        if (argumentNode.type === 'UnaryExpression' && argumentNode.operator === '!') {
          if (isTruthyAssertion(node.callee)) {
            reportError(node, 'assert.isNotOk', argumentNode.argument, 'useAssertIsNotOkInsteadOfNegation');
            return;
          }
          if (isFalsyAssertion(node.callee)) {
            reportError(node, 'assert.isOk', argumentNode.argument, 'useAssertIsOkInsteadOfNegation');
            return;
          }
        }

        if (isAssertOk(node.callee)) {
          reportError(node, 'assert.isOk', argumentNode, 'useAssertIsOk');
        } else if (isAssertNotOk(node.callee)) {
          reportError(node, 'assert.isNotOk', argumentNode, 'useAssertIsNotOk');
        }
      }

    };
  },
});
