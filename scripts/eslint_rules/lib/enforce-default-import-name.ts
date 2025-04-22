// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'path';

import {createRule} from './utils/ruleCreator.ts';
import {isStarAsImportSpecifier} from './utils/treeHelpers.ts';

// Define the structure of the options expected by the rule.
type RuleOptions = [{
  modulePath: string,
  importName: string,
}];

// Define the message IDs used by the rule.
type MessageIds = 'invalidName';

export default createRule<RuleOptions, MessageIds>({
  name: 'enforce-default-import-name',
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce default names for certain module imports',
      category: 'Possible Errors',
    },
    fixable: 'code',  // Note: No fixer provided in the original, but meta field kept.
    messages: {
      invalidName: 'When importing {{importPath}}, the name used must be {{requiredName}}',
    },
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          modulePath: {type: 'string'},
          importName: {type: 'string'},
        },
        required: ['modulePath', 'importName'],  // Added for schema completeness
        additionalProperties: false,             // Added for schema completeness
      },
      minItems: 0,  // Allow empty options array
    },
  },
  defaultOptions: [{
    modulePath: '',
    importName: '',
  }],
  create: function(context) {
    const filename = context.filename;
    const options = context.options;
    const importingFileName = path.resolve(filename);
    const importingDir = path.dirname(importingFileName);

    return {
      ImportDeclaration(node) {
        if (!isStarAsImportSpecifier(node.specifiers)) {
          // We only support checking `import * as X` based on the DevTools
          // conventions for module imports.
          return;
        }

        const importSourceValue = node.source.value;
        const normalizedImportPath = path.normalize(importSourceValue);
        const importPathForErrorMessage = importSourceValue.replace(/\\/g, '/');
        const absoluteImportPath = path.resolve(importingDir, normalizedImportPath);

        const importNameInCode = node.specifiers[0].local.name;

        for (const check of options) {
          const absoluteCheckPath = path.resolve(check.modulePath);
          if (absoluteImportPath === absoluteCheckPath && importNameInCode !== check.importName) {
            context.report({
              messageId: 'invalidName',
              node: node.specifiers[0].local,
              data: {
                importPath: importPathForErrorMessage,
                requiredName: check.importName,
              },
            });
          }
        }
      },
    };
  },
});
