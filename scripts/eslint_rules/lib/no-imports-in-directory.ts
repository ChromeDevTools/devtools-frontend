// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'path';

import {createRule} from './utils/ruleCreator.ts';

// Define the structure of the options object
interface Options {
  bannedImportPaths?: Array<{
    bannedPath: string,
    allowTypeImports: boolean,
  }>;
}

export default createRule<Options[], 'invalidImport'>({
  name: 'no-imports-in-directory',
  meta: {
    type: 'problem',

    docs: {
      description: 'Ban files in a directory from importing specific modules',
      category: 'Possible Errors',
    },
    messages: {
      invalidImport: 'It is banned to import this module from this file\'s directory',
    },
    schema: [
      {
        type: 'object',
        properties: {
          bannedImportPaths: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                bannedPath: {type: 'string'},
                allowTypeImports: {type: 'boolean'},
              }
            },
          },
        },
        additionalProperties: false,
      },
    ],
  },
  defaultOptions: [{bannedImportPaths: []}],
  create: function(context) {
    const filename = context.filename;
    // Use ?? [] for safety, although defaultOptions should handle it
    const bannedPaths = context.options[0]?.bannedImportPaths ?? [];
    const fileNameOfFileBeingChecked = path.resolve(filename);

    // No need to proceed if there are no banned paths defined
    if (bannedPaths.length === 0) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        // Ensure node.source is a Literal and has a value (should always be true for imports)
        if (typeof node.source.value !== 'string') {
          return;
        }
        const importPath = path.resolve(
            path.dirname(fileNameOfFileBeingChecked),
            node.source.value,
        );
        for (const {bannedPath, allowTypeImports} of bannedPaths) {
          if (!importPath.includes(bannedPath)) {
            continue;
          }
          if (allowTypeImports && node.importKind === 'type') {
            continue;
          }

          context.report({node, messageId: 'invalidImport'});
          break;
        }
      },
    };
  },
});
