// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Disallow usage of `assert.deepStrictEqual`.
 *
 * In chai, `deepStrictEqual` is an alias for `deepEqual`, and we want to
 * consistently use the latter to not leave developers wondering what's
 * the difference between these two. Also the `strict` part in the name might
 * lead to the wrong conclusion that this is about strict equality.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'Disallow usage of `assert.deepStrictEqual` in favor of `assert.deepEqual`.',
      category: 'Best Practices',
    },
    messages: {
      unexpectedAssertDeepStrictEqual: 'Unexpected assert.deepStrictEqual. Use assert.deepEqual instead.',
    },
    fixable: 'code',
    schema: [], // no options
  },
  create: function (context) {
    function isAssertDeepStrictEqual(calleeNode) {
      return calleeNode.type === 'MemberExpression' &&
             calleeNode.object.type === 'Identifier' &&
             calleeNode.object.name === 'assert' &&
             calleeNode.property.type === 'Identifier' &&
             calleeNode.property.name === 'deepStrictEqual';
    }

    function reportError(node) {
      context.report({
        node,
        messageId: 'unexpectedAssertDeepStrictEqual',
        fix(fixer) {
          return fixer.replaceText(node.callee.property, 'deepEqual');
        }
      });
    }

    return {
      CallExpression(node) {
        if (isAssertDeepStrictEqual(node.callee)) {
          reportError(node);
        }
      }
    };
  },
};
