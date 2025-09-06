// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../../../../third_party/marked/marked.js';
import * as MarkdownView from '../../../../ui/components/markdown_view/markdown_view.js';
import * as Lit from '../../../../ui/lit/lit.js';

const {html} = Lit;

// Markdown renderer with simple code block support (e.g., css sentinel line)
export class MarkdownRenderer extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  override templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    if (token.type === 'code') {
      const lines = (token.text).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    return super.templateForToken(token);
  }
}

// Extended renderer that collects a table of contents from headings
export class DeepResearchMarkdownRenderer extends MarkdownView.MarkdownView.MarkdownInsightRenderer {
  #tocItems: Array<{level: number, text: string, id: string}> = [];

  override templateForToken(token: Marked.Marked.MarkedToken): Lit.TemplateResult|null {
    if (token.type === 'heading') {
      const headingText = this.#extractTextFromTokens((token.tokens || []) as Marked.Marked.MarkedToken[]);
      const id = this.#generateHeadingId(headingText);
      this.#tocItems.push({ level: (token as any).depth, text: headingText, id });
      const content = super.renderToken(token);
      return html`<div id=${id} class="deep-research-heading-wrapper">${content}</div>`;
    }

    if (token.type === 'code') {
      const lines = (token.text).split('\n');
      if (lines[0]?.trim() === 'css') {
        token.lang = 'css';
        token.text = lines.slice(1).join('\n');
      }
    }

    return super.templateForToken(token);
  }

  #extractTextFromTokens(tokens: Marked.Marked.MarkedToken[]): string {
    return tokens.map(token => token.type === 'text' ? (token as any).text : (token as any).raw || '').join('');
  }

  #generateHeadingId(text: string): string {
    return text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').trim();
  }

  getTocItems(): Array<{level: number, text: string, id: string}> { return this.#tocItems; }
  clearToc(): void { this.#tocItems = []; }
}

// Helper to render text as markdown using devtools-markdown-view
export function renderMarkdown(
  text: string,
  markdownRenderer: MarkdownRenderer,
  onOpenTableInViewer?: (markdownContent: string) => void,
): Lit.TemplateResult {
  let tokens: Marked.Marked.MarkedToken[] = [];
  try {
    tokens = Marked.Marked.lexer(text) as Marked.Marked.MarkedToken[];
    for (const token of tokens) {
      markdownRenderer.renderToken(token);
    }
  } catch {
    return html`${text}`;
  }

  return html`<devtools-markdown-view
    .data=${{tokens, renderer: markdownRenderer, onOpenTableInViewer} as MarkdownView.MarkdownView.MarkdownViewData}>
  </devtools-markdown-view>`;
}

