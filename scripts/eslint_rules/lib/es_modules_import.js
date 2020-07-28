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
const INSPECTOR_OVERLAY_DIRECTORY = path.join(__dirname, '..', '..', '..', 'front_end', 'inspector_overlay');

const EXEMPTED_THIRD_PARTY_MODULES = new Set([
  // lit-html is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'lit-html'),
  // wasmparser is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'wasmparser'),
  // acorn is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'acorn'),
  // acorn-loose is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'acorn-loose'),
  // marked is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'marked'),
  // client-variations is exempt as it doesn't expose all its modules from the root file
  path.join(FRONT_END_DIRECTORY, 'third_party', 'chromium', 'client-variations'),
]);

const CROSS_NAMESPACE_MESSAGE =
    'Incorrect cross-namespace import: "{{importPath}}". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.';

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

  if (!importPath.endsWith('.js') && !importPath.endsWith('.mjs')) {
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

function checkStarImport(context, node, importPath, importingFileName, exportingFileName) {
  if (isModuleEntrypoint(importingFileName)) {
    return;
  }

  // The generated code is typically part of a different folder. Therefore,
  // it is allowed to directly import these files, as they are only
  // imported in 1 place at a time.
  if (computeTopLevelFolder(exportingFileName) === 'generated') {
    return;
  }

  const isSameFolder = computeTopLevelFolder(importingFileName) === computeTopLevelFolder(exportingFileName);

  const invalidSameFolderUsage = isSameFolder && isModuleEntrypoint(exportingFileName);
  const invalidCrossFolderUsage = !isSameFolder && !isModuleEntrypoint(exportingFileName);

  if (invalidSameFolderUsage) {
    context.report({
      node,
      message:
          'Incorrect same-namespace import: "{{importPath}}". Use "import { Symbol } from \'./relative-file.js\';" instead.',
      data: {
        importPath,
      },
    });
  }

  if (invalidCrossFolderUsage) {
    context.report({
      node,
      message: CROSS_NAMESPACE_MESSAGE,
      data: {
        importPath,
      },
    });
  }
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

        // Accidental relative URL:
        // import * as Root from 'front_end/root/root.js';
        //
        // Should ignore named imports:
        // import * as fs from 'fs';
        //
        // Don't use `importPath` here, as `path.normalize` removes
        // the `./` from same-folder import paths.
        if (!node.source.value.startsWith('.') && !/^[\w\-_]+$/.test(node.source.value)) {
          context.report({
            node,
            message: 'Invalid relative URL import. An import should start with either "../" or "./".',
          });
        }

        if (!importingFileName.startsWith(FRONT_END_DIRECTORY)) {
          return;
        }

        if (importingFileName.startsWith(INSPECTOR_OVERLAY_DIRECTORY)) {
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
          checkStarImport(context, node, importPath, importingFileName, exportingFileName);
        } else {
          if (computeTopLevelFolder(importingFileName) !== computeTopLevelFolder(exportingFileName)) {
            let message = CROSS_NAMESPACE_MESSAGE;

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
