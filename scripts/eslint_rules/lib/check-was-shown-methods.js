// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Checks wasShown() method definitions call super.wasShown();',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MethodDefinition(node) {
        const nodeName = node.key.name;
        if (node.parent.parent.superClass?.property?.name === 'Widget' && nodeName === 'wasShown') {
          const topBodyNode = node.value.body.body[0];
          if (!(topBodyNode.type === 'ExpressionStatement' && topBodyNode.expression.type === 'CallExpression' &&
                topBodyNode.expression.callee.object.type === 'Super' &&
                topBodyNode.expression.callee.property.name === 'wasShown')) {
            context.report({node, message: 'Please make sure the first call in wasShown is to super.wasShown().'});
          }
        }
      }
    };
  }
};
