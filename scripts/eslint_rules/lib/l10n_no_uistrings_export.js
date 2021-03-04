// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const l10nHelper = require('./l10n_helper.js');

const MODULE_UI_STRINGS_FILENAME_REGEX = /ModuleUIStrings\.(js|ts)$/;

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'UIStrings object literals are only allowed to be exported from ModuleUIStrings.(js|ts)',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    function removeExportKeywordFromUIStrings(fixer, exportNamedDeclaration) {
      const sourceCode = context.getSourceCode();
      const exportToken = sourceCode.getFirstToken(exportNamedDeclaration);
      if (exportToken.type === 'Keyword' && exportToken.value === 'export') {
        return fixer.remove(exportToken);
      }
      return [];
    }

    return {
      ExportNamedDeclaration(exportNamedDeclaration) {
        if (MODULE_UI_STRINGS_FILENAME_REGEX.test(context.getFilename())) {
          return;
        }

        const declaration = exportNamedDeclaration.declaration;
        if (declaration?.type !== 'VariableDeclaration') {
          return;
        }

        if (declaration.declarations.length === 0 || declaration.declarations[0].type !== 'VariableDeclarator') {
          return;
        }

        if (l10nHelper.isUIStringsIdentifier(declaration.declarations[0].id)) {
          context.report({
            node: declaration.declarations[0],
            message: 'Exporting the UIStrings object is only allowed in ModuleUIStrings.(js|ts)',
            fix: fixer => removeExportKeywordFromUIStrings(fixer, exportNamedDeclaration),
          });
        }
      },
      ExportSpecifier(specifier) {
        if (specifier.local?.type === 'Identifier' && specifier.local.name === 'UIStrings') {
          context.report({
            node: specifier,
            message: 'Exporting the UIStrings object is only allowed in ModuleUIStrings.(js|ts)',
          });
        }
      }
    };
  }
};
