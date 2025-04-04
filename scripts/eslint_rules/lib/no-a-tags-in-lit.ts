// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {createRule} from './tsUtils.ts';
import {isLitHtmlTemplateCall} from './utils.js';

export default createRule({
  name: 'no-a-tags-in-lit',
  meta: {
    type: 'problem',
    docs: {
      description: 'Check for <a> and </a> in Lit templates instead of using x-link.',
      category: 'Possible Errors',
    },
    messages: {
      foundAnchor: 'Found an anchor element in a lit template. Use XLink.ts instead.',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    return {
      TaggedTemplateExpression(node) {
        const isLitHtmlCall = isLitHtmlTemplateCall(node);
        if (!isLitHtmlCall) {
          return;
        }

        // node.quasi.quasis are all the static parts of the template literal.
        for (const templatePart of node.quasi.quasis) {
          if (templatePart.value.raw.match(/<a[\s>]/) || templatePart.value.raw.includes('</a>')) {
            context.report({
              node,
              messageId: 'foundAnchor',
            });
          }
        }
      },
    };
  }
});
