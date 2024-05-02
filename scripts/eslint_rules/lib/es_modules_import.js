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
const THIRD_PARTY_DIRECTORY = path.join(FRONT_END_DIRECTORY, 'third_party');
const INSPECTOR_OVERLAY_DIRECTORY = path.join(__dirname, '..', '..', '..', 'front_end', 'inspector_overlay');
const COMPONENT_DOCS_DIRECTORY = path.join(FRONT_END_DIRECTORY, 'ui', 'components', 'docs');

const CROSS_NAMESPACE_MESSAGE =
    'Incorrect cross-namespace import: "{{importPathForErrorMessage}}". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.';

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
  const directoryName = path.basename(path.dirname(fileName));
  return directoryName === fileNameWithoutExtension || `${directoryName}-testing` === fileNameWithoutExtension;
}

function computeTopLevelFolder(fileName) {
  const namespaceName = path.relative(FRONT_END_DIRECTORY, fileName);
  return namespaceName.substring(0, namespaceName.indexOf(path.sep));
}

function checkImportExtension(importPath, importPathForErrorMessage, context, node) {
  // detect import * as fs from 'fs';
  if (!importPath.startsWith('.')) {
    return;
  }

  if (!importPath.endsWith('.js') && !importPath.endsWith('.mjs')) {
    context.report({
      node,
      message: 'Missing file extension for import "{{importPathForErrorMessage}}"',
      data: {
        importPathForErrorMessage,
      },
      fix(fixer) {
        return fixer.replaceText(node.source, `'${importPathForErrorMessage}.js'`);
      }
    });
  }
}

function nodeSpecifiersSpecialImportsOnly(specifiers) {
  return specifiers.length === 1 && specifiers[0].type === 'ImportSpecifier' &&
      ['ls', 'assertNotNullOrUndefined'].includes(specifiers[0].imported.name);
}

