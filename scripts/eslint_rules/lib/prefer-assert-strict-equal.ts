// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

export default createRule({
  name: 'prefer-assert-strict-equal',
  meta: {
    type: 'suggestion',

    docs: {
      description:
          'Prefer explicit `assert.strictEqual(x, y)` or `assert.strictNotEqual(x, y)` over generic `assert(x === y)` or `assert.isFalse(x === y)',
      category: 'Best Practices',
    },
    messages: {
      useAssertStrictEqual: 'Use `assert.strictEqual` to assert that two values are strictly equal',
      useAssertNotStrictEqual: 'Use `assert.notStrictEqual` to assert that two values aren\'t strictly equal',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
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

    function reportError(node, calleeText, messageId) {
      context.report({
        node,
        messageId,
        fix(fixer) {
          const {sourceCode} = context;
          const calleeNode = node.callee;
          const [argumentNode] = node.arguments;
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
        if (node.arguments.length === 0) {
          return;
        }
        const [argumentNode] = node.arguments;
        if (argumentNode.type !== 'BinaryExpression') {
          return;
        }
        if (argumentNode.operator === '===') {
          if (isTruthyAssertion(node.callee)) {
            reportError(node, 'assert.strictEqual', 'useAssertStrictEqual');
          } else if (isFalsyAssertion(node.callee)) {
            reportError(node, 'assert.notStrictEqual', 'useAssertNotStrictEqual');
          }
        } else if (argumentNode.operator === '!==') {
          if (isFalsyAssertion(node.callee)) {
            reportError(node, 'assert.strictEqual', 'useAssertStrictEqual');
          } else if (isTruthyAssertion(node.callee)) {
            reportError(node, 'assert.notStrictEqual', 'useAssertNotStrictEqual');
          }
        }
      }
    };
  },
});
