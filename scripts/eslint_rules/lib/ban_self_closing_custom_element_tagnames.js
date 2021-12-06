// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlTemplateCall} = require('./utils.js');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check for self closing custom element tag names in Lit templates.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    return {
      TaggedTemplateExpression(node) {
        const isLitHtmlCall = isLitHtmlTemplateCall(node);
        if (!isLitHtmlCall) {
          return;
        }

        const text = node.quasi.quasis.map(templatePart => templatePart.value.raw).join('@TEMPLATE_EXPRESSION()');

        if (text.match(/<@TEMPLATE_EXPRESSION\(\)([^>]*?)\/>/)) {
          context.report({
            node,
            message: 'Custom elements should not be self closing.',
          });
        }
      },
    };
  }
};
