// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isUIStringsVariableDeclarator} from './utils/l10n-helper.ts';
import {createRule} from './utils/ruleCreator.ts';

const FULLY_LOCKED_PHRASE_REGEX = /^`[^`]*`$/;
const SINGLE_PLACEHOLDER_REGEX = /^\{\w+\}$/;  // Matches the PH regex in `collect-strings.js`.
const STRAIGHT_APOSTROPHE_REGEX = /[a-zA-Z]'[a-zA-Z]/;
const CURLY_DOUBLE_QUOTE_REGEX = /[“”]/;
const THREE_DOTS_REGEX = /\.\.\./;
const THREE_DOTS_OUTSIDE_BACKTICKS_REGEX = /(`[^`]*`)|\.\.\./g;
const PLACEHOLDER_REGEX = /\{[^{}]+\}/g;
const BACKTICK_CODE_REGEX = /`[^`]+`/g;
const URL_REGEX = /\burl\b/gi;

export default createRule({
  name: 'l10n-uistrings-text-style',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Enforces text style guidelines for UIStrings object literals (no fully locked phrases, no single placeholder phrases, use curly apostrophes, use straight double quotes, use Unicode ellipsis, use all-uppercase URL).',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],  // no options
    messages: {
      fullyLockedPhrase: 'Locking whole phrases is not allowed. Use i18n.i18n.lockedString instead.',
      singlePlaceholderPhrase: 'Single placeholder-only phrases are not allowed. Use i18n.i18n.lockedString instead.',
      useCurlyApostrophe: 'Use curly apostrophe (’) instead of straight apostrophe (\') in "{{PH1}}".',
      useStraightDoubleQuote: 'Use straight double quote (") instead of curly double quote in "{{PH1}}".',
      useUnicodeEllipsis: 'Use Unicode ellipsis (…) instead of three dots (...) in "{{PH1}}".',
      useUppercaseUrl: 'Use all-uppercase "URL" instead of "{{PH1}}" in "{{PH2}}".',
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
        if (expression?.type !== 'ObjectExpression') {
          return;
        }

        for (const property of expression.properties) {
          if (property.type !== 'Property' || property.value?.type !== 'Literal') {
            continue;
          }

          const valueNode = property.value;
          const propertyValue = valueNode.value;
          if (typeof propertyValue !== 'string') {
            continue;
          }

          if (FULLY_LOCKED_PHRASE_REGEX.test(propertyValue)) {
            context.report({
              node: valueNode,
              messageId: 'fullyLockedPhrase',
            });
          } else if (SINGLE_PLACEHOLDER_REGEX.test(propertyValue)) {
            context.report({
              node: valueNode,
              messageId: 'singlePlaceholderPhrase',
            });
          }

          if (STRAIGHT_APOSTROPHE_REGEX.test(propertyValue)) {
            context.report({
              node: valueNode,
              messageId: 'useCurlyApostrophe',
              data: {
                PH1: propertyValue,
              },
            });
          }

          if (CURLY_DOUBLE_QUOTE_REGEX.test(propertyValue)) {
            context.report({
              node: valueNode,
              messageId: 'useStraightDoubleQuote',
              data: {
                PH1: propertyValue,
              },
            });
          }

          // Strip placeholders like {url} or {PH1} and code spans in backticks like `url:a.com`
          const textWithoutCodeAndPlaceholders =
              propertyValue.replace(PLACEHOLDER_REGEX, '').replace(BACKTICK_CODE_REGEX, '');
          if (THREE_DOTS_REGEX.test(textWithoutCodeAndPlaceholders)) {
            context.report({
              node: valueNode,
              messageId: 'useUnicodeEllipsis',
              data: {
                PH1: propertyValue,
              },
              fix(fixer) {
                const rawText = context.sourceCode.getText(valueNode);
                const fixedText = rawText.replace(
                    THREE_DOTS_OUTSIDE_BACKTICKS_REGEX,
                    function(_match, backtickGroup: string|undefined) {
                      if (backtickGroup) {
                        return backtickGroup;
                      }
                      return '…';
                    },
                );
                return fixer.replaceText(valueNode, fixedText);
              },
            });
          }

          const urlMatches = textWithoutCodeAndPlaceholders.match(URL_REGEX);
          if (urlMatches) {
            const invalidUrlMatch = urlMatches.find(m => m !== 'URL');
            if (invalidUrlMatch) {
              context.report({
                node: valueNode,
                messageId: 'useUppercaseUrl',
                data: {
                  PH1: invalidUrlMatch,
                  PH2: propertyValue,
                },
              });
            }
          }
        }
      },
    };
  },
});
