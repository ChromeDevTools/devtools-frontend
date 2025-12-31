// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as AiCodeCompletion from '../../models/ai_code_completion/ai_code_completion.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import styles from './aiCodeCompletionDisclaimer.css.js';
const UIStringsNotTranslate = {
    /**
     * @description Disclaimer text for AI code completion
     */
    relevantData: 'Relevant data',
    /**
     * @description Disclaimer text for AI code completion
     */
    isSentToGoogle: 'is sent to Google',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
     */
    tooltipDisclaimerTextForAiCodeCompletionInConsole: 'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code completion.
     */
    tooltipDisclaimerTextForAiCodeCompletionNoLoggingInConsole: 'To generate code suggestions, your console input and the history of your current console session are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Sources panel.
     */
    tooltipDisclaimerTextForAiCodeCompletionInSources: 'To generate code suggestions, the contents of the currently open file are shared with Google. This data may be seen by human reviewers to improve this feature.',
    /**
     * @description Text for tooltip shown on hovering over "Relevant Data" in the disclaimer text for AI code generation in Sources panel.
     */
    tooltipDisclaimerTextForAiCodeCompletionNoLoggingInSources: 'To generate code suggestions, the contents of the currently open file are shared with Google. This data will not be used to improve Google’s AI models. Your organization may change these settings at any time.',
    /**
     * Text for tooltip shown on hovering over spinner.
     */
    tooltipTextForSpinner: 'Shows when data is being sent to Google to generate code suggestions',
    /**
     * @description Text for tooltip button which redirects to AI settings
     */
    manageInSettings: 'Manage in settings',
    /**
     *@description Text announced when request is sent to AIDA and the spinner is loading
     */
    dataIsBeingSentToGoogle: 'Data is being sent to Google',
};
const lockedString = i18n.i18n.lockedString;
function getTooltipDisclaimerText(noLogging, panel) {
    switch (panel) {
        case "console" /* AiCodeCompletion.AiCodeCompletion.ContextFlavor.CONSOLE */:
            return noLogging ?
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeCompletionNoLoggingInConsole) :
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeCompletionInConsole);
        case "sources" /* AiCodeCompletion.AiCodeCompletion.ContextFlavor.SOURCES */:
            return noLogging ?
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeCompletionNoLoggingInSources) :
                lockedString(UIStringsNotTranslate.tooltipDisclaimerTextForAiCodeCompletionInSources);
    }
}
export const DEFAULT_SUMMARY_TOOLBAR_VIEW = (input, output, target) => {
    if (input.aidaAvailability !== "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */ || !input.disclaimerTooltipId ||
        !input.spinnerTooltipId || !input.panel) {
        render(nothing, target);
        return;
    }
    const tooltipDisclaimerText = getTooltipDisclaimerText(input.noLogging, input.panel);
    // clang-format off
    render(html `
        <style>${styles}</style>
        <div class="ai-code-completion-disclaimer"><devtools-spinner
          .active=${false}
          ${Directives.ref(el => {
        if (el instanceof HTMLElement) {
            output.setLoading = (isLoading) => {
                el.toggleAttribute('active', isLoading);
            };
        }
    })}
          aria-details=${input.spinnerTooltipId}
          aria-describedby=${input.spinnerTooltipId}></devtools-spinner>
          <devtools-tooltip
              id=${input.spinnerTooltipId}
              variant="rich"
              jslogContext="ai-code-completion-spinner-tooltip">
          <div class="disclaimer-tooltip-container"><div class="tooltip-text">
            ${lockedString(UIStringsNotTranslate.tooltipTextForSpinner)}
          </div></div></devtools-tooltip>
          <span
              tabIndex="0"
              class="link"
              role="link"
              jslog=${VisualLogging.link('open-ai-settings').track({
        click: true,
    })}
              aria-details=${input.disclaimerTooltipId}
              aria-describedby=${input.disclaimerTooltipId}
              @click=${() => {
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }}
          >${lockedString(UIStringsNotTranslate.relevantData)}</span>${lockedString(UIStringsNotTranslate.isSentToGoogle)}
          <devtools-tooltip
              id=${input.disclaimerTooltipId}
              variant="rich"
              jslogContext="ai-code-completion-disclaimer"
              ${Directives.ref(el => {
        if (el instanceof HTMLElement) {
            output.hideTooltip = () => {
                el.hidePopover();
            };
        }
    })}>
            <div class="disclaimer-tooltip-container"><div class="tooltip-text">
                ${tooltipDisclaimerText}
                </div>
                <span
                    tabIndex="0"
                    class="link"
                    role="link"
                    jslog=${VisualLogging.link('open-ai-settings').track({
        click: true,
    })}
                    @click=${input.onManageInSettingsTooltipClick}
                >${lockedString(UIStringsNotTranslate.manageInSettings)}</span></div></devtools-tooltip>
          </div>
        `, target);
    // clang-format on
};
const MINIMUM_LOADING_STATE_TIMEOUT = 1000;
export class AiCodeCompletionDisclaimer extends UI.Widget.Widget {
    #view;
    #viewOutput = {};
    #spinnerTooltipId;
    #disclaimerTooltipId;
    #noLogging; // Whether the enterprise setting is `ALLOW_WITHOUT_LOGGING` or not.
    #loading = false;
    #loadingStartTime = 0;
    #spinnerLoadingTimeout;
    #panel;
    #aidaAvailability;
    #boundOnAidaAvailabilityChange;
    constructor(element, view = DEFAULT_SUMMARY_TOOLBAR_VIEW) {
        super(element);
        this.markAsExternallyManaged();
        this.#noLogging = Root.Runtime.hostConfig.aidaAvailability?.enterprisePolicyValue ===
            Root.Runtime.GenAiEnterprisePolicyValue.ALLOW_WITHOUT_LOGGING;
        this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
        this.#view = view;
    }
    set disclaimerTooltipId(disclaimerTooltipId) {
        this.#disclaimerTooltipId = disclaimerTooltipId;
        this.requestUpdate();
    }
    set spinnerTooltipId(spinnerTooltipId) {
        this.#spinnerTooltipId = spinnerTooltipId;
        this.requestUpdate();
    }
    set loading(loading) {
        if (!loading && !this.#loading) {
            return;
        }
        if (loading) {
            if (!this.#loading) {
                this.#viewOutput.setLoading?.(true);
                UI.ARIAUtils.LiveAnnouncer.status(lockedString(UIStringsNotTranslate.dataIsBeingSentToGoogle));
            }
            if (this.#spinnerLoadingTimeout) {
                clearTimeout(this.#spinnerLoadingTimeout);
                this.#spinnerLoadingTimeout = undefined;
            }
            this.#loadingStartTime = performance.now();
            this.#loading = true;
        }
        else {
            this.#loading = false;
            const duration = performance.now() - this.#loadingStartTime;
            const remainingTime = Math.max(MINIMUM_LOADING_STATE_TIMEOUT - duration, 0);
            this.#spinnerLoadingTimeout = window.setTimeout(() => {
                this.#viewOutput.setLoading?.(false);
                this.#spinnerLoadingTimeout = undefined;
            }, remainingTime);
        }
    }
    set panel(panel) {
        this.#panel = panel;
        this.requestUpdate();
    }
    async #onAidaAvailabilityChange() {
        const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== this.#aidaAvailability) {
            this.#aidaAvailability = currentAidaAvailability;
            this.requestUpdate();
        }
    }
    #onManageInSettingsTooltipClick() {
        this.#viewOutput.hideTooltip?.();
        void UI.ViewManager.ViewManager.instance().showView('chrome-ai');
    }
    performUpdate() {
        this.#view({
            disclaimerTooltipId: this.#disclaimerTooltipId,
            spinnerTooltipId: this.#spinnerTooltipId,
            noLogging: this.#noLogging,
            aidaAvailability: this.#aidaAvailability,
            onManageInSettingsTooltipClick: this.#onManageInSettingsTooltipClick.bind(this),
            panel: this.#panel,
        }, this.#viewOutput, this.contentElement);
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
//# sourceMappingURL=AiCodeCompletionDisclaimer.js.map