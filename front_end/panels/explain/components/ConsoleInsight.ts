// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as Host from '../../../core/host/host.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as Marked from '../../../third_party/marked/marked.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as IconButton from '../../../ui/components/icon_button/icon_button.js';
import * as Input from '../../../ui/components/input/input.js';
import * as MarkdownView from '../../../ui/components/markdown_view/markdown_view.js';
import * as Spinners from '../../../ui/components/spinners/spinners.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import {type PromptBuilder, type Source, SourceType} from '../PromptBuilder.js';

import styles from './consoleInsight.css.js';
import listStyles from './consoleInsightSourcesList.css.js';

// Note: privacy and legal notices are not localized so far.
const UIStrings = {
  /**
   * @description The title of the insight source "Console message".
   */
  consoleMessage: 'Console message',
  /**
   * @description The title of the insight source "Stacktrace".
   */
  stackTrace: 'Stacktrace',
  /**
   * @description The title of the insight source "Network request".
   */
  networkRequest: 'Network request',
  /**
   * @description The title of the insight source "Related code".
   */
  relatedCode: 'Related code',
  /**
   * @description The title that is shown while the insight is being generated.
   */
  generating: 'Generating explanation…',
  /**
   * @description The header that indicates that the content shown is a console
   * insight.
   */
  insight: 'Explanation',
  /**
   * @description The title of the a button that closes the insight pane.
   */
  closeInsight: 'Close explanation',
  /**
   * @description The title of the list of source data that was used to generate the insight.
   */
  inputData: 'Data used to understand this message',
  /**
   * @description The title of the button that allows submitting positive
   * feedback about the console insight.
   */
  goodResponse: 'Good response',
  /**
   * @description The title of the button that allows submitting negative
   * feedback about the console insight.
   */
  badResponse: 'Bad response',
  /**
   * @description The title of the button that opens a page to report a legal
   * issue with the console insight.
   */
  report: 'Report legal issue',
  /**
   * @description The text of the header inside the console insight pane when there was an error generating an insight.
   */
  error: 'DevTools has encountered an error',
  /**
   * @description The message shown when an error has been encountered.
   */
  errorBody: 'Something went wrong. Try again.',
  /**
   * @description Label for screenreaders that is added to the end of the link
   * title to indicate that the link will be opened in a new tab.
   */
  opensInNewTab: '(opens in a new tab)',
  /**
   * @description The title of a link that allows the user to learn more about
   * the feature.
   */
  learnMore: 'Learn more',
  /**
   * @description The error message when the user is not logged in into Chrome.
   */
  notLoggedIn: 'This feature is only available when you sign into Chrome with your Google account.',
  /**
   * @description The title of the button that opens Chrome settings.
   */
  updateSettings: 'Update Settings',
  /**
   * @description The header shown when the internet connection is not
   * available.
   */
  offlineHeader: 'DevTools can’t reach the internet',
  /**
   * @description Message shown when the user is offline.
   */
  offline: 'Check your internet connection and try again.',
  /**
   * @description The message shown if the user is not logged in.
   */
  signInToUse: 'Sign in to use this feature',
  /**
   * @description The title of the button that cancels a console insight flow.
   */
  cancel: 'Cancel',
  /**
   * @description The title of the button that disables the Console insight (this) feature.
   */
  disableFeature: 'Disable this feature',
  /**
   * @description The title of the button that goes to the next page.
   */
  next: 'Next',
  /**
   * @description The title of the button that goes back to the previous page.
   */
  back: 'Back',
  /**
   * @description The title of the button that lets the user to continue
   * with using the feature.
   */
  continue: 'Continue',
  /**
   * @description The title of the button that searches for the console
   * insight using a search engine instead of using console insights.
   */
  search: 'Use search instead',
  /**
   * @description Shown to the user when the network request data is not
   * available and a page reload might populate it.
   */
  reloadRecommendation:
      'Reload the page to capture related network request data for this message in order to create a better insight.',
  /**
   * @description Shown to the user when they need to enable the console insights feature in settings in order to use it.
   * @example {Console insights in Settings} PH1
   */
  turnOnInSettings:
      'Turn on {PH1} to receive AI assistance for understanding and addressing console warnings and errors.',
  /**
   * @description Text for a link to Chrome DevTools Settings.
   */
  settingsLink: 'Console insights in Settings',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/components/ConsoleInsight.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const {render, html, Directives} = LitHtml;

export class CloseEvent extends Event {
  static readonly eventName = 'close';

  constructor() {
    super(CloseEvent.eventName, {composed: true, bubbles: true});
  }
}

type PublicPromptBuilder = Pick<PromptBuilder, 'buildPrompt'|'getSearchQuery'>;
type PublicAidaClient = Pick<Host.AidaClient.AidaClient, 'fetch'|'registerClientEvent'>;

function localizeType(sourceType: SourceType): string {
  switch (sourceType) {
    case SourceType.MESSAGE:
      return i18nString(UIStrings.consoleMessage);
    case SourceType.STACKTRACE:
      return i18nString(UIStrings.stackTrace);
    case SourceType.NETWORK_REQUEST:
      return i18nString(UIStrings.networkRequest);
    case SourceType.RELATED_CODE:
      return i18nString(UIStrings.relatedCode);
  }
}

const TERMS_OF_SERVICE_URL = 'https://policies.google.com/terms';
const PRIVACY_POLICY_URL = 'https://policies.google.com/privacy';
const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';
const LEARNMORE_URL = 'https://goo.gle/devtools-console-messages-ai' as Platform.DevToolsPath.UrlString;
const REPORT_URL = 'https://support.google.com/legal/troubleshooter/1114905?hl=en#ts=1115658%2C13380504' as
    Platform.DevToolsPath.UrlString;
const CHROME_SETTINGS_URL = 'chrome://settings' as Platform.DevToolsPath.UrlString;

const enum State {
  INSIGHT = 'insight',
  LOADING = 'loading',
  ERROR = 'error',
  CONSENT_ONBOARDING = 'consent-onboarding',
  CONSENT_REMINDER = 'consent-reminder',
  NOT_LOGGED_IN = 'not-logged-in',
  SYNC_IS_PAUSED = 'sync-is-paused',
  OFFLINE = 'offline',
}

const enum ConsentOnboardingPage {
  PAGE1 = 'private',
  PAGE2 = 'legal',
}

type StateData = {
  type: State.LOADING,
  consentOnboardingFinished: boolean,
  consentReminderConfirmed: boolean,
}|{
  type: State.INSIGHT,
  tokens: MarkdownView.MarkdownView.MarkdownViewData['tokens'],
  validMarkdown: boolean,
  sources: Source[],
  isPageReloadRecommended: boolean,
  completed: boolean,
}&Host.AidaClient.AidaResponse|{
  type: State.ERROR,
  error: string,
}|{
  type: State.CONSENT_REMINDER,
  sources: Source[],
  isPageReloadRecommended: boolean,
}|{
  type: State.CONSENT_ONBOARDING,
  page: ConsentOnboardingPage,
}|{
  type: State.NOT_LOGGED_IN,
}|{
  type: State.SYNC_IS_PAUSED,
}|{
  type: State.OFFLINE,
};

export class ConsoleInsight extends HTMLElement {
  static async create(promptBuilder: PublicPromptBuilder, aidaClient: PublicAidaClient): Promise<ConsoleInsight> {
    const aidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
    return new ConsoleInsight(promptBuilder, aidaClient, aidaAvailability);
  }

  static readonly litTagName = LitHtml.literal`devtools-console-insight`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #promptBuilder: PublicPromptBuilder;
  #aidaClient: PublicAidaClient;
  #renderer = new MarkdownView.MarkdownView.MarkdownInsightRenderer();

  // Main state.
  #state: StateData;

  // Rating sub-form state.
  #selectedRating?: boolean;

  #consoleInsightsEnabledSetting: Common.Settings.Setting<boolean>|undefined;

  constructor(
      promptBuilder: PublicPromptBuilder, aidaClient: PublicAidaClient,
      aidaAvailability: Host.AidaClient.AidaAccessPreconditions) {
    super();
    this.#promptBuilder = promptBuilder;
    this.#aidaClient = aidaClient;
    this.#consoleInsightsEnabledSetting = this.#getConsoleInsightsEnabledSetting();

    switch (aidaAvailability) {
      case Host.AidaClient.AidaAccessPreconditions.AVAILABLE:
        if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
          if (this.#consoleInsightsEnabledSetting?.disabled()) {
            this.#state = {
              type: State.CONSENT_ONBOARDING,
              page: ConsentOnboardingPage.PAGE1,
            };
            break;
          }
          // Allows skipping the consent reminder if the user enabled the feature via settings in the current session
          const skipReminder =
              Common.Settings.Settings.instance()
                  .createSetting('console-insights-skip-reminder', false, Common.Settings.SettingStorageType.SESSION)
                  .get();
          this.#state = {
            type: State.LOADING,
            consentReminderConfirmed: this.#getOnboardingCompletedSetting().get() || skipReminder,
            consentOnboardingFinished: this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true,
          };
        } else {
          this.#state = {
            type: State.LOADING,
            consentReminderConfirmed: false,
            consentOnboardingFinished: this.#getOnboardingCompletedSetting().get(),
          };
        }
        break;
      case Host.AidaClient.AidaAccessPreconditions.NO_ACCOUNT_EMAIL:
        this.#state = {
          type: State.NOT_LOGGED_IN,
        };
        break;
      case Host.AidaClient.AidaAccessPreconditions.SYNC_IS_PAUSED:
        this.#state = {
          type: State.SYNC_IS_PAUSED,
        };
        break;
      case Host.AidaClient.AidaAccessPreconditions.NO_INTERNET:
        this.#state = {
          type: State.OFFLINE,
        };
        break;
    }

    this.#render();
    // Stop keyboard event propagation to avoid Console acting on the events
    // inside the insight component.
    this.addEventListener('keydown', e => {
      e.stopPropagation();
    });
    this.addEventListener('keyup', e => {
      e.stopPropagation();
    });
    this.addEventListener('keypress', e => {
      e.stopPropagation();
    });
    this.addEventListener('click', e => {
      e.stopPropagation();
    });
    this.focus();
  }

  // The 'console-insights-enabled'-setting controls different things, depending on the 'gen-ai-settings-panel' experiment.
  // experiment off:
  //   setting off -> no entrypoints for console insights shown
  //   setting on -> entrypoints are shown
  // experiment on:
  //   setting off -> entrypoints are shown, and point to the AI setting panel where the setting can be turned on
  //   setting on -> entrypoints are shown, and lead to directly generating a console insight
  #getConsoleInsightsEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('console-insights-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  // The 'console-insights-onboarding-finished'-setting controls different things, depending on the 'gen-ai-settings-panel' experiment.
  // experiment off:
  //   setting off -> 2-page onboarding disclaimer is shown before generating a console insight
  //   setting on -> no onboarding disclaimer
  // experiment on:
  //   setting off -> single page consent reminder is shown, unless the 'console-insights-enabled'-setting has been enabled in the current DevTools session
  //   setting on -> no consent reminder shown
  #getOnboardingCompletedSetting(): Common.Settings.Setting<boolean> {
    return Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles, Input.checkboxStyles];
    this.classList.add('opening');
    this.#consoleInsightsEnabledSetting?.addChangeListener(this.#onConsoleInsightsSettingChanged, this);
    if (this.#state.type === State.LOADING && this.#state.consentOnboardingFinished &&
        this.#state.consentReminderConfirmed) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.GeneratingInsightWithoutDisclaimer);
    }
    void this.#generateInsightIfNeeded();
  }

  disconnectedCallback(): void {
    this.#consoleInsightsEnabledSetting?.removeChangeListener(this.#onConsoleInsightsSettingChanged, this);
  }

  #onConsoleInsightsSettingChanged(): void {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
      if (this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true) {
        this.#getOnboardingCompletedSetting().set(true);
      }
      if (this.#state.type === State.CONSENT_ONBOARDING &&
          this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === true) {
        this.#transitionTo({
          type: State.LOADING,
          consentReminderConfirmed: true,
          consentOnboardingFinished: true,
        });
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserConfirmedInSettings);
        void this.#generateInsightIfNeeded();
      }
      if (this.#state.type === State.CONSENT_REMINDER &&
          this.#consoleInsightsEnabledSetting?.getIfNotDisabled() === false) {
        this.#transitionTo({
          type: State.LOADING,
          consentReminderConfirmed: false,
          consentOnboardingFinished: false,
        });
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserAbortedInSettings);
        void this.#generateInsightIfNeeded();
      }
    }
  }

  #transitionTo(newState: StateData): void {
    const previousState = this.#state;
    this.#state = newState;
    this.#render();
    if (newState.type !== previousState.type) {
      this.#focusHeader();
    }
  }

  async #generateInsightIfNeeded(): Promise<void> {
    if (this.#state.type !== State.LOADING) {
      return;
    }
    if (!this.#state.consentOnboardingFinished) {
      this.#transitionTo({
        type: State.CONSENT_ONBOARDING,
        page: ConsentOnboardingPage.PAGE1,
      });
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserShown);
      } else {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingShown);
      }
      return;
    }
    if (!this.#state.consentReminderConfirmed) {
      const {sources, isPageReloadRecommended} = await this.#promptBuilder.buildPrompt();
      this.#transitionTo({
        type: State.CONSENT_REMINDER,
        sources,
        isPageReloadRecommended,
      });
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserShown);
      } else {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightConsentReminderShown);
      }
      return;
    }
    await this.#generateInsight();
  }

  #onClose(): void {
    if (this.#state.type === State.CONSENT_REMINDER) {
      if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserCanceled);
      } else {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightConsentReminderCanceled);
      }
    } else if (this.#state.type === State.CONSENT_ONBOARDING) {
      if (this.#state.page === ConsentOnboardingPage.PAGE1) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingCanceledOnPage1);
      } else {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingCanceledOnPage2);
      }
    }
    this.shadowRoot?.addEventListener('animationend', () => {
      this.dispatchEvent(new CloseEvent());
    }, {once: true});
    this.classList.add('closing');
  }

  #onRating(event: Event): void {
    if (this.#state.type !== State.INSIGHT) {
      throw new Error('Unexpected state');
    }
    if (this.#state.metadata?.rpcGlobalId === undefined) {
      throw new Error('RPC Id not in metadata');
    }
    // If it was rated, do not record again.
    if (this.#selectedRating !== undefined) {
      return;
    }

    this.#selectedRating = (event.target as HTMLElement).dataset.rating === 'true';
    this.#render();
    if (this.#selectedRating) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedPositive);
    } else {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightRatedNegative);
    }
    const disallowLogging =
        Common.Settings.Settings.instance().getHostConfig().aidaAvailability?.disallowLogging ?? true;
    void this.#aidaClient.registerClientEvent({
      corresponding_aida_rpc_global_id: this.#state.metadata.rpcGlobalId,
      disable_user_content_logging: disallowLogging,
      do_conversation_client_event: {
        user_feedback: {
          sentiment: this.#selectedRating ? Host.AidaClient.Rating.POSITIVE : Host.AidaClient.Rating.NEGATIVE,
        },
      },
    });
  }

  #onReport(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(REPORT_URL);
  }

  #onSearch(): void {
    const query = this.#promptBuilder.getSearchQuery();
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openSearchResultsInNewTab(query);
  }

  async #onConsentReminderConfirmed(): Promise<void> {
    this.#getOnboardingCompletedSetting().set(true);
    this.#transitionTo({
      type: State.LOADING,
      consentReminderConfirmed: true,
      consentOnboardingFinished: true,
    });
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserConfirmed);
    } else {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightConsentReminderConfirmed);
    }
    await this.#generateInsight();
  }

  async #generateInsight(): Promise<void> {
    try {
      for await (const {sources, isPageReloadRecommended, explanation, metadata, completed} of this.#getInsight()) {
        const tokens = this.#validateMarkdown(explanation);
        const valid = tokens !== false;
        this.#transitionTo({
          type: State.INSIGHT,
          tokens: valid ? tokens : [],
          validMarkdown: valid,
          explanation,
          sources,
          metadata,
          isPageReloadRecommended,
          completed,
        });
      }
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightGenerated);
    } catch (err) {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErrored);
      this.#transitionTo({
        type: State.ERROR,
        error: err.message,
      });
    }
  }

  /**
   * Validates the markdown by trying to render it.
   */
  #validateMarkdown(text: string): Marked.Marked.TokensList|false {
    try {
      const tokens = Marked.Marked.lexer(text);
      for (const token of tokens) {
        this.#renderer.renderToken(token);
      }
      return tokens;
    } catch {
      Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredMarkdown);
      return false;
    }
  }

  async *
      #getInsight(): AsyncGenerator<
          {sources: Source[], isPageReloadRecommended: boolean}&Host.AidaClient.AidaResponse, void, void> {
    const {prompt, sources, isPageReloadRecommended} = await this.#promptBuilder.buildPrompt();
    try {
      for await (
          const response of this.#aidaClient.fetch(Host.AidaClient.AidaClient.buildConsoleInsightsRequest(prompt))) {
        yield {sources, isPageReloadRecommended, ...response};
      }
    } catch (err) {
      if (err.message === 'Server responded: permission denied') {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredPermissionDenied);
      } else if (err.message.startsWith('Cannot send request:')) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredCannotSend);
      } else if (err.message.startsWith('Request failed:')) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredRequestFailed);
      } else if (err.message.startsWith('Cannot parse chunk:')) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredCannotParseChunk);
      } else if (err.message === 'Unknown chunk result') {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredUnknownChunk);
      } else if (err.message.startsWith('Server responded:')) {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredApi);
      } else {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightErroredOther);
      }
      throw err;
    }
  }

  #onGoToSettings(): void {
    const rootTarget = SDK.TargetManager.TargetManager.instance().rootTarget();
    if (rootTarget === null) {
      return;
    }
    const url = CHROME_SETTINGS_URL;
    void rootTarget.targetAgent().invoke_createTarget({url}).then(result => {
      if (result.getError()) {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(url);
      }
    });
  }

  #onDisableFeature(): void {
    this.#consoleInsightsEnabledSetting?.set(false);
    this.#onClose();
    UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning('Reload for the change to apply.');
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingFeatureDisabled);
  }

  #goToNextPage(): void {
    this.#transitionTo({
      type: State.CONSENT_ONBOARDING,
      page: ConsentOnboardingPage.PAGE2,
    });
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingNextPage);
  }

  #focusHeader(): void {
    this.addEventListener('animationend', () => {
      (this.#shadow.querySelector('header h2') as HTMLElement | undefined)?.focus();
    }, {once: true});
  }

  #termsChecked(): boolean {
    const checkbox = this.#shadow.querySelector('.terms') as HTMLInputElement | undefined;
    if (!checkbox?.checked) {
      return false;
    }
    return true;
  }

  #onConsentOnboardingConfirmed(): void {
    if (!this.#termsChecked()) {
      return;
    }
    this.#getOnboardingCompletedSetting().set(true);
    this.#transitionTo({
      type: State.LOADING,
      consentReminderConfirmed: false,
      consentOnboardingFinished: this.#getOnboardingCompletedSetting().get(),
    });
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingConfirmed);
    void this.#generateInsightIfNeeded();
  }

  #goToPrevPage(): void {
    this.#transitionTo({
      type: State.CONSENT_ONBOARDING,
      page: ConsentOnboardingPage.PAGE1,
    });
    Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOnboardingPrevPage);
  }

  #renderCancelButton(): LitHtml.TemplateResult {
    // clang-format off
    return html`<${Buttons.Button.Button.litTagName}
      class="cancel-button"
      @click=${this.#onClose}
      .data=${
        {
          variant: Buttons.Button.Variant.OUTLINED,
          jslogContext: 'cancel',
        } as Buttons.Button.ButtonData
      }
    >
      ${i18nString(UIStrings.cancel)}
    </${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  }

  #renderDisableFeatureButton(): LitHtml.TemplateResult {
    // clang-format off
    return html`<${Buttons.Button.Button.litTagName}
      @click=${this.#onDisableFeature}
      class="disable-button"
      .data=${
        {
          variant: Buttons.Button.Variant.OUTLINED,
          jslogContext: 'disable',
        } as Buttons.Button.ButtonData
      }
    >
      ${i18nString(UIStrings.disableFeature)}
    </${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  }

  #renderNextButton(): LitHtml.TemplateResult {
    // clang-format off
    return html`<${Buttons.Button.Button.litTagName}
      class="next-button"
      @click=${this.#goToNextPage}
      .data=${
        {
          variant: Buttons.Button.Variant.PRIMARY,
          jslogContext: 'next',
        } as Buttons.Button.ButtonData
      }
    >
      ${i18nString(UIStrings.next)}
    </${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  }

  #renderBackButton(): LitHtml.TemplateResult {
    // clang-format off
    return html`<${Buttons.Button.Button.litTagName}
      @click=${this.#goToPrevPage}
      .data=${
        {
          variant: Buttons.Button.Variant.OUTLINED,
          jslogContext: 'back',
        } as Buttons.Button.ButtonData
      }
    >
      ${i18nString(UIStrings.back)}
    </${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  }

  #renderContinueButton(handler: (event: Event) => void, disabled = false): LitHtml.TemplateResult {
    // clang-format off
    return html`<${Buttons.Button.Button.litTagName}
      @click=${handler}
      class="continue-button"
      .data=${
        {
          variant: Buttons.Button.Variant.PRIMARY,
          disabled,
          jslogContext: 'continue',
        } as Buttons.Button.ButtonData
      }
    >
      ${i18nString(UIStrings.continue)}
    </${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  }

  #renderSearchButton(): LitHtml.TemplateResult {
    // clang-format off
    return html`<${Buttons.Button.Button.litTagName}
      @click=${this.#onSearch}
      class="search-button"
      .data=${
        {
          variant: Buttons.Button.Variant.OUTLINED,
          jslogContext: 'search',
        } as Buttons.Button.ButtonData
      }
    >
      ${i18nString(UIStrings.search)}
    </${Buttons.Button.Button.litTagName}>`;
    // clang-format on
  }

  #renderLearnMoreAboutInsights(): LitHtml.TemplateResult {
    // clang-format off
    return html`<x-link href=${LEARNMORE_URL} class="link" jslog=${VisualLogging.link('learn-more').track({click: true})}>
      ${i18nString(UIStrings.learnMore)}
    </x-link>`;
    // clang-format on
  }

  #onTermsChange(): void {
    this.#render();
  }

  #renderMain(): LitHtml.TemplateResult {
    const jslog = `${VisualLogging.section(this.#state.type).track({resize: true})}`;
    const disallowLogging =
        Common.Settings.Settings.instance().getHostConfig().aidaAvailability?.disallowLogging ?? true;
    // clang-format off
    switch (this.#state.type) {
      case State.LOADING:
        return html`<main jslog=${jslog}>
            <div role="presentation" aria-label="Loading" class="loader" style="clip-path: url('#clipPath');">
              <svg width="100%" height="64">
                <clipPath id="clipPath">
                  <rect x="0" y="0" width="100%" height="16" rx="8"></rect>
                  <rect x="0" y="24" width="100%" height="16" rx="8"></rect>
                  <rect x="0" y="48" width="100%" height="16" rx="8"></rect>
                </clipPath>
              </svg>
            </div>
          </main>`;
      case State.INSIGHT:
        return html`
        <main jslog=${jslog}>
          ${
            this.#state.validMarkdown ? html`<${MarkdownView.MarkdownView.MarkdownView.litTagName}
              .data=${{tokens: this.#state.tokens, renderer: this.#renderer} as MarkdownView.MarkdownView.MarkdownViewData}>
            </${MarkdownView.MarkdownView.MarkdownView.litTagName}>`: this.#state.explanation
          }
          <details style="--list-height: ${(this.#state.sources.length + (this.#state.isPageReloadRecommended ? 1 : 0)) * 20}px;" jslog=${VisualLogging.expand('sources').track({click: true})}>
            <summary>${i18nString(UIStrings.inputData)}</summary>
            <${ConsoleInsightSourcesList.litTagName} .sources=${this.#state.sources} .isPageReloadRecommended=${this.#state.isPageReloadRecommended}>
            </${ConsoleInsightSourcesList.litTagName}>
          </details>
          <div class="buttons">
            ${this.#renderSearchButton()}
          </div>
        </main>`;
      case State.ERROR:
        return html`
        <main jslog=${jslog}>
          <div class="error">${i18nString(UIStrings.errorBody)}</div>
        </main>`;
      case State.CONSENT_REMINDER:
        if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
          return html`
          <main class="reminder-container" jslog=${jslog}>
            <h3>Things to consider</h3>
            <div class="reminder-items">
              <div>
                <${IconButton.Icon.Icon.litTagName} .data=${{
                  iconName: 'google',
                  width: 'var(--sys-size-8)',
                  height: 'var(--sys-size-8)',
                } as IconButton.Icon.IconData}>
                </${IconButton.Icon.Icon.litTagName}>
              </div>
              <div>The console message, associated stack trace, related source code, and the associated network headers are sent to Google to generate explanations. This data may be seen by human reviewers to improve this feature. Avoid sharing sensitive or personal information.</div>
              <div>
                <${IconButton.Icon.Icon.litTagName} .data=${{
                  iconName: 'policy',
                  width: 'var(--sys-size-8)',
                  height: 'var(--sys-size-8)',
                } as IconButton.Icon.IconData}>
                </${IconButton.Icon.Icon.litTagName}>
              </div>
              <div>Use of this feature is subject to the
                <x-link
                  href=${TERMS_OF_SERVICE_URL}
                  class="link"
                  jslog=${VisualLogging.link('terms-of-service.console-insights').track({click: true})}
                >Google Terms of Service</x-link>
                and
                <x-link
                  href=${PRIVACY_POLICY_URL}
                  class="link"
                  jslog=${VisualLogging.link('privacy-policy.console-insights').track({click: true})}
                >Google Privacy Policy</x-link>
              </div>
              <div>
                <${IconButton.Icon.Icon.litTagName} .data=${{
                  iconName: 'warning',
                  width: 'var(--sys-size-8)',
                  height: 'var(--sys-size-8)',
                } as IconButton.Icon.IconData}>
                </${IconButton.Icon.Icon.litTagName}>
              </div>
              <div>
                <x-link
                  href="https://support.google.com/legal/answer/13505487"
                  class="link"
                  jslog=${VisualLogging.link('code-snippets-explainer.console-insights').track({click: true})}
                >Use generated code snippets with caution</x-link>
              </div>
            </div>
          </main>
        `;
        }
        return html`
          <main jslog=${jslog}>
            <p>The following data will be sent to Google to understand the context for the console message.
            ${disallowLogging ? '' : 'Human reviewers may process this information for quality purposes. Don’t submit sensitive information.'}
            Read Google’s <x-link href=${TERMS_OF_SERVICE_URL} class="link" jslog=${VisualLogging.link('terms-of-service').track({click: true})}>Terms of Service</x-link>.</p>
            <${ConsoleInsightSourcesList.litTagName} .sources=${this.#state.sources} .isPageReloadRecommended=${this.#state.isPageReloadRecommended}>
            </${ConsoleInsightSourcesList.litTagName}>
          </main>
        `;
      case State.CONSENT_ONBOARDING: {
        if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
          const settingsLink = document.createElement('button');
          settingsLink.textContent = i18nString(UIStrings.settingsLink);
          settingsLink.classList.add('link');
          UI.ARIAUtils.markAsLink(settingsLink);
          settingsLink.addEventListener('click', () => {
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsOptInTeaserSettingsLinkClicked);
            void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
          });
          settingsLink.setAttribute('jslog', `${VisualLogging.action('open-ai-settings').track({click: true})}`);

          return html`<main class="opt-in-teaser" jslog=${jslog}>
            <div class="badge">
              <${IconButton.Icon.Icon.litTagName} .data=${{
                iconName: 'lightbulb-spark',
                width: 'var(--sys-size-8)',
                height: 'var(--sys-size-8)',
              } as IconButton.Icon.IconData}>
              </${IconButton.Icon.Icon.litTagName}>
            </div>
            <div>
              ${i18n.i18n.getFormatLocalizedString(str_, UIStrings.turnOnInSettings, {PH1: settingsLink})}
              ${this.#renderLearnMoreAboutInsights()}
            </div>
          </main>`;
        }
        switch (this.#state.page) {
          case ConsentOnboardingPage.PAGE1:
            return html`<main jslog=${jslog}>
              <p>This notice and our <x-link href=${PRIVACY_POLICY_URL} class="link" jslog=${VisualLogging.link('privacy-notice').track({click: true})}>privacy notice</x-link> describe how Chrome DevTools handles your data. Please read them carefully.</p>

              <p>Chrome DevTools uses the console message, associated stack trace, related source code, and the associated network headers as input data. When you use "Understand this message", Google collects this input data, generated output, related feature usage information, and your feedback. Google uses this data to provide, improve, and develop Google products and services and machine learning technologies, including Google's enterprise products such as Google Cloud.</p>

              <p>To help with quality and improve our products, human reviewers may read, annotate, and process the above-mentioned input data, generated output, related feature usage information, and your feedback. <strong>Please do not include sensitive (e.g., confidential) or personal information that can be used to identify you or others in your prompts or feedback.</strong> Your data will be stored in a way where Google cannot tell who provided it and can no longer fulfill any deletion requests and will be retained for up to 18 months. We may refrain from collecting data to improve our product if your Google account is managed by an organization and depending on your region.</p>
            </main>`;
          case ConsentOnboardingPage.PAGE2:
            return html`<main jslog=${jslog}>
            <p>As you try "Understand this message", here are key things to know:

            <ul>
              <li>Chrome DevTools uses console message, associated stack trace, related source code, and the associated network headers to provide answers.</li>
              <li>Chrome DevTools uses experimental technology, and may generate inaccurate or offensive information that doesn't represent Google's views. Voting on the responses will help make this feature better.</li>
              <li>This feature is an experimental feature and subject to future changes.</li>
              <li><strong><x-link class="link" href=${CODE_SNIPPET_WARNING_URL} jslog=${VisualLogging.link('use-code-with-caution').track({click: true})}>Use generated code snippets with caution</x-link>.</strong></li>
            </ul>
            </p>

            <p>
            <label>
              <input class="terms" @change=${this.#onTermsChange} type="checkbox" jslog=${VisualLogging.toggle('terms-of-service-accepted')}>
              <span>I accept my use of "Understand this message" is subject to the <x-link href=${TERMS_OF_SERVICE_URL} class="link" jslog=${VisualLogging.link('terms-of-service').track({click: true})}>Google Terms of Service</x-link>.</span>
            </label>
            </p>
            </main>`;
        }
      }
      case State.NOT_LOGGED_IN:
      case State.SYNC_IS_PAUSED:
        return html`
          <main jslog=${jslog}>
            <div class="error">${i18nString(UIStrings.notLoggedIn)}</div>
          </main>`;
      case State.OFFLINE:
        return html`
          <main jslog=${jslog}>
            <div class="error">${i18nString(UIStrings.offline)}</div>
          </main>`;
    }
    // clang-format on
  }

  #renderDisclaimer(): LitHtml.LitTemplate {
    if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
      // clang-format off
      return LitHtml.html`<span>
        Chrome AI may generate inaccurate info that does not represent Google's views. Data sent to Google may be seen by human reviewers to improve this feature.
        <button class="link" role="link" @click=${() => UI.ViewManager.ViewManager.instance().showView('chrome-ai')}
          jslog=${VisualLogging.action('open-ai-settings').track({click: true})}
        >Open settings</button>
        or
        <x-link href=${LEARNMORE_URL} class="link" jslog=${VisualLogging.link('learn-more').track({click: true})}>learn more</x-link>
      </span>`;
    }
    return LitHtml.html`<span>
      This feature may display inaccurate or offensive information that doesn't represent Google's views.
      <x-link href=${LEARNMORE_URL} class="link" jslog=${
        VisualLogging.link('learn-more').track({click: true})}>${i18nString(UIStrings.learnMore)}</x-link>
    </span>`;
    // clang-format on
  }

  #renderFooter(): LitHtml.LitTemplate {
    const showThumbsUpDownButtons =
        !(Common.Settings.Settings.instance().getHostConfig().aidaAvailability?.disallowLogging ?? true);
    const disclaimer = this.#renderDisclaimer();
    // clang-format off
    switch (this.#state.type) {
      case State.LOADING:
        return LitHtml.nothing;
      case State.ERROR:
      case State.OFFLINE:
        return html`<footer jslog=${VisualLogging.section('footer')}>
          <div class="disclaimer">
            ${disclaimer}
          </div>
        </footer>`;
      case State.NOT_LOGGED_IN:
      case State.SYNC_IS_PAUSED:
        return html`<footer jslog=${VisualLogging.section('footer')}>
        <div class="filler"></div>
        <div>
          <${Buttons.Button.Button.litTagName}
            @click=${this.#onGoToSettings}
            .data=${
              {
                variant: Buttons.Button.Variant.PRIMARY,
                jslogContext: 'update-settings',
              } as Buttons.Button.ButtonData
            }
          >
            ${UIStrings.updateSettings}
          </${Buttons.Button.Button.litTagName}>
        </div>
      </footer>`;
      case State.CONSENT_REMINDER:
        if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
          return html`<footer jslog=${VisualLogging.section('footer')}>
            <div class="filler"></div>
            <div class="buttons">
              <${Buttons.Button.Button.litTagName}
                @click=${() => {
                  Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightsReminderTeaserSettingsLinkClicked);
                  void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
                }}
                .data=${
                  {
                    variant: Buttons.Button.Variant.TONAL,
                    jslogContext: 'settings',
                    title: 'Settings',
                  } as Buttons.Button.ButtonData
                }
              >
                Settings
              </${Buttons.Button.Button.litTagName}>
              <${Buttons.Button.Button.litTagName}
                class='continue-button'
                @click=${this.#onConsentReminderConfirmed}
                .data=${
                  {
                    variant: Buttons.Button.Variant.PRIMARY,
                    jslogContext: 'continue',
                    title: 'continue',
                  } as Buttons.Button.ButtonData
                }
               >
                Continue
              </${Buttons.Button.Button.litTagName}>
            </div>
          </footer>`;
        }
        return html`<footer jslog=${VisualLogging.section('footer')}>
          <div class="disclaimer">
            ${disclaimer}
          </div>
          <div class="filler"></div>
          <div class="buttons">
            ${this.#renderCancelButton()}
            ${this.#renderContinueButton(this.#onConsentReminderConfirmed)}
          </div>
        </footer>`;
      case State.CONSENT_ONBOARDING:
        if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
          return LitHtml.nothing;
        }
        switch (this.#state.page) {
          case ConsentOnboardingPage.PAGE1:
            return html`<footer jslog=${VisualLogging.section('footer')}>
                <div class="disclaimer">
                  ${this.#renderLearnMoreAboutInsights()}
                </div>
                <div class="filler"></div>
                <div class="buttons">
                    ${this.#renderCancelButton()}
                    ${this.#renderDisableFeatureButton()}
                    ${this.#renderNextButton()}
                  </div>
              </footer>`;
          case ConsentOnboardingPage.PAGE2:
            return html`<footer jslog=${VisualLogging.section('footer')}>
            <div class="disclaimer">
              ${this.#renderLearnMoreAboutInsights()}
            </div>
            <div class="filler"></div>
            <div class="buttons">
                ${this.#renderBackButton()}
                ${this.#renderDisableFeatureButton()}
                ${this.#renderContinueButton(this.#onConsentOnboardingConfirmed, !this.#termsChecked())}
              </div>
          </footer>`;
        }
      case State.INSIGHT:
        return html`<footer jslog=${VisualLogging.section('footer')}>
        <div class="disclaimer">
          ${disclaimer}
        </div>
        <div class="filler"></div>
        <div class="rating">
          ${showThumbsUpDownButtons ? html`
            <${Buttons.Button.Button.litTagName}
              data-rating=${'true'}
              .data=${
                {
                  variant: Buttons.Button.Variant.ICON,
                  size: Buttons.Button.Size.SMALL,
                  iconName: 'thumb-up',
                  active: this.#selectedRating !== undefined && this.#selectedRating,
                  title: i18nString(UIStrings.goodResponse),
                  jslogContext: 'thumbs-up',
                } as Buttons.Button.ButtonData
              }
              @click=${this.#onRating}
            ></${Buttons.Button.Button.litTagName}>
            <${Buttons.Button.Button.litTagName}
              data-rating=${'false'}
              .data=${
                {
                  variant: Buttons.Button.Variant.ICON,
                  size: Buttons.Button.Size.SMALL,
                  iconName: 'thumb-down',
                  active: this.#selectedRating !== undefined && !this.#selectedRating,
                  title: i18nString(UIStrings.badResponse),
                  jslogContext: 'thumbs-down',
                } as Buttons.Button.ButtonData
              }
              @click=${this.#onRating}
            ></${Buttons.Button.Button.litTagName}>
          ` : LitHtml.nothing}
          <${Buttons.Button.Button.litTagName}
            .data=${
              {
                variant: Buttons.Button.Variant.ICON,
                size: Buttons.Button.Size.SMALL,
                iconName: 'report',
                title: i18nString(UIStrings.report),
                jslogContext: 'report',
              } as Buttons.Button.ButtonData
            }
            @click=${this.#onReport}
          ></${Buttons.Button.Button.litTagName}>
        </div>

      </footer>`;
    }
    // clang-format on
  }

  #getHeader(): string {
    switch (this.#state.type) {
      case State.NOT_LOGGED_IN:
      case State.SYNC_IS_PAUSED:
        return i18nString(UIStrings.signInToUse);
      case State.OFFLINE:
        return i18nString(UIStrings.offlineHeader);
      case State.LOADING:
        return i18nString(UIStrings.generating);
      case State.INSIGHT:
        return i18nString(UIStrings.insight);
      case State.ERROR:
        return i18nString(UIStrings.error);
      case State.CONSENT_REMINDER:
        if (Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
          return 'Understand console messages with Chrome AI';
        }
        return i18nString(UIStrings.inputData);
      case State.CONSENT_ONBOARDING:
        switch (this.#state.page) {
          case ConsentOnboardingPage.PAGE1:
            return 'Privacy notice';
          case ConsentOnboardingPage.PAGE2:
            return 'Legal notice';
        }
    }
  }

  #renderSpinner(): LitHtml.LitTemplate {
    // clang-format off
    if (this.#state.type === State.INSIGHT && !this.#state.completed) {
      return html`<${Spinners.Spinner.Spinner.litTagName}></${Spinners.Spinner.Spinner.litTagName}>`;
    }
    return LitHtml.nothing;
    // clang-format on
  }

  #renderHeader(): LitHtml.LitTemplate {
    if (this.#state.type === State.CONSENT_ONBOARDING &&
        Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL)) {
      return LitHtml.nothing;
    }
    const hasIcon = Root.Runtime.experiments.isEnabled(Root.Runtime.ExperimentName.GEN_AI_SETTINGS_PANEL) &&
        this.#state.type === State.CONSENT_REMINDER;
    // clang-format off
    return html`
      <header>
        ${hasIcon ? html`
          <div class="header-icon-container">
            <${IconButton.Icon.Icon.litTagName} .data=${{
              iconName: 'lightbulb-spark',
              width: '18px',
              height: '18px',
            } as IconButton.Icon.IconData}>
            </${IconButton.Icon.Icon.litTagName}>
          </div>`
        : LitHtml.nothing}
        <div class="filler">
          <h2 tabindex="-1">
            ${this.#getHeader()}
          </h2>
          ${this.#renderSpinner()}
        </div>
        <div class="close-button">
          <${Buttons.Button.Button.litTagName}
            .data=${
              {
                variant: Buttons.Button.Variant.ICON,
                size: Buttons.Button.Size.SMALL,
                iconName: 'cross',
                title: i18nString(UIStrings.closeInsight),
              } as Buttons.Button.ButtonData
            }
            jslog=${VisualLogging.close().track({click: true})}
            @click=${this.#onClose}
          ></${Buttons.Button.Button.litTagName}>
        </div>
      </header>
    `;
    // clang-format on
  }

  #render(): void {
    // clang-format off
    render(html`
      <div class="wrapper" jslog=${VisualLogging.pane('console-insights').track({resize: true})}>
        <div class="animation-wrapper">
          ${this.#renderHeader()}
          ${this.#renderMain()}
          ${this.#renderFooter()}
        </div>
      </div>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }
}

class ConsoleInsightSourcesList extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-console-insight-sources-list`;
  readonly #shadow = this.attachShadow({mode: 'open'});
  #sources: Source[] = [];
  #isPageReloadRecommended = false;

  constructor() {
    super();
    this.#shadow.adoptedStyleSheets = [listStyles, Input.checkboxStyles];
  }

  #render(): void {
    // clang-format off
     render(html`
      <ul>
        ${Directives.repeat(this.#sources, item => item.value, item => {
          return html`<li><x-link class="link" title="${localizeType(item.type)} ${i18nString(UIStrings.opensInNewTab)}" href="data:text/plain,${encodeURIComponent(item.value)}" jslog=${VisualLogging.link('source-' + item.type).track({click: true})}>
            <${IconButton.Icon.Icon.litTagName} name="open-externally"></${IconButton.Icon.Icon.litTagName}>
            ${localizeType(item.type)}
          </x-link></li>`;
        })}
        ${this.#isPageReloadRecommended ? LitHtml.html`<li class="source-disclaimer">
          <${IconButton.Icon.Icon.litTagName} name="warning"></${IconButton.Icon.Icon.litTagName}>
          ${i18nString(UIStrings.reloadRecommendation)}</li>` : LitHtml.nothing}
      </ul>
    `, this.#shadow, {
      host: this,
    });
    // clang-format on
  }

  set sources(values: Source[]) {
    this.#sources = values;
    this.#render();
  }

  set isPageReloadRecommended(isPageReloadRecommended: boolean) {
    this.#isPageReloadRecommended = isPageReloadRecommended;
    this.#render();
  }
}

customElements.define('devtools-console-insight', ConsoleInsight);
customElements.define('devtools-console-insight-sources-list', ConsoleInsightSourcesList);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-console-insight': ConsoleInsight;
    'devtools-console-insight-sources-list': ConsoleInsightSourcesList;
  }
}
