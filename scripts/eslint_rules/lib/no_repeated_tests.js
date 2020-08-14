// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to check that .repeat() is not used in mocha tests
 * @author Peter Marshall
 */
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'usage of .repeat() in mocha tests',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MemberExpression(node) {
        if (node.object.name === 'it' && node.property.name === 'repeat' && node.parent.type === 'CallExpression') {
          context.report({node, message: 'Unexpected repeated mocha test'});
        }
      }
    };
  }
};
