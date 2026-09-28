// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @file Enforces punctuation rules for UIStrings in Chrome DevTools.
 *
 * How the linter works:
 * 1. Target identification:
 *    Inspects object literals assigned to `UIStrings` (e.g. `const UIStrings = { ... } as const;`).
 *    Strings with no alphabetic characters (e.g. '.', '---') are ignored.
 *
 * 2. Sentence boundary detection:
 *    Determines whether a string contains multiple sentences by searching for terminal punctuation
 *    ([.!?]) followed by whitespace and a new sentence start (capital letter, number, code quote, etc.).
 *    Common abbreviations ("e.g.", "i.e.", "vs.", "etc.") are ignored via a module-level Set so
 *    they do not trigger false sentence splits.
 *
 * 3. Validation:
 *    - Single-sentence strings: Standalone UI labels, titles, and short messages must NOT end in a period.
 *      Ellipses ('…', '...') are permitted.
 *    - Multi-sentence strings: In multi-sentence text, all sentences must have terminal punctuation.
 *      The final sentence must end in terminal punctuation (or an acceptable ending such as a URL,
 *      placeholder like {PH1}, ellipsis, or colon).
 *
 * 4. ICU plurals:
 *    For strings using ICU plural format (`{n, plural, =1 {...} other {...}}`), each plural branch is
 *    evaluated independently against the rules above.
 */

import {isUIStringsVariableDeclarator} from './utils/l10n-helper.ts';
import {createRule} from './utils/ruleCreator.ts';

const ABBREVIATIONS = new Set([
  'e.g.',
  'i.e.',
  'vs.',
  'etc.',
]);

const SENTENCE_ENDERS = new Set(['.', '!', '?']);
const TERMINAL_PUNCTUATION = new Set(['.', '!', '?', '…', ':']);
const CLOSING_WRAPPERS = new Set(['"', '\'', '’', '”', ')']);
const OPENING_WRAPPERS = new Set(['"', '\'', '‘', '“', '(']);
const SENTENCE_STARTERS = new Set(['`', '"', '\'', '{', '[']);
const URL_PREFIXES = ['http://', 'https://', 'goo.gle/', 'g.co/', 'web.dev/'];

