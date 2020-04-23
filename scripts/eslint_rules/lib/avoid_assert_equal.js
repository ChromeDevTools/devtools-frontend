// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to ban usage of assert.equal
 * @author Jack Franklin
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Usage of assert.equal',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MemberExpression(node) {
        if (node.object.name === 'assert' && node.property.name === 'equal') {
          context.report({
            node,
            message: 'assert.equal is non-strict. Use assert.strictEqual or assert.deepEqual to compare objects'
          });
        }
      }
    };
  }
};
