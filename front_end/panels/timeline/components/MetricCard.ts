// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../../ui/components/tooltips/tooltips.js';

import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import type * as Trace from '../../../models/trace/trace.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as UIHelpers from '../../../ui/helpers/helpers.js';
import * as UI from '../../../ui/legacy/legacy.js';
import {html, type LitTemplate, nothing, render} from '../../../ui/lit/lit.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';

import metricCardStyles from './metricCard.css.js';
import {type CompareRating, renderCompareText, renderDetailedCompareText} from './MetricCompareStrings.js';
import metricValueStyles from './metricValueStyles.css.js';
import {
  CLS_THRESHOLDS,
  determineCompareRating,
  INP_THRESHOLDS,
  LCP_THRESHOLDS,
  type MetricRating,
  type MetricThresholds,
  rateMetric,
  renderMetricValue,
} from './Utils.js';

const UIStrings = {
  /**
   * @description Label for a metric value measured in the local environment in the live metrics view of the Performance panel.
   */
  localValue: 'Local',
  /**
   * @description Label for the 75th percentile of real user field metrics in the live metrics view of the Performance panel.
   */
  field75thPercentile: 'Field 75th percentile',
  /**
   * @description Column header for the 75th percentile field metrics in the live metrics view of the Performance panel.
   */
  fieldP75: 'Field p75',
  /**
   * @description Label for metric values classified as good in the live metrics view of the Performance panel.
   */
  good: 'Good',
  /**
   * @description Label for metric values classified as needs improvement in the live metrics view of the Performance panel.
   */
  needsImprovement: 'Needs improvement',
  /**
   * @description Label for metric values classified as poor in the live metrics view of the Performance panel.
   */
  poor: 'Poor',
  /**
   * @description Label for a range of values that are less than or equal to a threshold in the live metrics view of the Performance panel.
   * @example {500 ms} PH1
   */
  leqRange: '(≤{PH1})',
  /**
   * @description Label for a range of values between two thresholds in the live metrics view of the Performance panel.
   * @example {500 ms} PH1
   * @example {800 ms} PH2
   */
  betweenRange: '({PH1}-{PH2})',
  /**
   * @description Label for a range of values greater than a threshold in the live metrics view of the Performance panel.
   * @example {500 ms} PH1
   */
  gtRange: '(>{PH1})',
  /**
   * @description Percentage value format string in the live metrics view of the Performance panel.
   * @example {13} PH1
   */
  percentage: '{PH1}%',
  /**
   * @description Prompt instructing the user to interact with the page to measure INP in the live metrics view of the Performance panel.
   */
  interactToMeasure: 'Interact with the page to measure INP',
  /**
   * @description Tooltip label to expand more details in the metric card of the Performance panel.
   */
  viewCardDetails: 'View card details',
  /**
   * @description Header recommending the user inspect their local test environment in the live metrics view of the Performance panel.
   */
  considerTesting: 'Consider your local test conditions',
  /**
   * @description Recommendation explaining how network throttling affects LCP page loads in the Performance panel.
   */
  recThrottlingLCP:
      'Real users may experience longer page loads due to slower network conditions. Increasing network throttling will simulate slower network conditions.',
  /**
   * @description Recommendation explaining how CPU throttling affects INP interaction delays in the Performance panel.
   */
  recThrottlingINP:
      'Real users may experience longer interactions due to slower CPU speeds. Increasing CPU throttling will simulate a slower device.',
  /**
   * @description Recommendation explaining how viewport size affects the LCP element in the Performance panel.
   */
  recViewportLCP: 'Screen size can influence what the LCP element is. Ensure you are testing common viewport sizes.',
  /**
   * @description Recommendation explaining how viewport size affects layout shifts in the Performance panel.
   */
  recViewportCLS: 'Screen size can influence what layout shifts happen. Ensure you are testing common viewport sizes.',
  /**
   * @description Recommendation explaining how user interaction journeys affect layout shifts in the Performance panel.
   */
  recJourneyCLS:
      'How a user interacts with the page can influence layout shifts. Ensure you are testing common interactions like scrolling the page.',
  /**
   * @description Recommendation explaining how user interaction journeys affect interaction delays in the Performance panel.
   */
  recJourneyINP:
      'How a user interacts with the page influences interaction delays. Ensure you are testing common interactions.',
  /**
   * @description Recommendation explaining how dynamic content affects LCP in the Performance panel.
   */
  recDynamicContentLCP: 'The LCP element can vary between page loads if content is dynamic',
  /**
   * @description Recommendation explaining how dynamic content affects layout shifts in the Performance panel.
   */
  recDynamicContentCLS: 'Dynamic content can influence what layout shifts happen',
  /**
   * @description Table column header for subpart stage names in the live metrics view of the Performance panel.
   */
  subpart: 'Subpart',
  /**
   * @description Tooltip text explaining the Largest Contentful Paint (LCP) metric in the live metrics view of the Performance panel.
   */
  lcpHelpTooltip:
      'LCP reports the render time of the largest image, text block, or video visible in the viewport. Click here to learn more about LCP.',
  /**
   * @description Tooltip text explaining the Cumulative Layout Shift (CLS) metric in the live metrics view of the Performance panel.
   */
  clsHelpTooltip: 'CLS measures the amount of unexpected shifted content. Click here to learn more about CLS.',
  /**
   * @description Tooltip text explaining the Interaction to Next Paint (INP) metric in the live metrics view of the Performance panel.
   */
  inpHelpTooltip:
      'INP measures the overall responsiveness to all click, tap, and keyboard interactions. Click here to learn more about INP.',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/MetricCard.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export type SubpartTable = Array<[string, Trace.Types.Timing.Milli, Trace.Types.Timing.Milli?]>;

type Metric = 'LCP'|'CLS'|'INP';

function getTitle(metric: Metric): string {
  switch (metric) {
    case 'LCP':
      return i18n.i18n.lockedString('Largest Contentful Paint (LCP)');
    case 'CLS':
      return i18n.i18n.lockedString('Cumulative Layout Shift (CLS)');
    case 'INP':
      return i18n.i18n.lockedString('Interaction to Next Paint (INP)');
  }
}

function getThresholds(metric: Metric): MetricThresholds {
  switch (metric) {
    case 'LCP':
      return LCP_THRESHOLDS;
    case 'CLS':
      return CLS_THRESHOLDS;
    case 'INP':
      return INP_THRESHOLDS;
  }
}

function getFormatFn(metric: Metric): (value: number) => string {
  switch (metric) {
    case 'LCP':
      return v => {
        const micro = (v * 1000) as Platform.Timing.MicroSeconds;
        return i18n.TimeUtilities.formatMicroSecondsAsSeconds(micro);
      };
    case 'CLS':
      return v => v === 0 ? '0' : v.toFixed(2);
    case 'INP':
      return v => i18n.TimeUtilities.preciseMillisToString(v);
  }
}

function getHelpLink(metric: Metric): Platform.DevToolsPath.UrlString {
  switch (metric) {
    case 'LCP':
      return 'https://web.dev/articles/lcp' as Platform.DevToolsPath.UrlString;
    case 'CLS':
      return 'https://web.dev/articles/cls' as Platform.DevToolsPath.UrlString;
    case 'INP':
      return 'https://web.dev/articles/inp' as Platform.DevToolsPath.UrlString;
  }
}

function getHelpTooltip(metric: Metric): string {
  switch (metric) {
    case 'LCP':
      return i18nString(UIStrings.lcpHelpTooltip);
    case 'CLS':
      return i18nString(UIStrings.clsHelpTooltip);
    case 'INP':
      return i18nString(UIStrings.inpHelpTooltip);
  }
}

function bucketIndexForRating(rating: MetricRating): number {
  switch (rating) {
    case 'good':
      return 0;
    case 'needs-improvement':
      return 1;
    case 'poor':
      return 2;
  }
}

function getBarWidthForRating(histogram: CrUXManager.MetricResponse['histogram']|undefined,
                              rating: MetricRating): string {
  const density = histogram?.[bucketIndexForRating(rating)].density || 0;
  const percent = Math.round(density * 100);
  return `${percent}%`;
}

function getPercentLabelForRating(histogram: CrUXManager.MetricResponse['histogram']|undefined,
                                  rating: MetricRating): string {
  if (histogram === undefined) {
    return '-';
  }

  // A missing density value should be interpreted as 0%
  const density = histogram[bucketIndexForRating(rating)].density || 0;
  const percent = Math.round(density * 100);
  return i18nString(UIStrings.percentage, {PH1: percent});
}

interface ViewInput {
  metric: 'LCP'|'CLS'|'INP';
  localValue?: number;
  fieldValue?: number;
  histogram?: CrUXManager.MetricResponse['histogram'];
  subparts?: SubpartTable;
  warnings?: string[];
}

type View = (input: ViewInput, output: object, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  const {metric, localValue, fieldValue} = input;

  /**
   * Returns if the local value is better/worse/similar compared to field.
   */
  function getCompareRating(): CompareRating|undefined {
    if (localValue === undefined || fieldValue === undefined) {
      return;
    }

    return determineCompareRating(metric, localValue, fieldValue);
  }

  function renderCompareString(): LitTemplate {
    if (localValue === undefined) {
      if (metric === 'INP') {
        return html`
          <div class="compare-text">${i18nString(UIStrings.interactToMeasure)}</div>
        `;
      }
      return nothing;
    }

    const compare = getCompareRating();
    const rating = rateMetric(localValue, getThresholds(metric));

    const valueEl = renderMetricValue(getMetricValueLogContext(true), localValue, getThresholds(metric),
                                      getFormatFn(metric), {dim: true});

    // clang-format off
    return html`
      <div class="compare-text">
        ${renderCompareText({
          metric: i18n.i18n.lockedString(metric),
          rating,
          compare,
          localValue: valueEl,
        })}
      </div>
    `;
    // clang-format on
  }

  function renderEnvironmentRecommendations(): LitTemplate {
    const compare = getCompareRating();
    if (!compare || compare === 'similar') {
      return nothing;
    }

    const recs: string[] = [];

    // Recommend using throttling
    if (metric === 'LCP' && compare === 'better') {
      recs.push(i18nString(UIStrings.recThrottlingLCP));
    } else if (metric === 'INP' && compare === 'better') {
      recs.push(i18nString(UIStrings.recThrottlingINP));
    }

    // Recommend trying new viewport sizes
    if (metric === 'LCP') {
      recs.push(i18nString(UIStrings.recViewportLCP));
    } else if (metric === 'CLS') {
      recs.push(i18nString(UIStrings.recViewportCLS));
    }

    // Recommend trying new user journeys
    if (metric === 'CLS') {
      recs.push(i18nString(UIStrings.recJourneyCLS));
    } else if (metric === 'INP') {
      recs.push(i18nString(UIStrings.recJourneyINP));
    }

    // Recommend accounting for dynamic content
    if (metric === 'LCP') {
      recs.push(i18nString(UIStrings.recDynamicContentLCP));
    } else if (metric === 'CLS') {
      recs.push(i18nString(UIStrings.recDynamicContentCLS));
    }

    if (!recs.length) {
      return nothing;
    }

    return html`
      <details class="environment-recs">
        <summary>${i18nString(UIStrings.considerTesting)}</summary>
        <ul class="environment-recs-list">${recs.map(rec => html`<li>${rec}</li>`)}</ul>
      </details>
    `;
  }

  function getMetricValueLogContext(isLocal: boolean): string {
    return `timeline.landing.${isLocal ? 'local' : 'field'}-${input.metric.toLowerCase()}`;
  }

  function renderDetailedCompareString(): LitTemplate {
    if (localValue === undefined) {
      if (metric === 'INP') {
        return html`
          <div class="detailed-compare-text">${i18nString(UIStrings.interactToMeasure)}</div>
        `;
      }
      return nothing;
    }

    const localRating = rateMetric(localValue, getThresholds(metric));

    const fieldRating = fieldValue !== undefined ? rateMetric(fieldValue, getThresholds(metric)) : undefined;

    const localValueEl = renderMetricValue(getMetricValueLogContext(true), localValue, getThresholds(metric),
                                           getFormatFn(metric), {dim: true});
    const fieldValueEl = renderMetricValue(getMetricValueLogContext(false), fieldValue, getThresholds(metric),
                                           getFormatFn(metric), {dim: true});

    // clang-format off
    return html`
      <div class="detailed-compare-text">${renderDetailedCompareText({
        metric: i18n.i18n.lockedString(metric),
        localRating,
        fieldRating,
        localValue: localValueEl,
        fieldValue: fieldValueEl,
        percent: getPercentLabelForRating(input.histogram, localRating),
      })}</div>
    `;
    // clang-format on
  }

  function renderFieldHistogram(): LitTemplate {
    const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;

    const format = getFormatFn(metric);
    const thresholds = getThresholds(metric);

    // clang-format off
    const goodLabel = html`
      <div class="bucket-label">
        <span>${i18nString(UIStrings.good)}</span>
        <span class="bucket-range"> ${i18nString(UIStrings.leqRange, {PH1: format(thresholds[0])})}</span>
      </div>
    `;

    const needsImprovementLabel = html`
      <div class="bucket-label">
        <span>${i18nString(UIStrings.needsImprovement)}</span>
        <span class="bucket-range"> ${i18nString(UIStrings.betweenRange, {PH1: format(thresholds[0]), PH2: format(thresholds[1])})}</span>
      </div>
    `;

    const poorLabel = html`
      <div class="bucket-label">
        <span>${i18nString(UIStrings.poor)}</span>
        <span class="bucket-range"> ${i18nString(UIStrings.gtRange, {PH1: format(thresholds[1])})}</span>
      </div>
    `;
    // clang-format on

    if (!fieldEnabled) {
      return html`
        <div class="bucket-summaries">
          ${goodLabel}
          ${needsImprovementLabel}
          ${poorLabel}
        </div>
      `;
    }

    // clang-format off
    return html`
      <div class="bucket-summaries histogram" jslog=${VisualLogging.canvas('metric-histogram')}>
        ${goodLabel}
        <div class="histogram-bar good-bg" style="width: ${getBarWidthForRating(input.histogram, 'good')}"></div>
        <div class="histogram-percent">${getPercentLabelForRating(input.histogram, 'good')}</div>
        ${needsImprovementLabel}
        <div class="histogram-bar needs-improvement-bg" style="width: ${getBarWidthForRating(input.histogram, 'needs-improvement')}"></div>
        <div class="histogram-percent">${getPercentLabelForRating(input.histogram, 'needs-improvement')}</div>
        ${poorLabel}
        <div class="histogram-bar poor-bg" style="width: ${getBarWidthForRating(input.histogram, 'poor')}"></div>
        <div class="histogram-percent">${getPercentLabelForRating(input.histogram, 'poor')}</div>
      </div>
    `;
    // clang-format on
  }

  function renderSubpartTable(subparts: SubpartTable): LitTemplate {
    const hasFieldData = subparts.every(subpart => subpart[2] !== undefined);

    // clang-format off
    return html`
      <hr class="divider">
      <div class="subpart-table" role="table">
        <div class="subpart-table-row subpart-table-header-row" role="row">
          <div role="columnheader" style="grid-column: 1">${i18nString(UIStrings.subpart)}</div>
          <div role="columnheader" class="subpart-table-value" style="grid-column: 2">${i18nString(UIStrings.localValue)}</div>
          ${hasFieldData ? html`
            <div
              role="columnheader"
              class="subpart-table-value"
              style="grid-column: 3"
              title=${i18nString(UIStrings.field75thPercentile)}>${i18nString(UIStrings.fieldP75)}</div>
          ` : nothing}
        </div>
        ${subparts.map(subpart => html`
          <div class="subpart-table-row" role="row" jslog=${VisualLogging.tableRow('metric-subpart')}>
            <div role="cell">${subpart[0]}</div>
            <div role="cell" class="subpart-table-value">${i18n.TimeUtilities.preciseMillisToString(subpart[1])}</div>
            ${subpart[2] !== undefined ? html`
              <div role="cell" class="subpart-table-value">${i18n.TimeUtilities.preciseMillisToString(subpart[2])}</div>
            ` : nothing}
          </div>
        `)}
      </div>
    `;
    // clang-format on
  }

  const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;
  const helpLink = getHelpLink(metric);
  const thresholds = getThresholds(metric);
  const formatFn = getFormatFn(metric);

  const localValueEl = renderMetricValue(getMetricValueLogContext(true), localValue, thresholds, formatFn);
  const fieldValueEl = renderMetricValue(getMetricValueLogContext(false), fieldValue, thresholds, formatFn);

  // clang-format off
  render(html`
      <style>${metricCardStyles}</style>
      <style>${metricValueStyles}</style>
      <div class="metric-card" jslog=${VisualLogging.section(Platform.StringUtilities.toKebabCase(metric))}>
        <h3 class="title">
          ${getTitle(metric)}
          <devtools-button
            class="title-help"
            title=${getHelpTooltip(metric)}
            .iconName=${'help'}
            .variant=${Buttons.Button.Variant.ICON}
            @click=${() => UIHelpers.openInNewTab(helpLink)}
          ></devtools-button>
        </h3>
        <div tabindex="0" class="metric-values-section" aria-details="tooltip">
          <div class="metric-source-block">
            <div class="metric-source-value" id="local-value">${localValueEl}</div>
            ${fieldEnabled ? html`<div class="metric-source-label">${i18nString(UIStrings.localValue)}</div>` : nothing}
          </div>
          ${fieldEnabled ? html`
            <div class="metric-source-block">
              <div class="metric-source-value" id="field-value">${fieldValueEl}</div>
              <div class="metric-source-label">${i18nString(UIStrings.field75thPercentile)}</div>
            </div>
          `: nothing}
        </div>
        <devtools-tooltip
          id="tooltip"
          variant="rich"
          hover-delay="500"
          aria-label=${i18nString(UIStrings.viewCardDetails)}
        >
          <div class="tooltip-contents">
            ${renderDetailedCompareString()}
            <hr class="divider">
            ${renderFieldHistogram()}
            ${localValue && input.subparts ? renderSubpartTable(input.subparts) : nothing}
          </div>
        </devtools-tooltip>
        ${fieldEnabled ? html`<hr class="divider">` : nothing}
        ${renderCompareString()}
        ${input.warnings?.map(warning => html`
          <div class="warning">${warning}</div>
        `)}
        ${renderEnvironmentRecommendations()}
        <slot name="extra-info"></slot>
      </div>
    `, target);
  // clang-format on
};

export class MetricCard extends UI.Widget.VBox {
  readonly #view: View;
  #metric: Metric = 'LCP';
  #localValue?: number;
  #fieldValue?: number|string;
  #histogram?: CrUXManager.MetricResponse['histogram'];
  #subparts?: SubpartTable;
  #warnings?: string[];

  constructor(target?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(target, {useShadowDom: true});
    this.#view = view;
  }

  get metric(): Metric {
    return this.#metric;
  }

  set metric(metric: Metric) {
    if (this.#metric === metric) {
      return;
    }
    this.#metric = metric;
    this.requestUpdate();
  }

  get localValue(): number|undefined {
    return this.#localValue;
  }

  set localValue(localValue: number|undefined) {
    if (this.#localValue === localValue) {
      return;
    }
    this.#localValue = localValue;
    this.requestUpdate();
  }

  get fieldValue(): number|string|undefined {
    return this.#fieldValue;
  }

  set fieldValue(fieldValue: number|string|undefined) {
    if (this.#fieldValue === fieldValue) {
      return;
    }
    this.#fieldValue = fieldValue;
    this.requestUpdate();
  }

  get histogram(): CrUXManager.MetricResponse['histogram']|undefined {
    return this.#histogram;
  }

  set histogram(histogram: CrUXManager.MetricResponse['histogram']|undefined) {
    if (this.#histogram === histogram) {
      return;
    }
    this.#histogram = histogram;
    this.requestUpdate();
  }

  get subparts(): SubpartTable|undefined {
    return this.#subparts;
  }

  set subparts(subparts: SubpartTable|undefined) {
    if (this.#subparts === subparts) {
      return;
    }
    this.#subparts = subparts;
    this.requestUpdate();
  }

  get warnings(): string[]|undefined {
    return this.#warnings;
  }

  set warnings(warnings: string[]|undefined) {
    if (this.#warnings === warnings) {
      return;
    }
    this.#warnings = warnings;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    CrUXManager.CrUXManager.instance().getConfigSetting().addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    CrUXManager.CrUXManager.instance().getConfigSetting().removeChangeListener(this.requestUpdate, this);
  }

  override performUpdate(): void {
    const fieldValue = typeof this.#fieldValue === 'string' ? Number(this.#fieldValue) : this.#fieldValue;
    this.#view({
      metric: this.#metric,
      localValue: this.#localValue,
      fieldValue: fieldValue !== undefined && Number.isFinite(fieldValue) ? fieldValue : undefined,
      histogram: this.#histogram,
      subparts: this.#subparts,
      warnings: this.#warnings,
    },
               {}, this.contentElement);
  }
}
