// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const l10nHelper = require('./l10n_helper.js');

const MODULE_UI_STRINGS_FILENAME_REGEX = /ModuleUIStrings\.(js|ts)$/;

/**
 * Returns true iff the passed expression is of the form `UIStrings.bar`.
 */
function isStandardUIStringsMemberExpression(expr) {
  if (expr.object.type !== 'Identifier' || expr.object.name !== 'UIStrings') {
    return false;
  }

  return expr.property.type === 'Identifier';
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Unused properties on UIStrings objects are not allowed.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: []  // no options
  },
  create: function(context) {
    const declaredUIStringsKeys = new Map();
    const usedUIStringsKeys = new Set();

    function removeProperty(fixer, property) {
      const source = context.getSourceCode();

      // For simplicity, we remove whole lines. This assumes that the UIStrings has
      // some standard formatting. Otherwise we would have to fiddle a lot
      // with tokens and whitespace.
      let lineToRemoveStart = source.getLocFromIndex(property.range[0]).line;
      const lineToRemoveEnd = source.getLocFromIndex(property.range[1]).line + 1;

      // Are there comments in front of the property?
      // Move the line we want to remove to the line of the first comment.
      const comments = source.getCommentsBefore(property);
      if (comments.length > 0) {
        lineToRemoveStart = source.getLocFromIndex(comments[0].range[0]).line;
      }

      const removeStart = source.getIndexFromLoc({line: lineToRemoveStart, column: 0});
      const removeEnd = source.getIndexFromLoc({line: Math.min(lineToRemoveEnd, source.lines.length), column: 0});
      return fixer.removeRange([removeStart, removeEnd]);
    }

    return {
      VariableDeclarator(variableDeclarator) {
        if (MODULE_UI_STRINGS_FILENAME_REGEX.test(context.getFilename())) {
          return;
        }

        if (!l10nHelper.isUIStringsVariableDeclarator(context, variableDeclarator)) {
          return;
        }

        for (const property of variableDeclarator.init.properties) {
          if (property.type !== 'Property' || property.key.type !== 'Identifier') {
            continue;
          }
          declaredUIStringsKeys.set(property.key.name, property);
        }
      },
      MemberExpression(memberExpression) {
        if (!isStandardUIStringsMemberExpression(memberExpression)) {
          return;
        }
        usedUIStringsKeys.add(memberExpression.property.name);
      },
      'Program:exit': function() {
        for (const usedKey of usedUIStringsKeys) {
          declaredUIStringsKeys.delete(usedKey);
        }

        for (const property of declaredUIStringsKeys.values()) {
          context.report({
            node: property,
            message: 'UIStrings message is not used.',
            fix: fixer => removeProperty(fixer, property),
          });
        }
      },
    };
  }
};
