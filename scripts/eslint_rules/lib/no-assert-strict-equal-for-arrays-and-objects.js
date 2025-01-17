// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Disallow `assert.strictEqual` and `assert.notStrictEqual`
 * with array or object literals.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Disallow `assert.strictEqual` and `assert.notStrictEqual` for arrays and objects',
      category: 'Possible Errors',
    },
    messages: {
      unexpectedAssertStrictEqual: 'Don\'t use `assert.strictEqual` to compare arrays or objects',
      unexpectedAssertNotStrictEqual: 'Don\'t use `assert.notStrictEqual` to compare arrays or objects',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    function isAssertStrictEqual(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             calleeNode.property.name === 'strictEqual';
    }

    function isAssertNotStrictEqual(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             calleeNode.property.name === 'notStrictEqual';
    }

    function isArrayOrObjectExpression(argumentNode) {
      return argumentNode.type === 'ArrayExpression' ||
             argumentNode.type === 'ObjectExpression';
    }

    function reportError(node, calleePropertyText, messageId) {
      context.report({
        node,
        messageId,
        fix(fixer) {
          return fixer.replaceText(node.callee.property, calleePropertyText);
        },
      });
    }

    return {
      CallExpression(node) {
        if (!node.arguments.some(isArrayOrObjectExpression)) {
          return;
        }
        if (isAssertStrictEqual(node.callee)) {
          reportError(node, 'deepEqual', 'unexpectedAssertStrictEqual');
        } else if (isAssertNotStrictEqual(node.callee)) {
          reportError(node, 'notDeepEqual', 'unexpectedAssertNotStrictEqual');
        }
      },
    };
  }
};
