// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Prefer `urlString` helper over sprinkling casts to
 * `UrlString` across the codebase..
 */

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {createRule} from './utils/ruleCreator.ts';

// Define specific node types for clarity
type ImportDeclaration = TSESTree.ImportDeclaration;
type TSAsExpression = TSESTree.TSAsExpression;
type TSTypeReference = TSESTree.TSTypeReference;
type RuleFix = TSESLint.RuleFix;

export default createRule({
  name: 'prefer-url-string',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Prefer `urlString` helper over manual casts to `UrlString` branded type.',
      category: 'Best Practices',
    },
    messages: {
      useUrlString: 'Use `urlString` helper instead of explicitly casting strings to the `UrlString` branded type',
    },
    fixable: 'code',
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;
    let lastImportNode: ImportDeclaration|null = null;
    let importTypeStarAsPlatformNode: ImportDeclaration|null = null;

    function isImportTypeStarAsPlatform(node: ImportDeclaration): boolean {
      return node.importKind === 'type' && node.specifiers.length === 1 &&
          node.specifiers[0].type === 'ImportNamespaceSpecifier' && node.specifiers[0].local.type === 'Identifier' &&
          node.specifiers[0].local.name === 'Platform';
    }

    function isPlatformDevToolsPathUrlString(node: TSESTree.TypeNode): node is TSTypeReference {
      // Check if it's a TSTypeReference with a TSQualifiedName
      if (node.type !== 'TSTypeReference' || node.typeName.type !== 'TSQualifiedName') {
        return false;
      }

      const typeName = node.typeName;
      // Check Platform.DevToolsPath part
      if (typeName.left.type !== 'TSQualifiedName' || typeName.left.left.type !== 'Identifier' ||
          typeName.left.left.name !== 'Platform' || typeName.left.right.type !== 'Identifier' ||
          typeName.left.right.name !== 'DevToolsPath') {
        return false;
      }

      // Check UrlString part
      return typeName.right.type === 'Identifier' && typeName.right.name === 'UrlString';
    }

    function reportError(node: TSAsExpression) {
      context.report({
        node,
        messageId: 'useUrlString',
        fix(fixer) {
          const urlText = node.expression.type === 'Literal' ?
              String(node.expression.value).replace('$', '\\$').replace('`', '\\`') :
              `\${${sourceCode.getText(node.expression)}}`;
          const nodeText = `urlString\`${urlText}\``;
          const fixers: RuleFix[] = [fixer.replaceText(node, nodeText)];

          // Add import fix if needed
          if (lastImportNode !== null) {
            fixers.push(fixer.insertTextAfter(lastImportNode, '\n\nconst {urlString} = Platform.DevToolsPath;'));
            // Prevent adding the import fix multiple times within the same file run
            lastImportNode = null;
          }

          // Modify type import if needed
          if (importTypeStarAsPlatformNode) {
            const importStarAsPlatformText =
                sourceCode.getText(importTypeStarAsPlatformNode).replace(/import\s+type/, 'import');
            fixers.push(fixer.replaceText(importTypeStarAsPlatformNode, importStarAsPlatformText));
            // Prevent modifying the import multiple times
            importTypeStarAsPlatformNode = null;
          }
          return fixers;
        },
      });
    }

    return {
      ImportDeclaration(node) {
        lastImportNode = node;
        if (isImportTypeStarAsPlatform(node)) {
          importTypeStarAsPlatformNode = node;
        }
      },
      TSAsExpression(node) {
        if (isPlatformDevToolsPathUrlString(node.typeAnnotation)) {
          reportError(node);
        }
      },
    };
  },
});
