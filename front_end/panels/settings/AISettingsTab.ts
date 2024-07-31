// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as LitHtml from '../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import aiSettingsTabStyles from './aiSettingsTab.css.js';

const UIStrings = {
  /**
   *@description Header text for for a list of things to consider in the context of generative AI features
   */
  boostYourProductivity: 'Boost your productivity with Chrome AI',
  /**
   *@description Text announcing a list of facts to consider (when using a GenAI feature)
   */
  thingsToConsider: 'Things to consider',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  experimentalFeatures: 'These features are experimental and may change',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  maybeInaccurate:
      'These features use generative AI and may provide inaccurate or offensive information that do not represent Google’s views',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  sendsDataToGoogle:
      'Using these features sends data relevant for the feature to Google. Please find more feature-specific information below.',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  collectData:
      'Google collects this data and feedback to improve its products and services with the help of human reviewers. Avoid sharing sensitive or personal information.',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  retainData:
      'Usage data will be stored in a way where Google cannot tell who provided it and can no longer fulfill any deletion requests and will be retained for up to 18 months',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  managedAccount: 'Google may refrain from data collection depending on your Google account management and/or region',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  adminSettings: 'Features available to managed users may vary depending upon their administrator’s settings',
  /**
   *@description Header for the Chrome AI settings page
   */
  chromeAi: 'Chrome AI',
};
const str_ = i18n.i18n.registerUIStrings('panels/settings/AISettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AISettingsTab extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-settings-ai-settings-tab`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [aiSettingsTabStyles];
  }

  #renderSharedDisclaimerItem(icon: string, text: Common.UIString.LocalizedString): LitHtml.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return LitHtml.html`
      <div>
        <${IconButton.Icon.Icon.litTagName} .data=${{
          iconName: icon,
          color: 'var(--icon-default)',
          width: 'var(--sys-size-8)',
          height: 'var(--sys-size-8)',
        } as IconButton.Icon.IconData}>
        </${IconButton.Icon.Icon.litTagName}>
      </div>
      <div>${text}</div>
    `;
    // clang-format on
  }

  #renderSharedDisclaimer(): LitHtml.TemplateResult {
    const bulletPoints = [
      {icon: 'psychiatry', text: i18nString(UIStrings.experimentalFeatures)},
      {icon: 'report', text: i18nString(UIStrings.maybeInaccurate)},
      {icon: 'google', text: i18nString(UIStrings.sendsDataToGoogle)},
      {icon: 'account-box', text: i18nString(UIStrings.collectData)},
      {icon: 'calendar-today', text: i18nString(UIStrings.retainData)},
      {icon: 'globe', text: i18nString(UIStrings.managedAccount)},
      {icon: 'corporate-fare', text: i18nString(UIStrings.adminSettings)},
    ];
    return LitHtml.html`
      <div class="shared-disclaimer">
        <h2>${i18nString(UIStrings.boostYourProductivity)}</h2>
        <span class="disclaimer-list-header">${i18nString(UIStrings.thingsToConsider)}</span>
        <div class="disclaimer-list">
          ${bulletPoints.map(item => this.#renderSharedDisclaimerItem(item.icon, item.text))}
        </div>
      </div>
    `;
  }

  override async render(): Promise<void> {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    LitHtml.render(LitHtml.html`
      <header>${i18nString(UIStrings.chromeAi)}</header>
      <div class="settings-container-wrapper" jslog=${VisualLogging.pane('chrome-ai')}>
        ${this.#renderSharedDisclaimer()}
      </div>
    `, this.#shadow, {host: this});
    // clang-format on
  }
}

customElements.define('devtools-settings-ai-settings-tab', AISettingsTab);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-settings-ai-settings-tab': AISettingsTab;
  }
}
