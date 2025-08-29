// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable rulesdir/no-lit-render-outside-of-view */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Input from '../../ui/components/input/input.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Switch from '../../ui/components/switch/switch.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import aiSettingsTabStyles from './aiSettingsTab.css.js';

const {html, Directives: {ifDefined, classMap}} = Lit;

const UIStrings = {
  /**
   * @description Header text for for a list of things to consider in the context of generative AI features
   */
  boostYourProductivity: 'Boost your productivity with AI',
  /**
   * @description Text announcing a list of facts to consider (when using a GenAI feature)
   */
  thingsToConsider: 'Things to consider',
  /**
   * @description Text describing a fact to consider when using AI features
   */
  experimentalFeatures:
      'These features use generative AI and may provide inaccurate or offensive information that doesn’t represent Google’s views',
  /**
   * @description Text describing a fact to consider when using AI features
   */
  sendsDataToGoogle:
      'These features send relevant data to Google. Google collects this data and feedback to improve its products and services with the help of human reviewers. Avoid sharing sensitive or personal information.',
  /**
   * @description Text describing a fact to consider when using AI features
   */
  sendsDataToGoogleNoLogging:
      'Your content will not be used by human reviewers to improve AI. Your organization may change these settings at any time.',
  /**
   * @description Text describing a fact to consider when using AI features
   */
  dataCollection: 'Depending on your region, Google may refrain from data collection',
  /**
   * @description Text describing a fact to consider when using AI features
   */
  dataCollectionNoLogging:
      'Depending on your Google account management and/or region, Google may refrain from data collection',
  /**
   * @description Text describing the 'Console Insights' feature
   */
  helpUnderstandConsole: 'Helps you understand and fix console warnings and errors',
  /**
   * @description Text describing the 'Auto Annotations' feature
   */
  aIAnnotationsFeatureDescription: 'Automatically generate titles for performance trace annotations',
  /**
   * @description Text explaining AI feature helps annotate a performance trace with auto-generated labels
   */
  helpAnnotatePerformance: 'Helps you annotate your performance trace with auto-generated labels',
  /**
   * @description Label for a button to expand an accordion
   */
  showMore: 'Show more',
  /**
   * @description Label for a button to collapse an accordion
   */
  showLess: 'Show less',
  /**
   * @description Header for a list of feature attributes. 'When (the feature is turned) on, you'll be able to …'
   */
  whenOn: 'When on',
  /**
   * @description Description of the console insights feature
   */
  explainConsole: 'Get explanations for console warnings and errors',
  /**
   * @description Description of the console insights feature ('these issues' refers to console warnings and errors)
   */
  receiveSuggestions: 'Receive suggestions and code samples to address these issues',
  /**
   * @description Explainer for which data is being sent by the console insights feature
   */
  consoleInsightsSendsData:
      'To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Explainer for which data is being sent by the console insights feature
   */
  consoleInsightsSendsDataNoLogging:
      'To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Reference to the terms of service and privacy notice
   * @example {Google Terms of Service} PH1
   * @example {Privacy Notice} PH2
   */
  termsOfServicePrivacyNotice: 'Use of these features is subject to the {PH1} and {PH2}',
  /**
   * @description Text describing the 'AI assistance' feature
   */
  helpUnderstandStyling: 'Get help with understanding CSS styles',
  /**
   * @description Text describing the 'AI assistance' feature
   */
  helpUnderstandStylingAndNetworkRequest: 'Get help with understanding CSS styles, and network requests',
  /**
   * @description Text describing the 'AI assistance' feature
   */
  helpUnderstandStylingNetworkAndFile: 'Get help with understanding CSS styles, network requests, and files',
  /**
   * @description Text describing the 'AI assistance' feature
   */
  helpUnderstandStylingNetworkPerformanceAndFile:
      'Get help with understanding CSS styles, network requests, performance, and files',
  /**
   * @description Text describing the 'Code suggestions' feature
   */
  helpUnderstandCodeSuggestions: 'Get help completing your code',
  /**
   * @description Text which is a hyperlink to more documentation
   */
  learnMore: 'Learn more',
  /**
   * @description Description of the AI assistance feature
   */
  explainStyling: 'Understand CSS styles with AI-powered insights',
  /**
   * @description Description of the AI assistance feature
   */
  explainStylingAndNetworkRequest: 'Understand CSS styles, and network activity with AI-powered insights',
  /**
   * @description Description of the AI assistance feature
   */
  explainStylingNetworkAndFile: 'Understand CSS styles, network activity, and file origins with AI-powered insights',
  /**
   * @description Description of the AI assistance feature
   */
  explainStylingNetworkPerformanceAndFile:
      'Understand CSS styles, network activity, performance bottlenecks, and file origins with AI-powered insights',
  /**
   * @description Description of the AI assistance feature
   */
  receiveStylingSuggestions: 'Improve your development workflow with contextual explanations and suggestions',
  /**
   * @description Explainer for which data is being sent by the AI assistance feature
   */
  freestylerSendsData:
      'To generate explanations, any user query and data the inspected page can access via Web APIs, network requests, files, and performance traces are sent to Google. This data may be seen by human reviewers to improve this feature. Don’t use on pages with personal or sensitive information.',
  /**
   * @description Explainer for which data is being sent by the AI assistance feature
   */
  freestylerSendsDataNoLogging:
      'To generate explanations, any user query and data the inspected page can access via Web APIs, network requests, files, and performance traces are sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Explainer for which data is being sent by the AI generated annotations feature
   */
  generatedAiAnnotationsSendData:
      'To generate annotation suggestions, your performance trace is sent to Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Explainer for which data is being sent by the AI assistance feature
   */
  generatedAiAnnotationsSendDataNoLogging:
      'To generate annotation suggestions, your performance trace is sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Description of the 'Code suggestions' feature
   */
  asYouTypeCodeSuggestions:
      'As you type in the Console or Sources panel, you’ll get code suggestions. Press Tab to accept one.',
  /**
   * @description Explainer for which data is being sent for the 'Code suggestions' feature
   */
  codeSuggestionsSendData:
      'To generate annotation suggestions, your performance trace is sent to Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Explainer for which data is being sent for the 'Code suggestions' feature when logging is not enabled
   */
  codeSuggestionsSendDataNoLogging:
      'To generate annotation suggestions, your performance trace is sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Label for a link to the terms of service
   */
  termsOfService: 'Google Terms of Service',
  /**
   * @description Label for a link to the privacy notice
   */
  privacyNotice: 'Google Privacy Policy',
  /**
   * @description Label for a toggle to enable the Console Insights feature
   */
  enableConsoleInsights: 'Enable `Console insights`',
  /**
   * @description Label for a toggle to enable the AI assistance feature
   */
  enableAiAssistance: 'Enable AI assistance',
  /**
   * @description Label for a toggle to enable the AI annotation feature
   */
  enableAiSuggestedAnnotations: 'Enable AI suggestions for performance panel annotations',
  /**
   * @description Label for a toggle to enable the AI code suggestions feature
   */
  enableAiCodeSuggestions: 'Enable AI code suggestions',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/AISettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface SettingItem {
  iconName: string;
  text: Common.UIString.LocalizedString;
}

interface AiSettingParams {
  settingName: Platform.UIString.LocalizedString;
  iconName: string;
  settingDescription: Platform.UIString.LocalizedString;
  enableSettingText: Common.UIString.LocalizedString;
  settingItems: SettingItem[];
  toConsiderSettingItems: SettingItem[];
  learnMoreLink: {url: string, linkJSLogContext: string};
  settingExpandState: {
    isSettingExpanded: boolean,
    expandSettingJSLogContext: string,
  };
}

export class AISettingsTab extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #consoleInsightsSetting?: Common.Settings.Setting<boolean>;
  #aiAnnotationsSetting?: Common.Settings.Setting<boolean>;
  #aiAssistanceSetting?: Common.Settings.Setting<boolean>;
  #aiCodeCompletionSetting?: Common.Settings.Setting<boolean>;
  #aidaAvailability = Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
  #boundOnAidaAvailabilityChange: () => Promise<void>;
  // Setting to parameters needed to display it in the UI.
  // To display a a setting, it needs to be added to this map.
  #settingToParams = new Map<Common.Settings.Setting<boolean>, AiSettingParams>();

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

    if (Root.Runtime.hostConfig.devToolsAiGeneratedTimelineLabels?.enabled) {
      // Get an existing setting or, if it does not exist, create a new one.
      this.#aiAnnotationsSetting = Common.Settings.Settings.instance().createSetting('ai-annotations-enabled', false);
    }

    if (Root.Runtime.hostConfig.devToolsAiCodeCompletion?.enabled) {
      // Get an existing setting or, if it does not exist, create a new one.
      this.#aiCodeCompletionSetting =
          Common.Settings.Settings.instance().createSetting('ai-code-completion-enabled', false);
    }

    this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
    this.#initSettings();
  }

  connectedCallback(): void {
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    void this.#onAidaAvailabilityChange();
  }

  disconnectedCallback(): void {
    Host.AidaClient.HostConfigTracker.instance().removeEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
  }

  // Define all parameter needed to render a setting
  #initSettings(): void {
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    if (this.#consoleInsightsSetting) {
      const consoleInsightsData: AiSettingParams = {
        settingName: i18n.i18n.lockedString('Console Insights'),
        iconName: 'lightbulb-spark',
        settingDescription: i18nString(UIStrings.helpUnderstandConsole),
        enableSettingText: i18nString(UIStrings.enableConsoleInsights),
        settingItems: [
          {iconName: 'lightbulb', text: i18nString(UIStrings.explainConsole)},
          {iconName: 'code', text: i18nString(UIStrings.receiveSuggestions)}
        ],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.consoleInsightsSendsDataNoLogging) :
                            i18nString(UIStrings.consoleInsightsSendsData)
        }],
        learnMoreLink: {
          url: 'https://developer.chrome.com/docs/devtools/console/understand-messages',
          linkJSLogContext: 'learn-more.console-insights',
        },
        settingExpandState: {
          isSettingExpanded: false,
          expandSettingJSLogContext: 'console-insights.accordion',
        },
      };

      this.#settingToParams.set(this.#consoleInsightsSetting, consoleInsightsData);
    }

    if (this.#aiAssistanceSetting) {
      const aiAssistanceData: AiSettingParams = {
        settingName: i18n.i18n.lockedString('AI assistance'),
        iconName: 'smart-assistant',
        settingDescription: this.#getAiAssistanceSettingDescription(),
        enableSettingText: i18nString(UIStrings.enableAiAssistance),
        settingItems: [
          {iconName: 'info', text: this.#getAiAssistanceSettingInfo()},
          {iconName: 'pen-spark', text: i18nString(UIStrings.receiveStylingSuggestions)}
        ],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.freestylerSendsDataNoLogging) :
                            i18nString(UIStrings.freestylerSendsData)
        }],
        learnMoreLink: {
          url: 'https://developer.chrome.com/docs/devtools/ai-assistance',
          linkJSLogContext: 'learn-more.ai-assistance',
        },
        settingExpandState: {
          isSettingExpanded: false,
          expandSettingJSLogContext: 'freestyler.accordion',
        },
      };

      this.#settingToParams.set(this.#aiAssistanceSetting, aiAssistanceData);
    }

    if (this.#aiAnnotationsSetting) {
      const aiAnnotationsData: AiSettingParams = {
        settingName: i18n.i18n.lockedString('Auto annotations'),
        iconName: 'pen-spark',
        settingDescription: i18nString(UIStrings.aIAnnotationsFeatureDescription),
        enableSettingText: i18nString(UIStrings.enableAiSuggestedAnnotations),
        settingItems: [
          {iconName: 'label-auto', text: i18nString(UIStrings.helpAnnotatePerformance)},
        ],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.generatedAiAnnotationsSendDataNoLogging) :
                            i18nString(UIStrings.generatedAiAnnotationsSendData)
        }],
        learnMoreLink: {
          url: 'https://developer.chrome.com/docs/devtools/performance/annotations#auto-annotations',
          linkJSLogContext: 'learn-more.auto-annotations'
        },
        settingExpandState: {
          isSettingExpanded: false,
          expandSettingJSLogContext: 'auto-annotations.accordion',
        },
      };

      this.#settingToParams.set(this.#aiAnnotationsSetting, aiAnnotationsData);
    }

    if (this.#aiCodeCompletionSetting) {
      const aiCodeCompletionData: AiSettingParams = {
        settingName: i18n.i18n.lockedString('Code suggestions'),
        iconName: 'text-analysis',
        settingDescription: i18nString(UIStrings.helpUnderstandCodeSuggestions),
        enableSettingText: i18nString(UIStrings.enableAiCodeSuggestions),
        settingItems: [{iconName: 'code', text: i18nString(UIStrings.asYouTypeCodeSuggestions)}],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.codeSuggestionsSendDataNoLogging) :
                            i18nString(UIStrings.codeSuggestionsSendData)
        }],
        // TODO: Add a relevant link
        learnMoreLink: {url: '', linkJSLogContext: 'learn-more.code-completion'},
        settingExpandState: {
          isSettingExpanded: false,
          expandSettingJSLogContext: 'code-completion.accordion',
        },
      };

      this.#settingToParams.set(this.#aiCodeCompletionSetting, aiCodeCompletionData);
    }
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

  #expandSetting(setting: Common.Settings.Setting<boolean>): void {
    const settingData = this.#settingToParams.get(setting);
    if (!settingData) {
      return;
    }
    settingData.settingExpandState.isSettingExpanded = !settingData.settingExpandState.isSettingExpanded;
    void this.render();
  }

  #toggleSetting(setting: Common.Settings.Setting<boolean>, ev: Event): void {
    // If the switch is being clicked, there is both a click- and a
    // change-event. Aborting on click avoids running this method twice.
    if (ev.target instanceof Switch.Switch.Switch && ev.type !== Switch.Switch.SwitchChangeEvent.eventName) {
      return;
    }

    const settingData = this.#settingToParams.get(setting);
    if (!settingData) {
      return;
    }

    const oldSettingValue = setting.get();
    setting.set(!oldSettingValue);
    if (!oldSettingValue && !settingData.settingExpandState.isSettingExpanded) {
      settingData.settingExpandState.isSettingExpanded = true;
    }

    // Custom settings logic
    if (setting.name === 'console-insights-enabled') {
      if (oldSettingValue) {
        // If the user turns the feature off, we want them to go through the full onboarding flow should they later turn
        // the feature on again. We achieve this by resetting the onboardig setting.
        Common.Settings.Settings.instance()
            .createLocalSetting('console-insights-onboarding-finished', false)
            .set(false);
      } else {
        // Allows skipping the consent reminder if the user enabled the feature via settings in the current session
        Common.Settings.Settings.instance()
            .createSetting('console-insights-skip-reminder', true, Common.Settings.SettingStorageType.SESSION)
            .set(true);
      }
    } else if (setting.name === 'ai-assistance-enabled' && !setting.get()) {
      // If the "AI Assistance" is toggled off, we remove all the history entries related to the feature.
      void AiAssistanceModel.AiHistoryStorage.instance().deleteAll();
    }
    void this.render();
  }

  #renderSharedDisclaimerItem(icon: string, text: Common.UIString.LocalizedString|Lit.TemplateResult):
      Lit.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div>
        <devtools-icon .name=${icon} class="medium">
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

  #renderSettingItem(settingItem: SettingItem): Lit.TemplateResult {
    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div>
        <devtools-icon class="extra-large" .name=${settingItem.iconName}>
        </devtools-icon>
      </div>
      <div class="padded">${settingItem.text}</div>
    `;
    // clang-format on
  }

  #renderSetting(setting: Common.Settings.Setting<boolean>): Lit.LitTemplate {
    const settingData = this.#settingToParams.get(setting);
    if (!settingData) {
      return Lit.nothing;
    }
    const disabledReasons = AiAssistanceModel.getDisabledReasons(this.#aidaAvailability);
    const isDisabled = disabledReasons.length > 0;
    const disabledReasonsJoined = disabledReasons.join('\n') || undefined;
    const detailsClasses = {
      'whole-row': true,
      open: settingData.settingExpandState.isSettingExpanded,
    };
    const tabindex = settingData.settingExpandState.isSettingExpanded ? '0' : '-1';

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    return html`
      <div class="accordion-header" @click=${this.#expandSetting.bind(this, setting)}>
        <div class="icon-container centered">
          <devtools-icon name=${settingData.iconName}></devtools-icon>
        </div>
        <div class="setting-card">
          <h2>${settingData.settingName}</h2>
          <div class="setting-description">${settingData.settingDescription}</div>
        </div>
        <div class="dropdown centered">
          <devtools-button
            .data=${{
              title: settingData.settingExpandState.isSettingExpanded ? i18nString(UIStrings.showLess) : i18nString(UIStrings.showMore),
              size: Buttons.Button.Size.SMALL,
              iconName: settingData.settingExpandState.isSettingExpanded ? 'chevron-up' : 'chevron-down',
              variant: Buttons.Button.Variant.ICON,
              jslogContext: settingData.settingExpandState.expandSettingJSLogContext,
            } as Buttons.Button.ButtonData}
          ></devtools-button>
        </div>
      </div>
      <div class="divider"></div>
      <div class="toggle-container centered"
        title=${ifDefined(disabledReasonsJoined)}
        @click=${this.#toggleSetting.bind(this, setting)}
      >
        <devtools-switch
          .checked=${Boolean(setting.get()) && !isDisabled}
          .jslogContext=${setting.name || ''}
          .disabled=${isDisabled}
          @switchchange=${this.#toggleSetting.bind(this, setting)}
          aria-label=${disabledReasonsJoined || settingData.enableSettingText}
        ></devtools-switch>
      </div>
      <div class=${classMap(detailsClasses)}>
        <div class="overflow-hidden">
          <div class="expansion-grid">
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.whenOn)}</h3>
            ${settingData.settingItems.map(item => this.#renderSettingItem(item))}
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.thingsToConsider)}</h3>
            ${settingData.toConsiderSettingItems.map(item => this.#renderSettingItem(item))}
            <div class="expansion-grid-whole-row">
              <x-link
                href=${settingData.learnMoreLink.url}
                class="link"
                tabindex=${tabindex}
                jslog=${VisualLogging.link(settingData.learnMoreLink.linkJSLogContext).track({
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
            <devtools-icon name="warning" class="medium" style="color: var(--icon-warning);">
            </devtools-icon>
            ${reason}
          </div>
        `)}
      </div>
    `;
    // clang-format on
  }

  override async render(): Promise<void> {
    const disabledReasons = AiAssistanceModel.getDisabledReasons(this.#aidaAvailability);

    // Disabled until https://crbug.com/1079231 is fixed.
    // clang-format off
    Lit.render(html`
      <style>${Input.checkboxStyles}</style>
      <style>${aiSettingsTabStyles}</style>
      <div class="settings-container-wrapper" jslog=${VisualLogging.pane('chrome-ai')}>
        ${this.#renderSharedDisclaimer()}
        ${this.#settingToParams.size > 0 ? html`
          ${disabledReasons.length ? this.#renderDisabledExplainer(disabledReasons) : Lit.nothing}
          <div class="settings-container">
            ${this.#settingToParams.keys().map(setting => this.#renderSetting(setting))}
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
