// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as AIAssistance from '../../../models/ai_assistance/ai_assistance.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import { md, shouldRenderForCategory } from './insights/Helpers.js';
import * as Insights from './insights/insights.js';
import sidebarSingleInsightSetStyles from './sidebarSingleInsightSet.css.js';
import { isFieldWorseThanLocal, NumberWithUnit } from './Utils.js';
const { html } = Lit.StaticHtml;
const UIStrings = {
    /**
     * @description title used for a metric value to tell the user about its score classification
     * @example {INP} PH1
     * @example {1.2s} PH2
     * @example {poor} PH3
     */
    metricScore: '{PH1}: {PH2} {PH3} score',
    /**
     * @description title used for a metric value to tell the user that the data is unavailable
     * @example {INP} PH1
     */
    metricScoreUnavailable: '{PH1}: unavailable',
    /**
     * @description Summary text for an expandable dropdown that contains all insights in a passing state.
     * @example {4} PH1
     */
    passedInsights: 'Passed insights ({PH1})',
    /**
     * @description Label denoting that metrics were observed in the field, from real use data (CrUX). Also denotes if from URL or Origin dataset.
     * @example {URL} PH1
     */
    fieldScoreLabel: 'Field ({PH1})',
    /**
     * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
     */
    urlOption: 'URL',
    /**
     * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
     */
    originOption: 'Origin',
    /**
     * @description Title for button that closes a warning popup.
     */
    dismissTitle: 'Dismiss',
    /**
     * @description Title shown in a warning dialog when field metrics (collected from real users) is worse than the locally observed metrics.
     */
    fieldMismatchTitle: 'Field & local metrics mismatch',
    /**
     * @description Text shown in a warning dialog when field metrics (collected from real users) is worse than the locally observed metrics.
     * Asks user to use features such as throttling and device emulation.
     */
    fieldMismatchNotice: 'There are many reasons why local and field metrics [may not match](https://web.dev/articles/lab-and-field-data-differences). ' +
        'Adjust [throttling settings and device emulation](https://developer.chrome.com/docs/devtools/device-mode) to analyze traces more similar to the average user\'s environment.',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarSingleInsightSet.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, output, target) => {
    const { shownInsights, passedInsights, local, field, activeCategory, showFieldMismatchNotice, onDismisFieldMismatchNotice, onClickMetric, renderInsightComponent, } = input;
    function renderMetrics() {
        const lcpEl = renderMetricValue('LCP', local?.lcp?.value ?? null, local?.lcp?.event ?? null);
        const inpEl = renderMetricValue('INP', local?.inp?.value ?? null, local?.inp?.event ?? null);
        const clsEl = renderMetricValue('CLS', local?.cls?.value ?? null, local?.cls?.worstClusterEvent ?? null);
        const localMetricsTemplateResult = html `
      <div class="metrics-row">
        <span>${lcpEl}</span>
        <span>${inpEl}</span>
        <span>${clsEl}</span>
        <span class="row-label">Local</span>
      </div>
      <span class="row-border"></span>
    `;
        let fieldMetricsTemplateResult;
        if (field) {
            const { lcp, inp, cls } = field;
            const lcpEl = renderMetricValue('LCP', lcp?.value ?? null, null);
            const inpEl = renderMetricValue('INP', inp?.value ?? null, null);
            const clsEl = renderMetricValue('CLS', cls?.value ?? null, null);
            let scope = i18nString(UIStrings.originOption);
            if (lcp?.pageScope === 'url' || inp?.pageScope === 'url') {
                scope = i18nString(UIStrings.urlOption);
            }
            // clang-format off
            fieldMetricsTemplateResult = html `
        <div class="metrics-row">
          <span>${lcpEl}</span>
          <span>${inpEl}</span>
          <span>${clsEl}</span>
          <span class="row-label">${i18nString(UIStrings.fieldScoreLabel, { PH1: scope })}</span>
        </div>
        <span class="row-border"></span>
      `;
            // clang-format on
        }
        let fieldIsDifferentEl;
        if (showFieldMismatchNotice) {
            // clang-format off
            fieldIsDifferentEl = html `
        <div class="field-mismatch-notice" jslog=${VisualLogging.section('timeline.insights.field-mismatch')}>
          <h3>${i18nString(UIStrings.fieldMismatchTitle)}</h3>
          <devtools-button
            title=${i18nString(UIStrings.dismissTitle)}
            .iconName=${'cross'}
            .variant=${"icon" /* Buttons.Button.Variant.ICON */}
            .jslogContext=${'timeline.insights.dismiss-field-mismatch'}
            @click=${onDismisFieldMismatchNotice}
          ></devtools-button>
          <div class="field-mismatch-notice__body">${md(i18nString(UIStrings.fieldMismatchNotice))}</div>
        </div>
      `;
            // clang-format on
        }
        const classes = { metrics: true, 'metrics--field': Boolean(fieldMetricsTemplateResult) };
        const metricsTableEl = html `<div class=${Lit.Directives.classMap(classes)}>
      <div class="metrics-row">
        <span class="metric-label">LCP</span>
        <span class="metric-label">INP</span>
        <span class="metric-label">CLS</span>
        <span class="row-label"></span>
      </div>
      ${localMetricsTemplateResult}
      ${fieldMetricsTemplateResult}
    </div>`;
        return html `
      ${metricsTableEl}
      ${fieldIsDifferentEl}
    `;
    }
    function renderMetricValue(metric, value, relevantEvent) {
        let valueText;
        let valueDisplay;
        let classification;
        if (value === null) {
            valueText = valueDisplay = '-';
            classification = "unclassified" /* Trace.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED */;
        }
        else if (metric === 'LCP') {
            const micros = value;
            const { text, element } = NumberWithUnit.formatMicroSecondsAsSeconds(micros);
            valueText = text;
            valueDisplay = element;
            classification =
                Trace.Handlers.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(micros);
        }
        else if (metric === 'CLS') {
            valueText = valueDisplay = value ? value.toFixed(2) : '0';
            classification = Trace.Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(value);
        }
        else if (metric === 'INP') {
            const micros = value;
            const { text, element } = NumberWithUnit.formatMicroSecondsAsMillisFixed(micros);
            valueText = text;
            valueDisplay = element;
            classification =
                Trace.Handlers.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(micros);
        }
        else {
            Platform.TypeScriptUtilities.assertNever(metric, `Unexpected metric ${metric}`);
        }
        // NOTE: it is deliberate to use the same value for the title and
        // aria-label; the aria-label is used to give more context to
        // screen-readers, and the title is to aid users who may not know what
        // the red/orange/green classification is, or those who are unable to
        // easily distinguish the visual colour differences.
        // clang-format off
        const title = value !== null ?
            i18nString(UIStrings.metricScore, { PH1: metric, PH2: valueText, PH3: classification }) :
            i18nString(UIStrings.metricScoreUnavailable, { PH1: metric });
        return metricIsVisible(activeCategory, metric) ? html `
      <button class="metric"
        @click=${relevantEvent ? onClickMetric.bind(relevantEvent) : null}
        title=${title}
        aria-label=${title}
      >
        <div class="metric-value metric-value-${classification}">${valueDisplay}</div>
      </button>
    ` : Lit.nothing;
        // clang-format on
    }
    function renderInsights() {
        const shownInsightTemplates = shownInsights.map(renderInsightComponent);
        const passedInsightsTemplates = passedInsights.map(renderInsightComponent);
        // clang-format off
        return html `
      ${shownInsightTemplates}
      ${passedInsightsTemplates.length ? html `
        <details class="passed-insights-section">
          <summary>${i18nString(UIStrings.passedInsights, {
            PH1: passedInsightsTemplates.length,
        })}</summary>
          ${passedInsightsTemplates}
        </details>
      ` : Lit.nothing}
    `;
        // clang-format on
    }
    // clang-format off
    Lit.render(html `
    <style>${sidebarSingleInsightSetStyles}</style>
    <div class="navigation">
      ${renderMetrics()}
      ${renderInsights()}
    </div>
  `, target);
    // clang-format on
};
function metricIsVisible(activeCategory, label) {
    if (activeCategory === Trace.Insights.Types.InsightCategory.ALL) {
        return true;
    }
    return label === activeCategory;
}
export class SidebarSingleInsightSet extends UI.Widget.Widget {
    #view;
    #insightRenderer = new Insights.InsightRenderer.InsightRenderer();
    #activeInsightElement = null;
    #activeHighlightTimeout = -1;
    #data = {
        insightSetKey: null,
        activeCategory: Trace.Insights.Types.InsightCategory.ALL,
        activeInsight: null,
        parsedTrace: null,
    };
    #didDismissFieldMismatchNotice = false;
    constructor(element, view = DEFAULT_VIEW) {
        super(element, { useShadowDom: true });
        this.#view = view;
    }
    set data(data) {
        this.#data = data;
        this.requestUpdate();
    }
    willHide() {
        super.willHide();
        window.clearTimeout(this.#activeHighlightTimeout);
    }
    highlightActiveInsight() {
        if (!this.#activeInsightElement) {
            return;
        }
        // First clear any existing highlight that is going on.
        this.#activeInsightElement.removeAttribute('highlight-insight');
        window.clearTimeout(this.#activeHighlightTimeout);
        requestAnimationFrame(() => {
            this.#activeInsightElement?.setAttribute('highlight-insight', 'true');
            this.#activeHighlightTimeout = window.setTimeout(() => {
                this.#activeInsightElement?.removeAttribute('highlight-insight');
            }, 2_000);
        });
    }
    #onClickMetric(traceEvent) {
        this.element.dispatchEvent(new Insights.EventRef.EventReferenceClick(traceEvent));
    }
    #getLocalMetrics(insightSetKey) {
        if (!this.#data.parsedTrace) {
            return null;
        }
        const insightSet = this.#data.parsedTrace.insights?.get(insightSetKey);
        if (!insightSet) {
            return null;
        }
        const lcp = Trace.Insights.Common.getLCP(insightSet);
        const cls = Trace.Insights.Common.getCLS(insightSet);
        const inp = Trace.Insights.Common.getINP(insightSet);
        return { lcp, cls, inp };
    }
    #getFieldMetrics(insightSetKey) {
        if (!this.#data.parsedTrace) {
            return null;
        }
        const insightSet = this.#data.parsedTrace.insights?.get(insightSetKey);
        if (!insightSet) {
            return null;
        }
        const fieldMetricsResults = Trace.Insights.Common.getFieldMetricsForInsightSet(insightSet, this.#data.parsedTrace.metadata, CrUXManager.CrUXManager.instance().getSelectedScope());
        if (!fieldMetricsResults) {
            return null;
        }
        return fieldMetricsResults;
    }
    #onDismisFieldMismatchNotice() {
        this.#didDismissFieldMismatchNotice = true;
        this.requestUpdate();
    }
    static categorizeInsights(insightSets, insightSetKey, activeCategory) {
        const insightSet = insightSets?.get(insightSetKey);
        if (!insightSet) {
            return { shownInsights: [], passedInsights: [] };
        }
        const shownInsights = [];
        const passedInsights = [];
        for (const [insightName, model] of Object.entries(insightSet.model)) {
            if (!model || !shouldRenderForCategory({ activeCategory, insightCategory: model.category })) {
                continue;
            }
            if (model.state === 'pass') {
                passedInsights.push({ insightName, model });
            }
            else {
                shownInsights.push({ insightName, model });
            }
        }
        return { shownInsights, passedInsights };
    }
    #renderInsightComponent(insightSet, insightData, fieldMetrics) {
        if (!this.#data.parsedTrace) {
            return Lit.nothing;
        }
        const { insightName, model } = insightData;
        const activeInsight = this.#data.activeInsight;
        const agentFocus = AIAssistance.AIContext.AgentFocus.fromInsight(this.#data.parsedTrace, model);
        const widgetElement = this.#insightRenderer.renderInsightToWidgetElement(this.#data.parsedTrace, insightSet, model, insightName, {
            selected: activeInsight?.model === model,
            agentFocus,
            fieldMetrics,
        });
        if (activeInsight?.model === model) {
            this.#activeInsightElement = widgetElement;
        }
        return html `${widgetElement}`;
    }
    performUpdate() {
        const { parsedTrace, insightSetKey, } = this.#data;
        if (!parsedTrace?.insights || !insightSetKey) {
            return;
        }
        const insightSet = parsedTrace.insights.get(insightSetKey);
        if (!insightSet) {
            return;
        }
        const local = this.#getLocalMetrics(insightSetKey);
        const field = this.#getFieldMetrics(insightSetKey);
        const { shownInsights, passedInsights } = SidebarSingleInsightSet.categorizeInsights(parsedTrace.insights, insightSetKey, this.#data.activeCategory);
        const localValues = {
            lcp: local?.lcp?.value !== undefined ? Trace.Helpers.Timing.microToMilli(local?.lcp.value) : undefined,
            inp: local?.inp?.value !== undefined ? Trace.Helpers.Timing.microToMilli(local?.inp.value) : undefined,
        };
        const fieldValues = field && {
            lcp: field.lcp?.value !== undefined ? Trace.Helpers.Timing.microToMilli(field.lcp.value) : undefined,
            inp: field.inp?.value !== undefined ? Trace.Helpers.Timing.microToMilli(field.inp.value) : undefined,
        };
        const showFieldMismatchNotice = !this.#didDismissFieldMismatchNotice && !!fieldValues && isFieldWorseThanLocal(localValues, fieldValues);
        const input = {
            shownInsights,
            passedInsights,
            local,
            field,
            activeCategory: this.#data.activeCategory,
            showFieldMismatchNotice,
            onDismisFieldMismatchNotice: this.#onDismisFieldMismatchNotice.bind(this),
            onClickMetric: this.#onClickMetric.bind(this),
            renderInsightComponent: insightData => this.#renderInsightComponent(insightSet, insightData, field),
        };
        this.#view(input, undefined, this.contentElement);
    }
}
//# sourceMappingURL=SidebarSingleInsightSet.js.map