const ASCII_LETTER_REGEX = /[a-zA-Z]/;
const ICU_PLURAL_BRANCH_REGEX = /((?:=\d+|zero|one|two|few|many|other)\s*\{)((?:[^{}]|\{[^{}]*\})+)(\})/g;
const TRAILING_PERIOD_BEFORE_QUOTE_REGEX = /\.(\s*['"`])$/;
const CLOSING_QUOTE_REGEX = /(\s*)(['"`])$/;

function stripTrailingWrapper(word: string): string {
  const lastChar = word.at(-1) ?? '';
  return CLOSING_WRAPPERS.has(lastChar) ? word.slice(0, -1) : word;
}

function stripLeadingWrappers(word: string): string {
  let i = 0;
  while (i < word.length && OPENING_WRAPPERS.has(word[i])) {
    i++;
  }
  return word.slice(i);
}

function isAbbreviation(word: string): boolean {
  const cleaned = stripLeadingWrappers(word).toLowerCase();
  return ABBREVIATIONS.has(cleaned);
}

function startsNewSentence(word: string, remainingText: string): boolean {
  const firstChar = word[0] ?? '';

  // Starts with an uppercase letter, digit, or code/placeholder/bracket opener.
  if ((firstChar >= 'A' && firstChar <= 'Z') || (firstChar >= '0' && firstChar <= '9') ||
      SENTENCE_STARTERS.has(firstChar)) {
    return true;
  }

  // Starts with a parenthetical that is itself a complete sentence ending in [.!?] before ')'.
  if (firstChar === '(') {
    const closeIdx = remainingText.indexOf(')');
    if (closeIdx > 0) {
      const charBeforeClose = remainingText[closeIdx - 1];
      if (SENTENCE_ENDERS.has(charBeforeClose)) {
        return true;
      }
    }
  }

  return false;
}

// Checks for an internal sentence boundary: terminal punctuation followed by whitespace
// and a new sentence start, ignoring known abbreviations and ellipses.
function isMultiSentence(text: string): boolean {
  const words = text.trim().split(/\s+/);
  let offset = 0;

  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i];
    offset = text.indexOf(word, offset) + word.length;

    const stripped = stripTrailingWrapper(word);
    const lastChar = stripped.at(-1) ?? '';

    // Must end with sentence-ending punctuation ('.', '!', or '?').
    if (!SENTENCE_ENDERS.has(lastChar)) {
      continue;
    }

    // Ignore ASCII ellipses ('..' or '...').
    if (stripped.endsWith('..')) {
      continue;
    }

    // Ignore known abbreviations ('e.g.', 'i.e.', 'vs.', 'etc.').
    if (isAbbreviation(stripped)) {
      continue;
    }

    const remainingText = text.slice(offset).trimStart();
    if (startsNewSentence(words[i + 1], remainingText)) {
      return true;
    }
  }

  return false;
}

function hasTerminalPunctuation(text: string): boolean {
  const trimmed = text.trimEnd();
  if (!trimmed) {
    return false;
  }

  // 1. Ends with standard terminal punctuation (optionally inside a closing quote or parenthesis).
  const withoutClosingWrapper = stripTrailingWrapper(trimmed);
  const lastChar = withoutClosingWrapper.at(-1) ?? '';
  if (TERMINAL_PUNCTUATION.has(lastChar)) {
    return true;
  }

  // 2. Ends with a URL or shortlink (where a trailing period could break the link).
  const lastWord = trimmed.split(/\s+/).at(-1) ?? '';
  if (URL_PREFIXES.some(prefix => lastWord.startsWith(prefix)) && !lastWord.endsWith(')')) {
    return true;
  }

  // 3. Ends with a localization placeholder such as {PH1}.
  const lastOpenBrace = trimmed.lastIndexOf('{');
  if (trimmed.endsWith('}') && lastOpenBrace !== -1) {
    const placeholderName = trimmed.slice(lastOpenBrace + 1, -1);
    if (placeholderName.length > 0 && !placeholderName.includes('}')) {
      return true;
    }
  }

  // 4. Ends with a bracketed source attribution tag such as [Source: ...].
  const lastOpenBracket = trimmed.lastIndexOf('[');
  if (trimmed.endsWith(']') && lastOpenBracket !== -1) {
    const bracketedText = trimmed.slice(lastOpenBracket);
    if (bracketedText.startsWith('[Source:') && !bracketedText.slice(1, -1).includes(']')) {
      return true;
    }
  }

  return false;
}

function checkPunctuation(text: string): 'singleSentenceEndingPeriod'|'multiSentenceMissingPeriod'|null {
  const trimmed = text.trimEnd();
  if (isMultiSentence(trimmed)) {
    return hasTerminalPunctuation(trimmed) ? null : 'multiSentenceMissingPeriod';
  }
  if (trimmed.endsWith('.') && !trimmed.endsWith('..') && !trimmed.endsWith('…')) {
    return 'singleSentenceEndingPeriod';
  }
  return null;
}

export default createRule({
  name: 'l10n-uistrings-sentence-punctuation',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Enforces punctuation rules for UIStrings: single-sentence strings must not end in a period, while multi-sentence strings must end each sentence with punctuation.',
      category: 'Possible Errors',
    },
    fixable: 'code',
    schema: [],
    messages: {
      singleSentenceEndingPeriod: 'UI strings that are a single sentence should not end on a period.',
      multiSentenceMissingPeriod: 'In a string with multiple sentences, each sentence should have a period.',
    },
  },
  defaultOptions: [],
  create: function(context) {
    const sourceCode = context.sourceCode;

    return {
      VariableDeclarator(node) {
        if (!isUIStringsVariableDeclarator(context, node)) {
          return;
        }

        if (node.init?.type !== 'TSAsExpression' || node.init.expression.type !== 'ObjectExpression') {
          return;
        }

        for (const property of node.init.expression.properties) {
          if (property.type !== 'Property' || property.key.type !== 'Identifier' || property.value.type !== 'Literal' ||
              typeof property.value.value !== 'string') {
            continue;
          }

          const valueNode = property.value;
          const value = property.value.value;
          const rawText = sourceCode.getText(valueNode);

          if (!ASCII_LETTER_REGEX.test(value)) {
            continue;
          }

          // ICU plural format: {n, plural, =1 {One.} other {Many.}}
          if (value.includes('plural,')) {
            let messageId: 'singleSentenceEndingPeriod'|'multiSentenceMissingPeriod'|null = null;

            for (const match of value.matchAll(ICU_PLURAL_BRANCH_REGEX)) {
              const err = checkPunctuation(match[2]);
              if (err) {
                messageId = err;
                break;
              }
            }

            if (messageId) {
              context.report({
                node: property.key,
                messageId,
                fix: fixer => {
                  const fixedText = rawText.replace(
                      ICU_PLURAL_BRANCH_REGEX,
                      (fullMatch, prefix: string, branchContent: string, closingBrace: string) => {
                        const branchError = checkPunctuation(branchContent);
                        if (branchError === 'singleSentenceEndingPeriod') {
                          return `${prefix}${branchContent.replace(/\.([ \t]*)$/, '$1')}${closingBrace}`;
                        }
                        if (branchError === 'multiSentenceMissingPeriod') {
                          return `${prefix}${branchContent.replace(/([ \t]*)$/, '.$1')}${closingBrace}`;
                        }
                        return fullMatch;
                      },
                  );
                  return fixer.replaceText(valueNode, fixedText);
                },
              });
            }
            continue;
          }

          const messageId = checkPunctuation(value);
          if (messageId === 'singleSentenceEndingPeriod') {
            context.report({
              node: property.key,
              messageId,
              fix: fixer => {
                return fixer.replaceText(
                    valueNode,
                    rawText.replace(TRAILING_PERIOD_BEFORE_QUOTE_REGEX, '$1'),
                );
              },
            });
          } else if (messageId === 'multiSentenceMissingPeriod') {
            context.report({
              node: property.key,
              messageId,
              fix: fixer => {
                return fixer.replaceText(
                    valueNode,
                    rawText.replace(CLOSING_QUOTE_REGEX, '.$1$2'),
                );
              },
            });
          }
        }
      },
    };
  },
});
