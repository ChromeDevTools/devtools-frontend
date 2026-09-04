// Copyright 2020 The Chromium Authors
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
    return node.quasis[0].value.cooked ?? undefined;
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
      disallowSkip: 'Do not use .skip. Use test/TestExpectations instead.',
      extraBugId:
          'Non-skipped tests cannot include a CRBug tag at the beginning of the description: `it(\'testname (crbug.com/BUGID)\', async() => {})',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    return {
      MemberExpression(node) {
        if (node.property.type !== 'Identifier' || node.property.name !== 'skip') {
          return;
        }
        if (node.object.type !== 'Identifier') {
          return;
        }
        if (node.object.name !== 'it' && node.object.name !== 'describe') {
          return;
        }
        if (node.parent?.type !== 'CallExpression') {
          return;
        }
        context.report({
          node,
          messageId: 'disallowSkip',
        });
      },

      CallExpression(node: TSESTree.CallExpression) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'it') {
          return;
        }
        if (node.arguments.length === 0) {
          return;
        }
        const textValue = getTextValue(node.arguments[0]);
        if (!textValue || !TEST_NAME_REGEX.test(textValue)) {
          return;
        }
        context.report({
          node,
          messageId: 'extraBugId',
        });
      },
    };
  },
});
