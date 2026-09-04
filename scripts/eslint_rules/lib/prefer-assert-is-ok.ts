// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {isAssertMethodCall} from './helpers/helpers.ts';
import {createRule} from './utils/ruleCreator.ts';

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

type MessageIds =
    'useAssertIsOk'|'useAssertIsOkInsteadOfNegation'|'useAssertIsNotOk'|'useAssertIsNotOkInsteadOfNegation';

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
        },
      });
    }

    return {
      CallExpression(node) {
        if (node.arguments.length < 1) {
          return;
        }

        const [argumentNode] = node.arguments;
        if (argumentNode.type === 'UnaryExpression' && argumentNode.operator === '!') {
          if (isAssertMethodCall(node, TRUTHY_ASSERTIONS) ||
              (node.callee.type === 'Identifier' && node.callee.name === 'assert')) {
            reportError(node, 'assert.isNotOk', argumentNode.argument, 'useAssertIsNotOkInsteadOfNegation');
            return;
          }
          if (isAssertMethodCall(node, FALSY_ASSERTIONS)) {
            reportError(node, 'assert.isOk', argumentNode.argument, 'useAssertIsOkInsteadOfNegation');
            return;
          }
        }

        if (isAssertMethodCall(node, 'ok')) {
          reportError(node, 'assert.isOk', argumentNode, 'useAssertIsOk');
        } else if (isAssertMethodCall(node, 'notOk')) {
          reportError(node, 'assert.isNotOk', argumentNode, 'useAssertIsNotOk');
        }
      },

    };
  },
});
