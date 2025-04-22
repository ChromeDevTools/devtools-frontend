// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './utils/ruleCreator.ts';

type MessageIds = `itScreenshot-${'only'|'repeat'}`;

const BANNED_IT_EXTENSIONS = new Set(['only', 'repeat']);

export default createRule<[], MessageIds>({
  name: 'no-it-screenshot-only-or-repeat',
  meta: {
    type: 'problem',
    docs: {
      description: 'ensure no itScreenshot.only or itScreenshot.repeat calls',
      category: 'Possible Errors',
    },
    messages: {
      'itScreenshot-only': 'Focused screenshot tests are not allowed.',
      'itScreenshot-repeat': 'Repeated screenshot tests are not allowed.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    return {
      CallExpression(node): void {
        if (node.callee.type !== 'MemberExpression' || node.callee.object.type !== 'Identifier' ||
            node.callee.object.name !== 'itScreenshot' || node.callee.property.type !== 'Identifier') {
          return;
        }

        const calleePropertyName = node.callee.property.name;
        if (!BANNED_IT_EXTENSIONS.has(calleePropertyName)) {
          return;
        }

        // Construct the message ID dynamically and assert its type
        const errorMessageId = `itScreenshot-${calleePropertyName}` as MessageIds;

        // Report the specific property (.only or .repeat) as the error location
        context.report({node: node.callee.property, messageId: errorMessageId});
      },
    };
  },
});
