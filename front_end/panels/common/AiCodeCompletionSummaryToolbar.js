// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/components/spinners/spinners.js';
import '../../ui/components/tooltips/tooltips.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { AiCodeCompletionDisclaimer } from './AiCodeCompletionDisclaimer.js';
import styles from './aiCodeCompletionSummaryToolbar.css.js';
const UIStringsNotTranslate = {
    /**
     * @description Text for recitation notice
     */
    generatedCodeMayBeSubjectToALicense: 'Generated code may be subject to a license.',
    /**
     * @description Text for citations
     */
    viewSources: 'View Sources',
};
const lockedString = i18n.i18n.lockedString;
export const DEFAULT_SUMMARY_TOOLBAR_VIEW = (input, _output, target) => {
    if (input.aidaAvailability !== "available" /* Host.AidaClient.AidaAccessPreconditions.AVAILABLE */) {
        render(nothing, target);
        return;
    }
    const toolbarClasses = Directives.classMap({
        'ai-code-completion-summary-toolbar': true,
        'has-disclaimer': Boolean(input.disclaimerTooltipId),
        'has-recitation-notice': Boolean(input.citations && input.citations.size > 0),
        'has-top-border': input.hasTopBorder,
    });
    // clang-format off
    const disclaimer = input.disclaimerTooltipId && input.spinnerTooltipId ?
        html `<devtools-widget
            .widgetConfig=${UI.Widget.widgetConfig(AiCodeCompletionDisclaimer, {
            disclaimerTooltipId: input.disclaimerTooltipId,
            spinnerTooltipId: input.spinnerTooltipId,
            loading: input.loading,
        })} class="disclaimer-widget"></devtools-widget>` : nothing;
    const recitationNotice = input.citations && input.citations.size > 0 ?
        html `<div class="ai-code-completion-recitation-notice">
                ${lockedString(UIStringsNotTranslate.generatedCodeMayBeSubjectToALicense)}
                <span class="link"
                    role="link"
                    aria-details=${input.citationsTooltipId}
                    aria-describedby=${input.citationsTooltipId}
                    tabIndex="0">
                  ${lockedString(UIStringsNotTranslate.viewSources)}&nbsp;${lockedString('(' + input.citations.size + ')')}
                </span>
                <devtools-tooltip
                    id=${input.citationsTooltipId}
                    variant="rich"
                    jslogContext="ai-code-completion-citations"
                ><div class="citations-tooltip-container">
                    ${Directives.repeat(input.citations, citation => html `<x-link
                        tabIndex="0"
                        href=${citation}
                        jslog=${VisualLogging.link('ai-code-completion-citations.citation-link').track({
            click: true
        })}>${citation}</x-link>`)}</div></devtools-tooltip>
            </div>` : nothing;
    render(html `
        <style>${styles}</style>
        <div class=${toolbarClasses}>
          ${disclaimer}
          ${recitationNotice}
        </div>
        `, target);
    // clang-format on
};
export class AiCodeCompletionSummaryToolbar extends UI.Widget.Widget {
    #view;
    #disclaimerTooltipId;
    #spinnerTooltipId;
    #citationsTooltipId;
    #citations = new Set();
    #loading = false;
    #hasTopBorder = false;
    #aidaAvailability;
    #boundOnAidaAvailabilityChange;
    constructor(props, view) {
        super();
        this.#disclaimerTooltipId = props.disclaimerTooltipId;
        this.#spinnerTooltipId = props.spinnerTooltipId;
        this.#citationsTooltipId = props.citationsTooltipId;
        this.#hasTopBorder = props.hasTopBorder ?? false;
        this.#boundOnAidaAvailabilityChange = this.#onAidaAvailabilityChange.bind(this);
        this.#view = view ?? DEFAULT_SUMMARY_TOOLBAR_VIEW;
        this.requestUpdate();
    }
    async #onAidaAvailabilityChange() {
        const currentAidaAvailability = await Host.AidaClient.AidaClient.checkAccessPreconditions();
        if (currentAidaAvailability !== this.#aidaAvailability) {
            this.#aidaAvailability = currentAidaAvailability;
            this.requestUpdate();
        }
    }
    setLoading(loading) {
        this.#loading = loading;
        this.requestUpdate();
    }
    updateCitations(citations) {
        citations.forEach(citation => this.#citations.add(citation));
        this.requestUpdate();
    }
    clearCitations() {
        this.#citations.clear();
        this.requestUpdate();
    }
    performUpdate() {
        this.#view({
            disclaimerTooltipId: this.#disclaimerTooltipId,
            spinnerTooltipId: this.#spinnerTooltipId,
            citations: this.#citations,
            citationsTooltipId: this.#citationsTooltipId,
            loading: this.#loading,
            hasTopBorder: this.#hasTopBorder,
            aidaAvailability: this.#aidaAvailability,
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
//# sourceMappingURL=AiCodeCompletionSummaryToolbar.js.map