function checkStarImport(context, node, importPath, importPathForErrorMessage, importingFileName, exportingFileName) {
  if (isModuleEntrypoint(importingFileName)) {
    return;
  }

  if (importingFileName.startsWith(COMPONENT_DOCS_DIRECTORY) &&
      importPath.includes([path.sep, 'testing', path.sep].join(''))) {
    return;
  }

  // The generated code is typically part of a different folder. Therefore,
  // it is allowed to directly import these files, as they are only
  // imported in 1 place at a time.
  if (computeTopLevelFolder(exportingFileName) === 'generated') {
    return;
  }

  const isSameFolder = path.dirname(importingFileName) === path.dirname(exportingFileName);

  const invalidSameFolderUsage = isSameFolder && isModuleEntrypoint(exportingFileName);
  const invalidCrossFolderUsage = !isSameFolder && !isModuleEntrypoint(exportingFileName);

  if (invalidSameFolderUsage) {
    // Meta files import their entrypoints and are considered separate entrypoints.
    // Additionally, any file ending with `-entrypoint.ts` is considered an entrypoint
    // as well. Therefore, they are allowed to import using a same-namespace star-import.
    // For `.test.ts` files we also need to use the namespace import syntax, to access
    // the module itself, so we need to allow this as well.
    const importingFileIsEntrypointOrTest = importingFileName.endsWith('-entrypoint.ts') ||
        importingFileName.endsWith('-meta.ts') || importingFileName.endsWith('.test.ts');

    if (!importingFileIsEntrypointOrTest) {
      context.report({
        node,
        message:
            'Incorrect same-namespace import: "{{importPathForErrorMessage}}". Use "import { Symbol } from \'./relative-file.js\';" instead.',
        data: {
          importPathForErrorMessage,
        },
      });
    }
  }

  if (invalidCrossFolderUsage) {
    context.report({
      node,
      message: CROSS_NAMESPACE_MESSAGE,
      data: {importPathForErrorMessage},
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

        const importPathForErrorMessage = node.source.value.replace(/\\/g, '/');
        checkImportExtension(importPath, importPathForErrorMessage, context, node);
      },
      ImportDeclaration(node) {
        const importPath = path.normalize(node.source.value);
        const importPathForErrorMessage = node.source.value.replace(/\\/g, '/');

        checkImportExtension(node.source.value, importPathForErrorMessage, context, node);

        // Type imports are unrestricted
        if (node.importKind === 'type') {
          // `import type ... from ...` syntax
          return;
        }
        if (node.importKind === 'value') {
          // `import {type ...} from ...` syntax
          if (node.specifiers.every(spec => spec.importKind === 'type')) {
            return;
          }
        }

        // Accidental relative URL:
        // e.g.: import * as Root from 'front_end/root/root.js';
        //
        // Should ignore named imports import * as fs from 'fs';
        //
        // Don't use `importPath` here, as `path.normalize` removes
        // the `./` from same-folder import paths.
        if (!node.source.value.startsWith('.') && !/^[\w\-_]+$/.test(node.source.value)) {
          context.report({
            node,
            message: 'Invalid relative URL import. An import should start with either "../" or "./".',
          });
        }

        // the Module import rules do not apply within:
        // 1. inspector_overlay
        // 2. front_end/third_party
        if (importingFileName.startsWith(INSPECTOR_OVERLAY_DIRECTORY) || importingFileName.startsWith(THIRD_PARTY_DIRECTORY)) {
          return;
        }

        if (isSideEffectImportSpecifier(node.specifiers)) {
          return;
        }

        const exportingFileName = path.resolve(path.dirname(importingFileName), importPath);

        if (importPathForErrorMessage.endsWith('platform/platform.js') &&
            nodeSpecifiersSpecialImportsOnly(node.specifiers)) {
          /* We allow direct importing of the ls and assertNotNull utility as it's so frequently used. */
          return;
        }

        if (isStarAsImportSpecifier(node.specifiers)) {
          checkStarImport(context, node, importPath, importPathForErrorMessage, importingFileName, exportingFileName);
        } else {
          if (computeTopLevelFolder(importingFileName) !== computeTopLevelFolder(exportingFileName)) {
            if (importingFileName.endsWith('.test.ts') &&
                importPath.includes([path.sep, 'testing', path.sep].join(''))) {
              /** Within test files we allow the direct import of test helpers.
               */
              return;
            }

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
                importPathForErrorMessage,
              },
            });
          } else if (isModuleEntrypoint(importingFileName)) {
            if (importingFileName.includes(['testing', 'test_setup.ts'].join(path.sep)) &&
                importPath.includes([path.sep, 'testing', path.sep].join(''))) {
              /** Within test files we allow the direct import of test helpers.
               * The entry point detection detects test_setup.ts as an
               * entrypoint, but we don't treat it as such, it's just a file
               * that Karma runs to setup the environment.
               */
              return;
            }

            if (importPath.endsWith('.css.js')) {
              // We allow files to import CSS files within the same module.
              return;
            }
            context.report({
              node,
              message:
                  'Incorrect same-namespace import: "{{importPathForErrorMessage}}". Use "import * as File from \'./File.js\';" instead.',
              data: {
                importPathForErrorMessage,
              }
            });
          } else if (path.dirname(importingFileName) === path.dirname(exportingFileName)) {
            if (!importingFileName.endsWith('.test.ts') || !importingFileName.startsWith(FRONT_END_DIRECTORY)) {
              return;
            }

            const importingDirectoryName = path.basename(path.dirname(importingFileName));
            if (importingDirectoryName === 'testing') {
              // Special case of Foo.test.ts for a helper Foo.ts.
              return;
            }

            // Unit tests must import from the entry points even for same-namespace
            // imports, as we otherwise break the module system (in Release builds).
            if (!isModuleEntrypoint(exportingFileName)) {
              const namespaceNameForErrorMessage =
                  importingDirectoryName.substring(0, 1).toUpperCase() + importingDirectoryName.substring(1);
              const namespaceFilenameForErrorMessage = importingDirectoryName;
              context.report({
                node,
                message:
                    'Incorrect same-namespace import: "{{importPathForErrorMessage}}". Use "import * as {{namespaceNameForErrorMessage}} from \'./{{namespaceFilenameForErrorMessage}}.js\';" instead.',
                data: {
                  importPathForErrorMessage,
                  namespaceNameForErrorMessage,
                  namespaceFilenameForErrorMessage,
                },
              });
            }
          }
        }
      }
    };
  }
};
