// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../core/platform/platform.js';
import * as TextUtils from '../../../core/text_utils/text_utils.js';
import * as Lit from '../../lit/lit.js';
import { getMarkdownLink } from './MarkdownLinksMap.js';
import { MarkdownLitRenderer } from './MarkdownView.js';
const { html } = Lit;
export const tokenizeWithPlaceholders = TextUtils.Markdown.tokenizeWithPlaceholders;
export class MarkdownPlaceholderLitRenderer extends MarkdownLitRenderer {
    #substitutions;
    constructor(substitutions) {
        super();
        this.#substitutions = substitutions;
    }
    #resolvePlaceholder(key, raw) {
        const replacement = this.#substitutions?.get(key) ?? this.#substitutions?.get(key.replace(/^PLACEHOLDER_/, ''));
        return replacement !== undefined ? Platform.StringUtilities.safeEscapeUnicode(replacement) : raw;
    }
    unescape(text) {
        return super.unescape(text).replace(TextUtils.Markdown.VALID_PLACEHOLDER_MATCH_PATTERN, (raw, key) => this.#resolvePlaceholder(key, raw));
    }
    templateForToken(token) {
        if (token.type === 'placeholder') {
            const placeholder = token;
            const value = this.#resolvePlaceholder(placeholder.key, placeholder.raw);
            return html `<span class="markdown-placeholder">${value}</span>`;
        }
        if (token.type === 'link' && token.text.includes('{PLACEHOLDER_')) {
            return html `<devtools-link
        class=${this.customClassMapForToken('link')}
        href=${getMarkdownLink(token.href)}
        >${this.renderText(token)}</devtools-link>`;
        }
        if (token.type === 'image' && token.text.includes('{PLACEHOLDER_')) {
            return html `<devtools-markdown-image
        class=${this.customClassMapForToken('image')}
        .data=${{
                key: token.href, title: this.unescape(token.text),
            }}></devtools-markdown-image>`;
        }
        return super.templateForToken(token);
    }
}
//# sourceMappingURL=MarkdownPlaceholderLitRenderer.js.map