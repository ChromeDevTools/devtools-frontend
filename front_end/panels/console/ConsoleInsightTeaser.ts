// Copyright 2025 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/components/tooltips/tooltips.js';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Buttons from '../../ui/components/buttons/buttons.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as PanelCommon from '../common/common.js';

import consoleInsightTeaserStyles from './consoleInsightTeaser.css.js';
import {ConsoleViewMessage} from './ConsoleViewMessage.js';
import {PromptBuilder} from './PromptBuilder.js';

const {render, html} = Lit;

const UIStringsNotTranslate = {
  /**
   * @description Link text in the disclaimer dialog, linking to a settings page containing more information
   */
  learnMore: 'Learn more',
  /**
   * @description Link text in the Console Insights Teaser info tooltip, linking to an explainer on how data is being used in this feature
   */
  learnMoreAboutAiSummaries: 'Learn more about AI summaries',
  /**
   * @description Description of the console insights feature
   */
  freDisclaimerHeader: 'Get explanations for console warnings and errors',
  /**
   * @description First item in the first-run experience dialog
   */
  freDisclaimerTextAiWontAlwaysGetItRight: 'This feature uses AI and won’t always get it right',
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
   * @description Third item in the first-run experience dialog
   */
  freDisclaimerTextUseWithCaution: 'Use generated code snippets with caution',
  /**
   * @description Tooltip text for the console insights teaser
   */
  infoTooltipText:
      'The text above has been generated with AI on your local device. Clicking the button will send the console message, stack trace, related source code, and the associated network headers to Google to generate a more detailed explanation.',
  /**
   * @description Header text during loading state while an AI summary is being generated
   */
  summarizing: 'Summarizing…',
  /**
   * @description Header text during longer lasting loading state while an AI summary is being generated
   */
  summarizingTakesABitLonger: 'Summarizing takes a bit longer…',
  /**
   * @description Label for an animation shown while an AI response is being generated
   */
  loading: 'Loading',
  /**
   * @description Label for a button which generates a more detailed explanation
   */
  tellMeMore: 'Tell me more',
  /**
   * @description Label for a checkbox which turns off the teaser explanation feature
   */
  dontShow: 'Don’t show',
  /**
   * @description Aria-label for an infor-button triggering a tooltip with more info about data usage
   */
  learnDataUsage: 'Learn more about how your data is used',
  /**
   * @description Header text if there was an error during AI summary generation
   */
  summaryNotAvailable: 'Summary not available',
} as const;

const lockedString = i18n.i18n.lockedString;

const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';
const DATA_USAGE_URL = 'https://developer.chrome.com/docs/devtools/ai-assistance/get-started#data-use';
const EXPLAIN_TEASER_ACTION_ID = 'explain.console-message.teaser';
const SLOW_GENERATION_CUTOFF_MILLISECONDS = 3500;

