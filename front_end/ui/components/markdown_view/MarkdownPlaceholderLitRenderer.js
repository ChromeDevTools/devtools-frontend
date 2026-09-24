// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../../../core/platform/platform.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';
import { getMarkdownLink } from './MarkdownLinksMap.js';
import { MarkdownLitRenderer } from './MarkdownView.js';
const { html } = Lit;
const validPlaceholderMatchPattern = /\{(PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*)\}/g;
const validPlaceholderNamePattern = /^PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*$/;
const placeholderExtension = {
    name: 'placeholder',
    level: 'inline',
    start(src) {
        return src.match(/\{PLACEHOLDER_[a-zA-Z][a-zA-Z0-9_]*\}/)?.index;
    },
    tokenizer(src) {
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
function validateSubstitutions(rawMarkdown, substitutions) {
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
export function tokenizeWithPlaceholders(markdown, substitutions) {
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
        return super.unescape(text).replace(validPlaceholderMatchPattern, (raw, key) => this.#resolvePlaceholder(key, raw));
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