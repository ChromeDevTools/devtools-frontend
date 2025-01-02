// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {shouldRenderForCategory} from './insights/Helpers.js';
import * as Insights from './insights/insights.js';
import type {ActiveInsight} from './Sidebar.js';
import styles from './sidebarSingleInsightSet.css.js';
import {NumberWithUnit, type NumberWithUnitString} from './Utils.js';

const {html} = LitHtml.StaticHtml;

const UIStrings = {
  /**
   *@description title used for a metric value to tell the user about its score classification
   *@example {INP} PH1
   *@example {1.2s} PH2
   *@example {poor} PH3
   */
  metricScore: '{PH1}: {PH2} {PH3} score',
  /**
   * @description Summary text for an expandable dropdown that contains all insights in a passing state.
   * @example {4} PH1
   */
  passedInsights: 'Passed insights ({PH1})',
};
const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/SidebarSingleInsightSet.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface SidebarSingleInsightSetData {
  insights: Trace.Insights.Types.TraceInsightSets|null;
  insightSetKey: Trace.Types.Events.NavigationId|null;
  activeCategory: Trace.Insights.Types.InsightCategory;
  activeInsight: ActiveInsight|null;
}

/**
 * These are WIP Insights that are only shown if the user has turned on the
 * "enable experimental performance insights" experiment. This is used to enable
 * us to ship incrementally without turning insights on by default for all
 * users. */
const EXPERIMENTAL_INSIGHTS: ReadonlySet<string> = new Set([
  'FontDisplay',
  'DOMSize',
]);

type InsightNameToComponentMapping =
    Record<string, typeof Insights.BaseInsightComponent.BaseInsightComponent<Trace.Insights.Types.InsightModel<{}>>>;

/**
 * Every insight (INCLUDING experimental ones).
 *
 * Order does not matter (but keep alphabetized).
 */
const INSIGHT_NAME_TO_COMPONENT: InsightNameToComponentMapping = {
  CLSCulprits: Insights.CLSCulprits.CLSCulprits,
  DOMSize: Insights.DOMSize.DOMSize,
  DocumentLatency: Insights.DocumentLatency.DocumentLatency,
  FontDisplay: Insights.FontDisplay.FontDisplay,
  ImageDelivery: Insights.ImageDelivery.ImageDelivery,
  InteractionToNextPaint: Insights.InteractionToNextPaint.InteractionToNextPaint,
  LCPDiscovery: Insights.LCPDiscovery.LCPDiscovery,
  LCPPhases: Insights.LCPPhases.LCPPhases,
  RenderBlocking: Insights.RenderBlocking.RenderBlocking,
  SlowCSSSelector: Insights.SlowCSSSelector.SlowCSSSelector,
  ThirdParties: Insights.ThirdParties.ThirdParties,
  Viewport: Insights.Viewport.Viewport,
};

export class SidebarSingleInsightSet extends HTMLElement {
  readonly #shadow = this.attachShadow({mode: 'open'});
  #renderBound = this.#render.bind(this);

