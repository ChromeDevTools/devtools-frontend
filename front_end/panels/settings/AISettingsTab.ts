// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as Input from '../../ui/components/input/input.js';
import * as Switch from '../../ui/components/switch/switch.js';
import * as uiI18n from '../../ui/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import aiSettingsTabStyles from './aiSettingsTab.css.js';

const {html, nothing, render, Directives: {ifDefined, classMap}} = Lit;

const UIStrings = {
  /**
   * @description Header text for a list of things to consider in the context of generative AI features.
   */
  boostYourProductivity: 'Boost your productivity with AI',
  /**
   * @description Text announcing a list of facts to consider when using a generative AI feature.
   */
  thingsToConsider: 'Things to consider',
  /**
   * @description Text describing a fact to consider when using AI features.
   */
  experimentalFeatures:
      'These features use generative AI and may provide inaccurate or offensive information that doesn’t represent Google’s views',
  /**
   * @description Text describing a fact to consider when using AI features.
   */
  sendsDataToGoogle:
      'These features send relevant data to Google. Google collects this data and feedback to improve its products and services with the help of human reviewers. Avoid sharing sensitive or personal information.',
  /**
   * @description Text describing a fact to consider when using AI features.
   */
  sendsDataToGoogleNoLogging:
      'Your content will not be used by human reviewers to improve AI. Your organization may change these settings at any time.',
  /**
   * @description Text describing a fact to consider when using AI features.
   */
  dataCollection: 'Depending on your region, Google may refrain from data collection',
  /**
   * @description Text describing a fact to consider when using AI features.
   */
  dataCollectionNoLogging:
      'Depending on your Google account management and/or region, Google may refrain from data collection',
  /**
   * @description Text describing the Console insights feature.
   */
  helpUnderstandConsole: 'Helps you understand and fix console warnings and errors',
  /**
   * @description Text describing the auto annotations feature.
   */
  aIAnnotationsFeatureDescription: 'Automatically generate titles for performance trace annotations',
  /**
   * @description Text explaining that the AI feature helps annotate a performance trace with auto-generated labels.
   */
  helpAnnotatePerformance: 'Helps you annotate your performance trace with auto-generated labels',
  /**
   * @description Label for a button to expand an accordion.
   */
  showMore: 'Show more',
  /**
   * @description Label for a button to collapse an accordion.
   */
  showLess: 'Show less',
  /**
   * @description Accessible label for a button to expand an accordion for a specific setting.
   * @example {Code suggestions} PH1
   */
  showMoreOfSetting: 'Show more of {PH1}',
  /**
   * @description Accessible label for a button to collapse an accordion for a specific setting.
   * @example {Code suggestions} PH1
   */
  showLessOfSetting: 'Show less of {PH1}',
  /**
   * @description Header for a list of feature attributes. 'When on, you'll be able to …'.
   */
  whenOn: 'When on',
  /**
   * @description Description of the Console insights feature.
   */
  explainConsole: 'Get explanations for console warnings and errors',
  /**
   * @description Description of the Console insights feature ('these issues' refers to Console warnings and errors).
   */
  receiveSuggestions: 'Receive suggestions and code samples to address these issues',
  /**
   * @description Explainer for which data is being sent by the Console insights feature.
   */
  consoleInsightsSendsData:
      'To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Explainer for which data is being sent by the Console insights feature without logging.
   */
  consoleInsightsSendsDataNoLogging:
      'To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Reference to the terms of service and privacy notice.
   * @example {Google Terms of Service} PH1
   * @example {Privacy Notice} PH2
   */
  termsOfServicePrivacyNotice: 'Use of these features is subject to the {PH1} and {PH2}',
  /**
   * @description Text describing the AI assistance feature.
   */
  aiAssistanceDescription: 'Get context-aware help on the inspected page',
  /**
   * @description First item in the description of the AI assistance feature.
   */
  aiAssistanceWhenOnItem1:
      'Debug styling, network, performance, source code, accessibility and storage issues with DevTools AI assistance',
  /**
   * @description Second item in the description of the AI assistance feature.
   */
  aiAssistanceWhenOnItem2: 'Follow the agent’s reasoning step-by-step and quickly jump to the relevant source data',
  /**
   * @description Explainer for which data is being sent by the AI assistance feature.
   */
  aiAssistanceThingsToConsider:
      'To generate explanations, chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google and may be seen by human reviewers to improve this feature. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Explainer for which data is being sent by the AI assistance feature when logging is disabled.
   */
  aiAssistanceThingsToConsiderNoLogging:
      'To generate explanations, chat messages, data accessible for this site via DevTools panels and Web APIs, and items you select such as network requests, files, and performance traces are sent to Google. The content you submit and that is generated by this feature will not be used to improve Google’s AI models. This is an experimental AI feature and won’t always get it right.',
  /**
   * @description Text describing the code suggestions feature.
   */
  helpUnderstandCodeSuggestions: 'Write code faster with AI-powered suggestions',
  /**
   * @description Text which is a hyperlink to more documentation.
   */
  learnMore: 'Learn more',
  /**
   * @description Explainer for which data is being sent by the AI-generated annotations feature.
   */
  generatedAiAnnotationsSendData:
      'To generate annotation suggestions, your performance trace is sent to Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Explainer for which data is being sent by the AI-generated annotations feature without logging.
   */
  generatedAiAnnotationsSendDataNoLogging:
      'To generate annotation suggestions, your performance trace is sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Description of the code suggestions feature.
   */
  asYouTypeCodeSuggestions:
      'As you type in the Console or Sources panel, you’ll get code suggestions. Press Tab to accept one.',
  /**
   * @description First item in the description of the code suggestions feature.
   */
  asYouTypeRelevantDataIsBeingSentToGoogle:
      'As you type, relevant data is being sent to Google to generate code suggestions. Press Tab to accept.',
  /**
   * @description Second item in the description of the code suggestions feature.
   */
  describeCodeInComment:
      'In Console or Sources, describe the code you need in a comment, then press Ctrl+I to generate it.',
  /**
   * @description Second item in the description of the code suggestions feature for macOS.
   */
  describeCodeInCommentForMacOs:
      'In Console or Sources, describe the code you need in a comment, then press Cmd+I to generate it.',
  /**
   * @description Explainer for which data is being sent for the code suggestions feature.
   */
  codeSuggestionsSendData:
      'To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.',
  /**
   * @description Explainer for which data is being sent for the code suggestions feature without logging.
   */
  codeSuggestionsSendDataNoLogging:
      'To generate code suggestions, your console input, the history of your current console session, the currently inspected CSS, and the contents of the currently open file are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
  /**
   * @description Label for a link to the terms of service.
   */
  termsOfService: 'Google Terms of Service',
  /**
   * @description Label for a link to the privacy notice.
   */
  privacyNotice: 'Google Privacy Policy',
  /**
   * @description Label for a toggle to enable the Console insights feature.
   */
  enableConsoleInsights: 'Enable `Console insights`',
  /**
   * @description Label for a toggle to enable the AI assistance feature.
   */
  enableAiAssistance: 'Enable AI assistance',
  /**
   * @description Label for a toggle to enable the AI annotation feature.
   */
  enableAiSuggestedAnnotations: 'Enable AI suggestions for performance panel annotations',
  /**
   * @description Label for a toggle to enable the AI code suggestions feature.
   */
  enableAiCodeSuggestions: 'Enable AI code suggestions',
  /**
   * @description Message shown to the user if the age check isn't successful.
   */
  ageRestricted: 'This feature is only available to users 18 years or older.',
  /**
   * @description The error message when the user isn't logged in to Chrome.
   */
  notLoggedIn: 'This feature is only available when you sign in to Chrome with your Google account.',
  /**
   * @description Message shown when the user is offline.
   */
  offline: 'This feature is only available with an active internet connection.',
  /**
   * @description Text informing the user that AI assistance isn't available in Incognito mode or Guest mode.
   */
  notAvailableInIncognitoMode: 'AI assistance isn’t available in Incognito mode or Guest mode.',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/settings/AISettingsTab.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface SettingItem {
  iconName: string;
  text: Common.UIString.LocalizedString;
}

interface AiSettingParams {
  settingName: Platform.UIString.LocalizedString;
  setting?: Common.Settings.Setting<boolean>;
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

interface ViewInput {
  disabledReasons: string[];
  sharedDisclaimerBulletPoints: Array<{icon: string, text: Common.UIString.LocalizedString|Lit.LitTemplate}>;
  settingToParams: Map<string, AiSettingParams>;
  expandSetting(settingName: string): void;
  toggleSetting(settingName: string, ev: Event): void;
}

type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const AI_SETTINGS_TAB_DEFAULT_VIEW: View = (input, _output, target): void => {
  // Disabled until https://crbug.com/1079231 is fixed.
  // clang-format off
  const disabledReasonsExplainer = input.disabledReasons.length ? html`
    <div class="disabled-explainer">
      ${input.disabledReasons.map(reason => html`
        <div class="disabled-explainer-row">
          <devtools-icon name="warning" class="medium" style="color: var(--icon-warning);">
          </devtools-icon>
          ${reason}
        </div>
      `)}
    </div>
  ` : nothing;

  const sharedDisclaimer = html`
    <div class="shared-disclaimer">
      <h2>${i18nString(UIStrings.boostYourProductivity)}</h2>
      <h3 class="disclaimer-list-header">${i18nString(UIStrings.thingsToConsider)}</h3>
      <div class="disclaimer-list">
        ${input.sharedDisclaimerBulletPoints.map(item =>
          html`<div><devtools-icon .name=${item.icon} class="medium"></devtools-icon>
              </div><div>${item.text}</div>`,
        )}
      </div>
    </div>
  `;

  const renderSettingItem = (settingItem: SettingItem): Lit.TemplateResult => {
    return html`
      <div>
        <devtools-icon class="extra-large" .name=${settingItem.iconName}>
        </devtools-icon>
      </div>
      <div class="padded">${settingItem.text}</div>
    `;
  };

  const isDisabled = input.disabledReasons.length > 0;
  const disabledReasonsJoined = input.disabledReasons.join('\n') || undefined;
  const settings = Array.from(input.settingToParams.entries()).map(([settingName, settingData]) => {
    const isChecked = settingData.setting ? Boolean(settingData.setting.get()) : false;
    const detailsClasses = {
      'whole-row': true,
      open: settingData.settingExpandState.isSettingExpanded,
    };
    const tabindex = settingData.settingExpandState.isSettingExpanded ? '0' : '-1';
    return html`
      <div class="accordion-header" @click=${input.expandSetting.bind(this, settingName)}>
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
              accessibleLabel: settingData.settingExpandState.isSettingExpanded ?
                  i18nString(UIStrings.showLessOfSetting, {PH1: settingData.settingName}) :
                  i18nString(UIStrings.showMoreOfSetting, {PH1: settingData.settingName}),
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
        @click=${settingData.setting ? input.toggleSetting.bind(this, settingName) : nothing}
      >
        <devtools-switch
          .checked=${isChecked && !isDisabled}
          .jslogContext=${settingName}
          .disabled=${isDisabled || !settingData.setting}
          .label=${disabledReasonsJoined || settingData.enableSettingText}
          data-testid=${settingData.enableSettingText}
          @switchchange=${settingData.setting ? input.toggleSetting.bind(this, settingName) : nothing}
        ></devtools-switch>
      </div>
      <div class=${classMap(detailsClasses)}>
        <div class="overflow-hidden">
          <div class="expansion-grid">
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.whenOn)}</h3>
            ${settingData.settingItems.map(item => renderSettingItem(item))}
            <h3 class="expansion-grid-whole-row">${i18nString(UIStrings.thingsToConsider)}</h3>
            ${settingData.toConsiderSettingItems.map(item => renderSettingItem(item))}
            <div class="expansion-grid-whole-row">
              <devtools-link
                href=${settingData.learnMoreLink.url}
                class="link"
                tabindex=${tabindex}
                .jslogContext=${settingData.learnMoreLink.linkJSLogContext}
              >${i18nString(UIStrings.learnMore)}</devtools-link>
            </div>
          </div>
        </div>
      </div>
    `;
  });

  render(html`
    <style>${Input.checkboxStyles}</style>
    <style>${aiSettingsTabStyles}</style>
    <div class="ai-settings-container">
    <div class="settings-container-wrapper" jslog=${VisualLogging.pane('chrome-ai')}>
      ${sharedDisclaimer}
      ${input.settingToParams.size ? html`
        ${disabledReasonsExplainer}
        <div class="settings-container">
          ${settings}
        </div>
      ` : nothing}
    </div></div>
  `, target);
  // clang-format on
};

export class AISettingsTab extends UI.Widget.VBox {
  #view: View;
  #consoleInsightsSetting?: Common.Settings.Setting<boolean>;
  #aiAnnotationsSetting?: Common.Settings.Setting<boolean>;
  #aiAssistanceSetting?: Common.Settings.Setting<boolean>;
  #aiCodeCompletionSetting?: Common.Settings.Setting<boolean>;
  #aidaAvailability = Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL;
  #boundOnAidaAvailabilityChange:
      (ev: Common.EventTarget.EventTargetEvent<Host.AidaClient.AidaAccessPreconditions>) => void;
  // Setting to parameters needed to display it in the UI.
  // To display a a setting, it needs to be added to this map.
  #settingToParams = new Map<string, AiSettingParams>();

  constructor(view?: View) {
    super();
    try {
      this.#consoleInsightsSetting =
          Common.Settings.Settings.instance().moduleSetting<boolean>('console-insights-enabled');
    } catch {
      this.#consoleInsightsSetting = undefined;
    }
    try {
      this.#aiAssistanceSetting = Common.Settings.Settings.instance().moduleSetting<boolean>('ai-assistance-enabled');
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
    this.#view = view ?? AI_SETTINGS_TAB_DEFAULT_VIEW;
  }

  #getDisabledReasons(): Platform.UIString.LocalizedString[] {
    const preconditions = AiAssistanceModel.AiUtils.getDisabledReasons(this.#aidaAvailability);
    const mappedReasons: Platform.UIString.LocalizedString[] = [];
    for (const precondition of preconditions) {
      switch (precondition) {
        case AiAssistanceModel.AiUtils.FrontendAccessPrecondition.IS_OFF_THE_RECORD:
          mappedReasons.push(i18nString(UIStrings.notAvailableInIncognitoMode));
          break;
        case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
        case Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED:
          mappedReasons.push(i18nString(UIStrings.notLoggedIn));
          break;
        case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET:
          mappedReasons.push(i18nString(UIStrings.offline));
          break;
        case AiAssistanceModel.AiUtils.FrontendAccessPrecondition.AGE_RESTRICTED:
          mappedReasons.push(i18nString(UIStrings.ageRestricted));
          break;
        default:
          Platform.assertNever(precondition, `Unknown precondition: ${precondition}`);
      }
    }
    const settingDisabledReasons =
        Common.Settings.Settings.instance().moduleSetting('ai-assistance-enabled').disabledReasons();
    return [...mappedReasons, ...settingDisabledReasons];
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      disabledReasons: this.#getDisabledReasons(),
      sharedDisclaimerBulletPoints: this.#getSharedDisclaimerBulletPoints(),
      settingToParams: this.#settingToParams,
      expandSetting: this.#expandSetting.bind(this),
      toggleSetting: this.#toggleSetting.bind(this),
    };
    this.#view(viewInput, undefined, this.contentElement);
  }

  override wasShown(): void {
    super.wasShown();
    Host.AidaClient.HostConfigTracker.instance().addEventListener(
        Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED, this.#boundOnAidaAvailabilityChange);
    const initialAvailability = Host.AidaClient.HostConfigTracker.instance().aidaAvailability;
    if (initialAvailability !== undefined) {
      this.#updateAidaAvailability(initialAvailability);
    }
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
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
        setting: this.#consoleInsightsSetting,
        iconName: 'lightbulb-spark',
        settingDescription: i18nString(UIStrings.helpUnderstandConsole),
        enableSettingText: i18nString(UIStrings.enableConsoleInsights),
        settingItems: [
          {iconName: 'lightbulb', text: i18nString(UIStrings.explainConsole)},
          {iconName: 'code', text: i18nString(UIStrings.receiveSuggestions)},
        ],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.consoleInsightsSendsDataNoLogging) :
                            i18nString(UIStrings.consoleInsightsSendsData),
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

      this.#settingToParams.set('console-insights-enabled', consoleInsightsData);
    }

    if (this.#aiAssistanceSetting) {
      const aiAssistanceData: AiSettingParams = {
        settingName: i18n.i18n.lockedString(AiAssistanceModel.AiUtils.isGeminiBranding() ? 'Gemini in Chrome DevTools' :
                                                                                           'AI assistance'),
        setting: this.#aiAssistanceSetting,
        iconName: AiAssistanceModel.AiUtils.getIconName(),
        settingDescription: this.#getAiAssistanceSettingDescription(),
        enableSettingText: i18nString(UIStrings.enableAiAssistance),
        settingItems: [
          {iconName: 'info', text: this.#getAiAssistanceSettingInfo()},
          {
            iconName: 'pen-spark',
            text: i18nString(UIStrings.aiAssistanceWhenOnItem2),
          },
        ],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.aiAssistanceThingsToConsiderNoLogging) :
                            i18nString(UIStrings.aiAssistanceThingsToConsider),
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

      this.#settingToParams.set('ai-assistance-enabled', aiAssistanceData);
    }

    if (this.#aiAnnotationsSetting) {
      const aiAnnotationsData: AiSettingParams = {
        settingName: i18n.i18n.lockedString('Auto annotations'),
        setting: this.#aiAnnotationsSetting,
        iconName: 'pen-spark',
        settingDescription: i18nString(UIStrings.aIAnnotationsFeatureDescription),
        enableSettingText: i18nString(UIStrings.enableAiSuggestedAnnotations),
        settingItems: [
          {iconName: 'label-auto', text: i18nString(UIStrings.helpAnnotatePerformance)},
        ],
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.generatedAiAnnotationsSendDataNoLogging) :
                            i18nString(UIStrings.generatedAiAnnotationsSendData),
        }],
        learnMoreLink: {
          url: 'https://developer.chrome.com/docs/devtools/performance/annotations#auto-annotations',
          linkJSLogContext: 'learn-more.auto-annotations',
        },
        settingExpandState: {
          isSettingExpanded: false,
          expandSettingJSLogContext: 'auto-annotations.accordion',
        },
      };

      this.#settingToParams.set('ai-annotations-enabled', aiAnnotationsData);
    }

    if (this.#aiCodeCompletionSetting) {
      const settingItems = Root.Runtime.hostConfig.devToolsAiCodeGeneration?.enabled ?
          [
            {iconName: 'code', text: i18nString(UIStrings.asYouTypeRelevantDataIsBeingSentToGoogle)},
            {
              iconName: 'text-analysis',
              text: Host.Platform.isMac() ? i18nString(UIStrings.describeCodeInCommentForMacOs) :
                                            i18nString(UIStrings.describeCodeInComment),
            },
          ] :
          [{iconName: 'code', text: i18nString(UIStrings.asYouTypeCodeSuggestions)}];

      const aiCodeCompletionData: AiSettingParams = {
        settingName: i18n.i18n.lockedString('Code suggestions'),
        setting: this.#aiCodeCompletionSetting,
        iconName: 'text-analysis',
        settingDescription: i18nString(UIStrings.helpUnderstandCodeSuggestions),
        enableSettingText: i18nString(UIStrings.enableAiCodeSuggestions),
        settingItems,
        toConsiderSettingItems: [{
          iconName: 'google',
          text: noLogging ? i18nString(UIStrings.codeSuggestionsSendDataNoLogging) :
                            i18nString(UIStrings.codeSuggestionsSendData),
        }],
        learnMoreLink: {
          url: ' https://developers.chrome.com/docs/devtools/ai-assistance/code-completion',
          linkJSLogContext: 'learn-more.code-completion',
        },
        settingExpandState: {
          isSettingExpanded: false,
          expandSettingJSLogContext: 'code-completion.accordion',
        },
      };

      this.#settingToParams.set('ai-code-completion-enabled', aiCodeCompletionData);
    }
  }

  #updateAidaAvailability(aidaAvailability: Host.AidaClient.AidaAccessPreconditions): void {
    if (aidaAvailability !== this.#aidaAvailability) {
      this.#aidaAvailability = aidaAvailability;
      this.requestUpdate();
    }
  }

  #onAidaAvailabilityChange(ev: Common.EventTarget.EventTargetEvent<Host.AidaClient.AidaAccessPreconditions>): void {
    this.#updateAidaAvailability(ev.data);
  }

  #getAiAssistanceSettingDescription(): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.aiAssistanceDescription);
  }

  #getAiAssistanceSettingInfo(): Platform.UIString.LocalizedString {
    return i18nString(UIStrings.aiAssistanceWhenOnItem1);
  }

  #expandSetting(settingName: string): void {
    const settingData = this.#settingToParams.get(settingName);
    if (!settingData) {
      return;
    }
    settingData.settingExpandState.isSettingExpanded = !settingData.settingExpandState.isSettingExpanded;
    this.requestUpdate();
  }

  #toggleSetting(settingName: string, ev: Event): void {
    // If the switch is being clicked, there is both a click- and a
    // change-event. Aborting on click avoids running this method twice.
    if (ev.target instanceof Switch.Switch.Switch && ev.type !== Switch.Switch.SwitchChangeEvent.eventName) {
      return;
    }

    const settingData = this.#settingToParams.get(settingName);
    if (!settingData || !settingData.setting) {
      return;
    }

    const setting = settingData.setting;
    const oldSettingValue = setting.get();
    setting.set(!oldSettingValue);
    if (!oldSettingValue && !settingData.settingExpandState.isSettingExpanded) {
      settingData.settingExpandState.isSettingExpanded = true;
    }

    // Custom settings logic
    if (settingName === 'console-insights-enabled') {
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
    } else if (settingName === 'ai-assistance-enabled') {
      if (!setting.get()) {
        // If the "AI Assistance" is toggled off, we remove all the history entries related to the feature.
        void AiAssistanceModel.AiHistoryStorage.AiHistoryStorage.instance().deleteAll();
      }

      if (setting.get()) {
        Common.Settings.Settings.instance().moduleSetting('ai-assistance-v2-opt-in-change-dialog-seen').set(true);
      }
    }
    this.requestUpdate();
  }

  #getSharedDisclaimerBulletPoints(): Array<{icon: string, text: Common.UIString.LocalizedString|Lit.LitTemplate}> {
    const tosLink = html`<devtools-link href="https://policies.google.com/terms" .jslogContext=${'terms-of-service'}>${
        i18nString(UIStrings.termsOfService)}</devtools-link>`;
    const privacyNoticeLink = html`<devtools-link href="https://policies.google.com/privacy" .jslogContext=${
                                  'privacy-notice'}>${i18nString(UIStrings.privacyNotice)}</devtools-link>`;
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;

    return [
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
        text: uiI18n.getFormatLocalizedStringTemplate(str_, UIStrings.termsOfServicePrivacyNotice, {
          PH1: tosLink,
          PH2: privacyNoticeLink,
        }),
      },
    ];
  }
}
