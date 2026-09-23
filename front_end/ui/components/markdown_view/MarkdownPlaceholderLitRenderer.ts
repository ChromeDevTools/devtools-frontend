// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';

import {getMarkdownLink} from './MarkdownLinksMap.js';
import {MarkdownLitRenderer} from './MarkdownView.js';

const {html} = Lit;

export type PlaceholderToken = TextUtils.Markdown.PlaceholderToken;
export const tokenizeWithPlaceholders: (markdown: string|Marked.Marked.Token[], substitutions?: Map<string, string>) =>
    Marked.Marked.Token[] = TextUtils.Markdown.tokenizeWithPlaceholders;

export class MarkdownPlaceholderLitRenderer extends MarkdownLitRenderer {
  readonly #substitutions?: Map<string, string>;

  constructor(substitutions?: Map<string, string>) {
    super();
    this.#substitutions = substitutions;
  }

  #resolvePlaceholder(key: string, raw: string): string {
    const replacement = this.#substitutions?.get(key) ?? this.#substitutions?.get(key.replace(/^PLACEHOLDER_/, ''));
    return replacement !== undefined ? Platform.StringUtilities.safeEscapeUnicode(replacement) : raw;
  }

  override unescape(text: string): string {
    return super.unescape(text).replace(TextUtils.Markdown.VALID_PLACEHOLDER_MATCH_PATTERN,
                                        (raw, key) => this.#resolvePlaceholder(key, raw));
  }

  override templateForToken(token: Marked.Marked.MarkedToken): Lit.LitTemplate|null {
    if ((token as Marked.Marked.Token).type === 'placeholder') {
      const placeholder = token as unknown as PlaceholderToken;
      const value = this.#resolvePlaceholder(placeholder.key, placeholder.raw);
      return html`<span class="markdown-placeholder">${value}</span>`;
    }
    if (token.type === 'link' && token.text.includes('{PLACEHOLDER_')) {
      return html`<devtools-link
        class=${this.customClassMapForToken('link')}
        href=${getMarkdownLink(token.href)}
        >${this.renderText(token)}</devtools-link>`;
    }
    if (token.type === 'image' && token.text.includes('{PLACEHOLDER_')) {
      return html`<devtools-markdown-image
        class=${this.customClassMapForToken('image')}
        .data=${{
        key: token.href, title: this.unescape(token.text),
      }
      }></devtools-markdown-image>`;
    }
    return super.templateForToken(token);
  }
}
