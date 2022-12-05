// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

module.exports = {
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
    schema: []  // no options
  },
  create: function(context) {
    // Stores any type imports (import type {} from ...).
    // The key is the literal import path ("../foo.js");
    const typeImports = new Map();
    // Stores any value imports (import {} from ...).
    // The key is the literal import path ("../foo.js");
    const valueImports = new Map();

    // Takes the node that represents an import ("Foo", "Foo as Bar") and
    // return the literal text.
    function getTextForImportSpecifier(specifier) {
      // => import {Foo as Bar} from 'foo';
      // Foo = imported name
      // Bar = local name
      const localName = specifier.local.name;
      const importedName = specifier.imported.name;
      if (localName === importedName) {
        // No `X as Y`, so just use either name.
        return localName;
      }
      return `${importedName} as ${localName}`;
    }

    function mergeImports(fixer, typeImportNode, valueImportNode) {
      // Get all the references from the type import node that we need to add to the value import node.
      const typeImportSpecifiers = typeImportNode.specifiers.map(spec => {
        return getTextForImportSpecifier(spec);
      });

      // Find the last value specifier, which we will then insert the type imports to.
      const lastValueSpecifier = valueImportNode.specifiers[valueImportNode.specifiers.length - 1];

      // Remember that we don't need to concern ourselves with indentation: in
      // PRESUBMIT clang-format runs _after_ ESLint, so we can let Clang tidy
      // up any rough edges.
      const textToImport = ', ' +
          typeImportSpecifiers
              .map(spec => `type ${spec}`)
              .join(', ');

      return [
        // Remove the type import
        fixer.remove(typeImportNode),
        // Add the type imports to the existing import
        fixer.insertTextAfter(lastValueSpecifier, textToImport)
      ];
    }

    function inlineTypeImportKeyword(fixer, typeImportNode) {
      // We need to remove the " type" text after "import".
      const importStart = typeImportNode.range[0];
      const typeImportStart = importStart + 6;    // 6 here = length of "import"
      const typeImportEnd = typeImportStart + 5;  // 5 here = length of "type" + 1 to remove the space after it.

      const addTypeToSpecifiersFixers = typeImportNode.specifiers.map(spec => {
        const newText = getTextForImportSpecifier(spec);

        return fixer.replaceText(spec, `type ${newText}`);
      });

      return [
        ...addTypeToSpecifiersFixers,
        fixer.removeRange([typeImportStart, typeImportEnd]),
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
          valueImports.set(importFilePath, node);
        }
      },
      'Program:exit'() {
        // Loop over the type imports and see if there are any matching value
        // imports.
        // Looping this way means if there are any value imports without a
        // matching type import, we leave them alone.
        for (const [typeImportFilePath, typeImportNode] of typeImports) {
          const valueImportNodeForFilePath = valueImports.get(typeImportFilePath);
          if (valueImportNodeForFilePath) {
          // If we've got here, we have two imports for the same file-path, one
          // for types, and one for values, so let's merge them.
            context.report({
              node: typeImportNode,
              messageId: 'inlineTypeImport',
              fix(fixer) {
                return mergeImports(fixer, typeImportNode, valueImportNodeForFilePath);
              }
            });
            continue;
          }

          // At this point we have just a type import and no matching file
          // import, but we still want to convert the import so that each
          // imported reference uses the type modifier:
          // BEFORE: import type {A, B} from '...';
          // AFTER: import {type A, type B} from '...';
          context.report({
            node: typeImportNode,
            messageId: 'convertTypeImport',
            fix(fixer) {
              return inlineTypeImportKeyword(fixer, typeImportNode);
            }
          });
        }
      },
    };
  }
};
