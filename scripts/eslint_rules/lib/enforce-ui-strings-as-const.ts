// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @file Rule to check ES import usage
 * @author Ergün Erdoğmuş
 */

import {createRule} from './utils/ruleCreator.ts';

export default createRule({
  name: 'enforce-ui-strings-as-const',
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
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
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

        const declaration = node.declarations[0];
        const declarationId = declaration.id;
        const declarationInit = declaration.init;

        // We look for `startsWith` because we want to capture other variations as well
        // such as `UIStringsNotTranslate` from the AIAssistancePanel.
        const isIdentifierUIStrings = declarationId.type === 'Identifier' && declarationId.name.startsWith('UIStrings');

        const isObjectExpressionWithoutAsConst = declarationInit?.type === 'ObjectExpression';

        if (!isIdentifierUIStrings || !isObjectExpressionWithoutAsConst) {
          return;
        }

        // If we reached here, it's a `const UIStrings... = {}` without `as const`.
        context.report({
          node: declaration,  // Report on the whole declaration for context
          messageId: 'invalidUIStringsObject',
          fix: fixer => {
            const objectEnd = declarationInit.range[1];

            return fixer.insertTextAfterRange(
                [objectEnd - 1, objectEnd],
                ' as const',
            );
          },
        });
      },
    };
  },
});
