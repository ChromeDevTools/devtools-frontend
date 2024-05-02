// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to ensure array comparisons are checked with `assert.deepEqual`
 * @author Tim van der Lippe
 */
'use strict';

const VALID_DEEP_COMPARISON_METHODS = new Set([
  'deepEqual', 'deepStrictEqual', 'sameMembers', 'sameDeepMembers', 'includeMembers', 'containsAllKeys', 'hasAllKeys'
]);

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Compare arrays with `assert.deepEqual`',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MemberExpression(node) {
        if (node.object.name !== 'assert') {
          return;
        }
        // Any existing usage of `deepEqual` or similar APIs is already fine
        if (VALID_DEEP_COMPARISON_METHODS.has(node.property.name)) {
          return;
        }
        // Should not happen, but here to code defensively
        if (node.parent.type !== 'CallExpression') {
          return;
        }
        // `assert.isDefined(someValue)`
        if (node.parent.arguments.length < 2) {
          return;
        }
        // `assert.equal(someResult, expectedValue)`
        const expectedValue = node.parent.arguments[1];
        if (expectedValue.type === 'ArrayExpression') {
          context.report({
            node,
            message:
                'Use assert.deepEqual (or similar assertion method that performs deep comparisons) to compare arrays'
          });
        }
      }
    };
  }
};
