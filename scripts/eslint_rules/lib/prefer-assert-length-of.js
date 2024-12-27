// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prefer `assert.lengthOf` to check `length` of an array-like.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const EQUALITY_ASSERTIONS = new Set(['deepEqual', 'deepStrictEqual', 'equal', 'strictEqual']);

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
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
    schema: [], // no options
  },
  create: function (context) {
    function isAssertEquality(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             EQUALITY_ASSERTIONS.has(calleeNode.property.name);
    }

    function isLengthProperty(argumentNode) {
      return argumentNode.type === 'MemberExpression' && argumentNode.property.type === 'Identifier' &&
          argumentNode.property.name === 'length';
    }

    function isNumberLiteral(argumentNode) {
      return argumentNode.type === 'Literal' &&
             typeof argumentNode.value === 'number';
    }

    function reportError(node) {
      context.report({
        node,
        messageId: 'useAssertLengthOf',
        fix(fixer) {
          const {sourceCode} = context;
          const calleeNode = node.callee;
          const [firstArgNode, secondArgNode] = node.arguments;
          const objectNode = (isLengthProperty(firstArgNode) ? firstArgNode : secondArgNode).object;
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
};
