// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import {type InsightProvider} from '../InsightProvider.js';
import {type PromptBuilder, type Source, SourceType} from '../PromptBuilder.js';

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

function buildLink(
    rating: 'Good'|'Bad', reasonKeys: string[], comment: string, context: string): Platform.DevToolsPath.UrlString {
  return `https://docs.google.com/forms/d/e/1FAIpQLSen1K-Uli0CSvlsNkI-L0Wq5iJ0FO9zFv0_mjM-3m5I8AKQGg/viewform?usp=pp_url&entry.1465663861=${
             encodeURIComponent(rating)}&entry.166041694=${encodeURIComponent(reasonKeys.join(','))}&entry.109342357=${
             encodeURIComponent(comment)}&entry.1805879004=${encodeURIComponent(context)}` as
      Platform.DevToolsPath.UrlString;
}

function localizeType(sourceType: SourceType): string {
  // TODO: localize.
  switch (sourceType) {
    case SourceType.MESSAGE:
      return 'Console message';
    case SourceType.STACKTRACE:
      return 'Stacktrace';
    case SourceType.NETWORK_REQUEST:
      return 'Network request';
    case SourceType.RELATED_CODE:
      return 'Related code';
  }
}

const DOGFOODFEEDBACK_URL =
    'https://docs.google.com/forms/d/e/1FAIpQLSePjpPA0BUSbyG_xrsLR_HtrVixLqu5gAKOxgV-YfztVTf8Vg/viewform?usp=published_options';

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
  #context = {
    prompt: '',
    result: '',
  };
  #loading = true;
  #dogfood = true;
  #sources: Source[] = [];

  constructor(promptBuilder: PublicPromptBuilder, insightProvider: PublicInsightProvider) {
    super();
    this.#promptBuilder = promptBuilder;
    this.#insightProvider = insightProvider;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
    this.classList.add('opening');
  }

  set dogfood(value: boolean) {
    this.#dogfood = value;
    this.#render();
  }

  get dogfood(): boolean {
    return this.#dogfood;
  }

  #renderMarkdown(content: string): void {
    this.#tokens = Marked.Marked.lexer(content);
    this.#render();
  }

  #setLoading(loading: boolean): void {
    this.#loading = loading;
    this.#render();
  }

  async update(): Promise<void> {
    this.#sources = [];
    this.#setLoading(true);
    try {
      const {prompt, sources} = await this.#promptBuilder.buildPrompt();
      const result = await this.#insightProvider.getInsights(prompt);
      this.#context = {
        prompt,
        result,
      };
      this.#sources = sources;
      this.#renderMarkdown(result);
    } catch (err) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErrored);
      this.#renderMarkdown(`loading failed: ${err.message}`);
    } finally {
      this.#setLoading(false);
    }
  }

  #onClose(): void {
    this.classList.add('closing');
    this.dispatchEvent(new CloseEvent());
  }

  #onCloseRating(): void {
    this.#ratingFormOpened = false;
    this.#selectedRating = undefined;
    this.#selectedRatingReasons.clear();
    this.#render();
  }

  #onSubmit(): void {
    if (this.#dogfood) {
      this.#openFeedbackFrom();
    }
    this.#onCloseRating();
  }

  #openFeedbackFrom(): void {
    const link = buildLink(
        this.#selectedRating ? 'Good' : 'Bad', Array.from(this.#selectedRatingReasons),
        this.#shadow.querySelector('textarea')?.value || '', JSON.stringify(this.#context));
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(link);
  }

  #onRating(event: Event): void {
    this.#selectedRating = (event.target as HTMLElement).dataset.rating === 'true';
    if (this.#selectedRating) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedPositive);
    } else {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedNegative);
    }
    if (this.#dogfood) {
      this.#openFeedbackFrom();
      return;
    }
    this.#ratingFormOpened = true;

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
          <div class="filler">${this.#loading ? 'Generating…' : 'Insight'}</div>
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
        ${this.#loading ? html`
        <main>
          <div class="loader"></div>
        </main>` : html`
        <main>
          <${MarkdownView.MarkdownView.MarkdownView.litTagName}
            .data=${{tokens: this.#tokens, renderer: this.#renderer} as MarkdownView.MarkdownView.MarkdownViewData}>
          </${MarkdownView.MarkdownView.MarkdownView.litTagName}>
          <details>
            <summary>Sources</summary>
            <ul>
              ${Directives.repeat(this.#sources, item => item.value, item => {
                const icon = new IconButton.Icon.Icon();
                icon.data = {iconName: 'open-externally', color: 'var(--sys-color-primary)', width: '14px', height: '14px'};
                return html`<li><x-link class="link" href=${`data:text/plain,${encodeURIComponent(item.value)}`}>${localizeType(item.type)}${icon}</x-link></li>`;
              })}
            </ul>
          </details>
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
          ${this.#dogfood ? html`<div class="dogfood-feedback">
              <${IconButton.Icon.Icon.litTagName}
                .data=${
                  {
                    iconName: 'dog-paw',
                    color: 'var(--icon-default)',
                    width: '16px',
                    height: '16px',
                  } as IconButton.Icon.IconData
                }>
              </${IconButton.Icon.Icon.litTagName}>
              <span>Dogfood - </span>
              <x-link href=${DOGFOODFEEDBACK_URL} class="link">Submit feedback</x-link>
          </div>`: ''}
        </footer>
        `}
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
                @click=${this.#onSubmit}
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
