// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../../core/i18n/i18n.js';
import * as AIAssistance from '../../../models/ai_assistance/ai_assistance.js';
import * as Trace from '../../../models/trace/trace.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';
import { CWVMetrics, getFieldMetrics } from './CWVMetrics.js';
import { shouldRenderForCategory } from './insights/Helpers.js';
import * as Insights from './insights/insights.js';
import sidebarSingleInsightSetStyles from './sidebarSingleInsightSet.css.js';
const { html } = Lit.StaticHtml;
const UIStrings = {
    /**
     * @description Summary text for an expandable dropdown that contains all insights in a passing state.
     * @example {4} PH1
     */
    passedInsights: 'Passed insights ({PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarSingleInsightSet.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { widget } = UI.Widget;
const DEFAULT_VIEW = (input, output, target) => {
    const { shownInsights, passedInsights, insightSetKey, parsedTrace, renderInsightComponent, } = input;
    function renderMetrics() {
        if (!insightSetKey || !parsedTrace) {
            return Lit.nothing;
        }
        return html `${widget(CWVMetrics, { data: { insightSetKey, parsedTrace } })}`;
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
    static categorizeInsights(insightSets, insightSetKey, activeCategory) {
        if (!insightSets || !(insightSets instanceof Map)) {
            return { shownInsights: [], passedInsights: [] };
        }
        const insightSet = insightSets.get(insightSetKey);
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
        if (!parsedTrace?.insights || !insightSetKey || !(parsedTrace.insights instanceof Map)) {
            return;
        }
        const insightSet = parsedTrace.insights.get(insightSetKey);
        if (!insightSet) {
            return;
        }
        const field = getFieldMetrics(parsedTrace, insightSetKey);
        const { shownInsights, passedInsights } = SidebarSingleInsightSet.categorizeInsights(parsedTrace.insights, insightSetKey, this.#data.activeCategory);
        const input = {
            shownInsights,
            passedInsights,
            insightSetKey,
            parsedTrace,
            renderInsightComponent: insightData => this.#renderInsightComponent(insightSet, insightData, field),
        };
        this.#view(input, undefined, this.contentElement);
    }
}
//# sourceMappingURL=SidebarSingleInsightSet.js.map