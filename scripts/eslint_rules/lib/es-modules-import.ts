// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Rule to check ES import usage
 * @author Tim van der Lippe
 */

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';
import path from 'path';

import {createRule} from './utils/ruleCreator.ts';
import {isStarAsImportSpecifier} from './utils/treeHelpers.ts';
// Define types based on TSESTree
type ImportDeclaration = TSESTree.ImportDeclaration;
type ExportNamedDeclaration = TSESTree.ExportNamedDeclaration;
type ImportSpecifier = TSESTree.ImportSpecifier;
type ImportDefaultSpecifier = TSESTree.ImportDefaultSpecifier;
type ImportNamespaceSpecifier = TSESTree.ImportNamespaceSpecifier;
type RuleContext = TSESLint.RuleContext<MessageIds, []>;  // Define MessageIds below
type RuleFixer = TSESLint.RuleFixer;

// Define MessageIds used in the rule
type MessageIds = 'doubleSlashInImportPath'|'missingExtension'|'invalidRelativeUrl'|'incorrectSameNamespaceImportNamed'|
    'incorrectSameNamespaceImportStar'|'crossNamespaceImport'|'crossNamespaceImportLs'|'crossNamespaceImportThirdParty'|
    'incorrectSameNamespaceTestImport';

const FRONT_END_DIRECTORY = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'front_end',
);
const THIRD_PARTY_DIRECTORY = path.join(FRONT_END_DIRECTORY, 'third_party');
const INSPECTOR_OVERLAY_DIRECTORY = path.join(
    // @ts-expect-error
    import.meta.dirname,
    '..',
    '..',
    '..',
    'front_end',
    'inspector_overlay',
);
const COMPONENT_DOCS_DIRECTORY = path.join(
    FRONT_END_DIRECTORY,
    'ui',
    'components',
    'docs',
);

const CROSS_NAMESPACE_MESSAGE =
    'Incorrect cross-namespace import: "{{importPathForErrorMessage}}". Use "import * as Namespace from \'../namespace/namespace.js\';" instead.';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

function isSideEffectImportSpecifier(
    specifiers: Array<ImportSpecifier|ImportDefaultSpecifier|ImportNamespaceSpecifier>): boolean {
  return specifiers.length === 0;
}

function isModuleEntrypoint(fileName: string): boolean {
  const fileNameWithoutExtension = path.basename(fileName).replace(path.extname(fileName), '');
  const directoryName = path.basename(path.dirname(fileName));
  return (directoryName === fileNameWithoutExtension || `${directoryName}-testing` === fileNameWithoutExtension);
}

function computeTopLevelFolder(fileName: string): string {
  const namespaceName = path.relative(FRONT_END_DIRECTORY, fileName);
  return namespaceName.substring(0, namespaceName.indexOf(path.sep));
}

function checkImportExtension(
    importPath: string,
    importPathForErrorMessage: string,
    context: RuleContext,
    node: ImportDeclaration|ExportNamedDeclaration,  // Node can be Import or Export
    ): void {
  // detect import * as fs from 'fs';
  if (!importPath.startsWith('.')) {
    return;
  }

  if (!importPath.endsWith('.js') && !importPath.endsWith('.mjs')) {
    context.report({
      node,
      messageId: 'missingExtension',
      data: {
        importPathForErrorMessage,
      },
      fix(fixer: RuleFixer) {
        if (node.source) {
          return fixer.replaceText(
              node.source,
              `'${importPathForErrorMessage}.js'`,
          );
        }
        return null;
      },
    });
  }
}

function nodeSpecifiersSpecialImportsOnly(
    specifiers: Array<ImportSpecifier|ImportDefaultSpecifier|ImportNamespaceSpecifier>): boolean {
  if (specifiers.length !== 1) {
    return false;
  }
  const firstSpecifier = specifiers[0];

  return (
      firstSpecifier.type === 'ImportSpecifier' && firstSpecifier.imported.type === 'Identifier' &&
      ['ls', 'assertNotNullOrUndefined'].includes(firstSpecifier.imported.name));
}

function checkStarImport(
    context: RuleContext,
    node: ImportDeclaration,
    importPath: string,
    importPathForErrorMessage: string,
    importingFileName: string,
    exportingFileName: string,
    ): void {
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
        messageId: 'incorrectSameNamespaceImportStar',
        data: {
          importPathForErrorMessage,
        },
      });
    }
  }

  if (invalidCrossFolderUsage) {
    context.report({
      node,
      messageId: 'crossNamespaceImport',
      data: {importPathForErrorMessage},
    });
  }
}

