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
import { ConsoleViewMessage } from './ConsoleViewMessage.js';
import { PromptBuilder } from './PromptBuilder.js';
const { render, html } = Lit;
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
    consoleInsightsSendsData: 'To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Explainer for which data is being sent by the console insights feature
     */
    consoleInsightsSendsDataNoLogging: 'To generate explanations, the console message, associated stack trace, related source code, and the associated network headers are sent to Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
    /**
     * @description Third item in the first-run experience dialog
     */
    freDisclaimerTextUseWithCaution: 'Use generated code snippets with caution',
    /**
     * @description Tooltip text for the console insights teaser
     */
    infoTooltipText: 'The text above has been generated with AI on your local device. Clicking the button will send the console message, stack trace, related source code, and the associated network headers to Google to generate a more detailed explanation.',
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
};
const lockedString = i18n.i18n.lockedString;
const CODE_SNIPPET_WARNING_URL = 'https://support.google.com/legal/answer/13505487';
const DATA_USAGE_URL = 'https://developer.chrome.com/docs/devtools/ai-assistance/get-started#data-use';
const EXPLAIN_TEASER_ACTION_ID = 'explain.console-message.teaser';
const SLOW_GENERATION_CUTOFF_MILLISECONDS = 3500;
function renderGenerating(input) {
    // clang-format off
    return html `
    <div class="teaser-tooltip-container">
      <div class="response-container">
        <h2>${input.isSlowGeneration ?
        lockedString(UIStringsNotTranslate.summarizingTakesABitLonger) :
        lockedString(UIStringsNotTranslate.summarizing)}</h2>
        <div
          role="presentation"
          aria-label=${lockedString(UIStringsNotTranslate.loading)}
          class="loader"
          style="clip-path: url(${'#clipPath-' + input.uuid});"
        >
          <svg width="100%" height="58">
            <defs>
            <clipPath id=${'clipPath-' + input.uuid}>
              <rect x="0" y="0" width="100%" height="12" rx="8"></rect>
              <rect x="0" y="20" width="100%" height="12" rx="8"></rect>
              <rect x="0" y="40" width="100%" height="12" rx="8"></rect>
            </clipPath>
          </defs>
          </svg>
        </div>
      </div>
      ${renderFooter(input)}
    </div>
  `;
    // clang-format on
}
function renderError(input) {
    // clang-format off
    return html `
    <div class="teaser-tooltip-container">
      <h2>${lockedString(UIStringsNotTranslate.summaryNotAvailable)}</h2>
      ${renderFooter(input)}
    </div>
  `;
    // clang-format on
}
function renderDontShowCheckbox(input) {
    // clang-format off
    return html `
    <devtools-checkbox
      aria-label=${lockedString(UIStringsNotTranslate.dontShow)}
      @change=${input.dontShowChanged}
      jslog=${VisualLogging.toggle('explain.teaser.dont-show').track({ change: true })}>
      ${lockedString(UIStringsNotTranslate.dontShow)}
    </devtools-checkbox>
  `;
    // clang-format on
}
function renderFooter(input) {
    // clang-format off
    return html `
    <div class="tooltip-footer">
      ${input.hasTellMeMoreButton ? html `
        <devtools-button
          title=${lockedString(UIStringsNotTranslate.tellMeMore)}
          .jslogContext=${'insights-teaser-tell-me-more'}
          .variant=${"primary" /* Buttons.Button.Variant.PRIMARY */}
          @click=${input.onTellMeMoreClick}
        >
          <devtools-icon class="lightbulb-icon" name="lightbulb-spark"></devtools-icon>
          ${lockedString(UIStringsNotTranslate.tellMeMore)}
        </devtools-button>
      ` : Lit.nothing}
      <devtools-button
        .iconName=${'info'}
        .variant=${"icon" /* Buttons.Button.Variant.ICON */}
        aria-details=${'teaser-info-tooltip-' + input.uuid}
        .accessibleLabel=${lockedString(UIStringsNotTranslate.learnDataUsage)}
      ></devtools-button>
      <devtools-tooltip
        id=${'teaser-info-tooltip-' + input.uuid}
        variant="rich"
        jslogContext="teaser-info-tooltip"
        trigger="both"
        hover-delay=500
      >
        <div class="info-tooltip-text">${lockedString(UIStringsNotTranslate.infoTooltipText)}</div>
        <div class="learn-more">
          <x-link
            class="devtools-link"
            title=${lockedString(UIStringsNotTranslate.learnMoreAboutAiSummaries)}
            href=${DATA_USAGE_URL}
            jslog=${VisualLogging.link().track({ click: true, keydown: 'Enter|Space' }).context('explain.teaser.learn-more')}
          >${lockedString(UIStringsNotTranslate.learnMoreAboutAiSummaries)}</x-link>
        </div>
      </devtools-tooltip>
      ${renderDontShowCheckbox(input)}
    </div>
  `;
    // clang-format on
}
function renderTeaser(input) {
    // clang-format off
    return html `
    <div class="teaser-tooltip-container">
      <div class="response-container">
        <h2>${input.headerText}</h2>
        <div class="main-text">${input.mainText}</div>
      </div>
      ${renderFooter(input)}
    </div>
  `;
    // clang-format on
}
export const DEFAULT_VIEW = (input, _output, target) => {
    if (input.isInactive) {
        render(Lit.nothing, target);
        return;
    }
    // clang-format off
    render(html `
    <style>${consoleInsightTeaserStyles}</style>
    <devtools-tooltip
      id=${'teaser-' + input.uuid}
      hover-delay=500
      variant="rich"
      vertical-distance-increase=-6
      prefer-span-left
      jslogContext="console-insight-teaser"
    >
      ${(() => {
        switch (input.state) {
            case "ready" /* State.READY */:
            case "generating" /* State.GENERATING */:
                return renderGenerating(input);
            case "error" /* State.ERROR */:
                return renderError(input);
            case "partial-teaser" /* State.PARTIAL_TEASER */:
            case "teaser" /* State.TEASER */:
                return renderTeaser(input);
        }
    })()}
    </devtools-tooltip>
  `, target);
    // clang-format on
};
export class ConsoleInsightTeaser extends UI.Widget.Widget {
    #view;
    #uuid;
    #builtInAi;
    #promptBuilder;
    #headerText = '';
    #mainText = '';
    #consoleViewMessage;
    #isInactive = false;
    #abortController = null;
    #isSlow = false;
    #timeoutId = null;
    #aidaAvailability;
    #boundOnAidaAvailabilityChange;
    #state;
    constructor(uuid, consoleViewMessage, element, view) {
        super(element);
        this.#view = view ?? DEFAULT_VIEW;
        this.#uuid = uuid;
        this.#promptBuilder = new PromptBuilder(consoleViewMessage);
        this.#consoleViewMessage = consoleViewMessage;
        this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
        this.#builtInAi = AiAssistanceModel.BuiltInAi.BuiltInAi.instance();
        this.#state = "ready" /* State.READY */;
        this.requestUpdate();
    }
    #getConsoleInsightsEnabledSetting() {
        try {
            return Common.Settings.moduleSetting('console-insights-enabled');
        }
        catch {
            return;
        }
    }
    #getOnboardingCompletedSetting() {
        return Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', true);
    }
    async #onAidaAvailabilityChange() {
        const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== this.#aidaAvailability) {
            this.#aidaAvailability = currentAidaAvailability;
            this.requestUpdate();
        }
    }
    #executeConsoleInsightAction() {
        UI.Context.Context.instance().setFlavor(ConsoleViewMessage, this.#consoleViewMessage);
        const action = UI.ActionRegistry.ActionRegistry.instance().getAction(EXPLAIN_TEASER_ACTION_ID);
        void action.execute();
    }
    #onTellMeMoreClick(event) {
        event.stopPropagation();
        if (this.#getConsoleInsightsEnabledSetting()?.getIfNotDisabled() &&
            this.#getOnboardingCompletedSetting()?.getIfNotDisabled()) {
            this.#executeConsoleInsightAction();
            return;
        }
        void this.#showFreDialog();
    }
    async #showFreDialog() {
        const noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
            Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
        const result = await PanelCommon.FreDialog.show({
            header: { iconName: 'smart-assistant', text: lockedString(UIStringsNotTranslate.freDisclaimerHeader) },
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
                    content: html `<x-link
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
    maybeGenerateTeaser() {
        switch (this.#state) {
            case "ready" /* State.READY */:
                if (!this.#isInactive &&
                    Common.Settings.Settings.instance().moduleSetting('console-insight-teasers-enabled').get()) {
                    void this.#generateTeaserText();
                }
                this.requestUpdate();
                return;
            case "generating" /* State.GENERATING */:
                console.error('Trying trigger teaser generation when state is "GENERATING"');
                return;
            case "partial-teaser" /* State.PARTIAL_TEASER */:
                console.error('Trying trigger teaser generation when state is "PARTIAL_TEASER"');
                return;
            // These are terminal states. No need to update anything.
            case "teaser" /* State.TEASER */:
            case "error" /* State.ERROR */:
                return;
        }
    }
    abortTeaserGeneration() {
        if (this.#abortController) {
            this.#abortController.abort();
        }
        if (this.#state === "generating" /* State.GENERATING */ || this.#state === "partial-teaser" /* State.PARTIAL_TEASER */) {
            this.#mainText = '';
            this.#state = "ready" /* State.READY */;
            Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightTeaserGenerationAborted);
        }
        if (this.#timeoutId) {
            clearTimeout(this.#timeoutId);
        }
    }
    setInactive(isInactive) {
        if (this.#isInactive === isInactive) {
            return;
        }
        this.#isInactive = isInactive;
        this.requestUpdate();
    }
    #setSlow() {
        this.#isSlow = true;
        this.requestUpdate();
    }
    async #generateTeaserText() {
        this.#headerText = this.#consoleViewMessage.toMessageTextString().substring(0, 70);
        this.#state = "generating" /* State.GENERATING */;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightTeaserGenerationStarted);
        this.#timeoutId = setTimeout(this.#setSlow.bind(this), SLOW_GENERATION_CUTOFF_MILLISECONDS);
        const startTime = performance.now();
        let teaserText = '';
        let firstChunkReceived = false;
        try {
            for await (const chunk of this.#getOnDeviceInsight()) {
                teaserText += chunk;
                this.#mainText = teaserText;
                this.#state = "partial-teaser" /* State.PARTIAL_TEASER */;
                this.requestUpdate();
                if (!firstChunkReceived) {
                    firstChunkReceived = true;
                    Host.userMetrics.consoleInsightTeaserFirstChunkGenerated(performance.now() - startTime);
                }
            }
        }
        catch (err) {
            // Ignore `AbortError` errors, which are thrown on mouse leave.
            if (err.name === 'AbortError') {
                this.#state = "ready" /* State.READY */;
            }
            else {
                console.error(err.name, err.message);
                this.#state = "error" /* State.ERROR */;
                Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightTeaserGenerationErrored);
            }
            clearTimeout(this.#timeoutId);
            this.requestUpdate();
            return;
        }
        clearTimeout(this.#timeoutId);
        Host.userMetrics.consoleInsightTeaserGenerated(performance.now() - startTime);
        this.#state = "teaser" /* State.TEASER */;
        this.#mainText = teaserText;
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.InsightTeaserGenerationCompleted);
        this.requestUpdate();
    }
    async *#getOnDeviceInsight() {
        const { prompt } = await this.#promptBuilder.buildPrompt();
        this.#abortController = new AbortController();
        const stream = this.#builtInAi.getConsoleInsight(prompt, this.#abortController);
        for await (const chunk of stream) {
            yield chunk;
        }
        this.#abortController = null;
    }
    #dontShowChanged(e) {
        const showTeasers = !e.target.checked;
        Common.Settings.Settings.instance().moduleSetting('console-insight-teasers-enabled').set(showTeasers);
    }
    #hasTellMeMoreButton() {
        if (!UI.ActionRegistry.ActionRegistry.instance().hasAction(EXPLAIN_TEASER_ACTION_ID)) {
            return false;
        }
        if (Root.Runtime.hostConfig.aidaAvailability?.blockedByAge || Root.Runtime.hostConfig.isOffTheRecord) {
            return false;
        }
        if (this.#aidaAvailability !== "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */) {
            return false;
        }
        return true;
    }
    performUpdate() {
        this.#view({
            onTellMeMoreClick: this.#onTellMeMoreClick.bind(this),
            uuid: this.#uuid,
            headerText: this.#headerText,
            mainText: this.#mainText,
            isInactive: this.#isInactive ||
                !Common.Settings.Settings.instance().moduleSetting('console-insight-teasers-enabled').get(),
            dontShowChanged: this.#dontShowChanged.bind(this),
            hasTellMeMoreButton: this.#hasTellMeMoreButton(),
            isSlowGeneration: this.#isSlow,
            state: this.#state,
        }, undefined, this.contentElement);
    }
    wasShown() {
        super.wasShown();
        Host.AidaClient.HostConfigTracker.instance().addEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnAidaAvailabilityChange);
        void this.#onAidaAvailabilityChange();
    }
    willHide() {
        super.willHide();
        Host.AidaClient.HostConfigTracker.instance().removeEventListener("aidaAvailabilityChanged" /* Host.AidaClient.Events.AIDA_AVAILABILITY_CHANGED */, this.#boundOnAidaAvailabilityChange);
    }
}
//# sourceMappingURL=ConsoleInsightTeaser.js.map