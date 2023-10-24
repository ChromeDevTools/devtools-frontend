// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../../../third_party/marked/marked.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import {type InsightProvider} from '../InsightProvider.js';
import {type PromptBuilder} from '../PromptBuilder.js';

import styles from './consoleInsight.css.js';

const {render, html} = LitHtml;

export class ConsoleInsight extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-console-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #promptBuilder: PromptBuilder;
  #insightProvider: InsightProvider;
  #tokens: MarkdownView.MarkdownView.MarkdownViewData['tokens'] = [];

  constructor(promptBuilder: PromptBuilder, insightProvider: InsightProvider) {
    super();
    this.#promptBuilder = promptBuilder;
    this.#insightProvider = insightProvider;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
  }

  #renderMarkdown(content: string): void {
    this.#tokens = Marked.Marked.lexer(content);
    this.#render();
  }

  async update(): Promise<void> {
    this.#renderMarkdown('loading...');
    try {
      const prompt = await this.#promptBuilder.buildPrompt();
      const result = await this.#insightProvider.getInsights(prompt);
      this.#renderMarkdown(result);
    } catch (err) {
      this.#renderMarkdown(`loading failed: ${err.message}`);
    }
  }

  #render(): void {
    // clang-format off
    render(html`
      <${MarkdownView.MarkdownView.MarkdownView.litTagName}
        .data=${{tokens: this.#tokens} as MarkdownView.MarkdownView.MarkdownViewData}>
      </${MarkdownView.MarkdownView.MarkdownView.litTagName}>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-console-insight', ConsoleInsight);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-console-insight': ConsoleInsight;
  }
}
