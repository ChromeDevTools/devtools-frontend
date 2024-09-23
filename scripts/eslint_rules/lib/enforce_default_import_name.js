// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const path = require('path');

function isStarAsImportSpecifier(specifiers) {
  return specifiers.length === 1 && specifiers[0].type === 'ImportNamespaceSpecifier';
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'enforce default names for certain module imports',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      invalidName: 'When importing {{importPath}}, the name used must be {{requiredName}}'
    },
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          modulePath: {type: 'string'},
          importName: {type: 'string'}

        }
      }
    }
  },
  create: function(context) {
    const importingFileName = path.resolve(context.getFilename());
    const importingDir = path.dirname(importingFileName);

    return {
      ImportDeclaration(node) {
        if(!isStarAsImportSpecifier(node.specifiers)) {
          // We only support checking `import * as X` based on the DevTools
          // conventions for module imports.
          return;
        }
        const importPath = path.normalize(node.source.value);
        const importPathForErrorMessage = node.source.value.replace(/\\/g, '/');
        const absoluteImportPath = path.resolve(importingDir, importPath);

        const importNameInCode = node.specifiers[0].local.name;
        for (const check of context.options) {
          if(absoluteImportPath === check.modulePath && importNameInCode !== check.importName) {
            context.report({
              messageId: 'invalidName',
              node,
              data: {
                importPath: importPathForErrorMessage,
                requiredName: check.importName,
              }
            });
          }
        }
      }
    };
  }
};
