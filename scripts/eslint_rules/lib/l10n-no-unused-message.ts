// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type {TSESLint, TSESTree} from '@typescript-eslint/utils';

import {isUIStringsVariableDeclarator} from './utils/l10n-helper.ts';
import {createRule} from './utils/ruleCreator.ts';

type MemberExpression = TSESTree.MemberExpression;
type Property = TSESTree.Property;
type Identifier = TSESTree.Identifier;
type RuleFix = TSESLint.RuleFix;
type RuleFixer = TSESLint.RuleFixer;

const MODULE_UI_STRINGS_FILENAME_REGEX = /ModuleUIStrings\.(js|ts)$/;
const TRACE_INSIGHTS_UI_STRINGS_FILENAME_REGEX = /models\/trace\/insights\/.*\.(js|ts)$/;

/**
 * Returns true iff the passed expression is of the form `UIStrings.bar`.
 */
function isStandardUIStringsMemberExpression(
    expr: TSESTree.Node,
    ): expr is MemberExpression&{
  object: Identifier, property: Identifier,
}
{
  if (expr.type !== 'MemberExpression') {
    return false;
  }
  if (expr.object.type !== 'Identifier' || !expr.object.name.startsWith('UIStrings')) {
    return false;
  }

  return expr.property.type === 'Identifier';
}

export default createRule({
  name: 'l10n-no-unused-message',
  meta: {
    type: 'problem',
    docs: {
      description: 'Unused properties on UIStrings objects are not allowed.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],  // no options
    messages: {
      unusedMessage: 'UIStrings message is not used.',
    },
  },
  defaultOptions: [],
  create: function(context) {
    // ESLint provides the filename with normalized separators.
    const filename = context.filename.replaceAll(
        '\\',
        '/',
    );

    const sourceCode = context.sourceCode;
    // Store the Property node itself to report errors and apply fixes
    const declaredUIStringsKeys = new Map<string, Property>();
    const usedUIStringsKeys = new Set<string>();

    function removeProperty(fixer: RuleFixer, property: Property): RuleFix {
      const source = sourceCode;

      // For simplicity, we remove whole lines. This assumes that the UIStrings has
      // some standard formatting. Otherwise we would have to fiddle a lot
      // with tokens and whitespace.
      let lineToRemoveStart = source.getLocFromIndex(property.range[0]).line;
      const lineToRemoveEnd = source.getLocFromIndex(property.range[1]).line + 1;

      // Are there comments in front of the property?
      // Move the line we want to remove to the line of the first comment.
      const comments = source.getCommentsBefore(property);
      const firstComment = comments[0];
      if (firstComment?.range) {
        lineToRemoveStart = source.getLocFromIndex(firstComment.range[0]).line;
      }

      const removeStart = source.getIndexFromLoc({
        line: lineToRemoveStart,
        column: 0,
      });
      // Ensure removeEnd doesn't exceed the source length
      const lastLineIndex = source.lines.length - 1;
      const lastLine = source.lines[lastLineIndex];
      const maxIndex = source.getIndexFromLoc({
        line: lastLineIndex + 1,
        column: lastLine.length,
      });
      const calculatedRemoveEnd = source.getIndexFromLoc({
        line: Math.min(lineToRemoveEnd, source.lines.length),
        column: 0,
      });

      // Adjust removeEnd if it points beyond the end of the file
      const removeEnd = Math.min(calculatedRemoveEnd, maxIndex);

      // Ensure start is not greater than end (can happen with empty files or edge cases)
      if (removeStart >= removeEnd) {
        // Cannot create a valid fix, maybe return null or an empty array?
        // For now, returning a no-op fix to match original intent closely.
        // A better approach might be to log a warning or prevent the report.
        console.warn(
            `Could not generate fix for unused l10n message at ${filename}:${lineToRemoveStart}`,
        );
        return fixer.replaceTextRange([0, 0], '');  // No-op fix
      }

      return fixer.removeRange([removeStart, removeEnd]);
    }

    return {
      VariableDeclarator(node) {
        if (MODULE_UI_STRINGS_FILENAME_REGEX.test(filename) ||
            TRACE_INSIGHTS_UI_STRINGS_FILENAME_REGEX.test(filename)) {
          return;
        }

        if (!isUIStringsVariableDeclarator(context, node)) {
          return;
        }

        // Add checks for init and expression properties
        if (node.init?.type !== 'TSAsExpression' || node.init.expression.type !== 'ObjectExpression') {
          return;
        }

        for (const property of node.init.expression.properties) {
          if (property.type !== 'Property' || property.key.type !== 'Identifier') {
            continue;
          }
          declaredUIStringsKeys.set(property.key.name, property);
        }
      },
      MemberExpression(node) {
        if (!isStandardUIStringsMemberExpression(node)) {
          return;
        }
        usedUIStringsKeys.add(node.property.name);
      },
      'Program:exit': function() {
        for (const usedKey of usedUIStringsKeys) {
          declaredUIStringsKeys.delete(usedKey);
        }

        for (const property of declaredUIStringsKeys.values()) {
          context.report({
            node: property,
            messageId: 'unusedMessage',
            fix: fixer => removeProperty(fixer, property),
          });
        }
      },
    };
  },
});
