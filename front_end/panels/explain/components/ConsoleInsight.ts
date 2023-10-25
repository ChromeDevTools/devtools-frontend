// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import {type InsightProvider} from '../InsightProvider.js';
import {type PromptBuilder} from '../PromptBuilder.js';

import styles from './consoleInsight.css.js';

const {render, html} = LitHtml;

export class CloseEvent extends Event {
  static readonly eventName = 'close';

  constructor() {
    super(CloseEvent.eventName, {composed: true, bubbles: true});
  }
}

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

  #onClose(): void {
    this.dispatchEvent(new CloseEvent());
  }

  #render(): void {
    // clang-format off
    render(html`
      <header>
        <div>
          <${IconButton.Icon.Icon.litTagName}
            .data=${
              {
                iconName: 'spark',
                color: 'var(--sys-color-primary-bright)',
                width: '20px',
                height: '20px',
              } as IconButton.Icon.IconData
            }>
          </${IconButton.Icon.Icon.litTagName}>
        </div>
        <div>Insights</div>
        <div>
          <${Buttons.Button.Button.litTagName}
            title=${'Close'}
            .data=${
              {
                variant: Buttons.Button.Variant.ROUND,
                size: Buttons.Button.Size.SMALL,
                iconName: 'cross',
              } as Buttons.Button.ButtonData
            }
            @click=${this.#onClose}
          ></${Buttons.Button.Button.litTagName}>
        </div>
      </header>
      <main>
      <${MarkdownView.MarkdownView.MarkdownView.litTagName}
        .data=${{tokens: this.#tokens} as MarkdownView.MarkdownView.MarkdownViewData}>
      </${MarkdownView.MarkdownView.MarkdownView.litTagName}>
      </main>
      <footer>
        <div>
          <${Buttons.Button.Button.litTagName}
            title=${'Thumb up'}
            .data=${
              {
                variant: Buttons.Button.Variant.TOOLBAR,
                size: Buttons.Button.Size.SMALL,
                iconName: 'thumb-up',
              } as Buttons.Button.ButtonData
            }
          ></${Buttons.Button.Button.litTagName}>
          <${Buttons.Button.Button.litTagName}
            title=${'Thumb down'}
            .data=${
              {
                variant: Buttons.Button.Variant.TOOLBAR,
                size: Buttons.Button.Size.SMALL,
                iconName: 'thumb-down',
              } as Buttons.Button.ButtonData
            }
          ></${Buttons.Button.Button.litTagName}>
        </div>
        <div></div>
        <div>TODO</div>
      </footer>
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
