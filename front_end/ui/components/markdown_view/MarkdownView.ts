// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Marked from '../../../third_party/marked/marked.js';
import * as UI from '../../legacy/legacy.js';
import * as LitHtml from '../../lit-html/lit-html.js';

import {CodeBlock} from './CodeBlock.js';
import {MarkdownImage, type MarkdownImageData} from './MarkdownImage.js';
import {MarkdownLink, type MarkdownLinkData} from './MarkdownLink.js';
import markdownViewStyles from './markdownView.css.js';

const html = LitHtml.html;
const render = LitHtml.render;

export interface MarkdownViewData {
  tokens: Marked.Marked.Token[];
  renderer?: MarkdownLitRenderer;
}

export class MarkdownView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-markdown-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #tokenData: readonly Marked.Marked.Token[] = [];
  #renderer = new MarkdownLitRenderer();

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [markdownViewStyles];
  }

  set data(data: MarkdownViewData) {
    this.#tokenData = data.tokens;
    if (data.renderer) {
      this.#renderer = data.renderer;
    }
    this.#update();
  }

  #update(): void {
    this.#render();
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <div class='message'>
        ${this.#tokenData.map(token => this.#renderer.renderToken(token))}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-markdown-view', MarkdownView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-markdown-view': MarkdownView;
  }
}

/**
 * Default renderer is used for the IssuesPanel and allows only well-known images and links to be embedded.
 */
export class MarkdownLitRenderer {
  renderChildTokens(token: Marked.Marked.Token): LitHtml.TemplateResult[] {
    if ('tokens' in token && token.tokens) {
      return token.tokens.map(token => this.renderToken(token));
    }
    throw new Error('Tokens not found');
  }

  /**
   * Unescape will get rid of the escaping done by Marked to avoid double escaping due to escaping it also with Lit-html.
   * Table taken from: front_end/third_party/marked/package/src/helpers.js
   */
  unescape(text: string): string {
    const escapeReplacements = new Map<string, string>([
      ['&amp;', '&'],
      ['&lt;', '<'],
      ['&gt;', '>'],
      ['&quot;', '"'],
      ['&#39;', '\''],
    ]);
    return text.replace(/&(amp|lt|gt|quot|#39);/g, (matchedString: string) => {
      const replacement = escapeReplacements.get(matchedString);
      return replacement ? replacement : matchedString;
    });
  }

  renderText(token: Marked.Marked.Token): LitHtml.TemplateResult {
    if ('tokens' in token && token.tokens) {
      return html`${this.renderChildTokens(token)}`;
    }
    // Due to unescaping, unescaped html entities (see escapeReplacements' keys) will be rendered
    // as their corresponding symbol while the rest will be rendered as verbatim.
    // Marked's escape function can be found in front_end/third_party/marked/package/src/helpers.js
    return html`${this.unescape('text' in token ? token.text : '')}`;
  }

  renderHeading(heading: Marked.Marked.Tokens.Heading): LitHtml.TemplateResult {
    switch (heading.depth) {
      case 1:
        return html`<h1>${this.renderText(heading)}</h1>`;
      case 2:
        return html`<h2>${this.renderText(heading)}</h2>`;
      case 3:
        return html`<h3>${this.renderText(heading)}</h3>`;
      case 4:
        return html`<h4>${this.renderText(heading)}</h4>`;
      case 5:
        return html`<h5>${this.renderText(heading)}</h5>`;
      default:
        return html`<h6>${this.renderText(heading)}</h6>`;
    }
  }

  renderCodeBlock(token: Marked.Marked.Tokens.Code): LitHtml.TemplateResult {
    // clang-format off
    return html`<${CodeBlock.litTagName}
      .code=${this.unescape(token.text)}
      .codeLang=${token.lang}>
    </${CodeBlock.litTagName}>`;
    // clang-format on
  }

  templateForToken(token: Marked.Marked.MarkedToken): LitHtml.TemplateResult|null {
    switch (token.type) {
      case 'paragraph':
        return html`<p>${this.renderChildTokens(token)}</p>`;
      case 'list':
        return html`<ul>${token.items.map(token => {
          return this.renderToken(token);
        })}</ul>`;
      case 'list_item':
        return html`<li>${this.renderChildTokens(token)}</li>`;
      case 'text':
        return this.renderText(token);
      case 'codespan':
        return html`<code>${this.unescape(token.text)}</code>`;
      case 'code':
        return this.renderCodeBlock(token);
      case 'space':
        return html``;
      case 'link':
        return html`<${MarkdownLink.litTagName} .data=${{key: token.href, title: token.text} as MarkdownLinkData}></${
            MarkdownLink.litTagName}>`;
      case 'image':
        return html`<${MarkdownImage.litTagName} .data=${{key: token.href, title: token.text} as MarkdownImageData}></${
            MarkdownImage.litTagName}>`;
      case 'heading':
        return this.renderHeading(token);
      case 'strong':
        return html`<strong>${this.renderText(token)}</strong>`;
      case 'em':
        return html`<em>${this.renderText(token)}</em>`;
      default:
        return null;
    }
  }

  renderToken(token: Marked.Marked.Token): LitHtml.TemplateResult {
    const template = this.templateForToken(token as Marked.Marked.MarkedToken);
    if (template === null) {
      throw new Error(`Markdown token type '${token.type}' not supported.`);
    }
    return template;
  }
}

/**
 * Renderer used in Console Insights and AI assistance for the text generated by an LLM.
 */
export class MarkdownInsightRenderer extends MarkdownLitRenderer {
  override renderToken(token: Marked.Marked.Token): LitHtml.TemplateResult {
    const template = this.templateForToken(token as Marked.Marked.MarkedToken);
    if (template === null) {
      return LitHtml.html`${token.raw}`;
    }
    return template;
  }

  sanitizeUrl(maybeUrl: string): string|null {
    try {
      const url = new URL(maybeUrl);
      if (url.protocol === 'https:' || url.protocol === 'http:') {
        return url.toString();
      }
      return null;
    } catch {
      return null;
    }
  }

  detectCodeLanguage(token: Marked.Marked.Tokens.Code): string {
    if (token.lang) {
      return token.lang;
    }

    if (/^(\.|#)?[\w:\[\]="'-\.]* ?{/m.test(token.text) || /^@import/.test(token.text)) {
      return 'css';
    }
    if (/^(var|const|let|function|async|import)\s/.test(token.text)) {
      return 'js';
    }

    return '';
  }

  override templateForToken(token: Marked.Marked.MarkedToken): LitHtml.TemplateResult|null {
    switch (token.type) {
      case 'heading':
        return html`<strong>${this.renderText(token)}</strong>`;
      case 'link':
      case 'image': {
        const sanitizedUrl = this.sanitizeUrl(token.href);
        if (!sanitizedUrl) {
          return null;
        }
        return LitHtml.html`${
            UI.XLink.XLink.create(sanitizedUrl, token.text, undefined, undefined, 'link-in-explanation')}`;
      }
      case 'code':
        return LitHtml.html`<${CodeBlock.litTagName}
          .code=${this.unescape(token.text)}
          .codeLang=${this.detectCodeLanguage(token)}
          .displayNotice=${true}>
        </${CodeBlock.litTagName}>`;
    }
    return super.templateForToken(token as Marked.Marked.MarkedToken);
  }
}
