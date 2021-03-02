// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'check for commented out console.{warn/log/etc} lines',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const sourceCode = context.getSourceCode();

    function checkCommentAndReportError(comment) {
      const trimmed = comment.value.trim();
      if (trimmed.startsWith('console.log(')) {
        context.report({node: comment, message: 'Found a commented out console call.'});
      }
    }

    return {
      Program() {
        const comments = sourceCode.getAllComments();
        if (!comments) {
          return;
        }
        for (const comment of comments) {
          checkCommentAndReportError(comment);
        }
      }
    };
  }
};
