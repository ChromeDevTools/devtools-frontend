// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'no-commented-out-console',
  meta: {
    type: 'problem',
    docs: {
      description: 'check for commented out console.{warn/log/etc} lines',
      category: 'Possible Errors',
    },
    messages: {
      foundComment: 'Found a commented out console call.',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    function checkCommentAndReportError(comment: TSESTree.Comment) {
      const trimmed = comment.value.trim();
      if (trimmed.startsWith('console.log(')) {
        context.report({
          node: comment,
          messageId: 'foundComment',
        });
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
      },
    };
  },
});
