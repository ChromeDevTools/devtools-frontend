// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../../kit/kit.js';
import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import { html, render } from '../../lit/lit.js';
import surveyLinkStyles from './surveyLink.css.js';
const UIStrings = {
    /**
     * @description Text shown when the link to open a survey is clicked but the survey has not yet appeared
     */
    openingSurvey: 'Opening survey …',
    /**
     * @description Text displayed instead of the survey link after the survey link is clicked, if the survey was shown successfully
     */
    thankYouForYourFeedback: 'Thank you for your feedback',
    /**
     * @description Text displayed instead of the survey link after the survey link is clicked, if the survey was not shown successfully
     */
    anErrorOccurredWithTheSurvey: 'An error occurred with the survey',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/survey_link/SurveyLink.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/**
 * A link to a survey. The link is rendered asynchronously because we need to first check if
 * canShowSurvey succeeds.
 **/
export class SurveyLink extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #trigger = '';
    #promptText = Common.UIString.LocalizedEmptyString;
    #canShowSurvey = () => { };
    #showSurvey = () => { };
    #state = "Checking" /* State.CHECKING */;
    // Re-setting data will cause the state to go back to 'Checking' which hides the link.
    set data(data) {
        this.#trigger = data.trigger;
        this.#promptText = data.promptText;
        this.#canShowSurvey = data.canShowSurvey;
        this.#showSurvey = data.showSurvey;
        this.#checkSurvey();
    }
    #checkSurvey() {
        this.#state = "Checking" /* State.CHECKING */;
        this.#canShowSurvey(this.#trigger, ({ canShowSurvey }) => {
            if (!canShowSurvey) {
                this.#state = "DontShowLink" /* State.DONT_SHOW_LINK */;
            }
            else {
                this.#state = "ShowLink" /* State.SHOW_LINK */;
            }
            this.#render();
        });
    }
    #sendSurvey() {
        this.#state = "Sending" /* State.SENDING */;
        this.#render();
        this.#showSurvey(this.#trigger, ({ surveyShown }) => {
            if (!surveyShown) {
                this.#state = "Failed" /* State.FAILED */;
            }
            else {
                this.#state = "SurveyShown" /* State.SURVEY_SHOWN */;
            }
            this.#render();
        });
    }
    #render() {
        if (this.#state === "Checking" /* State.CHECKING */ || this.#state === "DontShowLink" /* State.DONT_SHOW_LINK */) {
            return;
        }
        let linkText = this.#promptText;
        if (this.#state === "Sending" /* State.SENDING */) {
            linkText = i18nString(UIStrings.openingSurvey);
        }
        else if (this.#state === "SurveyShown" /* State.SURVEY_SHOWN */) {
            linkText = i18nString(UIStrings.thankYouForYourFeedback);
        }
        else if (this.#state === "Failed" /* State.FAILED */) {
            linkText = i18nString(UIStrings.anErrorOccurredWithTheSurvey);
        }
        let linkState = '';
        if (this.#state === "Sending" /* State.SENDING */) {
            linkState = 'pending-link';
        }
        else if (this.#state === "Failed" /* State.FAILED */ || this.#state === "SurveyShown" /* State.SURVEY_SHOWN */) {
            linkState = 'disabled-link';
        }
        const ariaDisabled = this.#state !== "ShowLink" /* State.SHOW_LINK */;
        // clang-format off
        const output = html `
      <style>${surveyLinkStyles}</style>
      <button
          class="link ${linkState}" tabindex=${ariaDisabled ? '-1' : '0'}
          .disabled=${ariaDisabled} aria-disabled=${ariaDisabled} @click=${this.#sendSurvey}>
        <devtools-icon class="link-icon" name="review" style="color: var(--sys-color-primary); width: var(--issue-link-icon-size, 16px); height: var(--issue-link-icon-size, 16px)">
        </devtools-icon>
        ${linkText}
      </button>`;
        // clang-format on
        render(output, this.#shadow, { host: this });
    }
}
customElements.define('devtools-survey-link', SurveyLink);
//# sourceMappingURL=SurveyLink.js.map