// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isLitHtmlTemplateCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

type MessageIds = 'noBooleanInputChecked'|'noBooleanOptionSelected';

function getCurrentTag(htmlSubstring: string): string|null {
  let i = 0;
  let currentTag: string|null = null;
  const len = htmlSubstring.length;

  while (i < len) {
    if (currentTag === null) {
      const openIdx = htmlSubstring.indexOf('<', i);
      if (openIdx === -1) {
        break;
      }
      i = openIdx + 1;
      if (i >= len) {
        break;
      }

      if (htmlSubstring.startsWith('!--', i)) {
        const commentEnd = htmlSubstring.indexOf('-->', i + 3);
        if (commentEnd === -1) {
          break;
        }
        i = commentEnd + 3;
        continue;
      }

      if (htmlSubstring[i] === '/') {
        const closeIdx = htmlSubstring.indexOf('>', i + 1);
        if (closeIdx === -1) {
          break;
        }
        i = closeIdx + 1;
        continue;
      }

      const tagMatch = htmlSubstring.slice(i).match(/^([a-zA-Z0-9-]+)/);
      if (tagMatch) {
        currentTag = tagMatch[1].toLowerCase();
        i += tagMatch[1].length;
      } else {
        i++;
      }
    } else {
      const ch = htmlSubstring[i];
      if (ch === '"') {
        const nextQuote = htmlSubstring.indexOf('"', i + 1);
        if (nextQuote === -1) {
          break;
        }
        i = nextQuote + 1;
      } else if (ch === '\'') {
        const nextQuote = htmlSubstring.indexOf('\'', i + 1);
        if (nextQuote === -1) {
          break;
        }
        i = nextQuote + 1;
      } else if (ch === '>') {
        currentTag = null;
        i++;
      } else {
        i++;
      }
    }
  }

  return currentTag;
}

export default createRule<[], MessageIds>({
  name: 'no-boolean-input-checked-attr',
  meta: {
    type: 'problem',
    docs: {
      description:
          'Ensure Lit templates use property bindings .checked on <input> and .selected on <option> instead of boolean attributes ?checked / ?selected',
      category: 'Possible Errors',
    },
    fixable: 'code',
    messages: {
      noBooleanInputChecked:
          'Use property binding .checked=${...} instead of boolean attribute binding ?checked=${...} on <input> elements.',
      noBooleanOptionSelected:
          'Use property binding .selected=${...} instead of boolean attribute binding ?selected=${...} on <option> elements.',
    },
    schema: [],
  },
  defaultOptions: [],
  create(context) {
    return {
      TaggedTemplateExpression(node) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        const quasis = node.quasi.quasis;
        const expressions = node.quasi.expressions;

        for (let index = 0; index < quasis.length - 1; index++) {
          const quasi = quasis[index];
          const rawValue = quasi.value.raw;

          const match = rawValue.match(/\?(checked|selected)\s*=\s*$/);
          if (!match) {
            continue;
          }

          const attrName = match[1];

          let htmlUpToAttribute = '';
          for (let k = 0; k <= index; k++) {
            if (k > 0) {
              htmlUpToAttribute += '"EXPR"';
            }
            htmlUpToAttribute += quasis[k].value.raw;
          }

          const currentTag = getCurrentTag(htmlUpToAttribute);

          const isInputChecked = attrName === 'checked' && currentTag === 'input';
          const isOptionSelected = attrName === 'selected' && currentTag === 'option';

          if (!isInputChecked && !isOptionSelected) {
            continue;
          }

          const expressionNode = expressions[index];
          if (!expressionNode) {
            continue;
          }

          context.report({
            node: expressionNode,
            messageId: isInputChecked ? 'noBooleanInputChecked' : 'noBooleanOptionSelected',
            fix(fixer) {
              const qPos = quasi.range[1] - 2 - match[0].length;
              const sourceText = context.sourceCode.text;
              if (sourceText.charAt(qPos) === '?') {
                return fixer.replaceTextRange([qPos, qPos + 1], '.');
              }
              const searchRegion = sourceText.slice(quasi.range[0], quasi.range[1]);
              const relativeIdx = searchRegion.lastIndexOf('?' + attrName);
              if (relativeIdx !== -1) {
                const absoluteIdx = quasi.range[0] + relativeIdx;
                return fixer.replaceTextRange([absoluteIdx, absoluteIdx + 1], '.');
              }
              return null;
            },
          });
        }
      },
    };
  },
});
