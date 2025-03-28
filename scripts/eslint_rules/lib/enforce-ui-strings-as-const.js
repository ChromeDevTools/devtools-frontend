// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @fileoverview Rule to check ES import usage
 * @author ergunsh@
 */
'use strict';

// ------------------------------------------------------------------------------
// Rule Definition
// ------------------------------------------------------------------------------

/**
 * @type {import('eslint').Rule.RuleModule}
 */
module.exports = {
  meta: {
    type: 'suggestion',
    messages: {
      invalidUIStringsObject: 'Add `as const` to UIStrings constant object.',
    },
    docs: {
      description: 'Enforce `as const` for UIStrings constant objects.',
      category: 'Best Practices',
    },
    fixable: 'code',
    schema: [], // no options
  },
  create: function (context) {
    return {
      VariableDeclaration(node) {
        if (node.kind !== 'const') {
          return;
        }

        // We only care about the declaration `const UIStrings = {}`
        // and there can't be multiple declarations while defining it.
        if (node.declarations.length !== 1) {
          return;
        }

        const [declaration] = node.declarations;
        // We look for `startsWith` because we want to capture other variations as well
        // such as `UIStringsNotTranslate` from the AIAssistancePanel.
        const isIdentifierUIStrings = declaration.id.type === 'Identifier' && declaration.id.name.startsWith('UIStrings');
        const isAValidObjectExpression = declaration.init?.type === 'ObjectExpression';
        if (!isIdentifierUIStrings || !isAValidObjectExpression) {
          return;
        }

        // When we already have `as const`, the `declaration.init`s
        // type will be TSAsExpression, so if we're here, we know
        // that the declaration's init is marked as `ObjectExpression`
        // and it is not an `as const` expression.
        context.report({
          node: declaration,
          messageId: 'invalidUIStringsObject',
          fix: fixer => {
            const objectEnd = declaration.init?.range?.[1];
            if (!objectEnd) {
              return null;
            }

            return fixer.insertTextAfterRange(
                [objectEnd - 1, objectEnd],
                ' as const',
            );
          },
        });
      },
    };
  },
};
