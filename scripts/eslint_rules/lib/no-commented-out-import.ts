// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import type {TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type Comment = TSESTree.Comment;

export default createRule({
  name: 'no-commented-out-import',
  meta: {
    type: 'problem',
    docs: {
      description: 'check for commented out import statements',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      foundImport: 'Commented-out import statements should be deleted.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    function checkImportAndReportError(comment: Comment) {
      const trimmed = comment.value.trim();
      // Simple check if the comment line starts with 'import '
      // More robust checking could involve parsing, but this matches the original logic.
      if (trimmed.startsWith('import ')) {
        context.report({node: comment, messageId: 'foundImport'});
      }
    }

    return {
      Program() {
        const comments = sourceCode.getAllComments();
        for (const comment of comments) {
          checkImportAndReportError(comment);
        }
      },
    };
  },
});
