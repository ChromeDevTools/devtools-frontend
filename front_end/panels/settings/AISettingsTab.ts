// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import type * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as Input from '../../ui/components/input/input.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Switch from '../../ui/components/switch/switch.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import aiSettingsTabStylesRaw from './aiSettingsTab.css.js';

// TODO(crbug.com/391381439): Fully migrate off of constructed style sheets.
const aiSettingsTabStyles = new CSSStyleSheet();
aiSettingsTabStyles.replaceSync(aiSettingsTabStylesRaw.cssContent);

const {html, Directives: {ifDefined, classMap}} = Lit;

const UIStrings = {
  /**
   *@description Header text for for a list of things to consider in the context of generative AI features
   */
  boostYourProductivity: 'Boost your productivity with AI',
  /**
   *@description Text announcing a list of facts to consider (when using a GenAI feature)
   */
  thingsToConsider: 'Things to consider',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  experimentalFeatures:
      'These features use generative AI and may provide inaccurate or offensive information that doesn’t represent Google’s views',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  sendsDataToGoogle:
      'These features send relevant data to Google. Google collects this data and feedback to improve its products and services with the help of human reviewers. Avoid sharing sensitive or personal information.',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  sendsDataToGoogleNoLogging:
      'Your content will not be used by human reviewers to improve AI. Your organization may change these settings at any time.',

  /**
   *@description Text describing a fact to consider when using AI features
   */
  dataCollection: 'Depending on your region, Google may refrain from data collection',
  /**
   *@description Text describing a fact to consider when using AI features
   */
  dataCollectionNoLogging:
      'Depending on your Google account management and/or region, Google may refrain from data collection',
  /**
   *@description Text describing the 'Console Insights' feature
   */
  helpUnderstandConsole: 'Helps you understand and fix console warnings and errors',
  /**
   *@description Label for a button to expand an accordion
   */
  showMore: 'Show more',
  /**
   *@description Label for a button to collapse an accordion
   */
  showLess: 'Show less',
  /**
   *@description Header for a list of feature attributes. 'When (the feature is turned) on, you'll be able to ...'
   */
  whenOn: 'When on',
  /**
   *@description Description of the console insights feature
   */
  explainConsole: 'Get explanations for console warnings and errors',
  /**
   *@description Description of the console insights feature ('these issues' refers to console warnings and errors)
   */
  receiveSuggestions: 'Receive suggestions and code samples to address these issues',
  /**
   *@description Explainer for which data is being sent by the console insights feature
   */
  consoleInsightsSendsData:
      'The console message, associated stack trace, related source code, and the associated network headers are sent to Google to generate explanations. This data may be seen by human reviewers to improve this feature.',
  /**
   *@description Explainer for which data is being sent by the console insights feature
   */
  consoleInsightsSendsDataNoLogging:
      'The console message, associated stack trace, related source code, and the associated network headers are sent to Google to generate explanations. This data will not be used to improve Google’s AI models.',
  /**
   *@description Reference to the terms of service and privacy notice
   *@example {Google Terms of Service} PH1
   *@example {Privacy Notice} PH2
   */
  termsOfServicePrivacyNotice: 'Use of these features is subject to the {PH1} and {PH2}',
  /**
   *@description Text describing the 'AI assistance' feature
   */
  helpUnderstandStyling: 'Get help with understanding CSS styles',
  /**
   *@description Text describing the 'AI assistance' feature
   */
  helpUnderstandStylingAndNetworkRequest: 'Get help with understanding CSS styles, and network requests',
  /**
   *@description Text describing the 'AI assistance' feature
   */
  helpUnderstandStylingNetworkAndFile: 'Get help with understanding CSS styles, network requests, and files',
  /**
   *@description Text describing the 'AI assistance' feature
   */
  helpUnderstandStylingNetworkPerformanceAndFile:
      'Get help with understanding CSS styles, network requests, performance, and files',
  /**
   *@description Text which is a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   *@description Description of the AI assistance feature
   */
  explainStyling: 'Understand CSS styles with AI-powered insights',
  /**
   *@description Description of the AI assistance feature
   */
  explainStylingAndNetworkRequest: 'Understand CSS styles, and network activity with AI-powered insights',
  /**
   *@description Description of the AI assistance feature
   */
  explainStylingNetworkAndFile: 'Understand CSS styles, network activity, and file origins with AI-powered insights',
  /**
   *@description Description of the AI assistance feature
   */
  explainStylingNetworkPerformanceAndFile:
      'Understand CSS styles, network activity, performance bottlenecks, and file origins with AI-powered insights',
  /**
   *@description Description of the AI assistance feature
   */
  receiveStylingSuggestions: 'Improve your development workflow with contextual explanations and suggestions',
  /**
   *@description Explainer for which data is being sent by the AI assistance feature
   */
  freestylerSendsData:
      'Any user query and data the inspected page can access via Web APIs, network requests, files, and performance traces are sent to Google to generate explanations. This data may be seen by human reviewers to improve this feature. Don’t use on pages with personal or sensitive information.',
  /**
   *@description Explainer for which data is being sent by the AI assistance feature
   */
  freestylerSendsDataNoLogging:
      'Any user query and data the inspected page can access via Web APIs, network requests, files, and performance traces are sent to Google to generate explanations. This data will not be used to improve Google’s AI models.',
  /**
   *@description Label for a link to the terms of service
   */
  termsOfService: 'Google Terms of Service',
  /**
   *@description Label for a link to the privacy notice
   */
  privacyNotice: 'Google Privacy Policy',
  /**
   *@description Label for a toggle to enable the Console Insights feature
   */
  enableConsoleInsights: 'Enable `Console insights`',
  /**
   *@description Label for a toggle to enable the AI assistance feature
   */
  enableAiAssistance: 'Enable AI assistance',
  /**
   * @description Message shown to the user if the age check is not successful.
   */
  ageRestricted: 'This feature is only available to users who are 18 years of age or older.',
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account.',
  /**
   * @description Message shown when the user is offline.
   */
  offline: 'This feature is only available with an active internet connection.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/AISettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class AISettingsTab extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #consoleInsightsSetting?: Common.Settings.Setting<boolean>;
  #aiAssistanceSetting?: Common.Settings.Setting<boolean>;
  #aiAssistanceHistorySetting?: Common.Settings.Setting<unknown[]>;
  #isConsoleInsightsSettingExpanded = false;
  #isAiAssistanceSettingExpanded = false;
  #aidaAvailability = Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
  #boundOnAidaAvailabilityChange: () => Promise<void>;

  constructor() {
    super();
    try {
      this.#consoleInsightsSetting = Common.Settings.Settings.instance().moduleSetting('console-insights-enabled');
    } catch {
      this.#consoleInsightsSetting = undefined;
    }
    try {
      this.#aiAssistanceSetting = Common.Settings.Settings.instance().moduleSetting('ai-assistance-enabled');
    } catch {
      this.#aiAssistanceSetting = undefined;
    }
    try {
      this.#aiAssistanceHistorySetting =
          // Name needs to match the one in AiHistoryStorage
          Common.Settings.Settings.instance().moduleSetting('ai-assistance-history-entries');
    } catch {
      this.#aiAssistanceHistorySetting = undefined;
    }
    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [Input.checkboxStyles, aiSettingsTabStyles];
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
  }

  disconnectedCallback(): void {
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
  }

  async #onAidaAvailabilityChange(): Promise<void> {
    const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    if (currentAidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = currentAidaAvailability;
      void this.render();
    }
  }

  #getAiAssistanceSettingDescription(): Platform.UIString.LocalizedString {
    const {hostConfig} = Root.Runtime;
    if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      return i18nString(UIStrings.helpUnderstandStylingNetworkPerformanceAndFile);
    }
    if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      return i18nString(UIStrings.helpUnderstandStylingNetworkAndFile);
    }
    if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      return i18nString(UIStrings.helpUnderstandStylingAndNetworkRequest);
    }
    return i18nString(UIStrings.helpUnderstandStyling);
  }

  #getAiAssistanceSettingInfo(): Platform.UIString.LocalizedString {
    const {hostConfig} = Root.Runtime;
    if (hostConfig.devToolsAiAssistancePerformanceAgent?.enabled) {
      return i18nString(UIStrings.explainStylingNetworkPerformanceAndFile);
    }
    if (hostConfig.devToolsAiAssistanceFileAgent?.enabled) {
      return i18nString(UIStrings.explainStylingNetworkAndFile);
    }
    if (hostConfig.devToolsAiAssistanceNetworkAgent?.enabled) {
      return i18nString(UIStrings.explainStylingAndNetworkRequest);
    }
    return i18nString(UIStrings.explainStyling);
  }

  #expandConsoleInsightsSetting(): void {
    this.#isConsoleInsightsSettingExpanded = !this.#isConsoleInsightsSettingExpanded;
    void this.render();
  }

  #toggleConsoleInsightsSetting(ev: Event): void {
    // If the switch is being clicked, there is both a click- and a
    // change-event. Aborting on click avoids running this method twice.
    if (ev.target instanceof Switch.Switch.Switch && ev.type !== Switch.Switch.SwitchChangeEvent.eventName) {
      return;
    }
    if (!this.#consoleInsightsSetting) {
      return;
    }
    const oldSettingValue = this.#consoleInsightsSetting.get();
    this.#consoleInsightsSetting.set(!oldSettingValue);
    if (!oldSettingValue && !this.#isConsoleInsightsSettingExpanded) {
      this.#isConsoleInsightsSettingExpanded = true;
    }
    if (oldSettingValue === false) {
      // Allows skipping the consent reminder if the user enabled the feature via settings in the current session
      Common.Settings.Settings.instance()
          .createSetting('console-insights-skip-reminder', true, Common.Settings.SettingStorageType.SESSION)
          .set(true);
    }
    void this.render();
  }

  #expandAiAssistanceSetting(): void {
    this.#isAiAssistanceSettingExpanded = !this.#isAiAssistanceSettingExpanded;
    void this.render();
  }

  #toggleAiAssistanceSetting(ev: Event): void {
    // If the switch is being clicked, there is both a click- and a
    // change-event. Aborting on click avoids running this method twice.
    if (ev.target instanceof Switch.Switch.Switch && ev.type !== Switch.Switch.SwitchChangeEvent.eventName) {
      return;
    }
    if (!this.#aiAssistanceSetting) {
      return;
    }
    const oldSettingValue = this.#aiAssistanceSetting.get();
    this.#aiAssistanceSetting.set(!oldSettingValue);
    if (!oldSettingValue && !this.#isAiAssistanceSettingExpanded) {
      this.#isAiAssistanceSettingExpanded = true;
    }

    // If history was create create and the value changes to `false`
    if (this.#aiAssistanceHistorySetting && !this.#aiAssistanceSetting.get()) {
      this.#aiAssistanceHistorySetting.set([]);
    }
    void this.render();
  }

  #renderSharedDisclaimerItem(icon: string, text: Common.UIString.LocalizedString|Lit.TemplateResult):
      Lit.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div>
        <devtools-icon .data=${{
          iconName: icon,
          color: 'var(--icon-default)',
          width: 'var(--sys-size-8)',
          height: 'var(--sys-size-8)',
        } as IconButton.Icon.IconData}>
        </devtools-icon>
      </div>
      <div>${text}</div>
    `;
    // clang-format on
  }

  #renderSharedDisclaimer(): Lit.TemplateResult {
    const tosLink = UI.XLink.XLink.create(
        'https://policies.google.com/terms', i18nString(UIStrings.termsOfService), undefined, undefined,
        'terms-of-service');
    const privacyNoticeLink = UI.XLink.XLink.create(
        'https://policies.google.com/privacy', i18nString(UIStrings.privacyNotice), undefined, undefined,
        'privacy-notice');
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    const bulletPoints = [
      {icon: 'psychiatry', text: i18nString(UIStrings.experimentalFeatures)},
      {
        icon: 'google',
        text: noLogging ? i18nString(UIStrings.sendsDataToGoogleNoLogging) : i18nString(UIStrings.sendsDataToGoogle),
      },
      {
        icon: 'corporate-fare',
        text: noLogging ? i18nString(UIStrings.dataCollectionNoLogging) : i18nString(UIStrings.dataCollection),
      },
      {
        icon: 'policy',
        text: html`${i18n.i18n.getFormatLocalizedString(str_, UIStrings.termsOfServicePrivacyNotice, {
          PH1: tosLink,
          PH2: privacyNoticeLink,
        })}`,
      },
    ];
    return html`
      <div class="shared-disclaimer">
        <h2>${i18nString(UIStrings.boostYourProductivity)}</h2>
        <h3 class="disclaimer-list-header">${i18nString(UIStrings.thingsToConsider)}</h3>
        <div class="disclaimer-list">
          ${bulletPoints.map(item => this.#renderSharedDisclaimerItem(item.icon, item.text))}
        </div>
      </div>
    `;
  }

  #renderSettingItem(icon: string, text: Common.UIString.LocalizedString): Lit.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div>
        <devtools-icon .data=${{
          iconName: icon,
          width: 'var(--sys-size-9)',
          height: 'var(--sys-size-9)',
        } as IconButton.Icon.IconData}>
        </devtools-icon>
      </div>
      <div class="padded">${text}</div>
    `;
    // clang-format on
  }

  #getDisabledReasons(): string[] {
    const reasons = [];
    switch (this.#aidaAvailability) {
      case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
      case Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED:
        reasons.push(i18nString(UIStrings.notLoggedIn));
        break;
      // @ts-expect-error
      case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET:  // fallthrough
        reasons.push(i18nString(UIStrings.offline));
      case Host.AidaClient.AidaAccessPreconditions.AVAILABLE: {
        // No age check if there is no logged in user. Age check would always fail in that case.
        const {hostConfig} = Root.Runtime;
        if (hostConfig?.aidaAvailability?.blockedByAge === true) {
          reasons.push(i18nString(UIStrings.ageRestricted));
        }
      }
    }
    // `consoleInsightsSetting` and `aiAssistantSetting` are both disabled for the same reasons.
    const disabledReasons = this.#consoleInsightsSetting?.disabledReasons() || [];
    reasons.push(...disabledReasons);
    return reasons;
  }

  #renderConsoleInsightsSetting(disabledReasons: string[]): Lit.TemplateResult {
    const isDisabled = disabledReasons.length > 0;
    const disabledReasonsJoined = disabledReasons.join('\n') || undefined;
    const detailsClasses = {
      'whole-row': true,
      open: this.#isConsoleInsightsSettingExpanded,
    };
    const tabindex = this.#isConsoleInsightsSettingExpanded ? '0' : '-1';
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="accordion-header" @click=${this.#expandConsoleInsightsSetting}>
        <div class="icon-container centered">
          <devtools-icon name="lightbulb-spark"></devtools-icon>
        </div>
        <div class="setting-card">
          <h2>${i18n.i18n.lockedString('Console Insights')}</h2>
          <div class="setting-description">${i18nString(UIStrings.helpUnderstandConsole)}</div>
        </div>
        <div class="dropdown centered">
          <devtools-button
            .data=${{
              title: this.#isConsoleInsightsSettingExpanded ? i18nString(UIStrings.showLess) : i18nString(UIStrings.showMore),
              size: Buttons.Button.Size.SMALL,
              iconName: this.#isConsoleInsightsSettingExpanded ? 'chevron-up' : 'chevron-down',
              variant: Buttons.Button.Variant.ICON,
              jslogContext: 'console-insights.accordion',
            } as Buttons.Button.ButtonData}
          ></devtools-button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="toggle-container centered"
        title=${ifDefined(disabledReasonsJoined)}
        @click=${this.#toggleConsoleInsightsSetting.bind(this)}
      >
        <devtools-switch
          .checked=${Boolean(this.#consoleInsightsSetting?.get()) && !isDisabled}
          .jslogContext=${this.#consoleInsightsSetting?.name || ''}
          .disabled=${isDisabled}
          @switchchange=${this.#toggleConsoleInsightsSetting.bind(this)}
          aria-label=${disabledReasonsJoined || i18nString(UIStrings.enableConsoleInsights)}
        ></devtools-switch>
      </div>
      <div class=${classMap(detailsClasses)}>
        <div class="overflow-hidden">
          <div class="expansion-grid">
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.whenOn)}</h3>
            ${this.#renderSettingItem('lightbulb', i18nString(UIStrings.explainConsole))}
            ${this.#renderSettingItem('code', i18nString(UIStrings.receiveSuggestions))}
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.thingsToConsider)}</h3>
            ${this.#renderSettingItem('google', noLogging ? i18nString(UIStrings.consoleInsightsSendsDataNoLogging) : i18nString(UIStrings.consoleInsightsSendsData))}
            <div class="expansion-grid-whole-row">
              <x-link
                href="https://goo.gle/devtools-console-messages-ai"
                class="link"
                tabindex=${tabindex}
                jslog=${VisualLogging.link('learn-more.console-insights').track({
                  click: true,
                })}
              >${i18nString(UIStrings.learnMore)}</x-link>
            </div>
          </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  #renderAiAssistanceSetting(disabledReasons: string[]): Lit.TemplateResult {
    const isDisabled = disabledReasons.length > 0;
    const disabledReasonsJoined = disabledReasons.join('\n') || undefined;
    const detailsClasses = {
      'whole-row': true,
      open: this.#isAiAssistanceSettingExpanded,
    };
    const tabindex = this.#isAiAssistanceSettingExpanded ? '0' : '-1';
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="accordion-header" @click=${this.#expandAiAssistanceSetting}>
        <div class="icon-container centered">
          <devtools-icon name="smart-assistant"></devtools-icon>
        </div>
        <div class="setting-card">
          <h2>${i18n.i18n.lockedString('AI assistance')}</h2>
          <div class="setting-description">${this.#getAiAssistanceSettingDescription()}</div>
        </div>
        <div class="dropdown centered">
          <devtools-button
            .data=${{
              title: this.#isAiAssistanceSettingExpanded ? i18nString(UIStrings.showLess) : i18nString(UIStrings.showMore),
              size: Buttons.Button.Size.SMALL,
              iconName: this.#isAiAssistanceSettingExpanded ? 'chevron-up' : 'chevron-down',
              variant: Buttons.Button.Variant.ICON,
              jslogContext: 'freestyler.accordion',
            } as Buttons.Button.ButtonData}
          ></devtools-button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="toggle-container centered"
        title=${ifDefined(disabledReasonsJoined)}
        @click=${this.#toggleAiAssistanceSetting.bind(this)}
      >
        <devtools-switch
          .checked=${Boolean(this.#aiAssistanceSetting?.get()) && !isDisabled}
          .jslogContext=${this.#aiAssistanceSetting?.name || ''}
          .disabled=${isDisabled}
          @switchchange=${this.#toggleAiAssistanceSetting.bind(this)}
          aria-label=${disabledReasonsJoined || i18nString(UIStrings.enableAiAssistance)}
        ></devtools-switch>
      </div>
      <div class=${classMap(detailsClasses)}>
        <div class="overflow-hidden">
          <div class="expansion-grid">
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.whenOn)}</h3>
            ${this.#renderSettingItem('info', this.#getAiAssistanceSettingInfo())}
            ${this.#renderSettingItem('pen-spark', i18nString(UIStrings.receiveStylingSuggestions))}
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.thingsToConsider)}</h3>
            ${this.#renderSettingItem('google', noLogging ? i18nString(UIStrings.freestylerSendsDataNoLogging) : i18nString(UIStrings.freestylerSendsData))}
            <div class="expansion-grid-whole-row">
              <x-link
                href="https://goo.gle/devtools-ai-assistance"
                class="link"
                tabindex=${tabindex}
                jslog=${VisualLogging.link('learn-more.ai-assistance').track({
                  click: true,
                })}
              >${i18nString(UIStrings.learnMore)}</x-link>
            </div>
          </div>
        </div>
      </div>
    `;
    // clang-format on
  }

  #renderDisabledExplainer(disabledReasons: string[]): Lit.LitTemplate {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="disabled-explainer">
        ${disabledReasons.map(reason => html`
          <div class="disabled-explainer-row">
            <devtools-icon .data=${{
              iconName: 'warning',
              color: 'var(--sys-color-orange)',
              width: 'var(--sys-size-8)',
              height: 'var(--sys-size-8)',
            } as IconButton.Icon.IconData}>
            </devtools-icon>
            ${reason}
          </div>
        `)}
      </div>
    `;
    // clang-format on
  }

  override async render(): Promise<void> {
    const disabledReasons = this.#getDisabledReasons();

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    Lit.render(html`
      <div class="settings-container-wrapper" jslog=${VisualLogging.pane('chrome-ai')}>
        ${this.#renderSharedDisclaimer()}
        ${this.#consoleInsightsSetting || this.#aiAssistanceSetting ? html`
          ${disabledReasons.length ? this.#renderDisabledExplainer(disabledReasons) : Lit.nothing}
          <div class="settings-container">
            ${this.#consoleInsightsSetting ? this.#renderConsoleInsightsSetting(disabledReasons) : Lit.nothing}
            ${this.#aiAssistanceSetting ? this.#renderAiAssistanceSetting(disabledReasons) : Lit.nothing}
          </div>
        ` : Lit.nothing}
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
