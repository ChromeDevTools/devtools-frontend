// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Marked from '../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import type * as Lit from '../../../ui/lit/lit.js';

// The model returns multiline code blocks in an erroneous way with the language being in new line.
// This renderer takes that into account and correctly updates the parsed multiline token with the language
// correctly identified and stripped from the content.
// Example:
// ```
// css <-- This should have been on the first line.
// * {
//   color: red;
// }
// ```
export class MarkdownRendererWithCodeBlock extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  #stripLinks: boolean = false;
  constructor(opts: {stripLinks?: boolean} = {}) {
    super();
    this.#stripLinks = Boolean(opts.stripLinks);
  }
  override templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    if (token.type === 'code') {
      const lines = (token.text as string).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    // Potentially remove links from the rendered result
    if (this.#stripLinks && (token.type === 'link' || token.type === 'image')) {
      // Insert an extra text node at the end after any link text. Show the link as plaintext (surrounded by parentheses)
      const urlText = ` ( ${token.href} )`;
      // Images would be turned into as links (but we'll skip that) https://source.chromium.org/chromium/chromium/src/+/main:third_party/devtools-frontend/src/front_end/ui/components/markdown_view/MarkdownView.ts;l=286-291;drc=d2cc89e48c913666655542d818ad0a09d25d0d08
      const childTokens = token.type === 'image' ? undefined : [
        ...token.tokens,
        {type: 'text', text: urlText, raw: urlText},
      ];

      token = {
        ...token,
        // Marked doesn't read .text or .raw of a link, but we'll update anyway
        // https://github.com/markedjs/marked/blob/035af38ab1e5aae95ece213dcc9a9c6d79cff46f/src/Renderer.ts#L178-L191
        text: `${token.text}${urlText}`,
        raw: `${token.text}${urlText}`,
        type: 'text',
        tokens: childTokens,
      };
    }

    return super.templateForToken(token);
  }
}
