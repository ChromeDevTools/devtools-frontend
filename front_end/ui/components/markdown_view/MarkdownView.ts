// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import './CodeBlock.js';
import './MarkdownImage.js';
import './MarkdownLink.js';

import type * as Marked from '../../../third_party/marked/marked.js';
import * as Lit from '../../lit/lit.js';
import * as VisualLogging from '../../visual_logging/visual_logging.js';

import type * as Codeblock from './CodeBlock.js';
import markdownViewStyles from './markdownView.css.js';

const html = Lit.html;
const render = Lit.render;

export interface MarkdownViewData {
  tokens: Marked.Marked.Token[];
  renderer?: MarkdownLitRenderer;
  animationEnabled?: boolean;
}

export type CodeTokenWithCitation = Marked.Marked.Tokens.Generic&{
  citations: Codeblock.Citation[],
};

export class MarkdownView extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #tokenData: readonly Marked.Marked.Token[] = [];
  #renderer = new MarkdownLitRenderer();
  #animationEnabled = false;
  #isAnimating = false;

  set data(data: MarkdownViewData) {
    this.#tokenData = data.tokens;
    if (data.renderer) {
      this.#renderer = data.renderer;
    }

    if (data.animationEnabled) {
      this.#animationEnabled = true;
      this.#renderer.addCustomClasses({
        paragraph: 'pending',
        heading: 'pending',
        list_item: 'pending',
        code: 'pending',
      });
    } else {
      this.#finishAnimations();
    }

    this.#update();
  }

  #finishAnimations(): void {
    const animatingElements = this.#shadow.querySelectorAll('.animating');
    for (const element of animatingElements) {
      element.classList.remove('animating');
    }

    const pendingElements = this.#shadow.querySelectorAll('.pending');
    for (const element of pendingElements) {
      element.classList.remove('pending');
    }
    this.#isAnimating = false;
    this.#animationEnabled = false;
    this.#renderer.removeCustomClasses({
      paragraph: 'pending',
      heading: 'pending',
      list_item: 'pending',
      code: 'pending',
    });
  }

  #animate(): void {
    if (this.#isAnimating) {
      return;
    }

    this.#isAnimating = true;
    const reveal = (): void => {
      const pendingElement = this.#shadow.querySelector('.pending');
      if (!pendingElement) {
        this.#isAnimating = false;
        return;
      }

      pendingElement.addEventListener('animationend', () => {
        pendingElement.classList.remove('animating');
        reveal();
      }, {once: true});

      pendingElement.classList.remove('pending');
      pendingElement.classList.add('animating');
    };

    reveal();
  }

  #update(): void {
    this.#render();

    if (this.#animationEnabled) {
      this.#animate();
    }
  }

  #render(): void {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(html`
      <style>${markdownViewStyles}</style>
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
  #customClasses: Record<string, Set<string>> = {};

  addCustomClasses(customClasses: Record<Marked.Marked.Token['type'], string>): void {
    for (const [type, className] of Object.entries(customClasses)) {
      if (!this.#customClasses[type]) {
        this.#customClasses[type] = new Set();
      }
      this.#customClasses[type].add(className);
    }
  }

  removeCustomClasses(customClasses: Record<Marked.Marked.Token['type'], string>): void {
    for (const [type, className] of Object.entries(customClasses)) {
      if (this.#customClasses[type]) {
        this.#customClasses[type].delete(className);
      }
    }
  }

  protected customClassMapForToken(type: Marked.Marked.Token['type']): Lit.Directive.DirectiveResult {
    const classNames = this.#customClasses[type] || new Set();
    const classInfo = Object.fromEntries([...classNames].map(className => [className, true]));
    return Lit.Directives.classMap(classInfo);
  }

  renderChildTokens(token: Marked.Marked.Token): Lit.TemplateResult[] {
    if ('tokens' in token && token.tokens) {
      return token.tokens.map(token => this.renderToken(token));
    }
    throw new Error('Tokens not found');
  }

  /**
   * Unescape will get rid of the escaping done by Marked to avoid double escaping due to escaping it also with lit.
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

  renderText(token: Marked.Marked.Token): Lit.TemplateResult {
    if ('tokens' in token && token.tokens) {
      return html`${this.renderChildTokens(token)}`;
    }
    // Due to unescaping, unescaped html entities (see escapeReplacements' keys) will be rendered
    // as their corresponding symbol while the rest will be rendered as verbatim.
    // Marked's escape function can be found in front_end/third_party/marked/package/src/helpers.js
    return html`${this.unescape('text' in token ? token.text : '')}`;
  }

  renderHeading(heading: Marked.Marked.Tokens.Heading): Lit.TemplateResult {
    const customClass = this.customClassMapForToken('heading');
    switch (heading.depth) {
      case 1:
        return html`<h1 class=${customClass}>${this.renderText(heading)}</h1>`;
      case 2:
        return html`<h2 class=${customClass}>${this.renderText(heading)}</h2>`;
      case 3:
        return html`<h3 class=${customClass}>${this.renderText(heading)}</h3>`;
      case 4:
        return html`<h4 class=${customClass}>${this.renderText(heading)}</h4>`;
      case 5:
        return html`<h5 class=${customClass}>${this.renderText(heading)}</h5>`;
      default:
        return html`<h6 class=${customClass}>${this.renderText(heading)}</h6>`;
    }
  }

  renderCodeBlock(token: Marked.Marked.Tokens.Code): Lit.TemplateResult {
    // clang-format off
    return html`<devtools-code-block
      class=${this.customClassMapForToken('code')}
      .code=${this.unescape(token.text)}
      .codeLang=${token.lang || ''}>
    </devtools-code-block>`;
    // clang-format on
  }

  templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    switch (token.type) {
      case 'paragraph':
        return html`<p class=${this.customClassMapForToken('paragraph')}>${this.renderChildTokens(token)}</p>`;
      case 'list':
        return html`<ul class=${this.customClassMapForToken('list')}>${token.items.map(token => {
          return this.renderToken(token);
        })}</ul>`;
      case 'list_item':
        return html`<li class=${this.customClassMapForToken('list_item')}>${this.renderChildTokens(token)}</li>`;
      case 'text':
        return this.renderText(token);
      case 'codespan':
        return html`<code class=${this.customClassMapForToken('codespan')}>${this.unescape(token.text)}</code>`;
      case 'code':
        return this.renderCodeBlock(token);
      case 'space':
        return html``;
      case 'link':
        return html`<devtools-markdown-link
        class=${this.customClassMapForToken('link')}
        .data=${{
        key:
          token.href, title: token.text,
        }
        }></devtools-markdown-link>`;
      case 'image':
        return html`<devtools-markdown-image
        class=${this.customClassMapForToken('image')}
        .data=${{
        key:
          token.href, title: token.text,
        }
        }></devtools-markdown-image>`;
      case 'heading':
        return this.renderHeading(token);
      case 'strong':
        return html`<strong class=${this.customClassMapForToken('strong')}>${this.renderText(token)}</strong>`;
      case 'em':
        return html`<em class=${this.customClassMapForToken('em')}>${this.renderText(token)}</em>`;
      default:
        return null;
    }
  }

  renderToken(token: Marked.Marked.Token): Lit.TemplateResult {
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
  #citationClickHandler: (index: number) => void;

  constructor(citationClickHandler?: (index: number) => void) {
    super();
    this.#citationClickHandler = citationClickHandler || (() => {});
    this.addCustomClasses({heading: 'insight'});
  }

  override renderToken(token: Marked.Marked.Token): Lit.TemplateResult {
    const template = this.templateForToken(token as Marked.Marked.MarkedToken);
    if (template === null) {
      return html`${token.raw}`;
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

    if (/^(\.|#)?[\w:\[\]="'-\.]+ ?{/m.test(token.text) || /^@import/.test(token.text)) {
      return 'css';
    }
    if (/^(var|const|let|function|async|import)\s/.test(token.text)) {
      return 'js';
    }

    return '';
  }

  override templateForToken(token: Marked.Marked.Token): Lit.TemplateResult|null {
    switch (token.type) {
      case 'heading':
        return this.renderHeading(token as Marked.Marked.Tokens.Heading);
      case 'link':
      case 'image': {
        const sanitizedUrl = this.sanitizeUrl(token.href);
        if (!sanitizedUrl) {
          return null;
        }
        // Only links pointing to resources within DevTools can be rendered here.
        return html`${token.text ?? token.href}`;
      }
      case 'code':
        return html`<devtools-code-block
          class=${this.customClassMapForToken('code')}
          .code=${this.unescape(token.text)}
          .codeLang=${this.detectCodeLanguage(token as Marked.Marked.Tokens.Code)}
          .citations=${(token as CodeTokenWithCitation).citations || []}
          .displayNotice=${true}>
        </devtools-code-block>`;
      case 'citation':
        // clang-format off
        return html`<sup><button
            class="citation"
            jslog=${VisualLogging.link('inline-citation').track({click: true})}
            @click=${this.#citationClickHandler.bind(this, Number(token.linkText))}
          >[${token.linkText}]</button></sup>`;
        // clang-format on
    }
    return super.templateForToken(token as Marked.Marked.MarkedToken);
  }
}