export default createRule<[], MessageIds>({
  name: 'es-modules-import',
  meta: {
    type: 'problem',
    messages: {
      // Define messages corresponding to MessageIds
      doubleSlashInImportPath: 'Double slash in import path: "{{importPathForErrorMessage}}"',
      missingExtension: 'Missing file extension for import "{{importPathForErrorMessage}}"',
      invalidRelativeUrl: 'Invalid relative URL import. An import should start with either "../" or "./".',
      incorrectSameNamespaceImportNamed:
          'Incorrect same-namespace import: "{{importPathForErrorMessage}}". Use "import * as File from \'./File.js\';" instead.',
      incorrectSameNamespaceImportStar:
          'Incorrect same-namespace import: "{{importPathForErrorMessage}}". Use "import { Symbol } from \'./relative-file.js\';" instead.',
      crossNamespaceImport: CROSS_NAMESPACE_MESSAGE,
      crossNamespaceImportLs:
          CROSS_NAMESPACE_MESSAGE + ' You may only import common/ls.js directly from TypeScript source files.',
      crossNamespaceImportThirdParty: CROSS_NAMESPACE_MESSAGE +
          ' If the third_party dependency does not expose a single entrypoint, update es_modules_import.js to make it exempt.',
      incorrectSameNamespaceTestImport:
          'Incorrect same-namespace import: "{{importPathForErrorMessage}}". Use "import * as {{namespaceNameForErrorMessage}} from \'./{{namespaceFilenameForErrorMessage}}.js\';" instead.',
    },
    docs: {
      description: 'check ES import usage',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],  // Add defaultOptions
  create: function(context: RuleContext) {
    const filename = context.filename;
    // Ensure filename is resolved to an absolute path if it's not already
    const importingFileName = path.resolve(filename);

    return {
      ExportNamedDeclaration(node) {
        // Any export in a file is called an `ExportNamedDeclaration`, but
        // only directly-exporting-from-import declarations have the
        // `node.source` set.
        if (!node.source) {
          return;
        }
        const value = node.source.value;
        const importPath = path.normalize(value);
        const importPathForErrorMessage = value.replace(/\\/g, '/');
        checkImportExtension(
            importPath,
            importPathForErrorMessage,
            context,
            node,
        );
      },
      ImportDeclaration(node) {
        const value = node.source.value;

        if (value.includes('//')) {
          context.report({
            node,
            messageId: 'doubleSlashInImportPath',
            data: {
              importPathForErrorMessage: value,
            },
            fix(fixer: RuleFixer) {
              const fixedValue = value.replaceAll('//', '/');
              // Replace the original import string with the fixed one. We need
              // the extra quotes around the value to ensure we produce valid
              // JS - else it would end up as `import X from ../some/path.js`
              return fixer.replaceText(node.source, `'${fixedValue}'`);
            },
          });
        }

        const importPath = path.normalize(value);
        const importPathForErrorMessage = value.replace(/\\/g, '/');

        checkImportExtension(
            value,
            importPathForErrorMessage,
            context,
            node,
        );

        // Type imports are unrestricted
        if (node.importKind === 'type') {
          // `import type ... from ...` syntax
          return;
        }
        // Check specifiers for `import {type T} from ...`
        if (node.specifiers.every(spec => spec.type === 'ImportSpecifier' && spec.importKind === 'type')) {
          return;
        }

        // Accidental relative URL:
        // e.g.: import * as Root from 'front_end/root/root.js';
        //
        // Should ignore named imports import * as fs from 'fs';
        //
        // Don't use `importPath` here, as `path.normalize` removes
        // the `./` from same-folder import paths. Use original `value`.
        if (!value.startsWith('.') && !/^[\w\-_]+$/.test(value)) {
          context.report({
            node,
            messageId: 'invalidRelativeUrl',  // Use messageId
          });
        }

        // the Module import rules do not apply within:
        // 1. inspector_overlay
        // 2. front_end/third_party
        if (importingFileName.startsWith(INSPECTOR_OVERLAY_DIRECTORY) ||
            importingFileName.startsWith(THIRD_PARTY_DIRECTORY)) {
          return;
        }

        if (isSideEffectImportSpecifier(node.specifiers)) {
          return;
        }

        if (importPathForErrorMessage.endsWith('platform/platform.js') &&
            nodeSpecifiersSpecialImportsOnly(node.specifiers)) {
          /* We allow direct importing of the ls and assertNotNull utility as it's so frequently used. */
          return;
        }

        const exportingFileName = path.resolve(
            path.dirname(importingFileName),
            importPath,
        );

        if (isStarAsImportSpecifier(node.specifiers)) {
          // Pass absolute paths to checkStarImport
          checkStarImport(
              context,
              node,
              importPath,
              importPathForErrorMessage,
              importingFileName,
              exportingFileName,
          );
        } else if (computeTopLevelFolder(importingFileName) !== computeTopLevelFolder(exportingFileName)) {
          // Check if exportingFileName is actually under FRONT_END_DIRECTORY before comparing top level folders
          if (!path.relative(FRONT_END_DIRECTORY, exportingFileName).startsWith('..')) {
            if (importingFileName.endsWith('.test.ts') &&
                importPath.includes([path.sep, 'testing', path.sep].join(''))) {
              /** Within test files we allow the direct import of test helpers.*/
              return;
            }

            // We explicitly allow destructuring imports from 'lit/lit.js'.
            if (importPath.endsWith(path.join('lit', 'lit.js'))) {
              return;
            }

            let messageId: MessageIds = 'crossNamespaceImport';

            if (value.endsWith('common/ls.js')) {
              messageId = 'crossNamespaceImportLs';
            } else if (importPath.includes('third_party')) {
              messageId = 'crossNamespaceImportThirdParty';
            }

            context.report({
              node,
              messageId,
              data: {
                importPathForErrorMessage,
              },
            });
          }
        } else if (isModuleEntrypoint(importingFileName)) {
          if (importingFileName.includes(
                  ['testing', 'test_setup.ts'].join(path.sep),
                  ) &&
              importPath.includes([path.sep, 'testing', path.sep].join(''))) {
            /**
             * Within test files we allow the direct import of test helpers.
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
            messageId: 'incorrectSameNamespaceImportNamed',  // Use messageId
            data: {
              importPathForErrorMessage,
            },
          });
        } else if (path.dirname(importingFileName) === path.dirname(exportingFileName)) {
          if (!importingFileName.endsWith('.test.ts') || !importingFileName.startsWith(FRONT_END_DIRECTORY)) {
            return;
          }

          const importingDirectoryName = path.basename(
              path.dirname(importingFileName),
          );
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
              messageId: 'incorrectSameNamespaceTestImport',
              data: {
                importPathForErrorMessage,
                namespaceNameForErrorMessage,
                namespaceFilenameForErrorMessage,
              },
            });
          }
        }
      },
    };
  },
});
