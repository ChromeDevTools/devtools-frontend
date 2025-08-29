// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import '../../../ui/legacy/legacy.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import {html, nothing, render} from '../../../ui/lit/lit.js';

import previewToggleStyles from './previewToggle.css.js';

export interface PreviewToggleData {
  name: string;
  helperText: string|null;
  feedbackURL: string|null;
  experiment: Root.Runtime.ExperimentName;
  learnMoreURL?: string;
  onChangeCallback?: (checked: boolean) => void;
}

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
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/components/panel_feedback/PreviewToggle.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PreviewToggle extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});

  #name = '';
  #helperText: string|null = null;
  #feedbackURL: string|null = null;
  #learnMoreURL: string|undefined;
  #experiment = '';
  #onChangeCallback?: (checked: boolean) => void;

  set data(data: PreviewToggleData) {
    this.#name = data.name;
    this.#helperText = data.helperText;
    this.#feedbackURL = data.feedbackURL;
    this.#learnMoreURL = data.learnMoreURL;
    this.#experiment = data.experiment;
    this.#onChangeCallback = data.onChangeCallback;
    this.#render();
  }

  #render(): void {
    const checked = Root.Runtime.experiments.isEnabled(this.#experiment);
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    render(
      html`
      <style>${previewToggleStyles}</style>
      <div class="container">
          <devtools-checkbox
            ?checked=${checked}
            @change=${this.#checkboxChanged}
            aria-label=${this.#name} />
            <devtools-icon name="experiment" class="medium">
          </devtools-icon>${this.#name}
          </devtools-checkbox>
        <div class="spacer"></div>
        ${this.#feedbackURL && !this.#helperText
          ? html`<div class="feedback"><x-link class="x-link" href=${this.#feedbackURL}>${i18nString(UIStrings.shortFeedbackLink)}</x-link></div>`
          : nothing}
        ${this.#learnMoreURL
          ? html`<div class="learn-more"><x-link class="x-link" href=${this.#learnMoreURL}>${i18nString(UIStrings.learnMoreLink)}</x-link></div>`
          : nothing}
        <div class="helper">
          ${this.#helperText && this.#feedbackURL
            ? html`<p>${this.#helperText} <x-link class="x-link" href=${this.#feedbackURL}>${i18nString(UIStrings.previewTextFeedbackLink)}</x-link></p>`
            : nothing}
        </div>
      </div>`,
      this.#shadow,
      {
        host: this,
      });
    // clang-format on
  }

  #checkboxChanged(event: Event): void {
    const checked = (event.target as HTMLInputElement).checked;
    Root.Runtime.experiments.setEnabled(this.#experiment, checked);
    this.#onChangeCallback?.(checked);
  }
}

customElements.define('devtools-preview-toggle', PreviewToggle);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-preview-toggle': PreviewToggle;
  }
}
