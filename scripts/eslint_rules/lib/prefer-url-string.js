// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
'use strict';

/**
 * @fileoverview Prefer `urlString` helper over sprinkling casts to
 * `UrlString` across the codebase..
 */

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/** @type {import('eslint').Rule.RuleModule} */
module.exports = {
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
    schema: [], // no options
  },
  create: function (context) {
    let lastImportNode = null;
    let importTypeStarAsPlatformNode = null;

    function isImportTypeStarAsPlatform(node) {
      return node.importKind === 'type' &&
             node.specifiers.length === 1 &&
             node.specifiers[0].type === 'ImportNamespaceSpecifier' &&
             node.specifiers[0].local.type === 'Identifier' &&
             node.specifiers[0].local.name === 'Platform';
    }

    function isPlatformDevToolsPathUrlString(node) {
      return node.type === 'TSTypeReference' &&
             node.typeName.type === 'TSQualifiedName' &&
             node.typeName.left.type === 'TSQualifiedName' &&
             node.typeName.left.left.type === 'Identifier' &&
             node.typeName.left.left.name === 'Platform' &&
             node.typeName.left.right.type === 'Identifier' &&
             node.typeName.left.right.name === 'DevToolsPath' &&
             node.typeName.right.type === 'Identifier' &&
             node.typeName.right.name === 'UrlString';
    }

    function reportError(node) {
      context.report({
        node,
        messageId: 'useUrlString',
        fix(fixer) {
          const {sourceCode} = context;
          const urlText = node.expression.type === 'Literal' ?
              String(node.expression.value).replace('$', '\\$').replace('`', '\\`') :
              `\${${sourceCode.getText(node.expression)}}`;
          const nodeText = `urlString\`${urlText}\``;
          const result = [fixer.replaceText(node, nodeText)];
          if (lastImportNode !== null) {
            // Define the shorthand
            result.push(fixer.insertTextAfter(lastImportNode, '\n\nconst {urlString} = Platform.DevToolsPath;'));
            lastImportNode = null;
          }
          if (importTypeStarAsPlatformNode) {
            const importStarAsPlatformText =
                sourceCode.getText(importTypeStarAsPlatformNode).replace(/import\s+type/, 'import');
            result.push(fixer.replaceText(importTypeStarAsPlatformNode, importStarAsPlatformText));
            importTypeStarAsPlatformNode = null;
          }
          return result;
        }
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
};
