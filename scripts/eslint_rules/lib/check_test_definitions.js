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

function getTextValue(node) {
  if (node.type === 'Literal') {
    return node.value;
  }
  if (node.type === 'TemplateLiteral') {
    if (node.quasis.length === 0) {
      return undefined;
    }
    return node.quasis[0].value.cooked;
  }
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check test implementations',
      category: 'Possible Errors',
    },
    messages: {
      missingBugId:
          'Skipped tests must have a CRBug included in the description: `it.skip(\'[crbug.com/BUGID]: testname\', async() => {})',
      extraBugId:
          'Non-skipped tests cannot include a CRBug tag at the beginning of the description: `it.skip(\'testname (crbug.com/BUGID)\', async() => {})',
      comment: 'A skipped test must have an attached comment with an explanation written before the test'
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      MemberExpression(node) {
        if ((node.object.name === 'it' || node.object.name === 'describe' || node.object.name === 'itScreenshot') &&
            (node.property.name === 'skip' || node.property.name === 'skipOnPlatforms') &&
            node.parent.type === 'CallExpression') {
          const testNameNode = node.property.name === 'skip' ? node.parent.arguments[0] : node.parent.arguments[1];

          if(!testNameNode) {
            return;
          }

          const textValue = getTextValue(testNameNode);

          if (!textValue || !TEST_NAME_REGEX.test(textValue)) {
            context.report({
              node,
              messageId: 'missingBugId',
            });
          }

          const attachedComments = context.getCommentsBefore(node.parent);

          if (attachedComments.length === 0) {
            context.report({node, messageId: 'comment'});
          }
        }
      },

      CallExpression(node) {
        if (node.callee.name === 'it' && node.arguments[0]) {
          const textValue = getTextValue(node.arguments[0]);

          if (textValue && TEST_NAME_REGEX.test(textValue)) {
            context.report({
              node,
              messageId: 'extraBugId',
            });
          }
        }
      }
    };
  }
};
