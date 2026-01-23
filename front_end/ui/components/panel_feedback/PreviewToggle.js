// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view, @devtools/enforce-custom-element-definitions-location */
import '../../../ui/legacy/legacy.js';
import '../../../ui/kit/kit.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import { html, nothing, render } from '../../../ui/lit/lit.js';
import previewToggleStyles from './previewToggle.css.js';
const UIStrings = {
    /**
     * @description Link text the user can click to provide feedback to the team.
     */
    previewTextFeedbackLink: 'Send us your feedback.',
    /**
     * @description Link text the user can click to provide feedback to the team.
     */
    shortFeedbackLink: 'Send feedback',
    /**
     * @description Link text the user can click to see documentation.
     */
    learnMoreLink: 'Learn More',
};
const str_ = i18n.i18n.registerUIStrings('ui/components/panel_feedback/PreviewToggle.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PreviewToggle extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    #name = '';
    #helperText = null;
    #feedbackURL = null;
    #learnMoreURL;
    #experiment = '';
    #onChangeCallback;
    set data(data) {
        this.#name = data.name;
        this.#helperText = data.helperText;
        this.#feedbackURL = data.feedbackURL;
        this.#learnMoreURL = data.learnMoreURL;
        this.#experiment = data.experiment;
        this.#onChangeCallback = data.onChangeCallback;
        this.#render();
    }
    #render() {
        const checked = this.#experiment && Root.Runtime.experiments.isEnabled(this.#experiment);
        // Disabled until https://crbug.com/1079231 is fixed.
        // clang-format off
        render(html `
      <style>${previewToggleStyles}</style>
      <div class="container">
          <devtools-checkbox
            ?checked=${checked}
            @change=${this.#checkboxChanged}
            aria-label=${this.#name} >
            <devtools-icon name="experiment" class="medium">
          </devtools-icon>${this.#name}
          </devtools-checkbox>
        <div class="spacer"></div>
        ${this.#feedbackURL && !this.#helperText
            ? html `<div class="feedback"><devtools-link class="devtools-link" href=${this.#feedbackURL} jslogContext=${'feedback'}>${i18nString(UIStrings.shortFeedbackLink)}</devtools-link></div>`
            : nothing}
        ${this.#learnMoreURL
            ? html `<div class="learn-more"><devtools-link class="devtools-link" href=${this.#learnMoreURL} jslogContext=${'learn-more'}>${i18nString(UIStrings.learnMoreLink)}</devtools-link></div>`
            : nothing}
        <div class="helper">
          ${this.#helperText && this.#feedbackURL
            ? html `<p>${this.#helperText} <devtools-link class="devtools-link" href=${this.#feedbackURL} jslogContext=${'feedback'}>${i18nString(UIStrings.previewTextFeedbackLink)}</devtools-link></p>`
            : nothing}
        </div>
      </div>`, this.#shadow, {
            host: this,
        });
        // clang-format on
    }
    #checkboxChanged(event) {
        const checked = event.target.checked;
        if (this.#experiment) {
            Root.Runtime.experiments.setEnabled(this.#experiment, checked);
        }
        this.#onChangeCallback?.(checked);
    }
}
customElements.define('devtools-preview-toggle', PreviewToggle);
//# sourceMappingURL=PreviewToggle.js.map