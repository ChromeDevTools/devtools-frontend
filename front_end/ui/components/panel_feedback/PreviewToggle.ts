// Copyright (c) 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as ComponentHelpers from '../helpers/helpers.js';
import * as IconButton from '../icon_button/icon_button.js';

import * as Input from '../input/input.js';
import previewToggleStyles from './previewToggle.css.js';

const {render, html, nothing} = LitHtml;

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
   *@description Link text the user can click to provide feedback to the team.
   */
  previewTextFeedbackLink: 'Send us your feedback.',
  /**
   *@description Link text the user can click to provide feedback to the team.
   */
  shortFeedbackLink: 'Send feedback',
  /**
   *@description Link text the user can click to see documentation.
   */
  learnMoreLink: 'Learn More',
};

const str_ = i18n.i18n.registerUIStrings('ui/components/panel_feedback/PreviewToggle.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PreviewToggle extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-preview-toggle`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #name = '';
  #helperText: string|null = null;
  #feedbackURL: string|null = null;
  #learnMoreURL: string|undefined;
  #experiment: string = '';
  #onChangeCallback?: (checked: boolean) => void;

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, previewToggleStyles];
  }

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
      <div class="container">
        <label class="experiment-preview">
          <input type="checkbox" ?checked=${checked} @change=${this.#checkboxChanged} aria-label=${this.#name}/>
          <${IconButton.Icon.Icon.litTagName} .data=${{
            iconName: 'experiment',
            width: '16px',
            height: '16px',
            color: 'var(--icon-default)',
          } as IconButton.Icon.IconData}>
          </${IconButton.Icon.Icon.litTagName}>${this.#name}
        </label>
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

ComponentHelpers.CustomElements.defineComponent('devtools-preview-toggle', PreviewToggle);

declare global {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface HTMLElementTagNameMap {
    'devtools-preview-toggle': PreviewToggle;
  }
}