interface ViewInput {
  onTellMeMoreClick: (event: Event) => void;
  // If multiple ConsoleInsightTeasers exist, each one needs a unique id. Otherwise showing and
  // hiding of the tooltip, and rendering the loading animation, does not work correctly.
  uuid: string;
  headerText: string;
  mainText: string;
  isInactive: boolean;
  dontShowChanged: (e: Event) => void;
  hasTellMeMoreButton: boolean;
  isSlowGeneration: boolean;
  isError: boolean;
}

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  if (input.isInactive) {
    render(Lit.nothing, target);
    return;
  }

  const showPlaceholder = !Boolean(input.mainText);
  const renderFooter = (): Lit.LitTemplate => {
    // clang-format off
    return html`
      <div class="tooltip-footer">
        ${input.hasTellMeMoreButton ? html`
          <devtools-button
            title=${lockedString(UIStringsNotTranslate.tellMeMore)}
            .jslogContext=${'insights-teaser-tell-me-more'},
            .variant=${Buttons.Button.Variant.PRIMARY}
            @click=${input.onTellMeMoreClick}
          >
            <devtools-icon class="lightbulb-icon" name="lightbulb-spark"></devtools-icon>
            ${lockedString(UIStringsNotTranslate.tellMeMore)}
          </devtools-button>
        ` : Lit.nothing}
        ${showPlaceholder ? Lit.nothing : html`
          <devtools-button
            .iconName=${'info'}
            .variant=${Buttons.Button.Variant.ICON}
            aria-details=${'teaser-info-tooltip-' + input.uuid}
            aria-label=${lockedString(UIStringsNotTranslate.learnDataUsage)}
          ></devtools-button>
          <devtools-tooltip id=${'teaser-info-tooltip-' + input.uuid} variant="rich">
            <div class="info-tooltip-text">${lockedString(UIStringsNotTranslate.infoTooltipText)}</div>
            <div class="learn-more">
              <x-link
                class="devtools-link"
                title=${lockedString(UIStringsNotTranslate.learnMoreAboutAiSummaries)}
                href=${DATA_USAGE_URL}
                jslog=${VisualLogging.link().track({click: true, keydown:'Enter|Space'}).context('explain.teaser.learn-more')}
              >${lockedString(UIStringsNotTranslate.learnMoreAboutAiSummaries)}</x-link>
            </div>
          </devtools-tooltip>
        `}
        <devtools-checkbox
          aria-label=${lockedString(UIStringsNotTranslate.dontShow)}
          @change=${input.dontShowChanged}
          jslog=${VisualLogging.toggle('explain.teaser.dont-show').track({ change: true })}>
          ${lockedString(UIStringsNotTranslate.dontShow)}
        </devtools-checkbox>
      </div>
    `;
    // clang-format on
  };

  // clang-format off
  render(html`
    <style>${consoleInsightTeaserStyles}</style>
    <devtools-tooltip
      id=${'teaser-' + input.uuid}
      hover-delay=500
      variant="rich"
      vertical-distance-increase=-6
      prefer-span-left
    >
      <div class="teaser-tooltip-container">
        ${input.isError ? html`
          <h2>${lockedString(UIStringsNotTranslate.summaryNotAvailable)}</h2>
        ` :
          showPlaceholder ? html`
            <h2>${input.isSlowGeneration ?
              lockedString(UIStringsNotTranslate.summarizingTakesABitLonger) :
              lockedString(UIStringsNotTranslate.summarizing)
            }</h2>
            <div
              role="presentation"
              aria-label=${lockedString(UIStringsNotTranslate.loading)}
              class="loader"
              style="clip-path: url(${'#clipPath-' + input.uuid});"
            >
              <svg width="100%" height="52">
                <defs>
                <clipPath id=${'clipPath-' + input.uuid}>
                  <rect x="0" y="0" width="100%" height="12" rx="8"></rect>
                  <rect x="0" y="20" width="100%" height="12" rx="8"></rect>
                  <rect x="0" y="40" width="100%" height="12" rx="8"></rect>
                </clipPath>
              </defs>
              </svg>
            </div>
          ` : html`
            <h2>${input.headerText}</h2>
            <div>${input.mainText}</div>
          `
        }
        ${input.isError || input.isSlowGeneration || !showPlaceholder ? renderFooter() : Lit.nothing}
      </div>
    </devtools-tooltip>
  `, target);
  // clang-format on
};

export type View = typeof DEFAULT_VIEW;

export class ConsoleInsightTeaser extends UI.Widget.Widget {
  #view: View;
  #uuid: string;
  #isGenerating = false;
  #builtInAi: AiAssistanceModel.BuiltInAi.BuiltInAi|undefined;
  #promptBuilder: PromptBuilder;
  #headerText = '';
  #mainText = '';
  #consoleViewMessage: ConsoleViewMessage;
  #isInactive = false;
  #abortController: null|AbortController = null;
  #isSlow = false;
  #timeoutId: ReturnType<typeof setTimeout>|null = null;
  #isError = false;

  constructor(uuid: string, consoleViewMessage: ConsoleViewMessage, element?: HTMLElement, view?: View) {
    super(element);
    this.#view = view ?? DEFAULT_VIEW;
    this.#uuid = uuid;
    this.#promptBuilder = new PromptBuilder(consoleViewMessage);
    this.#consoleViewMessage = consoleViewMessage;
    this.requestUpdate();
  }

