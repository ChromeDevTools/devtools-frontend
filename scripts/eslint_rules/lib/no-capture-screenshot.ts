// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

/** Helper type guard to check for devToolsPage.equal calls **/
function isCaptureScreenshot(node: TSESTree.Node): node is TSESTree.CallExpression&{
  callee: TSESTree.MemberExpression&{
    object: TSESTree.Identifier & {name: 'devToolsPage'},
    property: TSESTree.Identifier & {name: 'captureScreenshot'},
  },
}
{
  return node.type === 'CallExpression' && node.callee.type === 'MemberExpression' &&
      node.callee.object.type === 'Identifier' && node.callee.object.name === 'devToolsPage' &&
      node.callee.property.type === 'Identifier' && node.callee.property.name === 'captureScreenshot';
}

export default createRule({
  name: 'no-capture-screenshot',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow usage of captureScreenshot, which is a debugging tool.',
      category: 'Possible Errors',
    },
    messages: {
      unexpectedCaptureScreenshot: '`captureScreenshot` is a debugging tool and should not be committed.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create(context) {
    return {
      CallExpression(node: TSESTree.CallExpression) {
        if (isCaptureScreenshot(node)) {
          context.report({
            node,
            messageId: 'unexpectedCaptureScreenshot',
          });
        }
      },
    };
  },
});
