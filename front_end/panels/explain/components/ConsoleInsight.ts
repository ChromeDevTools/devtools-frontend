// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import {type InsightProvider} from '../InsightProvider.js';
import {type PromptBuilder} from '../PromptBuilder.js';

import styles from './consoleInsight.css.js';

const {render, html, Directives} = LitHtml;

export class CloseEvent extends Event {
  static readonly eventName = 'close';

  constructor() {
    super(CloseEvent.eventName, {composed: true, bubbles: true});
  }
}

type PublicPromptBuilder = Pick<PromptBuilder, 'buildPrompt'>;
type PublicInsightProvider = Pick<InsightProvider, 'getInsights'>;

// key => localized string.
const negativeRatingReasons = [
  ['inaccurate', 'Inaccurate'],
  ['irrelevant', 'Irrelevant'],
  ['inapproprate', 'Inappropriate'],
  ['not-helpful', 'Not helpful'],
  ['other', 'Other'],
];

export class ConsoleInsight extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-console-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #promptBuilder: PublicPromptBuilder;
  #insightProvider: PublicInsightProvider;
  #tokens: MarkdownView.MarkdownView.MarkdownViewData['tokens'] = [];
  #renderer = new MarkdownRenderer();
  #ratingFormOpened = false;
  #selectedRating?: boolean;
  #selectedRatingReasons = new Set<string>();

  constructor(promptBuilder: PublicPromptBuilder, insightProvider: PublicInsightProvider) {
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

  #onCloseRating(): void {
    this.#ratingFormOpened = false;
    this.#selectedRating = undefined;
    this.#selectedRatingReasons.clear();
    this.#render();
  }

  #onRating(event: Event): void {
    this.#ratingFormOpened = true;
    this.#selectedRating = (event.target as HTMLElement).dataset.rating === 'true';
    this.#render();
  }

  #onReason(event: Event): void {
    const target = event.target as Buttons.Button.Button;
    if (!target.active) {
      this.#selectedRatingReasons.add(target.dataset.reason as string);
    } else {
      this.#selectedRatingReasons.delete(target.dataset.reason as string);
    }
    this.#render();
  }

  #render(): void {
    const topWrapper = Directives.classMap({
      wrapper: true,
      top: this.#ratingFormOpened,
    });
    const bottomWrapper = Directives.classMap({
      wrapper: true,
      bottom: this.#ratingFormOpened,
    });
    // clang-format off
    render(html`
      <div class=${topWrapper}>
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
          <div class="filler">Insights</div>
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
          .data=${{tokens: this.#tokens, renderer: this.#renderer} as MarkdownView.MarkdownView.MarkdownViewData}>
        </${MarkdownView.MarkdownView.MarkdownView.litTagName}>
        </main>
        <footer>
          <div>
            <${Buttons.Button.Button.litTagName}
              title=${'Thumb up'}
              data-rating=${'true'}
              .data=${
                {
                  variant: Buttons.Button.Variant.ROUND,
                  size: Buttons.Button.Size.SMALL,
                  iconName: 'thumb-up',
                  active: this.#selectedRating,
                } as Buttons.Button.ButtonData
              }
              @click=${this.#onRating}
            ></${Buttons.Button.Button.litTagName}>
            <${Buttons.Button.Button.litTagName}
              title=${'Thumb down'}
              data-rating=${'false'}
              .data=${
                {
                  variant: Buttons.Button.Variant.ROUND,
                  size: Buttons.Button.Size.SMALL,
                  iconName: 'thumb-down',
                  active: this.#selectedRating !== undefined && !this.#selectedRating,
                } as Buttons.Button.ButtonData
              }
              @click=${this.#onRating}
            ></${Buttons.Button.Button.litTagName}>
          </div>
          <div class="filler"></div>
          <div>TODO</div>
        </footer>
      </div>
      ${this.#ratingFormOpened ? html`
        <div class=${bottomWrapper}>
          <header>
            <div class="filler">Why did you choose this rating? (optional)</div>
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
                @click=${this.#onCloseRating}
              ></${Buttons.Button.Button.litTagName}>
            </div>
          </header>
          <main>
            ${!this.#selectedRating ? html`
                <div class="buttons">
                  ${Directives.repeat(negativeRatingReasons, ([key, label]) => {
                    return html`
                      <${Buttons.Button.Button.litTagName}
                        data-reason=${key}
                        @click=${this.#onReason}
                        .data=${
                          {
                            variant: Buttons.Button.Variant.SECONDARY,
                            size: Buttons.Button.Size.MEDIUM,
                            active: this.#selectedRatingReasons.has(key),
                          } as Buttons.Button.ButtonData
                        }
                      >
                        ${label}
                      </${Buttons.Button.Button.litTagName}>
                    `;
                  })}
                </div>
            ` : ''}
            <textarea placeholder=${'Provide additional feedback (optional)'}></textarea>
          </main>
          <footer>
            <div class="filler"></div>
            <div>
              <${Buttons.Button.Button.litTagName}
                title=${'Close'}
                .data=${
                  {
                    variant: Buttons.Button.Variant.PRIMARY,
                    size: Buttons.Button.Size.MEDIUM,
                  } as Buttons.Button.ButtonData
                }
                @click=${this.#onCloseRating}
              >
                Submit
              </${Buttons.Button.Button.litTagName}>
            </div>
          </footer>
        </div>
      ` : ''}
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

export class MarkdownRenderer extends MarkdownView.MarkdownView.MarkdownLitRenderer {
  override renderToken(token: Marked.Marked.Token): LitHtml.TemplateResult {
    const template = this.templateForToken(token);
    if (template === null) {
      console.warn(`Markdown token type '${token.type}' not supported.`);
      return LitHtml.html``;
    }
    return template;
  }

  override templateForToken(token: Marked.Marked.Token): LitHtml.TemplateResult|null {
    switch (token.type) {
      case 'heading':
        return html`<strong>${this.renderText(token)}</strong>`;
      case 'link':
      case 'image':
        return LitHtml.html`${UI.XLink.XLink.create(token.href, token.text)}`;
    }
    return super.templateForToken(token);
  }
}
