// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';
module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure no itScreenshot.only or itScreenshot.repeat calls',
      category: 'Possible Errors',
    },
    messages: {
      // Formatted like this to make it easily to dynamically look up the
      // message based on the invalid property name.
      'itScreenshot-only': 'Focused screenshot tests are not allowed.',
      'itScreenshot-repeat': 'Repeated screenshot tests are not allowed.',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const BANNED_IT_EXTENSIONS = new Set(['only', 'repeat']);
    return {
      'CallExpression[callee.type="MemberExpression"][callee.object.name="itScreenshot"]'(node) {
        const calleePropertyName = node.callee.property.name;
        if (!BANNED_IT_EXTENSIONS.has(calleePropertyName)) {
          return;
        }
        const errorMessageId = `itScreenshot-${calleePropertyName}`;

        // We report the node.callee.property as the bad node so that in an editor
        // only the ".only" / ".repeat" part is highlighted as an error, else it is very
        // distracting when you're working on debugging a test and the entire
        // body of the test is highlighted as an error.
        context.report({node: node.callee.property, messageId: errorMessageId});
      }
    };
  }
};
