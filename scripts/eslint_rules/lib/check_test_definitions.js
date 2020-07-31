// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to check test definitions
 * @author Tim van der Lippe
 */
'use strict';

const TEST_NAME_REGEX = /^\[crbug.com\/\d+\]/;

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check test implementations',
      category: 'Possible Errors',
    },
    messages: {
      description:
          'Skipped tests must have a CRBug included in the description: `it.skip(\'[crbug.com/BUGID]: testname\', async() => {})',
      comment: 'A skipped test must have an attached comment with an explanation'
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MemberExpression(node) {
        if (node.object.name === 'it' && node.property.name === 'skip' && node.parent.type === 'CallExpression') {
          const testNameNode = node.parent.arguments[0];

          let textValue;

          if (testNameNode.type === 'Literal') {
            textValue = testNameNode.value;
          } else if (testNameNode.type === 'TemplateLiteral') {
            if (testNameNode.quasis.length === 0) {
              context.report({
                node,
                messageId: 'description',
              });

              return;
            }

            textValue = testNameNode.quasis[0].value.cooked;
          }

          if (!textValue || !TEST_NAME_REGEX.test(textValue)) {
            context.report({
              node,
              messageId: 'description',
            });
          }

          const attachedComments = context.getCommentsBefore(node.parent);

          if (attachedComments.length === 0) {
            context.report({node, messageId: 'comment'});
          }
        }
      }
    };
  }
};
