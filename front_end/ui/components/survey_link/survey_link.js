var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/components/survey_link/SurveyLink.js
var SurveyLink_exports = {};
__export(SurveyLink_exports, {
  SurveyLink: () => SurveyLink
});
import "./../../kit/kit.js";
import * as Common from "./../../../core/common/common.js";
import * as i18n from "./../../../core/i18n/i18n.js";
import { html, render } from "./../../lit/lit.js";

// gen/front_end/ui/components/survey_link/surveyLink.css.js
var surveyLink_css_default = `/*
 * Copyright 2021 The Chromium Authors
 * Use of this source code is governed by a BSD-style license that can be
 * found in the LICENSE file.
 */

.link-icon {
  vertical-align: sub;
  margin-right: 0.5ch;
}

.link {
  padding: var(--issue-link-padding, 4px 0 0 0);
  text-decoration: var(--issue-link-text-decoration, underline);
  cursor: pointer;
  font-size: var(--issue-link-font-size, 14px);
  color: var(--sys-color-primary);
  outline-offset: 2px;
  border: none;
  background: none;
  font-family: inherit;
}

.link:focus:not(:focus-visible) {
  outline: none;
}

.pending-link {
  opacity: 75%;
  pointer-events: none;
  cursor: default;
  text-decoration: none;
}

.disabled-link {
  pointer-events: none;
  cursor: default;
  text-decoration: none;
}

/*# sourceURL=${import.meta.resolve("./surveyLink.css")} */`;

// gen/front_end/ui/components/survey_link/SurveyLink.js
var UIStrings = {
  /**
   * @description Text shown when the link to open a survey is clicked but the survey has not yet appeared
   */
  openingSurvey: "Opening survey \u2026",
  /**
   * @description Text displayed instead of the survey link after the survey link is clicked, if the survey was shown successfully
   */
  thankYouForYourFeedback: "Thank you for your feedback",
  /**
   * @description Text displayed instead of the survey link after the survey link is clicked, if the survey was not shown successfully
   */
  anErrorOccurredWithTheSurvey: "An error occurred with the survey"
};
var str_ = i18n.i18n.registerUIStrings("ui/components/survey_link/SurveyLink.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
var SurveyLink = class extends HTMLElement {
  #shadow = this.attachShadow({ mode: "open" });
  #trigger = "";
  #promptText = Common.UIString.LocalizedEmptyString;
  #canShowSurvey = () => {
  };
  #showSurvey = () => {
  };
  #state = "Checking";
  // Re-setting data will cause the state to go back to 'Checking' which hides the link.
  set data(data) {
    this.#trigger = data.trigger;
    this.#promptText = data.promptText;
    this.#canShowSurvey = data.canShowSurvey;
    this.#showSurvey = data.showSurvey;
    this.#checkSurvey();
  }
  #checkSurvey() {
    this.#state = "Checking";
    this.#canShowSurvey(this.#trigger, ({ canShowSurvey }) => {
      if (!canShowSurvey) {
        this.#state = "DontShowLink";
      } else {
        this.#state = "ShowLink";
      }
      this.#render();
    });
  }
  #sendSurvey() {
    this.#state = "Sending";
    this.#render();
    this.#showSurvey(this.#trigger, ({ surveyShown }) => {
      if (!surveyShown) {
        this.#state = "Failed";
      } else {
        this.#state = "SurveyShown";
      }
      this.#render();
    });
  }
  #render() {
    if (this.#state === "Checking" || this.#state === "DontShowLink") {
      return;
    }
    let linkText = this.#promptText;
    if (this.#state === "Sending") {
      linkText = i18nString(UIStrings.openingSurvey);
    } else if (this.#state === "SurveyShown") {
      linkText = i18nString(UIStrings.thankYouForYourFeedback);
    } else if (this.#state === "Failed") {
      linkText = i18nString(UIStrings.anErrorOccurredWithTheSurvey);
    }
    let linkState = "";
    if (this.#state === "Sending") {
      linkState = "pending-link";
    } else if (this.#state === "Failed" || this.#state === "SurveyShown") {
      linkState = "disabled-link";
    }
    const ariaDisabled = this.#state !== "ShowLink";
    const output = html`
      <style>${surveyLink_css_default}</style>
      <button
          class="link ${linkState}" tabindex=${ariaDisabled ? "-1" : "0"}
          .disabled=${ariaDisabled} aria-disabled=${ariaDisabled} @click=${this.#sendSurvey}>
        <devtools-icon class="link-icon" name="review" style="color: var(--sys-color-primary); width: var(--issue-link-icon-size, 16px); height: var(--issue-link-icon-size, 16px)">
        </devtools-icon>
        ${linkText}
      </button>`;
    render(output, this.#shadow, { host: this });
  }
};
customElements.define("devtools-survey-link", SurveyLink);
export {
  SurveyLink_exports as SurveyLink
};
//# sourceMappingURL=survey_link.js.map
