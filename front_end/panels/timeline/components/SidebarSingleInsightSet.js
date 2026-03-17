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
/**
 * Every insight (INCLUDING experimental ones).
 *
 * Order does not matter (but keep alphabetized).
 */
const INSIGHT_NAME_TO_COMPONENT = {
    Cache: Insights.Cache.Cache,
    CharacterSet: Insights.CharacterSet.CharacterSet,
    CLSCulprits: Insights.CLSCulprits.CLSCulprits,
    DocumentLatency: Insights.DocumentLatency.DocumentLatency,
    DOMSize: Insights.DOMSize.DOMSize,
    DuplicatedJavaScript: Insights.DuplicatedJavaScript.DuplicatedJavaScript,
    FontDisplay: Insights.FontDisplay.FontDisplay,
    ForcedReflow: Insights.ForcedReflow.ForcedReflow,
    ImageDelivery: Insights.ImageDelivery.ImageDelivery,
    INPBreakdown: Insights.INPBreakdown.INPBreakdown,
    LCPDiscovery: Insights.LCPDiscovery.LCPDiscovery,
    LCPBreakdown: Insights.LCPBreakdown.LCPBreakdown,
    LegacyJavaScript: Insights.LegacyJavaScript.LegacyJavaScript,
    ModernHTTP: Insights.ModernHTTP.ModernHTTP,
    NetworkDependencyTree: Insights.NetworkDependencyTree.NetworkDependencyTree,
    RenderBlocking: Insights.RenderBlocking.RenderBlocking,
    SlowCSSSelector: Insights.SlowCSSSelector.SlowCSSSelector,
    ThirdParties: Insights.ThirdParties.ThirdParties,
    Viewport: Insights.Viewport.Viewport,
};
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
    #isActiveInsightHighlighted = false;
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
    async highlightActiveInsight() {
        window.clearTimeout(this.#activeHighlightTimeout);
        this.#isActiveInsightHighlighted = false;
        this.requestUpdate();
        await this.updateComplete;
        this.#isActiveInsightHighlighted = true;
        this.requestUpdate();
        this.#activeHighlightTimeout = window.setTimeout(() => {
            this.#isActiveInsightHighlighted = false;
            this.requestUpdate();
        }, 2_000);
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
        const isActiveInsight = activeInsight?.model === model;
        const componentClass = INSIGHT_NAME_TO_COMPONENT[insightName];
        const widgetConfig = {
            selected: isActiveInsight,
            // The `model` passed in as a parameter is the base type, but since
            // `componentClass` is the union of every derived insight component, the
            // `model` for the widget config is the union of every model. That can't be
            // satisfied, so disable typescript.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            model: model,
            bounds: insightSet.bounds,
            insightSetKey: insightSet.id,
            agentFocus,
            fieldMetrics,
        };
        // clang-format off
        return html `<devtools-widget class="insight-component-widget" ?highlight-insight=${isActiveInsight && this.#isActiveInsightHighlighted}
      ${widget(componentClass, widgetConfig)}
    ></devtools-widget>`;
        // clang-format on
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