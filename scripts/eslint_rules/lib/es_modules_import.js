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

const EXEMPTED_THIRD_PARTY_MODULES = new Set([
  // lit-html is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'lit-html'),
]);

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

function isStarAsImportSpecifier(specifiers) {
  return specifiers.length === 1 && specifiers[0].type === 'ImportNamespaceSpecifier';
}

function isSideEffectImportSpecifier(specifiers) {
  return specifiers.length === 0;
}

function isModuleEntrypoint(fileName) {
  const fileNameWithoutExtension = path.basename(fileName).replace(path.extname(fileName), '');
  const directoryName = computeTopLevelFolder(fileName);

  // TODO(crbug.com/1011811): remove -legacy fallback
  return directoryName === fileNameWithoutExtension || `${directoryName}-legacy` === fileNameWithoutExtension;
}

function computeTopLevelFolder(fileName) {
  const namespaceName = path.relative(FRONT_END_DIRECTORY, fileName);
  return namespaceName.substring(0, namespaceName.indexOf(path.sep));
}

function checkImportExtension(importPath, context, node) {
  // import * as fs from 'fs';
  if (!importPath.startsWith('.')) {
    return;
  }

  if (!importPath.endsWith('.js')) {
    context.report({
      node,
      message: 'Missing file extension for import "{{importPath}}"',
      data: {
        importPath,
      },
      fix(fixer) {
        return fixer.replaceText(node.source, `'${importPath}.js'`);
      }
    });
  }
}

function nodeSpecifiersImportLsOnly(specifiers) {
  return specifiers.length === 1 && specifiers[0].type === 'ImportSpecifier' && specifiers[0].imported.name === 'ls';
}

module.exports = {
  meta: {
    type: 'problem',

    docs: {
      description: 'check ES import usage',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const importingFileName = path.resolve(context.getFilename());

    return {
      ExportNamedDeclaration(node) {
        // Any export in a file is called an `ExportNamedDeclaration`, but
        // only directly-exporting-from-import declarations have the
        // `node.source` set.
        if (!node.source) {
          return;
        }
        const importPath = path.normalize(node.source.value);

        checkImportExtension(importPath, context, node);
      },
      ImportDeclaration(node) {
        const importPath = path.normalize(node.source.value);

        checkImportExtension(importPath, context, node);

        if (!importingFileName.startsWith(FRONT_END_DIRECTORY)) {
          return;
        }

        if (isSideEffectImportSpecifier(node.specifiers)) {
          return;
        }

        const exportingFileName = path.resolve(path.dirname(importingFileName), importPath);

        const importMatchesExemptThirdParty =
            Array.from(EXEMPTED_THIRD_PARTY_MODULES)
                .some(exemptModulePath => exportingFileName.startsWith(exemptModulePath));

        if (importMatchesExemptThirdParty) {
          /* We don't impose any rules on third_party DEPS which do not expose
           * all functionality in a single entrypoint
           */
          return;
        }

        if (importPath.endsWith(path.join('platform', 'platform.js')) && nodeSpecifiersImportLsOnly(node.specifiers)) {
          /* We allow direct importing of the ls utility as it's so frequently used. */
          return;
        }

        if (isStarAsImportSpecifier(node.specifiers)) {
          if (computeTopLevelFolder(importingFileName) === computeTopLevelFolder(exportingFileName) &&
              !isModuleEntrypoint(importingFileName) && isModuleEntrypoint(exportingFileName)) {
            context.report({
              node,
              message:
                  'Incorrect same-namespace import: "{{importPath}}". Use "import { Symbol } from \'./relative-file.js\';" instead.',
              data: {
                importPath,
              },
            });
          }
        } else {
          if (computeTopLevelFolder(importingFileName) !== computeTopLevelFolder(exportingFileName)) {
            let message =
                'Incorrect cross-namespace import: "{{importPath}}". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.';

            if (importPath.endsWith(path.join('common', 'ls.js'))) {
              message += ' You may only import common/ls.js directly from TypeScript source files.';
            }

            if (importPath.includes('third_party')) {
              message +=
                  ' If the third_party dependency does not expose a single entrypoint, update es_modules_import.js to make it exempt.';
            }

            context.report({
              node,
              message,
              data: {
                importPath,
              },
            });
          } else if (isModuleEntrypoint(importingFileName)) {
            context.report({
              node,
              message:
                  'Incorrect same-namespace import: "{{importPath}}". Use "import * as File from \'./File.js\';" instead.',
              data: {
                importPath,
              }
            });
          }
        }
      }
    };
  }
};
