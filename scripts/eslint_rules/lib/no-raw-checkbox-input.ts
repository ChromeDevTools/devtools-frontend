// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isLitHtmlTemplateCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noRawCheckboxInput';

type ScanState =|'DATA'|'COMMENT'|'RAWTEXT'|'TAG_ATTR_START'|'AFTER_ATTR_NAME'|'BEFORE_ATTR_VALUE'|
    'IN_QUOTED_ATTR_VALUE'|'IN_UNQUOTED_ATTR_VALUE';

const RAWTEXT_CLOSE_REGEX = new Map<string, RegExp>([
  ['script', /<\/script(?:\s[^>]*)?>/i],
  ['style', /<\/style(?:\s[^>]*)?>/i],
  ['textarea', /<\/textarea(?:\s[^>]*)?>/i],
  ['title', /<\/title(?:\s[^>]*)?>/i],
]);

function isAsciiWhitespace(ch: string): boolean {
  return ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r' || ch === '\f';
}

function isAsciiLetter(ch: string): boolean {
  return (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
}

function isTagNameChar(ch: string): boolean {
  return isAsciiLetter(ch) || (ch >= '0' && ch <= '9') || ch === '-';
}

function isAttrNameChar(ch: string): boolean {
  return !isAsciiWhitespace(ch) && ch !== '=' && ch !== '>' && ch !== '/' && ch !== '"' && ch !== '\'';
}

export default createRule<[], MessageIds>({
  name: 'no-raw-checkbox-input',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw <input type="checkbox"> in Lit templates in favor of <devtools-checkbox>',
      category: 'Possible Errors',
    },
    messages: {
      noRawCheckboxInput: 'Do not use raw <input type="checkbox"> in Lit templates. ' +
          'Use <devtools-checkbox> (UI.UIUtils.CheckboxLabel) instead.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    const sourceText = context.sourceCode.text;

    return {
      TaggedTemplateExpression(node) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        const quasis = node.quasi.quasis;
        let state: ScanState = 'DATA';
        let rawtextTag = '';
        let pendingRawtextTag = '';
        let tagStartOffset = -1;
        let isInputTag = false;
        let hasCheckboxType = false;
        let attrName = '';
        let attrValue = '';
        let quoteChar = '';
        let attrValueHasExpr = false;

        const maybeRecordCheckboxType = (): void => {
          if (isInputTag && !attrValueHasExpr && attrName.toLowerCase() === 'type' &&
              attrValue.toLowerCase() === 'checkbox') {
            hasCheckboxType = true;
          }
        };

        const finishTag = (endOffset: number): ScanState => {
          if (isInputTag && hasCheckboxType) {
            context.report({
              node,
              loc: {
                start: context.sourceCode.getLocFromIndex(tagStartOffset),
                end: context.sourceCode.getLocFromIndex(endOffset),
              },
              messageId: 'noRawCheckboxInput',
            });
          }
          isInputTag = false;
          hasCheckboxType = false;
          if (pendingRawtextTag) {
            rawtextTag = pendingRawtextTag;
            pendingRawtextTag = '';
            return 'RAWTEXT';
          }
          return 'DATA';
        };

        for (const q of quasis) {
          const rawStart = q.range[0] + 1;
          const rawEnd = q.range[1] - (q.tail ? 1 : 2);
          const text = sourceText.slice(rawStart, rawEnd);
          let pos = 0;

          while (pos < text.length) {
            switch (state) {
              case 'DATA': {
                const lt = text.indexOf('<', pos);
                if (lt === -1) {
                  pos = text.length;
                  break;
                }
                pos = lt + 1;
                if (pos >= text.length) {
                  break;
                }
                if (text.startsWith('!--', pos)) {
                  pos += 3;
                  state = 'COMMENT';
                  break;
                }
                if (text[pos] === '/') {
                  const closeEnd = text.indexOf('>', pos + 1);
                  pos = closeEnd === -1 ? text.length : closeEnd + 1;
                  break;
                }
                if (!isAsciiLetter(text[pos])) {
                  break;
                }
                const nameStart = pos;
                while (pos < text.length && isTagNameChar(text[pos])) {
                  pos++;
                }
                const tagName = text.slice(nameStart, pos);
                if (pos < text.length && !isAsciiWhitespace(text[pos]) && text[pos] !== '/' && text[pos] !== '>') {
                  break;
                }
                if (pos === text.length && !q.tail) {
                  break;
                }
                const lowerTag = tagName.toLowerCase();
                tagStartOffset = rawStart + lt;
                isInputTag = lowerTag === 'input';
                hasCheckboxType = false;
                pendingRawtextTag = RAWTEXT_CLOSE_REGEX.has(lowerTag) ? lowerTag : '';
                state = 'TAG_ATTR_START';
                break;
              }
              case 'COMMENT': {
                const end = text.indexOf('-->', pos);
                if (end === -1) {
                  pos = text.length;
                } else {
                  pos = end + 3;
                  state = 'DATA';
                }
                break;
              }
              case 'RAWTEXT': {
                const match = RAWTEXT_CLOSE_REGEX.get(rawtextTag)?.exec(text.slice(pos));
                if (!match) {
                  pos = text.length;
                } else {
                  pos += match.index + match[0].length;
                  rawtextTag = '';
                  state = 'DATA';
                }
                break;
              }
              case 'TAG_ATTR_START': {
                while (pos < text.length && (isAsciiWhitespace(text[pos]) || text[pos] === '/')) {
                  pos++;
                }
                if (pos >= text.length) {
                  break;
                }
                const ch = text[pos];
                if (ch === '>') {
                  state = finishTag(rawStart + pos + 1);
                  pos++;
                  break;
                }
                if (ch === '=' || ch === '"' || ch === '\'') {
                  pos++;
                  break;
                }
                const nameStart = pos;
                while (pos < text.length && isAttrNameChar(text[pos])) {
                  pos++;
                }
                attrName = text.slice(nameStart, pos);
                state = 'AFTER_ATTR_NAME';
                break;
              }
              case 'AFTER_ATTR_NAME': {
                while (pos < text.length && isAsciiWhitespace(text[pos])) {
                  pos++;
                }
                if (pos >= text.length) {
                  break;
                }
                if (text[pos] === '=') {
                  pos++;
                  attrValue = '';
                  attrValueHasExpr = false;
                  state = 'BEFORE_ATTR_VALUE';
                } else {
                  state = 'TAG_ATTR_START';
                }
                break;
              }
              case 'BEFORE_ATTR_VALUE': {
                while (pos < text.length && isAsciiWhitespace(text[pos])) {
                  pos++;
                }
                if (pos >= text.length) {
                  break;
                }
                const ch = text[pos];
                if (ch === '>') {
                  state = 'TAG_ATTR_START';
                  break;
                }
                if (ch === '"' || ch === '\'') {
                  quoteChar = ch;
                  pos++;
                  state = 'IN_QUOTED_ATTR_VALUE';
                  break;
                }
                state = 'IN_UNQUOTED_ATTR_VALUE';
                break;
              }
              case 'IN_QUOTED_ATTR_VALUE': {
                const endQuote = text.indexOf(quoteChar, pos);
                if (endQuote === -1) {
                  attrValue += text.slice(pos);
                  pos = text.length;
                } else {
                  attrValue += text.slice(pos, endQuote);
                  pos = endQuote + 1;
                  maybeRecordCheckboxType();
                  state = 'TAG_ATTR_START';
                }
                break;
              }
              case 'IN_UNQUOTED_ATTR_VALUE': {
                const valStart = pos;
                while (pos < text.length && !isAsciiWhitespace(text[pos]) && text[pos] !== '>') {
                  pos++;
                }
                attrValue += text.slice(valStart, pos);
                if (pos < text.length) {
                  maybeRecordCheckboxType();
                  state = 'TAG_ATTR_START';
                }
                break;
              }
            }
          }

          if (!q.tail) {
            if (state === 'AFTER_ATTR_NAME') {
              state = 'TAG_ATTR_START';
            } else if (state === 'BEFORE_ATTR_VALUE') {
              attrValueHasExpr = true;
              state = 'IN_UNQUOTED_ATTR_VALUE';
            } else if (state === 'IN_QUOTED_ATTR_VALUE' || state === 'IN_UNQUOTED_ATTR_VALUE') {
              attrValueHasExpr = true;
            }
          }
        }
      },
    };
  },
});
