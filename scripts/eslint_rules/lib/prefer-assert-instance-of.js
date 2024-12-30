// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prefer `assert.instanceOf` to assert that a value is an instance
 * of a class.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const FALSY_ASSERTIONS = new Set(['isFalse', 'isNotOk', 'isNotTrue', 'notOk']);
const TRUTHY_ASSERTIONS = new Set(['isNotFalse', 'isOk', 'isTrue', 'ok']);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
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
    schema: [], // no options
  },
  create: function (context) {
    function isTruthyAssertion(calleeNode) {
      if (calleeNode.type === 'Identifier' &&
          calleeNode.name === 'assert') {
        return true;
      }
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             TRUTHY_ASSERTIONS.has(calleeNode.property.name);
    }

    function isFalsyAssertion(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             FALSY_ASSERTIONS.has(calleeNode.property.name);
    }

    function isInstanceofExpression(argumentNode) {
      return argumentNode.type === 'BinaryExpression' &&
             argumentNode.operator === 'instanceof';
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
};
