// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

type ImportDeclaration = TSESTree.ImportDeclaration;
type ImportSpecifier = TSESTree.ImportSpecifier;
type RuleFixer = TSESLint.RuleFixer;
type RuleContext = TSESLint.RuleContext<'inlineTypeImport'|'convertTypeImport', []>;

export default createRule({
  name: 'inline-type-imports',
  meta: {
    type: 'problem',

    docs: {
      description: 'Inline type imports.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      inlineTypeImport: 'Type imports must be imported in the same import statement as values, using the type keyword',
      convertTypeImport: 'Type imports must use the type modifier on each item, not on the overall import statement',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context: RuleContext) {
    // Stores any type imports (import type {} from ...).
    // The key is the literal import path ("../foo.js");
    const typeImports = new Map<string, ImportDeclaration>();
    // Stores any value imports (import {} from ...).
    // The key is the literal import path ("../foo.js");
    const valueImports = new Map<string, ImportDeclaration>();

    // Takes the node that represents an import ("Foo", "Foo as Bar") and
    // return the literal text.
    function getTextForImportSpecifier(specifier: ImportSpecifier): string {
      // => import {Foo as Bar} from 'foo';
      // Foo = imported name
      // Bar = local name
      const localName = specifier.local.name;
      const importedName =
          specifier.imported.type === 'Identifier' ? specifier.imported.name : specifier.imported.value;
      // => import Foo from 'foo;
      if (localName === importedName) {
        // No `X as Y`, so just use either name.
        return localName;
      }
      return `${importedName} as ${localName}`;
    }

    function mergeImports(fixer: RuleFixer, typeImportNode: ImportDeclaration, valueImportNode: ImportDeclaration) {
      // Get all the references from the type import node that we need to add to the value import node.
      const typeImportSpecifiers =
          typeImportNode.specifiers.filter((spec): spec is ImportSpecifier => spec.type === 'ImportSpecifier')
              .map(spec => {
                return getTextForImportSpecifier(spec);
              });

      // Find the last value specifier, which we will then insert the type imports to.
      const lastValueSpecifier = valueImportNode.specifiers[valueImportNode.specifiers.length - 1];

      // Remember that we don't need to concern ourselves with indentation: in
      // PRESUBMIT clang-format runs _after_ ESLint, so we can let Clang tidy
      // up any rough edges.
      const textToImport = ', ' + typeImportSpecifiers.map(spec => `type ${spec}`).join(', ');

      return [
        // Remove the type import
        fixer.remove(typeImportNode),
        // Add the type imports to the existing import
        fixer.insertTextAfter(lastValueSpecifier, textToImport),
      ];
    }

    function extractTypeImportKeyword(fixer: RuleFixer, valueImportNode: ImportDeclaration) {
      if (!valueImportNode.range) {
        return [];
      }
      const importStart = valueImportNode.range[0];
      // Find the 'type' keyword after 'import'. It should be the first token after 'import'.
      const sourceCode = context.sourceCode;
      const importToken = sourceCode.getFirstToken(valueImportNode);
      const typeToken = importToken ? sourceCode.getTokenAfter(importToken) : null;

      const fixes: TSESLint.RuleFix[] = [];

      if (typeToken && typeToken.value === 'type' && typeToken.range) {
        // Remove the " type" text after "import".
        fixes.push(fixer.removeRange(typeToken.range));
        // Potentially remove the space after 'type' if it exists
        const spaceAfterType = sourceCode.getTokenAfter(typeToken);
        if (spaceAfterType?.range && spaceAfterType.range[0] === typeToken.range[1]) {
          fixes.push(fixer.removeRange([typeToken.range[1], spaceAfterType.range[0]]));
        }
      }

      // We need to remove the "type" text before each specifier.
      const removeTypeFromSpecifiersFixers =
          valueImportNode.specifiers.filter(spec => spec.type === 'ImportSpecifier')
              .map(spec => {
                if (spec.importKind === 'type') {
                  const typeKeywordToken = sourceCode.getFirstToken(spec);
                  if (typeKeywordToken && typeKeywordToken.value === 'type' && typeKeywordToken.range) {
                    const spaceAfter = sourceCode.getTokenAfter(typeKeywordToken);
                    // Remove 'type' and the space after it
                    const endRange = (spaceAfter?.range) ? spaceAfter.range[0] : typeKeywordToken.range[1];
                    return fixer.removeRange([typeKeywordToken.range[0], endRange]);
                  }
                }
                return null;  // Return null for specifiers without 'type' or if token not found
              })
              .filter((fix): fix is TSESLint.RuleFix => fix !== null);  // Filter out nulls

      // Insert ' type' after 'import'
      fixes.push(fixer.insertTextAfterRange([importStart, importStart + 6], ' type'));  // 6 = length of "import"

      return [
        ...fixes,
        ...removeTypeFromSpecifiersFixers,
      ];
    }

    return {
      ImportDeclaration(node) {
        // Note that we only care about named imports: import {} from 'foo.js'.
        // This is because:
        // 1: if we have `import type * as SDK from '../` that means we know we
        // aren't using `SDK` for any values, otherwise we wouldn't have the
        // `type` modifier.
        // 2: similarly, `import type Foo from './foo'` follows (1). We also
        // don't use this pattern in DevTools, but even if we did we don't have
        // to worry about it.
        // 3: Any side-effect imports (import './foo.js') are irrelevant.

        if (!node.specifiers || node.specifiers.length < 1) {
          // => import './foo.js';
          return;
        }

        if (node.specifiers[0].type === 'ImportDefaultSpecifier') {
          // => import Foo from './foo.js';
          return;
        }

        if (node.specifiers[0].type === 'ImportNamespaceSpecifier') {
          // => import * as Foo from './foo.js';
          return;
        }

        // Store the import
        const importFilePath = node.source.value;
        if (node.importKind === 'type') {
          typeImports.set(importFilePath, node);
        } else if (node.importKind === 'value') {
          // Check if all specifiers are type imports even if the declaration kind is 'value'
          const allSpecifiersAreTypes =
              node.specifiers.every(s => s.type === 'ImportSpecifier' && s.importKind === 'type');
          if (allSpecifiersAreTypes) {
            // Treat `import {type A} from '...'` as a type import for merging purposes initially.
            // It will be handled later in Program:exit if no value import exists.
            typeImports.set(importFilePath, node);
          } else {
            valueImports.set(importFilePath, node);
          }
        }
      },
      'Program:exit'() {
        // Loop over the type imports and see if there are any matching value
        // imports.
        // Looping this way means if there are any value imports without a
        // matching type import, we leave them alone.
        for (const [typeImportFilePath, typeImportNode] of typeImports) {
          const valueImportNodeForFilePath = valueImports.get(typeImportFilePath);

          // Check if the typeImportNode was originally `import {type A}` which we stored earlier
          const typeImportIsSpecifierOnly = typeImportNode.importKind === 'value' &&
              typeImportNode.specifiers.every(s => s.type === 'ImportSpecifier' && s.importKind === 'type');

          if (valueImportNodeForFilePath) {
            // If we've got here, we have two imports for the same file-path, one
            // for types (either `import type {A}` or `import {type A}`),
            // and one for values, so let's merge them.
            context.report({
              node: typeImportNode,
              messageId: 'inlineTypeImport',
              fix(fixer) {
                return mergeImports(
                    fixer,
                    typeImportNode,
                    valueImportNodeForFilePath,
                );
              },
            });
            // Since we merged, remove this from typeImports map so it's not processed below
            typeImports.delete(typeImportFilePath);
            continue;
          } else if (typeImportIsSpecifierOnly) {
            // If there's no corresponding value import, and this was an `import {type A}` style,
            // convert it to `import type {A}`.
            context.report({
              node: typeImportNode,
              messageId: 'convertTypeImport',
              fix(fixer) {
                return extractTypeImportKeyword(fixer, typeImportNode);
              },
            });
          }
        }
      },
    };
  },
});
