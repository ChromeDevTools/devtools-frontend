// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import path from 'node:path';

import {createRule} from './utils/ruleCreator.ts';
import {isStarAsImportSpecifier} from './utils/treeHelpers.ts';

// Define the structure of the options expected by the rule.
type RuleOptions = Array<{
  modulePath: string,
  importName: string,
}>;

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
  defaultOptions: [],
  create: function(context) {
    const options = context.options;
    if (!options || options.length === 0) {
      return {};
    }
    const filename = context.filename;
    const importingFileName = path.resolve(filename);
    const importingDir = path.dirname(importingFileName);

    const resolvedChecks = options.map(check => ({
                                         ...check,
                                         absoluteCheckPath: path.resolve(check.modulePath),
                                       }));

    return {
      ImportDeclaration(node) {
        if (!isStarAsImportSpecifier(node.specifiers)) {
          // We only support checking `import * as X` based on the DevTools
          // conventions for module imports.
          return;
        }

        const importSourceValue = node.source.value;
        if (typeof importSourceValue !== 'string') {
          return;
        }
        const normalizedImportPath = path.normalize(importSourceValue);
        const importPathForErrorMessage = importSourceValue.replace(/\\/g, '/');
        const absoluteImportPath = path.resolve(importingDir, normalizedImportPath);

        const importNameInCode = node.specifiers[0].local.name;

        for (const check of resolvedChecks) {
          if (absoluteImportPath === check.absoluteCheckPath && importNameInCode !== check.importName) {
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
