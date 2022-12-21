// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Host from '../../../core/host/host.js';
import * as LitHtml from '../../lit-html/lit-html.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as ComponentHelpers from '../../components/helpers/helpers.js';
import * as IconButton from '../icon_button/icon_button.js';
import surveyLinkStyles from './surveyLink.css.js';

const UIStrings = {
  /**
   *@description Text shown when the link to open a survey is clicked but the survey has not yet appeared
   */
  openingSurvey: 'Opening survey …',
  /**
   *@description Text displayed instead of the survey link after the survey link is clicked, if the survey was shown successfully
   */
  thankYouForYourFeedback: 'Thank you for your feedback',
  /**
   *@description Text displayed instead of the survey link after the survey link is clicked, if the survey was not shown successfully
   */
  anErrorOccurredWithTheSurvey: 'An error occurred with the survey',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/survey_link/SurveyLink.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type CanShowSurveyCallback = (result: Host.InspectorFrontendHostAPI.CanShowSurveyResult) => void;
export type ShowSurveyCallback = (result: Host.InspectorFrontendHostAPI.ShowSurveyResult) => void;

export interface SurveyLinkData {
  trigger: string;
  promptText: Common.UIString.LocalizedString;
  canShowSurvey: (trigger: string, callback: CanShowSurveyCallback) => void;
  showSurvey: (trigger: string, callback: ShowSurveyCallback) => void;
}

const enum State {
  Checking = 'Checking',  // (begin state) -> ShowLink | DontShowLink
  ShowLink = 'ShowLink',  // -> Sending
  Sending = 'Sending',    // -> SurveyShown | Failed
  SurveyShown = 'SurveyShown',
  Failed = 'Failed',
  DontShowLink = 'DontShowLink',
}

// A link to a survey. The link is rendered aysnchronously because we need to first check if
// canShowSurvey succeeds.
export class SurveyLink extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-survey-link`;

  readonly #shadow = this.attachShadow({mode: 'open'});
  #trigger = '';
  #promptText = Common.UIString.LocalizedEmptyString;
  #canShowSurvey: (trigger: string, callback: CanShowSurveyCallback) => void = () => {};
  #showSurvey: (trigger: string, callback: ShowSurveyCallback) => void = () => {};
  #state: State = State.Checking;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [surveyLinkStyles];
  }

  // Re-setting data will cause the state to go back to 'Checking' which hides the link.
  set data(data: SurveyLinkData) {
    this.#trigger = data.trigger;
    this.#promptText = data.promptText;
    this.#canShowSurvey = data.canShowSurvey;
    this.#showSurvey = data.showSurvey;

    this.#checkSurvey();
  }

  #checkSurvey(): void {
    this.#state = State.Checking;
    this.#canShowSurvey(this.#trigger, ({canShowSurvey}) => {
      if (!canShowSurvey) {
        this.#state = State.DontShowLink;
      } else {
        this.#state = State.ShowLink;
      }
      this.#render();
    });
  }

  #sendSurvey(): void {
    this.#state = State.Sending;
    this.#render();
    this.#showSurvey(this.#trigger, ({surveyShown}) => {
      if (!surveyShown) {
        this.#state = State.Failed;
      } else {
        this.#state = State.SurveyShown;
      }
      this.#render();
    });
  }

  #render(): void {
    if (this.#state === State.Checking || this.#state === State.DontShowLink) {
      return;
    }

    let linkText = this.#promptText;
    if (this.#state === State.Sending) {
      linkText = i18nString(UIStrings.openingSurvey);
    } else if (this.#state === State.SurveyShown) {
      linkText = i18nString(UIStrings.thankYouForYourFeedback);
    } else if (this.#state === State.Failed) {
      linkText = i18nString(UIStrings.anErrorOccurredWithTheSurvey);
    }

    let linkState = '';
    if (this.#state === State.Sending) {
      linkState = 'pending-link';
    } else if (this.#state === State.Failed || this.#state === State.SurveyShown) {
      linkState = 'disabled-link';
    }

    const ariaDisabled = this.#state !== State.ShowLink;

    // clang-format off
    // eslint-disable-next-line rulesdir/ban_style_tags_in_lit_html
    const output = LitHtml.html`
      <button class="link ${linkState}" tabindex=${ariaDisabled ? '-1' : '0'} .disabled=${ariaDisabled} aria-disabled=${ariaDisabled} @click=${this.#sendSurvey}>
        <${IconButton.Icon.Icon.litTagName} class="link-icon" .data=${{iconName: 'feedback_button_icon', color: 'var(--color-link)', width: 'var(--issue-link-icon-size, 16px)', height: 'var(--issue-link-icon-size, 16px)'} as IconButton.Icon.IconData}></${IconButton.Icon.Icon.litTagName}><!--
      -->${linkText}
      </button>
    `;
    // clang-format on
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

ComponentHelpers.CustomElements.defineComponent('devtools-survey-link', SurveyLink);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-survey-link': SurveyLink;
  }
}
