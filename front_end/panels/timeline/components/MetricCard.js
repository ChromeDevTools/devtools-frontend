// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import metricCardStyles from './metricCard.css.js';
import { renderCompareText, renderDetailedCompareText } from './MetricCompareStrings.js';
import metricValueStyles from './metricValueStyles.css.js';
import { CLS_THRESHOLDS, determineCompareRating, INP_THRESHOLDS, LCP_THRESHOLDS, rateMetric, renderMetricValue, } from './Utils.js';
const { html, nothing } = Lit;
const UIStrings = {
    /**
     * @description Label for a metric value that was measured in the local environment.
     */
    localValue: 'Local',
    /**
     * @description Label for the 75th percentile of a metric according to data collected from real users in the field. This should be interpreted as "75th percentile of real users".
     */
    field75thPercentile: 'Field 75th percentile',
    /**
     * @description Column header for the 75th percentile of a metric according to data collected from real users in the field. This should be interpreted as "75th percentile of real users". Width of the column is limited so character length should be as small as possible.
     */
    fieldP75: 'Field p75',
    /**
     * @description Text label for values that are classified as "good".
     */
    good: 'Good',
    /**
     * @description Text label for values that are classified as "needs improvement".
     */
    needsImprovement: 'Needs improvement',
    /**
     * @description Text label for values that are classified as "poor".
     */
    poor: 'Poor',
    /**
     * @description Text label for a range of values that are less than or equal to a certain value.
     * @example {500 ms} PH1
     */
    leqRange: '(≤{PH1})',
    /**
     * @description Text label for a range of values that are between two values.
     * @example {500 ms} PH1
     * @example {800 ms} PH2
     */
    betweenRange: '({PH1}-{PH2})',
    /**
     * @description Text label for a range of values that are greater than a certain value.
     * @example {500 ms} PH1
     */
    gtRange: '(>{PH1})',
    /**
     * @description Text for a percentage value in the live metrics view.
     * @example {13} PH1
     */
    percentage: '{PH1}%',
    /**
     * @description Text instructing the user to interact with the page because a user interaction is required to measure Interaction to Next Paint (INP).
     */
    interactToMeasure: 'Interact with the page to measure INP.',
    /**
     * @description Label for a tooltip that provides more details.
     */
    viewCardDetails: 'View card details',
    /**
     * @description Text block recommending a site developer look at their test environment followed by bullet points that highlight specific things about the test environment. "local" refers to the testing setup of the developer as opposed to the conditions experienced by real users.
     */
    considerTesting: 'Consider your local test conditions',
    /**
     * @description Text block explaining how network conditions can slow down the page load. "network throttling" refers to artificially slowing down the network to simulate slower network conditions.
     */
    recThrottlingLCP: 'Real users may experience longer page loads due to slower network conditions. Increasing network throttling will simulate slower network conditions.',
    /**
     * @description Text block explaining how CPU speed affects how long it takes the page to render after an interaction. "CPU throttling" refers to artificially slowing down the CPU to simulate slower devices.
     */
    recThrottlingINP: 'Real users may experience longer interactions due to slower CPU speeds. Increasing CPU throttling will simulate a slower device.',
    /**
     * @description Text block explaining how screen size can affect what content is rendered and therefore affects the LCP performance metric. "viewport" and "screen size" are synonymous in this case. "LCP element" refers to the page element that was the largest content on the page.
     */
    recViewportLCP: 'Screen size can influence what the LCP element is. Ensure you are testing common viewport sizes.',
    /**
     * @description Text block explaining viewport size can affect layout shifts. "viewport" and "screen size" are synonymous in this case. "layout shifts" refer to page instability where content moving around can create a jarring experience.
     */
    recViewportCLS: 'Screen size can influence what layout shifts happen. Ensure you are testing common viewport sizes.',
    /**
     * @description Text block explaining how a user interacts with the page can cause different amounts of layout shifts. "layout shifts" refer to page instability where content moving around can create a jarring experience.
     */
    recJourneyCLS: 'How a user interacts with the page can influence layout shifts. Ensure you are testing common interactions like scrolling the page.',
    /**
     * @description Text block explaining how a user interacts with the page can affect interaction delays. "interaction delay" refers to the delay between an interaction and the page rendering new content.
     */
    recJourneyINP: 'How a user interacts with the page influences interaction delays. Ensure you are testing common interactions.',
    /**
     * @description Text block explaining how dynamic content can affect LCP. "LCP" is a performance metric measuring when the largest content was rendered on the page. "LCP element" refers to the page element that was the largest content on the page.
     */
    recDynamicContentLCP: 'The LCP element can vary between page loads if content is dynamic.',
    /**
     * @description Text block explaining how dynamic content can affect layout shifts. "layout shifts" refer to page instability where content moving around can create a jarring experience.
     */
    recDynamicContentCLS: 'Dynamic content can influence what layout shifts happen.',
    /**
     * @description Column header for table cell values representing the phase/component/stage/section of a larger duration.
     */
    phase: 'Phase',
    /**
     * @description Tooltip text for a link that goes to documentation explaining the Largest Contentful Paint (LCP) metric. "LCP" is an acronym and should not be translated.
     */
    lcpHelpTooltip: 'LCP reports the render time of the largest image, text block, or video visible in the viewport. Click here to learn more about LCP.',
    /**
     * @description Tooltip text for a link that goes to documentation explaining the Cumulative Layout Shift (CLS) metric. "CLS" is an acronym and should not be translated.
     */
    clsHelpTooltip: 'CLS measures the amount of unexpected shifted content. Click here to learn more about CLS.',
    /**
     * @description Tooltip text for a link that goes to documentation explaining the Interaction to Next Paint (INP) metric. "INP" is an acronym and should not be translated.
     */
    inpHelpTooltip: 'INP measures the overall responsiveness to all click, tap, and keyboard interactions. Click here to learn more about INP.',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/MetricCard.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class MetricCard extends HTMLElement {
    #shadow = this.attachShadow({ mode: 'open' });
    constructor() {
        super();
        this.#render();
    }
    #tooltipEl;
    #data = {
        metric: 'LCP',
    };
    set data(data) {
        this.#data = data;
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    connectedCallback() {
        void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
    }
    #hideTooltipOnEsc = (event) => {
        if (Platform.KeyboardUtilities.isEscKey(event)) {
            event.stopPropagation();
            this.#hideTooltip();
        }
    };
    #hideTooltipOnMouseLeave(event) {
        const target = event.target;
        if (target?.hasFocus()) {
            return;
        }
        this.#hideTooltip();
    }
    #hideTooltipOnFocusOut(event) {
        const target = event.target;
        if (target?.hasFocus()) {
            return;
        }
        const relatedTarget = event.relatedTarget;
        if (relatedTarget instanceof Node && target.contains(relatedTarget)) {
            // `focusout` bubbles so we should get another event once focus leaves `relatedTarget`
            return;
        }
        this.#hideTooltip();
    }
    #hideTooltip() {
        const tooltipEl = this.#tooltipEl;
        if (!tooltipEl) {
            return;
        }
        document.body.removeEventListener('keydown', this.#hideTooltipOnEsc);
        tooltipEl.style.removeProperty('left');
        tooltipEl.style.removeProperty('visibility');
        tooltipEl.style.removeProperty('display');
        tooltipEl.style.removeProperty('transition-delay');
    }
    #showTooltip(delayMs = 0) {
        const tooltipEl = this.#tooltipEl;
        if (!tooltipEl || tooltipEl.style.visibility || tooltipEl.style.display) {
            return;
        }
        document.body.addEventListener('keydown', this.#hideTooltipOnEsc);
        tooltipEl.style.display = 'block';
        tooltipEl.style.transitionDelay = `${Math.round(delayMs)}ms`;
        const container = this.#data.tooltipContainer;
        if (!container) {
            return;
        }
        const containerBox = container.getBoundingClientRect();
        tooltipEl.style.setProperty('--tooltip-container-width', `${Math.round(containerBox.width)}px`);
        requestAnimationFrame(() => {
            let offset = 0;
            const tooltipBox = tooltipEl.getBoundingClientRect();
            const rightDiff = tooltipBox.right - containerBox.right;
            const leftDiff = tooltipBox.left - containerBox.left;
            if (leftDiff < 0) {
                offset = Math.round(leftDiff);
            }
            else if (rightDiff > 0) {
                offset = Math.round(rightDiff);
            }
            tooltipEl.style.left = `calc(50% - ${offset}px)`;
            tooltipEl.style.visibility = 'visible';
        });
    }
    #getTitle() {
        switch (this.#data.metric) {
            case 'LCP':
                return i18n.i18n.lockedString('Largest Contentful Paint (LCP)');
            case 'CLS':
                return i18n.i18n.lockedString('Cumulative Layout Shift (CLS)');
            case 'INP':
                return i18n.i18n.lockedString('Interaction to Next Paint (INP)');
        }
    }
    #getThresholds() {
        switch (this.#data.metric) {
            case 'LCP':
                return LCP_THRESHOLDS;
            case 'CLS':
                return CLS_THRESHOLDS;
            case 'INP':
                return INP_THRESHOLDS;
        }
    }
    #getFormatFn() {
        switch (this.#data.metric) {
            case 'LCP':
                return v => {
                    const micro = (v * 1000);
                    return i18n.TimeUtilities.formatMicroSecondsAsSeconds(micro);
                };
            case 'CLS':
                return v => v === 0 ? '0' : v.toFixed(2);
            case 'INP':
                return v => i18n.TimeUtilities.preciseMillisToString(v);
        }
    }
    #getHelpLink() {
        switch (this.#data.metric) {
            case 'LCP':
                return 'https://web.dev/articles/lcp';
            case 'CLS':
                return 'https://web.dev/articles/cls';
            case 'INP':
                return 'https://web.dev/articles/inp';
        }
    }
    #getHelpTooltip() {
        switch (this.#data.metric) {
            case 'LCP':
                return i18nString(UIStrings.lcpHelpTooltip);
            case 'CLS':
                return i18nString(UIStrings.clsHelpTooltip);
            case 'INP':
                return i18nString(UIStrings.inpHelpTooltip);
        }
    }
    #getLocalValue() {
        const { localValue } = this.#data;
        if (localValue === undefined) {
            return;
        }
        return localValue;
    }
    #getFieldValue() {
        let { fieldValue } = this.#data;
        if (fieldValue === undefined) {
            return;
        }
        if (typeof fieldValue === 'string') {
            fieldValue = Number(fieldValue);
        }
        if (!Number.isFinite(fieldValue)) {
            return;
        }
        return fieldValue;
    }
    /**
     * Returns if the local value is better/worse/similar compared to field.
     */
    #getCompareRating() {
        const localValue = this.#getLocalValue();
        const fieldValue = this.#getFieldValue();
        if (localValue === undefined || fieldValue === undefined) {
            return;
        }
        return determineCompareRating(this.#data.metric, localValue, fieldValue);
    }
    #renderCompareString() {
        const localValue = this.#getLocalValue();
        if (localValue === undefined) {
            if (this.#data.metric === 'INP') {
                return html `
          <div class="compare-text">${i18nString(UIStrings.interactToMeasure)}</div>
        `;
            }
            return Lit.nothing;
        }
        const compare = this.#getCompareRating();
        const rating = rateMetric(localValue, this.#getThresholds());
        const valueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, this.#getThresholds(), this.#getFormatFn(), { dim: true });
        // clang-format off
        return html `
      <div class="compare-text">
        ${renderCompareText({
            metric: i18n.i18n.lockedString(this.#data.metric),
            rating,
            compare,
            localValue: valueEl,
        })}
      </div>
    `;
        // clang-format on
    }
    #renderEnvironmentRecommendations() {
        const compare = this.#getCompareRating();
        if (!compare || compare === 'similar') {
            return Lit.nothing;
        }
        const recs = [];
        const metric = this.#data.metric;
        // Recommend using throttling
        if (metric === 'LCP' && compare === 'better') {
            recs.push(i18nString(UIStrings.recThrottlingLCP));
        }
        else if (metric === 'INP' && compare === 'better') {
            recs.push(i18nString(UIStrings.recThrottlingINP));
        }
        // Recommend trying new viewport sizes
        if (metric === 'LCP') {
            recs.push(i18nString(UIStrings.recViewportLCP));
        }
        else if (metric === 'CLS') {
            recs.push(i18nString(UIStrings.recViewportCLS));
        }
        // Recommend trying new user journeys
        if (metric === 'CLS') {
            recs.push(i18nString(UIStrings.recJourneyCLS));
        }
        else if (metric === 'INP') {
            recs.push(i18nString(UIStrings.recJourneyINP));
        }
        // Recommend accounting for dynamic content
        if (metric === 'LCP') {
            recs.push(i18nString(UIStrings.recDynamicContentLCP));
        }
        else if (metric === 'CLS') {
            recs.push(i18nString(UIStrings.recDynamicContentCLS));
        }
        if (!recs.length) {
            return Lit.nothing;
        }
        return html `
      <details class="environment-recs">
        <summary>${i18nString(UIStrings.considerTesting)}</summary>
        <ul class="environment-recs-list">${recs.map(rec => html `<li>${rec}</li>`)}</ul>
      </details>
    `;
    }
    #getMetricValueLogContext(isLocal) {
        return `timeline.landing.${isLocal ? 'local' : 'field'}-${this.#data.metric.toLowerCase()}`;
    }
    #renderDetailedCompareString() {
        const localValue = this.#getLocalValue();
        if (localValue === undefined) {
            if (this.#data.metric === 'INP') {
                return html `
          <div class="detailed-compare-text">${i18nString(UIStrings.interactToMeasure)}</div>
        `;
            }
            return Lit.nothing;
        }
        const localRating = rateMetric(localValue, this.#getThresholds());
        const fieldValue = this.#getFieldValue();
        const fieldRating = fieldValue !== undefined ? rateMetric(fieldValue, this.#getThresholds()) : undefined;
        const localValueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, this.#getThresholds(), this.#getFormatFn(), { dim: true });
        const fieldValueEl = renderMetricValue(this.#getMetricValueLogContext(false), fieldValue, this.#getThresholds(), this.#getFormatFn(), { dim: true });
        // clang-format off
        return html `
      <div class="detailed-compare-text">${renderDetailedCompareText({
            metric: i18n.i18n.lockedString(this.#data.metric),
            localRating,
            fieldRating,
            localValue: localValueEl,
            fieldValue: fieldValueEl,
            percent: this.#getPercentLabelForRating(localRating),
        })}</div>
    `;
        // clang-format on
    }
    #bucketIndexForRating(rating) {
        switch (rating) {
            case 'good':
                return 0;
            case 'needs-improvement':
                return 1;
            case 'poor':
                return 2;
        }
    }
    #getBarWidthForRating(rating) {
        const histogram = this.#data.histogram;
        const density = histogram?.[this.#bucketIndexForRating(rating)].density || 0;
        const percent = Math.round(density * 100);
        return `${percent}%`;
    }
    #getPercentLabelForRating(rating) {
        const histogram = this.#data.histogram;
        if (histogram === undefined) {
            return '-';
        }
        // A missing density value should be interpreted as 0%
        const density = histogram[this.#bucketIndexForRating(rating)].density || 0;
        const percent = Math.round(density * 100);
        return i18nString(UIStrings.percentage, { PH1: percent });
    }
    #renderFieldHistogram() {
        const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;
        const format = this.#getFormatFn();
        const thresholds = this.#getThresholds();
        // clang-format off
        const goodLabel = html `
      <div class="bucket-label">
        <span>${i18nString(UIStrings.good)}</span>
        <span class="bucket-range"> ${i18nString(UIStrings.leqRange, { PH1: format(thresholds[0]) })}</span>
      </div>
    `;
        const needsImprovementLabel = html `
      <div class="bucket-label">
        <span>${i18nString(UIStrings.needsImprovement)}</span>
        <span class="bucket-range"> ${i18nString(UIStrings.betweenRange, { PH1: format(thresholds[0]), PH2: format(thresholds[1]) })}</span>
      </div>
    `;
        const poorLabel = html `
      <div class="bucket-label">
        <span>${i18nString(UIStrings.poor)}</span>
        <span class="bucket-range"> ${i18nString(UIStrings.gtRange, { PH1: format(thresholds[1]) })}</span>
      </div>
    `;
        // clang-format on
        if (!fieldEnabled) {
            return html `
        <div class="bucket-summaries">
          ${goodLabel}
          ${needsImprovementLabel}
          ${poorLabel}
        </div>
      `;
        }
        // clang-format off
        return html `
      <div class="bucket-summaries histogram">
        ${goodLabel}
        <div class="histogram-bar good-bg" style="width: ${this.#getBarWidthForRating('good')}"></div>
        <div class="histogram-percent">${this.#getPercentLabelForRating('good')}</div>
        ${needsImprovementLabel}
        <div class="histogram-bar needs-improvement-bg" style="width: ${this.#getBarWidthForRating('needs-improvement')}"></div>
        <div class="histogram-percent">${this.#getPercentLabelForRating('needs-improvement')}</div>
        ${poorLabel}
        <div class="histogram-bar poor-bg" style="width: ${this.#getBarWidthForRating('poor')}"></div>
        <div class="histogram-percent">${this.#getPercentLabelForRating('poor')}</div>
      </div>
    `;
        // clang-format on
    }
    #renderPhaseTable(phases) {
        const hasFieldData = phases.every(phase => phase[2] !== undefined);
        // clang-format off
        return html `
      <hr class="divider">
      <div class="phase-table" role="table">
        <div class="phase-table-row phase-table-header-row" role="row">
          <div role="columnheader" style="grid-column: 1">${i18nString(UIStrings.phase)}</div>
          <div role="columnheader" class="phase-table-value" style="grid-column: 2">${i18nString(UIStrings.localValue)}</div>
          ${hasFieldData ? html `
            <div
              role="columnheader"
              class="phase-table-value"
              style="grid-column: 3"
              title=${i18nString(UIStrings.field75thPercentile)}>${i18nString(UIStrings.fieldP75)}</div>
          ` : nothing}
        </div>
        ${phases.map(phase => html `
          <div class="phase-table-row" role="row">
            <div role="cell">${phase[0]}</div>
            <div role="cell" class="phase-table-value">${i18n.TimeUtilities.preciseMillisToString(phase[1])}</div>
            ${phase[2] !== undefined ? html `
              <div role="cell" class="phase-table-value">${i18n.TimeUtilities.preciseMillisToString(phase[2])}</div>
            ` : nothing}
          </div>
        `)}
      </div>
    `;
        // clang-format on
    }
    #render = () => {
        const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;
        const helpLink = this.#getHelpLink();
        const localValue = this.#getLocalValue();
        const fieldValue = this.#getFieldValue();
        const thresholds = this.#getThresholds();
        const formatFn = this.#getFormatFn();
        const localValueEl = renderMetricValue(this.#getMetricValueLogContext(true), localValue, thresholds, formatFn);
        const fieldValueEl = renderMetricValue(this.#getMetricValueLogContext(false), fieldValue, thresholds, formatFn);
        // clang-format off
        const output = html `
      <style>${metricCardStyles}</style>
      <style>${metricValueStyles}</style>
      <div class="metric-card">
        <h3 class="title">
          ${this.#getTitle()}
          <devtools-button
            class="title-help"
            title=${this.#getHelpTooltip()}
            .iconName=${'help'}
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            @click=${() => UI.UIUtils.openInNewTab(helpLink)}
          ></devtools-button>
        </h3>
        <div tabindex="0" class="metric-values-section"
          @mouseenter=${() => this.#showTooltip(500)}
          @mouseleave=${this.#hideTooltipOnMouseLeave}
          @focusin=${this.#showTooltip}
          @focusout=${this.#hideTooltipOnFocusOut}
          aria-describedby="tooltip"
        >
          <div class="metric-source-block">
            <div class="metric-source-value" id="local-value">${localValueEl}</div>
            ${fieldEnabled ? html `<div class="metric-source-label">${i18nString(UIStrings.localValue)}</div>` : nothing}
          </div>
          ${fieldEnabled ? html `
            <div class="metric-source-block">
              <div class="metric-source-value" id="field-value">${fieldValueEl}</div>
              <div class="metric-source-label">${i18nString(UIStrings.field75thPercentile)}</div>
            </div>
          ` : nothing}
          <div
            id="tooltip"
            class="tooltip"
            role="tooltip"
            aria-label=${i18nString(UIStrings.viewCardDetails)}
            ${Lit.Directives.ref(el => {
            if (el instanceof HTMLElement) {
                this.#tooltipEl = el;
            }
        })}
          >
            <div class="tooltip-scroll">
              <div class="tooltip-contents">
                <div>
                  ${this.#renderDetailedCompareString()}
                  <hr class="divider">
                  ${this.#renderFieldHistogram()}
                  ${localValue && this.#data.phases ? this.#renderPhaseTable(this.#data.phases) : nothing}
                </div>
              </div>
            </div>
          </div>
        </div>
        ${fieldEnabled ? html `<hr class="divider">` : nothing}
        ${this.#renderCompareString()}
        ${this.#data.warnings?.map(warning => html `
          <div class="warning">${warning}</div>
        `)}
        ${this.#renderEnvironmentRecommendations()}
        <slot name="extra-info"></slot>
      </div>
    `;
        Lit.render(output, this.#shadow, { host: this });
    };
}
customElements.define('devtools-metric-card', MetricCard);
//# sourceMappingURL=MetricCard.js.map