  #getConsoleInsightsEnabledSetting(): Common.Settings.Setting<boolean>|undefined {
    try {
      return Common.Settings.moduleSetting('console-insights-enabled') as Common.Settings.Setting<boolean>;
    } catch {
      return;
    }
  }

  #getOnboardingCompletedSetting(): Common.Settings.Setting<boolean> {
    return Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', true);
  }

  #executeConsoleInsightAction(): void {
    UI.Context.Context.instance().setFlavor(ConsoleViewMessage, this.#consoleViewMessage);
    const action = UI.ActionRegistry.ActionRegistry.instance().getAction(EXPLAIN_TEASER_ACTION_ID);
    void action.execute();
  }

  #onTellMeMoreClick(event: Event): void {
    event.stopPropagation();
    if (this.#getConsoleInsightsEnabledSetting()?.getIfNotDisabled() &&
        this.#getOnboardingCompletedSetting()?.getIfNotDisabled()) {
      this.#executeConsoleInsightAction();
      return;
    }
    void this.#showFreDialog();
  }

  async #showFreDialog(): Promise<void> {
    const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
        Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
    const result = await PanelCommon.FreDialog.show({
      header: {iconName: 'smart-assistant', text: lockedString(UIStringsNotTranslate.freDisclaimerHeader)},
      reminderItems: [
        {
          iconName: 'psychiatry',
          content: lockedString(UIStringsNotTranslate.freDisclaimerTextAiWontAlwaysGetItRight),
        },
        {
          iconName: 'google',
          content: noLogging ? lockedString(UIStringsNotTranslate.consoleInsightsSendsDataNoLogging) :
                               lockedString(UIStringsNotTranslate.consoleInsightsSendsData),
        },
        {
          iconName: 'warning',
          // clang-format off
          content: html`<x-link
            href=${CODE_SNIPPET_WARNING_URL}
            class="link devtools-link"
            jslog=${VisualLogging.link('explain.teaser.code-snippets-explainer').track({
              click: true
            })}
          >${lockedString(UIStringsNotTranslate.freDisclaimerTextUseWithCaution)}</x-link>`,
          // clang-format on
        }
      ],
      onLearnMoreClick: () => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
      },
      ariaLabel: lockedString(UIStringsNotTranslate.freDisclaimerHeader),
      learnMoreButtonText: lockedString(UIStringsNotTranslate.learnMore),
    });

    if (result) {
      this.#getConsoleInsightsEnabledSetting()?.set(true);
      this.#getOnboardingCompletedSetting()?.set(true);
      this.#executeConsoleInsightAction();
    }
  }

  maybeGenerateTeaser(): void {
    this.requestUpdate();
    if (!this.#isInactive && !this.#isGenerating && !Boolean(this.#mainText) &&
        Common.Settings.Settings.instance().moduleSetting('console-insight-teasers-enabled').get()) {
      void this.#generateTeaserText();
    }
  }

  abortTeaserGeneration(): void {
    if (this.#abortController) {
      this.#abortController.abort();
    }
    this.#isGenerating = false;
    if (this.#timeoutId) {
      clearTimeout(this.#timeoutId);
    }
  }

  setInactive(isInactive: boolean): void {
    if (this.#isInactive === isInactive) {
      return;
    }
    this.#isInactive = isInactive;
    this.requestUpdate();
  }

  #setSlow(): void {
    this.#isSlow = true;
    this.requestUpdate();
  }

  async #generateTeaserText(): Promise<void> {
    this.#isGenerating = true;
    this.#timeoutId = setTimeout(this.#setSlow.bind(this), SLOW_GENERATION_CUTOFF_MILLISECONDS);
    let teaserText = '';
    try {
      for await (const chunk of this.#getOnDeviceInsight()) {
        teaserText += chunk;
      }
    } catch (err) {
      // Ignore `AbortError` errors, which are thrown on mouse leave.
      if (err.name !== 'AbortError') {
        console.error(err.name, err.message);
        this.#isError = true;
      }
      this.#isGenerating = false;
      clearTimeout(this.#timeoutId);
      this.requestUpdate();
      return;
    }

    clearTimeout(this.#timeoutId);
    this.#isGenerating = false;
    let responseObject = {
      header: null,
      explanation: null,
    };
    try {
      responseObject = JSON.parse(teaserText);
    } catch (err) {
      console.error(err.name, err.message);
      this.#isError = true;
      this.requestUpdate();
      return;
    }
    this.#headerText = responseObject.header || '';
    this.#mainText = responseObject.explanation || '';
    if (!this.#headerText || !this.#mainText) {
      this.#isError = true;
    }
    this.requestUpdate();
  }

  async * #getOnDeviceInsight(): AsyncGenerator<string> {
    const {prompt} = await this.#promptBuilder.buildPrompt();
    if (!this.#builtInAi) {
      this.#builtInAi = await AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
      if (!this.#builtInAi) {
        this.#isInactive = true;
        throw new Error('Cannot instantiate BuiltInAi');
      }
    }
    this.#abortController = new AbortController();
    const stream = this.#builtInAi.getConsoleInsight(prompt, this.#abortController);
    for await (const chunk of stream) {
      yield chunk;
    }
    this.#abortController = null;
  }

  #dontShowChanged(e: Event): void {
    const showTeasers = !(e.target as HTMLInputElement).checked;
    Common.Settings.Settings.instance().moduleSetting('console-insight-teasers-enabled').set(showTeasers);
  }

  #hasTellMeMoreButton(): boolean {
    if (!UI.ActionRegistry.ActionRegistry.instance().hasAction(EXPLAIN_TEASER_ACTION_ID)) {
      return false;
    }
    if (Root.Runtime.hostConfig.aidaAvailability?.blockedByAge || Root.Runtime.hostConfig.isOffTheRecord) {
      return false;
    }
    if (!Host.AidaClient.AidaAccessPreconditions.AVAILABLE) {
      return false;
    }
    return true;
  }

  override performUpdate(): Promise<void>|void {
    this.#view(
        {
          onTellMeMoreClick: this.#onTellMeMoreClick.bind(this),
          uuid: this.#uuid,
          headerText: this.#headerText,
          mainText: this.#mainText,
          isInactive: this.#isInactive ||
              !Common.Settings.Settings.instance().moduleSetting('console-insight-teasers-enabled').get(),
          dontShowChanged: this.#dontShowChanged.bind(this),
          hasTellMeMoreButton: this.#hasTellMeMoreButton(),
          isSlowGeneration: this.#isSlow,
          isError: this.#isError,
        },
        undefined, this.contentElement);
  }
}
