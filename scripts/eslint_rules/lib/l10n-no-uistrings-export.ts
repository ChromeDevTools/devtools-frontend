// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {isUIStringsIdentifier} from './utils/l10n-helper.ts';
import {createRule} from './utils/ruleCreator.ts';

type ExportNamedDeclaration = TSESTree.ExportNamedDeclaration;
type RuleFix = TSESLint.RuleFix;
type RuleFixer = TSESLint.RuleFixer;

const MODULE_UI_STRINGS_FILENAME_REGEX = /ModuleUIStrings\.(js|ts)$/;
const TRACE_INSIGHTS_UI_STRINGS_FILENAME_REGEX = /models\/trace\/insights\/.*\.(js|ts)$/;

export default createRule({
  name: 'l10n-no-uistrings-export',
  meta: {
    type: 'problem',
    docs: {
      description:
          'UIStrings object literals are only allowed to be exported from ModuleUIStrings.(js|ts) or trace/model/insights',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],  // no options
    messages: {
      noExport: 'Exporting the UIStrings object is only allowed in ModuleUIStrings.(js|ts) or trace/model/insights',
    },
  },
  defaultOptions: [],
  create: function(context) {
    const filename = context.filename.replaceAll('\\', '/');
    const sourceCode = context.sourceCode;

    function removeExportKeywordFromUIStrings(
        fixer: RuleFixer,
        exportNamedDeclaration: ExportNamedDeclaration,
        ): RuleFix|RuleFix[] {
      const exportToken = sourceCode.getFirstToken(exportNamedDeclaration);
      if (!exportToken) {
        return [];
      }

      if (exportToken.type === 'Keyword' && exportToken.value === 'export') {
        return fixer.remove(exportToken);
      }
      // Return an empty array if no fix is applied
      return [];
    }

    return {
      ExportNamedDeclaration(node) {
        if (MODULE_UI_STRINGS_FILENAME_REGEX.test(filename) ||
            TRACE_INSIGHTS_UI_STRINGS_FILENAME_REGEX.test(filename)) {
          return;
        }

        const declaration = node.declaration;
        if (declaration?.type !== 'VariableDeclaration') {
          return;
        }

        if (declaration.declarations.length === 0 || declaration.declarations[0].type !== 'VariableDeclarator') {
          return;
        }

        const firstDeclarator = declaration.declarations[0];

        if (firstDeclarator.id?.type === 'Identifier' && isUIStringsIdentifier(firstDeclarator.id)) {
          context.report({
            node: firstDeclarator,
            messageId: 'noExport',
            fix: fixer => removeExportKeywordFromUIStrings(fixer, node),
          });
        }
      },
      ExportSpecifier(node) {
        if (node.local?.type === 'Identifier' && node.local.name === 'UIStrings') {
          context.report({
            node,
            messageId: 'noExport',
          });
        }
      },
    };
  },
});
