// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Prevent importing SVG urls from the `src` directory, and
 * ensure they are read from `Images/foo.svg`.
 * Images in the `src/` directory are minified and put into `Images/` as part
 * of the build process, so we should never import from 'src'.
 */

import {createRule} from './utils/ruleCreator.ts';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

const SRC_DIRECTORY_PATH_TO_MATCH = 'Images/src/';

export default createRule({
  // Add type parameters for options and messageIds
  name: 'no-importing-images-from-src',  // Rule name should match the file name
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
  defaultOptions: [],
  create: function(context) {
    return {
      NewExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'URL') {
          return;
        }

        if (!node.arguments || node.arguments.length < 1) {
          // Invalid code: user is probably mid-way through typing! Just leave
          // it; TypeScript will error if it ends up being invalid.
          return;
        }

        const firstArgument = node.arguments[0];
        // Ensure the first argument is a Literal with a string value
        if (!firstArgument || firstArgument.type !== 'Literal' || typeof firstArgument.value !== 'string') {
          return;
        }

        // firstArgument.value is now guaranteed to be a string
        const filePath: string = firstArgument.value;

        if (filePath.includes(SRC_DIRECTORY_PATH_TO_MATCH)) {
          context.report({
            node: firstArgument,  // Report on the argument node itself
            messageId: 'imageImportUsingSrc',
            fix(fixer) {
              // Fixer function returns RuleFix or null
              // Ensure the node to fix is the same literal node
              if (node.arguments[0].type === 'Literal' && typeof node.arguments[0].value === 'string') {
                return fixer.replaceText(
                    node.arguments[0],
                    `'${
                        filePath.replace(
                            SRC_DIRECTORY_PATH_TO_MATCH,
                            'Images/',
                            )}'`,
                );
              }
              return null;  // Cannot fix if the node structure changed unexpectedly
            },
          });
        }
      },
    };
  },
});
