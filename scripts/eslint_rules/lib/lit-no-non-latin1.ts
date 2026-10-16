// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {isLitHtmlTemplateCall} from './utils/lit.ts';
import {createRule} from './utils/ruleCreator.ts';

const NON_LATIN1_REGEX = /[^\x00-\xff]/u;

export default createRule({
  name: 'lit-no-non-latin1',
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow raw non-Latin1 characters in Lit templates.',
      category: 'Possible Errors',
    },
    messages: {
      nonLatin1InLit:
          'Avoid raw non-Latin1 character ({{codePoint}}) in Lit templates as esbuild preserves it, forcing V8 to use two-byte strings for the bundle. Use a Unicode escape ({{escaped}}) or i18nString instead.',
    },
    schema: [],  // no options
  },
  defaultOptions: [],
  create: function(context) {
    return {
      TaggedTemplateExpression(node) {
        if (!isLitHtmlTemplateCall(node)) {
          return;
        }

        for (const templatePart of node.quasi.quasis) {
          const match = NON_LATIN1_REGEX.exec(templatePart.value.raw);
          if (!match) {
            continue;
          }
          const codePoint = match[0].codePointAt(0);
          if (codePoint !== undefined) {
            const hex = codePoint.toString(16).padStart(4, '0');
            let escaped = `\\u${hex}`;
            if (codePoint > 0xffff) {
              escaped = `\\u{${codePoint.toString(16)}}`;
            }
            context.report({
              node: templatePart,
              messageId: 'nonLatin1InLit',
              data: {
                codePoint: `U+${hex.toUpperCase()}`,
                escaped,
              },
            });
          }
        }
      },
    };
  },
});