  #data: SidebarSingleInsightSetData = {
    insights: null,
    insightSetKey: null,
    activeCategory: Trace.Insights.Types.InsightCategory.ALL,
    activeInsight: null,
  };

  set data(data: SidebarSingleInsightSetData) {
    this.#data = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#renderBound);
  }
  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [styles];
    this.#render();
  }

  #metricIsVisible(label: 'LCP'|'CLS'|'INP'): boolean {
    if (this.#data.activeCategory === Trace.Insights.Types.InsightCategory.ALL) {
      return true;
    }
    return label === this.#data.activeCategory;
  }

  #onClickMetric(traceEvent: Trace.Types.Events.Event): void {
    this.dispatchEvent(new Insights.EventRef.EventReferenceClick(traceEvent));
  }

  #renderMetricValue(
      label: 'LCP'|'CLS'|'INP', value: string|NumberWithUnitString,
      classification: Trace.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification,
      eventToSelectOnClick: Trace.Types.Events.Event|null): LitHtml.LitTemplate {
    const valueText = typeof value === 'string' ? value : value.text;
    const valueDisplay = typeof value === 'string' ? value : value.element;

    // NOTE: it is deliberate to use the same value for the title and
    // aria-label; the aria-label is used to give more context to
    // screen-readers, and the title is to aid users who may not know what
    // the red/orange/green classification is, or those who are unable to
    // easily distinguish the visual colour differences.
    // clang-format off
    const title = i18nString(UIStrings.metricScore, {PH1: label, PH2: valueText, PH3: classification});

    return this.#metricIsVisible(label) ? html`
      <button class="metric"
        @click=${eventToSelectOnClick ? this.#onClickMetric.bind(this, eventToSelectOnClick) : null}
        title=${title}
        aria-label=${title}
      >
        <div class="metric-value metric-value-${classification}">${valueDisplay}</div>
        <div class="metric-label">${label}</div>
      </button>
    ` : LitHtml.nothing;
    // clang-format on
  }

  #renderMetrics(insightSetKey: string): LitHtml.TemplateResult {
    const lcp = Trace.Insights.Common.getLCP(this.#data.insights, insightSetKey);
    const cls = Trace.Insights.Common.getCLS(this.#data.insights, insightSetKey);
    const inp = Trace.Insights.Common.getINP(this.#data.insights, insightSetKey);

    return html`
    <div class="metrics-row">
    ${
        lcp ? this.#renderMetricValue(
                  'LCP', NumberWithUnit.formatMicroSecondsAsSeconds(lcp.value),
                  Trace.Handlers.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(lcp.value),
                  lcp.event ?? null) :
              LitHtml.nothing}
    ${
        inp ? this.#renderMetricValue(
                  'INP', NumberWithUnit.formatMicroSecondsAsMillisFixed(inp.value),
                  Trace.Handlers.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(inp.value),
                  inp.event) :
              LitHtml.nothing}
    ${
        this.#renderMetricValue(
            'CLS', cls.value ? cls.value.toFixed(2) : '0',
            Trace.Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(cls.value),
            cls.worstShiftEvent)}
    </div>
    `;
  }

  #renderInsights(
      insightSets: Trace.Insights.Types.TraceInsightSets|null,
      insightSetKey: string,
      ): LitHtml.LitTemplate {
    const includeExperimental = Root.Runtime.experiments.isEnabled(
        Root.Runtime.ExperimentName.TIMELINE_EXPERIMENTAL_INSIGHTS,
    );

    const insightSet = insightSets?.get(insightSetKey);
    if (!insightSet) {
      return LitHtml.nothing;
    }

    const models = insightSet.model;
    const shownInsights: LitHtml.TemplateResult[] = [];
    const passedInsights: LitHtml.TemplateResult[] = [];
    for (const [name, model] of Object.entries(models)) {
      const componentClass = INSIGHT_NAME_TO_COMPONENT[name as keyof Trace.Insights.Types.InsightModels];
      if (!componentClass) {
        continue;
      }

      if (!includeExperimental && EXPERIMENTAL_INSIGHTS.has(name)) {
        continue;
      }

      if (!model ||
          !shouldRenderForCategory({activeCategory: this.#data.activeCategory, insightCategory: model.category})) {
        continue;
      }

      // clang-format off
      const component = html`<div>
        <${componentClass.litTagName}
          .selected=${this.#data.activeInsight?.model === model}
          .model=${model}
          .bounds=${insightSet.bounds}
          .insightSetKey=${insightSetKey}
        </${componentClass.litTagName}>
      </div>`;
      // clang-format on

      if (model.shouldShow) {
        shownInsights.push(component);
      } else {
        passedInsights.push(component);
      }
    }

    // clang-format off
    return html`
      ${shownInsights}
      ${passedInsights.length ? html`
        <details class="passed-insights-section">
          <summary>${i18nString(UIStrings.passedInsights, {
            PH1: passedInsights.length,
          })}</summary>
          ${passedInsights}
        </details>
      ` : LitHtml.nothing}
    `;
    // clang-format on
  }

  #render(): void {
    const {
      insights,
      insightSetKey,
    } = this.#data;
    if (!insights || !insightSetKey) {
      LitHtml.render(html``, this.#shadow, {host: this});
      return;
    }

    // clang-format off
    LitHtml.render(html`
      <div class="navigation">
        ${this.#renderMetrics(insightSetKey)}
        ${this.#renderInsights(insights, insightSetKey)}
        </div>
      `, this.#shadow, {host: this});
    // clang-format on
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'devtools-performance-sidebar-single-navigation': SidebarSingleInsightSet;
  }
}

customElements.define('devtools-performance-sidebar-single-navigation', SidebarSingleInsightSet);
