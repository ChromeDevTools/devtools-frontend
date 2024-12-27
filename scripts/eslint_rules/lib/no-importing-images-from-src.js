// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prevent importing SVG urls from the `src` directory, and
 * ensure they are read from `Images/foo.svg`.
 * Images in the `src/` directory are minified and put into `Images/` as part
 * of the build process, so we should never import from 'src'.
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const SRC_DIRECTORY_PATH_TO_MATCH = 'Images/src/';

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'ensure image imports do not include the src/ directory',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],
    messages: {
      imageImportUsingSrc:
          'Found an image import containing the `src/` directory. You should always import `Images/foo.svg`.',
    },
  },
  create: function(context) {
    return {
      // Matches new URL(...)
      'NewExpression[callee.name=\'URL\']'(node) {
        if (!node.arguments || node.arguments.length < 1) {
          // Invalid code: user is probably mid-way through typing! Just leave
          // it; TypeScript will error if it ends up being invalid.
          return;
        }
        /** @type {String} */
        const filePath = node.arguments[0].value;
        if (!filePath) {
          return;
        }
        if (filePath.includes(SRC_DIRECTORY_PATH_TO_MATCH)) {
          context.report({
            node: node.arguments[0],
            messageId: 'imageImportUsingSrc',
            fix(fixer) {
              return fixer.replaceText(
                  node.arguments[0], `'${filePath.replace(SRC_DIRECTORY_PATH_TO_MATCH, 'Images/')}'`);
            }
          });
        }
      }
    };
  }
};
