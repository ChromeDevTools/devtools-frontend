// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isUIStringsVariableDeclarator} from './utils/l10n-helper.ts';
import {createRule} from './utils/ruleCreator.ts';

const FULLY_LOCKED_PHRASE_REGEX = /^`[^`]*`$/;
const SINGLE_PLACEHOLDER_REGEX = /^\{\w+\}$/;  // Matches the PH regex in `collect-strings.js`.

// Define the rule using the createRule utility
export default createRule({
  name: 'l10n-no-locked-or-placeholder-only-phrase',
  meta: {
    type: 'problem',
    docs: {
      description:
          'UIStrings object literals are not allowed to have phrases that are fully locked, or consist only of a single placeholder.',
      category: 'Possible Errors',
    },
    schema: [],  // no options
    messages: {
      fullyLockedPhrase: 'Locking whole phrases is not allowed. Use i18n.i18n.lockedString instead.',
      singlePlaceholderPhrase: 'Single placeholder-only phrases are not allowed. Use i18n.i18n.lockedString instead.',
    },
  },
  defaultOptions: [],
  create: function(context) {
    return {
      VariableDeclarator(node) {
        if (!isUIStringsVariableDeclarator(context, node)) {
          return;
        }

        if (node.init?.type !== 'TSAsExpression') {
          return;
        }

        const expression = node.init.expression;
        // Check if the expression inside TSAsExpression is an ObjectExpression
        if (expression?.type !== 'ObjectExpression') {
          return;
        }

        for (const property of expression.properties) {
          // Ensure the property is a standard Property and its value is a Literal
          if (property.type !== 'Property' || property.value?.type !== 'Literal') {
            continue;
          }

          const propertyValue = property.value.value;
          // Check if the literal value is a string before testing regex
          if (typeof propertyValue !== 'string') {
            continue;
          }

          if (FULLY_LOCKED_PHRASE_REGEX.test(propertyValue)) {
            context.report({
              node: property.value,
              messageId: 'fullyLockedPhrase',
            });
          } else if (SINGLE_PLACEHOLDER_REGEX.test(propertyValue)) {
            context.report({
              node: property.value,
              messageId: 'singlePlaceholderPhrase',
            });
          }
        }
      },
    };
  },
});
