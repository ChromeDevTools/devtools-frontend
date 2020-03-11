// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to check ES import usage
 * @author Tim van der Lippe
 */
'use strict';

const path = require('path');

const FRONT_END_DIRECTORY = path.join(__dirname, '..', '..', '..', 'front_end');
const EXEMPTED_EXPORTING_FILES = new Set([path.join(FRONT_END_DIRECTORY, 'ui', 'ARIAUtils.js')]);

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

function isStarAsImportSpecifier(specifiers) {
  return specifiers.length === 1 && specifiers[0].type === 'ImportNamespaceSpecifier';
}

function isSideEffectImportSpecifier(specifiers) {
  return specifiers.length === 0;
}

function isModuleEntrypoint(fileName) {
  const fileNameWithoutExtension = path.basename(fileName).replace(path.extname(fileName), '');
  const directoryName = path.basename(path.dirname(fileName));

  // TODO(crbug.com/1011811): remove -legacy fallback
  return directoryName === fileNameWithoutExtension || `${directoryName}-legacy` === fileNameWithoutExtension;
}

function computeTopLevelFolder(fileName) {
  const namespaceName = path.relative(FRONT_END_DIRECTORY, fileName);
  return namespaceName.substring(0, namespaceName.indexOf(path.sep));
}

module.exports = {
  meta: {
    type: 'suggestion',

    docs: {
      description: 'check ES import usage',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const importingFileName = path.resolve(context.getFilename());

    if (!importingFileName.startsWith(FRONT_END_DIRECTORY)) {
      return {};
    }

    return {
      ImportDeclaration(node) {
        if (isSideEffectImportSpecifier(node.specifiers)) {
          return;
        }

        const importPath = path.normalize(node.source.value);
        const exportingFileName = path.resolve(path.dirname(importingFileName), importPath);

        if (EXEMPTED_EXPORTING_FILES.has(exportingFileName)) {
          return;
        }

        if (importPath.endsWith(path.join('common', 'ls.js')) && path.extname(importingFileName) === '.ts') {
          /* We allow TypeScript files to import the ls module directly.
           * See common/ls.ts for more detail.
           */
          return;
        }

        if (isStarAsImportSpecifier(node.specifiers)) {
          if (computeTopLevelFolder(importingFileName) === computeTopLevelFolder(exportingFileName) &&
              !isModuleEntrypoint(importingFileName)) {
            context.report({
              node,
              message:
                  `Incorrect same-namespace import: "{{importPath}}". Use "import { Symbol } from './relative-file.js';" instead.`,
              data: {
                importPath,
              },
            });
          }
        } else {
          if (computeTopLevelFolder(importingFileName) !== computeTopLevelFolder(exportingFileName)) {
            let message =
                `Incorrect cross-namespace import: "{{importPath}}". Use "import * as Namespace from '../namespace/namespace.js';" instead.`;

            if (importPath.endsWith(path.join('common', 'ls.js'))) {
              message += ' You may only import common/ls.js directly from TypeScript source files.'
            }

            context.report({
              node,
              message,
              data: {
                importPath,
              },
            });
          }
        }
      }
    };
  }
};
