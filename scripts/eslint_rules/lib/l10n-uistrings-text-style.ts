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

const CONTRACTIONS_MAP: Record<string, string> = {
  'does not': 'doesn’t',
  'has not': 'hasn’t',
  'is not': 'isn’t',
  'are not': 'aren’t',
  'can not': 'can’t',
  // eslint-disable-next-line @stylistic/quote-props
  'cannot': 'can’t',
  'will not': 'won’t',
  'do not': 'don’t',
  'should not': 'shouldn’t',
  'would not': 'wouldn’t',
  'could not': 'couldn’t',
  'did not': 'didn’t',
  'was not': 'wasn’t',
  'were not': 'weren’t',
  'have not': 'haven’t',
  'had not': 'hadn’t',
  'must not': 'mustn’t',
};
const CONTRACTION_PATTERN = Object.keys(CONTRACTIONS_MAP).join('|');
const CONTRACTION_REGEX = new RegExp(`\\b(${CONTRACTION_PATTERN})\\b`, 'i');
const CONTRACTION_OUTSIDE_BACKTICKS_REGEX = new RegExp(`(\`[^\`]*\`)|\\b(${CONTRACTION_PATTERN})\\b`, 'gi');

function getContractionReplacement(match: string): string {
  const replacement = CONTRACTIONS_MAP[match.toLowerCase()];
  if (!replacement) {
    return match;
  }
  if (match[0] === match[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

export default createRule({
  name: 'l10n-uistrings-text-style',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Enforces text style guidelines for UIStrings object literals (no fully locked phrases, no single placeholder phrases, use curly apostrophes, use straight double quotes, use Unicode ellipsis, use all-uppercase URL, use contractions).',
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
      useContraction: 'Use contraction "{{PH1}}" instead of "{{PH2}}" in "{{PH3}}".',
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
          const textWithoutCode = propertyValue.replace(BACKTICK_CODE_REGEX, '');
          const textWithoutCodeAndPlaceholders = textWithoutCode.replace(PLACEHOLDER_REGEX, '');
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

          const contractionMatch = textWithoutCode.match(CONTRACTION_REGEX);
          if (contractionMatch) {
            const uncontracted = contractionMatch[0];
            const contracted = getContractionReplacement(uncontracted);
            context.report({
              node: valueNode,
              messageId: 'useContraction',
              data: {
                PH1: contracted,
                PH2: uncontracted,
                PH3: propertyValue,
              },
              fix: function(fixer) {
                const rawText = context.sourceCode.getText(valueNode);
                const fixedText = rawText.replace(
                    CONTRACTION_OUTSIDE_BACKTICKS_REGEX,
                    function(match, backtickGroup: string|undefined) {
                      if (backtickGroup) {
                        return backtickGroup;
                      }
                      return getContractionReplacement(match);
                    },
                );
                return fixer.replaceText(valueNode, fixedText);
              },
            });
          }
        }
      },
    };
  },
});
