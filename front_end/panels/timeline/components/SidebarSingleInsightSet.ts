// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import * as Trace from '../../../models/trace/trace.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {shouldRenderForCategory} from './insights/Helpers.js';
import * as Insights from './insights/insights.js';
import type {ActiveInsight} from './Sidebar.js';
import styles from './sidebarSingleInsightSet.css.js';
import {NumberWithUnit} from './Utils.js';

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
   *@description title used for a metric value to tell the user that the data is unavailable
   *@example {INP} PH1
   */
  metricScoreUnavailable: '{PH1}: unavailable',
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
  parsedTrace: Trace.Handlers.Types.ParsedTrace|null;
  traceMetadata: Trace.Types.File.MetaData|null;
}

/**
 * These are WIP Insights that are only shown if the user has turned on the
 * "enable experimental performance insights" experiment. This is used to enable
 * us to ship incrementally without turning insights on by default for all
 * users. */
const EXPERIMENTAL_INSIGHTS: ReadonlySet<string> = new Set([
  'FontDisplay',
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
    parsedTrace: null,
    traceMetadata: null,
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

  #renderMetricValue(metric: 'LCP'|'CLS'|'INP', value: number|null, relevantEvent: Trace.Types.Events.Event|null):
      LitHtml.LitTemplate {
    let valueText: string;
    let valueDisplay: HTMLElement|string;
    let classification;
    if (value === null) {
      valueText = valueDisplay = '-';
      classification = Trace.Handlers.ModelHandlers.PageLoadMetrics.ScoreClassification.UNCLASSIFIED;
    } else if (metric === 'LCP') {
      const micros = value as Trace.Types.Timing.Micro;
      const {text, element} = NumberWithUnit.formatMicroSecondsAsSeconds(micros);
      valueText = text;
      valueDisplay = element;
      classification =
          Trace.Handlers.ModelHandlers.PageLoadMetrics.scoreClassificationForLargestContentfulPaint(micros);
    } else if (metric === 'CLS') {
      valueText = valueDisplay = value ? value.toFixed(2) : '0';
      classification = Trace.Handlers.ModelHandlers.LayoutShifts.scoreClassificationForLayoutShift(value);
    } else if (metric === 'INP') {
      const micros = value as Trace.Types.Timing.Micro;
      const {text, element} = NumberWithUnit.formatMicroSecondsAsMillisFixed(micros);
      valueText = text;
      valueDisplay = element;
      classification =
          Trace.Handlers.ModelHandlers.UserInteractions.scoreClassificationForInteractionToNextPaint(micros);
    } else {
      Platform.TypeScriptUtilities.assertNever(metric, `Unexpected metric ${metric}`);
    }

    // NOTE: it is deliberate to use the same value for the title and
    // aria-label; the aria-label is used to give more context to
    // screen-readers, and the title is to aid users who may not know what
    // the red/orange/green classification is, or those who are unable to
    // easily distinguish the visual colour differences.
    // clang-format off
    const title = value !== null ?
      i18nString(UIStrings.metricScore, {PH1: metric, PH2: valueText, PH3: classification}) :
      i18nString(UIStrings.metricScoreUnavailable, {PH1: metric});

    return this.#metricIsVisible(metric) ? html`
      <button class="metric"
        @click=${relevantEvent ? this.#onClickMetric.bind(this, relevantEvent) : null}
        title=${title}
        aria-label=${title}
      >
        <div class="metric-value metric-value-${classification}">${valueDisplay}</div>
      </button>
    ` : LitHtml.nothing;
    // clang-format on
  }

  #renderMetrics(insightSetKey: string): LitHtml.TemplateResult {
    const lcp = Trace.Insights.Common.getLCP(this.#data.insights, insightSetKey);
    const cls = Trace.Insights.Common.getCLS(this.#data.insights, insightSetKey);
    const inp = Trace.Insights.Common.getINP(this.#data.insights, insightSetKey);

    const lcpEl = this.#renderMetricValue('LCP', lcp?.value ?? null, lcp?.event ?? null);
    const inpEl = this.#renderMetricValue('INP', inp?.value ?? null, inp?.event ?? null);
    const clsEl = this.#renderMetricValue('CLS', cls.value ?? null, cls?.worstShiftEvent ?? null);

    const localMetricsTemplateResult = html`
      <div class="metrics-row">
        <span>${lcpEl}</span>
        <span>${inpEl}</span>
        <span>${clsEl}</span>
        <span class="row-label">Local</span>
      </div>
      <span class="row-border"></span>
    `;

    const insightSet = this.#data.insights?.get(insightSetKey);
    const fieldMetricsResults =
        insightSet && Trace.Insights.Common.getFieldMetricsForInsightSet(insightSet, this.#data.traceMetadata);
    let fieldMetricsTemplateResult;
    if (fieldMetricsResults) {
      let {lcp, inp, cls} = fieldMetricsResults;

      // This UI shows field data from the Origin or URL datasets, but never a mix.
      if (lcp?.pageScope === 'url' || inp?.pageScope === 'url' || cls?.pageScope === 'url') {
        if (lcp?.pageScope === 'origin') {
          lcp = null;
        }
        if (inp?.pageScope === 'origin') {
          inp = null;
        }
        if (cls?.pageScope === 'origin') {
          cls = null;
        }
      }

      if (lcp || inp || cls) {
        const lcpEl = this.#renderMetricValue('LCP', lcp?.value ?? null, null);
        const inpEl = this.#renderMetricValue('INP', inp?.value ?? null, null);
        const clsEl = this.#renderMetricValue('CLS', cls?.value ?? null, null);

        fieldMetricsTemplateResult = html`
          <div class="metrics-row">
            <span>${lcpEl}</span>
            <span>${inpEl}</span>
            <span>${clsEl}</span>
            <span class="row-label">Field (Origin)</span>
          </div>
          <span class="row-border"></span>
        `;
      }
    }

    const classes = {metrics: true, 'metrics--field': Boolean(fieldMetricsTemplateResult)};
    return html`<div class=${LitHtml.Directives.classMap(classes)}>
      <div class="metrics-row">
        <span class="metric-label">LCP</span>
        <span class="metric-label">INP</span>
        <span class="metric-label">CLS</span>
        <span class="row-label"></span>
      </div>
      ${localMetricsTemplateResult}
      ${fieldMetricsTemplateResult}
    </div>`;
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
          .parsedTrace=${this.#data.parsedTrace}>
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
