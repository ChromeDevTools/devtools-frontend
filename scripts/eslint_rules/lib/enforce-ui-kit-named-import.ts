// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as path from 'node:path';

import {createRule} from './utils/ruleCreator.ts';
import {isStarAsImportSpecifier} from './utils/treeHelpers.ts';

const UI_KIT_PATH = path.join('front_end', 'ui', 'kit', 'kit.js');

export default createRule({
  name: 'enforce-ui-kit-named-import',
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce named imports for front_end/ui/kit/kit.js.',
      category: 'Possible Errors',
    },
    messages: {
      namedKitImport:
          'Imports from front_end/ui/kit/kit.js must be named (e.g., `import {Card} from \'../../ui/kit/kit.js\'`).',
    },
    schema: [],
  },
  defaultOptions: [],
  create: function(context) {
    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const normalizedImportPath = path.normalize(importPath);

        const currentFileAbsolutePath = context.filename;
        const currentFileDirectory = path.dirname(currentFileAbsolutePath);
        const resolvedAbsoluteImportPath = path.resolve(currentFileDirectory, normalizedImportPath);

        if (!resolvedAbsoluteImportPath.endsWith(UI_KIT_PATH)) {
          return;
        }

        const importPathForErrorMessage = importPath.replace(/\\/g, '/');
        if (isStarAsImportSpecifier(node.specifiers)) {
          context.report({
            node,
            messageId: 'namedKitImport',
            data: {
              importPathForErrorMessage,
            },
          });
        }
      },
    };
  },
});
