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
} as const;

const lockedString = i18n.i18n.lockedString;

const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';
const DATA_USAGE_URL = 'https://developer.chrome.com/docs/devtools/ai-assistance/get-started#data-use';
const EXPLAIN_TEASER_ACTION_ID = 'explain.console-message.teaser';

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
}

export const DEFAULT_VIEW = (input: ViewInput, _output: undefined, target: HTMLElement): void => {
  if (input.isInactive) {
    render(Lit.nothing, target);
    return;
  }

  const showPlaceholder = !Boolean(input.mainText);
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
        ${showPlaceholder ? html`
          <h2 tabindex="-1">${lockedString(UIStringsNotTranslate.summarizing)}</h2>
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
          <h2 tabindex="-1">${input.headerText}</h2>
          <div>${input.mainText}</div>
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
            <devtools-icon
              name="info"
              class="info-icon"
              aria-details=${'teaser-info-tooltip-' + input.uuid}
            ></devtools-icon>
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
            <devtools-checkbox
              @change=${input.dontShowChanged}
              jslog=${VisualLogging.toggle('explain.teaser.dont-show').track({ change: true })}>
              ${lockedString(UIStringsNotTranslate.dontShow)}
            </devtools-checkbox>
          </div>
        `}
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
  }

  setInactive(isInactive: boolean): void {
    if (this.#isInactive === isInactive) {
      return;
    }
    this.#isInactive = isInactive;
    this.requestUpdate();
  }

  async #generateTeaserText(): Promise<void> {
    this.#isGenerating = true;
    let teaserText = '';
    try {
      for await (const chunk of this.#getOnDeviceInsight()) {
        teaserText += chunk;
      }
    } catch (err) {
      // Ignore `AbortError` errors, which are thrown on mouse leave.
      if (err.name !== 'AbortError') {
        console.error(err.name, err.message);
      }
      this.#isGenerating = false;
      return;
    }

    // TODO(crbug.com/443618746): Add user-facing error message instead of staying in loading state
    let responseObject = {
      header: null,
      explanation: null,
    };
    try {
      responseObject = JSON.parse(teaserText);
    } catch (err) {
      console.error(err.name, err.message);
    }
    this.#headerText = responseObject.header || '';
    this.#mainText = responseObject.explanation || '';
    this.#isGenerating = false;
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
        },
        undefined, this.contentElement);
  }
}
