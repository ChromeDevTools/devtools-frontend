// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'usage of .only() in mocha tests',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {noOnly: 'Unexpected exclusive mocha test'},
    schema: []  // no options
  },
  create: function(context) {
    return {
     MemberExpression(node) {
        if (node.property.name === 'only' && node.property.type === 'Identifier' && node.parent.type === 'CallExpression' && node.parent.callee === node) {
          context.report({
            node,
            messageId: 'noOnly',
            fix(fixer) {
              // The node.property range covers the 'only' call, but it does not
              // include the '.' before it. So we remove the range of chars that
              // covers the node, and the one character before it.
              const rangeToRemove = [
                node.property.range[0] - 1,
                node.property.range[1],
              ];
              return fixer.removeRange(rangeToRemove);
            }
          });
        }
      }
    };
  }
};
