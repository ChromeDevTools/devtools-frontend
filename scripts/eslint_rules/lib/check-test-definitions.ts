// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/types';

import {createRule} from './utils/ruleCreator.ts';

const TEST_NAME_REGEX = /^\[crbug.com\/\d+\]/;

function getTextValue(node: TSESTree.Node): string|undefined {
  if (node.type === 'Literal') {
    return node.value?.toString();
  }
  if (node.type === 'TemplateLiteral') {
    if (node.quasis.length === 0) {
      return;
    }
    return node.quasis[0].value.cooked;
  }
  return;
}

export default createRule({
  name: 'check-test-definitions',
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
      comment: 'A skipped test must have an attached comment with an explanation written before the test',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;
    return {
      MemberExpression(node) {
        if (node.object.type !== 'Identifier' || node.property.type !== 'Identifier') {
          return;
        }

        if ((node.object.name === 'it' || node.object.name === 'describe') &&
            (node.property.name === 'skip' || node.property.name === 'skipOnPlatforms') &&
            node.parent?.type === 'CallExpression') {
          const testNameNode = node.property.name === 'skip' ? node.parent.arguments[0] : node.parent.arguments[1];

          if (!testNameNode) {
            return;
          }

          const textValue = getTextValue(testNameNode);

          if (!textValue || !TEST_NAME_REGEX.test(textValue)) {
            context.report({
              node,
              messageId: 'missingBugId',
            });
          }

          const attachedComments = sourceCode.getCommentsBefore(node.parent);

          if (attachedComments.length === 0) {
            context.report({node, messageId: 'comment'});
          }
        }
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'it' && node.arguments[0]) {
          const textValue = getTextValue(node.arguments[0]);

          if (textValue && TEST_NAME_REGEX.test(textValue)) {
            context.report({
              node,
              messageId: 'extraBugId',
            });
          }
        }
      },
    };
  },
});
