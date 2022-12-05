// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'check for commented out import statements',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      foundImport: 'Commented-out import statements should be deleted.'
    },
    schema: []  // no options
  },
  create: function(context) {
    const sourceCode = context.getSourceCode();

    function checkImportAndReportError(comment) {
      const trimmed = comment.value.trim();
      if (trimmed.startsWith('import ')) {
        context.report({node: comment, messageId: 'foundImport'});
      }
    }

    return {
      Program() {
        const comments = sourceCode.getAllComments();
        if (!comments) {
          return;
        }
        for (const comment of comments) {
          checkImportAndReportError(comment);
        }
      }
    };
  }
};
