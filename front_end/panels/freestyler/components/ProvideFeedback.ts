// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Input from '../../../ui/components/input/input.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import provideFeedbackStyles from './provideFeedback.css.js';

/*
  * TODO(nvitkov): b/346933425
  * Temporary string that should not be translated
  * as they may change often during development.
  */
const UIStringsTemp = {

  /**
   * @description The title of the button that allows submitting positive
   * feedback about the response for freestyler.
   */
  thumbsUp: 'Thumbs up',
  /**
   * @description The title of the button that allows submitting negative
   * feedback about the response for freestyler.
   */
  thumbsDown: 'Thumbs down',
  /**
   * @description The placeholder text for the feedback input.
   */
  provideFeedbackPlaceholder: 'Provide additional feedback',
  /**
   * @description The disclaimer text that tells the user what will be shared
   * and what will be stored.
   */
  disclaimer: 'Feedback submitted will also include your conversation.',
  /**
   * @description The button text for the action of submitting feedback.
   */
  submit: 'Submit',
  /**
   * @description The header of the feedback form asking.
   */
  whyThisRating: 'Why did you choose this rating? (optional)',
  /**
   * @description The button text for the action that hides the feedback form.
   */
  close: 'Close',
  /**
   * @description The title of the button that opens a page to report a legal
   * issue with the Freestyler message.
   */
  report: 'Report legal issue',
};
// const str_ = i18n.i18n.registerUIStrings('panels/freestyler/components/AiRatings.ts', UIStrings);
// const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/* eslint-disable  rulesdir/l10n_i18nString_call_only_with_uistrings */
const i18nString = i18n.i18n.lockedString;

const REPORT_URL = 'https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504' as
    Platform.DevToolsPath.UrlString;
export interface ProvideFeedbackProps {
  onFeedbackSubmit: (rate: Host.AidaClient.Rating, feedback?: string) => void;
}

export class ProvideFeedback extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-provide-feedback`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #props: ProvideFeedbackProps;
  #showFeedbackForm = false;
  #currentRating?: Host.AidaClient.Rating;

  constructor(props: ProvideFeedbackProps) {
    super();
    this.#props = props;
  }

  set props(props: ProvideFeedbackProps) {
    this.#props = props;
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [provideFeedbackStyles, Input.textInputStyles];
    this.#render();
  }

  #handleRateClick(rating: Host.AidaClient.Rating): void {
    if (this.#currentRating === rating) {
      return;
    }

    this.#currentRating = rating;
    this.#showFeedbackForm = true;
    this.#props.onFeedbackSubmit(this.#currentRating);
    this.#render();
  }

  #handleClose = (): void => {
    this.#showFeedbackForm = false;
    this.#render();
  };

  #handleSubmit = (ev: SubmitEvent): void => {
    ev.preventDefault();
    const input = this.#shadow.querySelector('.feedback-input') as HTMLInputElement;
    if (!this.#currentRating || !input || !input.value) {
      return;
    }
    this.#props.onFeedbackSubmit(this.#currentRating, input.value);
    this.#showFeedbackForm = false;
    this.#render();
  };

  #handleReportClick = (): void => {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(REPORT_URL);
  };

  #renderButtons(): LitHtml.TemplateResult {
    // clang-format off
    return LitHtml.html`
      <${Buttons.Button.Button.litTagName}
        .data=${{
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.SMALL,
          iconName: 'thumb-up',
          active: this.#currentRating === Host.AidaClient.Rating.POSITIVE,
          title: i18nString(UIStringsTemp.thumbsUp),
          jslogContext: 'thumbs-up',
        } as Buttons.Button.ButtonData}
        @click=${() => this.#handleRateClick(Host.AidaClient.Rating.POSITIVE)}
      ></${Buttons.Button.Button.litTagName}>
      <${Buttons.Button.Button.litTagName}
        .data=${{
          variant: Buttons.Button.Variant.ICON,
          size: Buttons.Button.Size.SMALL,
          iconName: 'thumb-down',
          active: this.#currentRating === Host.AidaClient.Rating.NEGATIVE,
          title: i18nString(UIStringsTemp.thumbsDown),
          jslogContext: 'thumbs-down',
        } as Buttons.Button.ButtonData}
        @click=${() => this.#handleRateClick(Host.AidaClient.Rating.NEGATIVE)}
      ></${Buttons.Button.Button.litTagName}>
      <div class="vertical-separator"></div>
      <${Buttons.Button.Button.litTagName}
        .data=${
          {
            variant: Buttons.Button.Variant.ICON,
            size: Buttons.Button.Size.SMALL,
            title: i18nString(UIStringsTemp.report),
            iconName: 'report',
            jslogContext: 'report',
          } as Buttons.Button.ButtonData
        }
        @click=${this.#handleReportClick}
      ></${Buttons.Button.Button.litTagName}>
    `;
    // clang-format on
  }

  #renderFeedbackForm(): LitHtml.LitTemplate {
    // clang-format off
    return LitHtml.html`
      <form class="feedback" @submit=${this.#handleSubmit}>
        <div class="feedback-header">
          <h4 class="feedback-title">${i18nString(
              UIStringsTemp.whyThisRating,
          )}</h4>
          <${Buttons.Button.Button.litTagName}
            aria-label=${i18nString(UIStringsTemp.close)}
            @click=${this.#handleClose}
            .data=${
              {
                variant: Buttons.Button.Variant.ICON,
                iconName: 'cross',
                size: Buttons.Button.Size.SMALL,
                title: i18nString(UIStringsTemp.close),
                jslogContext: 'close',
              } as Buttons.Button.ButtonData
            }
          ></${Buttons.Button.Button.litTagName}>
        </div>
        <input
          type="text"
          class="devtools-text-input feedback-input"
          placeholder=${i18nString(
           UIStringsTemp.provideFeedbackPlaceholder,
          )}
        >
        <span class="feedback-disclaimer">${
          i18nString(UIStringsTemp.disclaimer)
        }</span>
        <${Buttons.Button.Button.litTagName}
        aria-label=${i18nString(UIStringsTemp.submit)}
        .data=${
          {
              type: 'submit',
              variant: Buttons.Button.Variant.OUTLINED,
              size: Buttons.Button.Size.SMALL,
              title: i18nString(UIStringsTemp.submit),
              jslogContext: 'send',
            } as Buttons.Button.ButtonData
          }
        >${
          i18nString(UIStringsTemp.submit)
        }</${Buttons.Button.Button.litTagName}>
      </div>
    `;
    // clang-format on
  }

  #render(): void {
    // clang-format off
    LitHtml.render(
      LitHtml.html`
        <div class="rate-buttons">
          ${this.#renderButtons()}
          ${this.#showFeedbackForm
            ? this.#renderFeedbackForm()
            : LitHtml.nothing
          }
        </div>`,
      this.#shadow,
      {host: this},
    );
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-provide-feedback': ProvideFeedback;
  }
}

customElements.define('devtools-provide-feedback', ProvideFeedback);
