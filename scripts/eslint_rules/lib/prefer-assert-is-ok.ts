// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

export default createRule({
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
    function isAssertOk(calleeNode) {
      return calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier' &&
          calleeNode.property.name === 'ok';
    }

    function isAssertNotOk(calleeNode) {
      return calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier' &&
          calleeNode.property.name === 'notOk';
    }

    function isTruthyAssertion(calleeNode) {
      if (calleeNode.type === 'Identifier' && calleeNode.name === 'assert') {
        return true;
      }
      return calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier' &&
          TRUTHY_ASSERTIONS.has(calleeNode.property.name);
    }

    function isFalsyAssertion(calleeNode) {
      return calleeNode.type === 'MemberExpression' && calleeNode.object.type === 'Identifier' &&
          calleeNode.object.name === 'assert' && calleeNode.property.type === 'Identifier' &&
          FALSY_ASSERTIONS.has(calleeNode.property.name);
    }

    function reportError(node, calleeText, firstArgNode, messageId) {
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
        if (node.arguments.length >= 1) {
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
      }
    };
  },
});
