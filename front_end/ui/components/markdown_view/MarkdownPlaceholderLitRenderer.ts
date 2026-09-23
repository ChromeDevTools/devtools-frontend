// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../core/platform/platform.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';

import {getMarkdownLink} from './MarkdownLinksMap.js';
import {MarkdownLitRenderer} from './MarkdownView.js';

const {html} = Lit;

export interface PlaceholderToken extends Marked.Marked.Tokens.Generic {
  type: 'placeholder';
  raw: string;
  key: string;
}

const validPlaceholderMatchPattern = /\{(PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*)\}/g;
const validPlaceholderNamePattern = /^PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*$/;

const placeholderExtension: Marked.Marked.TokenizerExtension = {
  name: 'placeholder',
  level: 'inline',
  start(src: string): number |
      undefined {
        return src.match(/\{PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*\}/)?.index;
      },
  tokenizer(src: string): PlaceholderToken |
      undefined {
        const match = /^\{(PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*)\}/.exec(src);
        if (match) {
          return {
            type: 'placeholder',
            raw: match[0],
            key: match[1],
          };
        }
        return undefined;
      },
};

function validateSubstitutions(rawMarkdown: string, substitutions?: Map<string, string>): void {
  if (!substitutions) {
    return;
  }
  const unusedPlaceholders = new Set(substitutions.keys());
  for (const key of unusedPlaceholders) {
    if (!validPlaceholderNamePattern.test(key)) {
      throw new Error(`Invalid placeholder '${key}' provided in the substitutions map.`);
    }
  }
  for (const [, placeholder] of rawMarkdown.matchAll(validPlaceholderMatchPattern)) {
    if (!substitutions.has(placeholder)) {
      throw new Error(`No replacement provided for placeholder '${placeholder}'.`);
    }
    unusedPlaceholders.delete(placeholder);
  }
  if (unusedPlaceholders.size > 0) {
    throw new Error(`Unused replacements provided: ${[...unusedPlaceholders]}`);
  }
}

export function tokenizeWithPlaceholders(markdown: string|Marked.Marked.Token[],
                                         substitutions?: Map<string, string>): Marked.Marked.Token[] {
  const rawMarkdown = typeof markdown === 'string' ? markdown : markdown.map(token => token.raw).join('');
  validateSubstitutions(rawMarkdown, substitutions);
  if (typeof markdown !== 'string' && !rawMarkdown.includes('{PLACEHOLDER_')) {
    return markdown;
  }
  const markedInstance = new Marked.Marked.Marked({
    extensions: [placeholderExtension],
  });
  return markedInstance.lexer(rawMarkdown);
}

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
    return super.unescape(text).replace(validPlaceholderMatchPattern, (raw, key) => this.#resolvePlaceholder(key, raw));
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
