// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

const {isLitHtmlTemplateCall} = require('./utils.js');

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'Check for <style> and </style> in Lit templates instead of using adoptedStyleSheets.',
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

        // node.quasi.quasis are all the static parts of the template literal.
        for (const templatePart of node.quasi.quasis) {
          if (templatePart.value.raw.includes('<style') || templatePart.value.raw.includes('</style>')) {
            context.report({
              node,
              message:
                  'Adding styles to a component should be done using this.shadow.adoptedStyleSheets = [importedStyles]. Import the styles from the CSS file.',
            });
          }
        }
      },
    };
  }
};
