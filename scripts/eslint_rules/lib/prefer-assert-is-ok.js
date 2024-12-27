// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prefer `assert.isOk` and `assert.isNotOk` over `assert.ok`
 * and `assert.notOk`.
 *
 * For consistency with the other `assert.isXXX` checks, we standardize on
 * `assert.isOk` and `assert.isNotOk`. We still also allow plain `assert`.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Prefer `assert.isOk` and `assert.isNotOk` over `assert.ok` and `assert.notOk`.',
      category: 'Best Practices',
    },
    messages: {
      useAssertIsOk: 'Use `assert.isOk(e)` or `assert(e)` instead of `assert.ok(e)`',
      useAssertIsNotOk: 'Use `assert.isNotOk(e)` or `assert(!e)` instead of `assert.notOk(e)`',
    },
    fixable: 'code',
    schema: [], // no options
  },
  create: function (context) {
    function isAssertOk(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             calleeNode.property.name === 'ok';
    }

    function isAssertNotOk(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             calleeNode.property.name === 'notOk';
    }

    function reportError(node, calleeText, messageId) {
      context.report({
        node,
        messageId,
        fix(fixer) {
          return fixer.replaceText(node.callee, calleeText);
        }
      });
    }

    return {
      CallExpression(node) {
        if (isAssertOk(node.callee)) {
          reportError(node, 'assert.isOk', 'useAssertIsOk');
        } else if (isAssertNotOk(node.callee)) {
          reportError(node, 'assert.isNotOk', 'useAssertIsNotOk');
        }
      }
    };
  },
};
