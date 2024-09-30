// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as Platform from '../../../core/platform/platform.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LegacyWrapper from '../../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as VisualLogging from '../../../ui/visual_logging/visual_logging.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import {CPUThrottlingSelector} from './CPUThrottlingSelector.js';
import {FieldSettingsDialog} from './FieldSettingsDialog.js';
import liveMetricsViewStyles from './liveMetricsView.css.js';
import {renderCompareText, renderDetailedCompareText} from './MetricCompareStrings.js';
import {NetworkThrottlingSelector} from './NetworkThrottlingSelector.js';

const {html, nothing, Directives} = LitHtml;
const {until} = Directives;

type MetricRating = 'good'|'needs-improvement'|'poor';
type MetricThresholds = [number, number];
type DeviceOption = CrUXManager.DeviceScope|'AUTO';

// TODO: Consolidate our metric rating logic with the trace engine.
const LCP_THRESHOLDS = [2500, 4000] as MetricThresholds;
const CLS_THRESHOLDS = [0.1, 0.25] as MetricThresholds;
const INP_THRESHOLDS = [200, 500] as MetricThresholds;

const DEVICE_OPTION_LIST: DeviceOption[] = ['AUTO', ...CrUXManager.DEVICE_SCOPE_LIST];

const RTT_COMPARISON_THRESHOLD = 200;
const RTT_MINIMUM = 60;

const UIStrings = {
  /**
   * @description Title of a view that shows performance metrics from the local environment and field metrics collected from real users in the field.
   */
  localAndFieldMetrics: 'Local and field metrics',
  /**
   * @description Title of a view that shows performance metrics from the local environment.
   */
  localMetrics: 'Local metrics',
  /**
   * @description Title of a section that lists user interactions.
   */
  interactions: 'Interactions',
  /**
   * @description Title of a sidebar section that shows options for the user to take after using the main view.
   */
  nextSteps: 'Next steps',
  /**
   * @description Title of a section that shows options for how real user data in the field should be fetched.
   */
  fieldData: 'Field data',
  /**
   * @description Title of a section that shows recording settings.
   */
  recordingSettings: 'Recording settings',
  /**
   * @description Title of a report section for the largest contentful paint metric.
   */
  lcpTitle: 'Largest Contentful Paint (LCP)',
  /**
   * @description Title of a report section for the cumulative layout shift metric.
   */
  clsTitle: 'Cumulative Layout Shift (CLS)',
  /**
   * @description Title of a report section for the interaction to next paint metric.
   */
  inpTitle: 'Interaction to Next Paint (INP)',
  /**
   * @description Label for a metric value that was measured in the local environment.
   */
  localValue: 'Local',
  /**
   * @description Label for the 75th percentile of a metric according to data collected from real users in the field.
   */
  field75thPercentile: 'Field 75th Percentile',
  /**
   * @description Label for an select box that selects which device type field data be shown for (e.g. desktop/mobile/all devices/etc).
   * @example {Mobile} PH1
   */
  showFieldDataForDevice: 'Show field data for device type: {PH1}',
  /**
   * @description Label for an select box that selects which device type field data be shown for (e.g. desktop/mobile/all devices/etc).
   * @example {Mobile} PH1
   */
  device: 'Device: {PH1}',
  /**
   * @description Label for an option to select all device form factors.
   */
  allDevices: 'All devices',
  /**
   * @description Label for an option to select the desktop form factor.
   */
  desktop: 'Desktop',
  /**
   * @description Label for an option to select the mobile form factor.
   */
  mobile: 'Mobile',
  /**
   * @description Label for an option to select the tablet form factor.
   */
  tablet: 'Tablet',
  /**
   * @description Label for an option to to automatically select the form factor. The automatic selection will be displayed in PH1.
   * @example {Desktop} PH1
   */
  auto: 'Auto ({PH1})',
  /**
   * @description Label for an option that is loading.
   * @example {Desktop} PH1
   */
  loadingOption: '{PH1} - Loading…',
  /**
   * @description Label for an option that does not have enough data and the user should ignore.
   * @example {Desktop} PH1
   */
  needsDataOption: '{PH1} - No data',
  /**
   * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
   */
  urlOption: 'URL',
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   */
  originOption: 'Origin',
  /**
   * @description Label for an option that selects the page's specific URL as opposed to it's entire origin/domain.
   * @example {https://example.com/} PH1
   */
  urlOptionWithKey: 'URL: {PH1}',
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   * @example {https://example.com} PH1
   */
  originOptionWithKey: 'Origin: {PH1}',
  /**
   * @description Label for an combo-box that indicates if field data should be taken from the page's URL or it's origin/domain.
   * @example {Origin: https://example.com} PH1
   */
  showFieldDataForPage: 'Show field data for {PH1}',
  /**
   * @description Text block recommendation instructing the user to disable network throttling to best match real user network data.
   */
  tryDisablingThrottling: 'Try disabling network throttling to approximate the network latency measured by real users.',
  /**
   * @description Text block recommendation instructing the user to enable a throttling preset to best match real user network data.
   * @example {Slow 4G} PH1
   */
  tryUsingThrottling: 'Try using {PH1} network throttling to approximate the network latency measured by real users.',
  /**
   * @description Text block recommendation instructing the user to emulate a mobile device to match most real users.
   */
  mostUsersMobile: 'A majority of users are on mobile. Try emulating a mobile device that matches real users.',
  /**
   * @description Text block recommendation instructing the user to emulate different desktop window sizes to match most real users.
   */
  mostUsersDesktop: 'A majority of users are on desktop. Try emulating a desktop window size that matches real users.',
  /**
   * @description Text label for a link to the Largest Contentful Paint (LCP) related DOM node.
   */
  lcpElement: 'LCP Element',
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
   * @description Label for a a range of dates that represents the period of time a set of field data is collected from.
   */
  collectionPeriod: 'Collection period:',
  /**
   * @description Text showing a range of dates meant to represent a period of time.
   * @example {Oct 1, 2024} PH1
   * @example {Nov 1, 2024} PH2
   */
  dateRange: '{PH1} - {PH2}',
  /**
   * @description Text block telling the user to see how performance metrics measured on their local computer compare to data collected from real users. PH1 will be a link to more information about the Chrome UX Report and the link text will be untranslated because it is a product name.
   * @example {Chrome UX Report} PH1
   */
  seeHowYourLocalMetricsCompare: 'See how your local metrics compare to real user data in the {PH1}.',
  /**
   * @description Text block explaining that local metrics are collected from the local environment used to load the page being tested. PH1 will be a link with text that will be translated separately.
   * @example {local metrics} PH1
   */
  theLocalMetricsAre: 'The {PH1} are captured from the current page using your network connection and device.',
  /**
   * @description Link text that is inserted in another translated text block that describes performance metrics measured in the developers local environment.
   */
  localMetricsLink: 'local metrics',
  /**
   * @description Text block explaining that field metrics are measured by real users using many different connections and hardware over a 28 period. PH1 will be a link with text that will be translated separately.
   * @example {field data} PH1
   */
  theFieldMetricsAre: 'The {PH1} is measured by real users using many different network connections and devices.',
  /**
   * @description Link text that is inserted in another translated text block that describes performance data measured by real users in the field.
   */
  fieldDataLink: 'field data',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LiveMetricsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

function rateMetric(value: number, thresholds: MetricThresholds): MetricRating {
  if (value <= thresholds[0]) {
    return 'good';
  }
  if (value <= thresholds[1]) {
    return 'needs-improvement';
  }
  return 'poor';
}

function renderMetricValue(
    jslogContext: string, value: number|undefined, thresholds: MetricThresholds, format: (value: number) => string,
    options?: {dim?: boolean}): HTMLElement {
  const metricValueEl = document.createElement('span');
  metricValueEl.classList.add('metric-value');
  if (value === undefined) {
    metricValueEl.classList.add('waiting');
    metricValueEl.textContent = '-';
    return metricValueEl;
  }

  metricValueEl.textContent = format(value);
  const rating = rateMetric(value, thresholds);
  metricValueEl.classList.add(rating);
  // Ensure we log impressions of each section. We purposefully add this here
  // because if we don't have field data (dealt with in the undefined branch
  // above), we do not want to log an impression on it.
  metricValueEl.setAttribute('jslog', `${VisualLogging.section(jslogContext)}`);
  if (options?.dim) {
    metricValueEl.classList.add('dim');
  }

  return metricValueEl;
}

export interface MetricCardData {
  metric: 'LCP'|'CLS'|'INP';
  localValue?: number;
  fieldValue?: number|string;
  histogram?: CrUXManager.MetricResponse['histogram'];
  tooltipContainer?: HTMLElement;
}

export class MetricCard extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-metric-card`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();

    this.#render();
  }

  #tooltipEl?: HTMLElement;

  #data: MetricCardData = {
    metric: 'LCP',
  };

  set data(data: MetricCardData) {
    this.#data = data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [liveMetricsViewStyles];

    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #hideTooltipOnEsc = (event: KeyboardEvent): void => {
    if (Platform.KeyboardUtilities.isEscKey(event)) {
      event.stopPropagation();
      this.#hideTooltip();
    }
  };

  #hideTooltipOnMouseLeave(event: Event): void {
    const target = event.target as HTMLElement;
    if (target?.hasFocus()) {
      return;
    }

    this.#hideTooltip();
  }

  #hideTooltipOnFocusOut(event: FocusEvent): void {
    const target = event.target as HTMLElement;
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

  #hideTooltip(): void {
    const tooltipEl = this.#tooltipEl;
    if (!tooltipEl) {
      return;
    }

    document.body.removeEventListener('keydown', this.#hideTooltipOnEsc);

    tooltipEl.style.left = '';
    tooltipEl.style.maxWidth = '';
    tooltipEl.style.display = 'none';
  }

  #showTooltip(): void {
    const tooltipEl = this.#tooltipEl;
    if (!tooltipEl || tooltipEl.style.display === 'block') {
      return;
    }

    document.body.addEventListener('keydown', this.#hideTooltipOnEsc);

    tooltipEl.style.display = 'block';

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
      } else if (rightDiff > 0) {
        offset = Math.round(rightDiff);
      }

      tooltipEl.style.left = `calc(50% - ${offset}px)`;
    });
  }

  #getTitle(): string {
    switch (this.#data.metric) {
      case 'LCP':
        return i18nString(UIStrings.lcpTitle);
      case 'CLS':
        return i18nString(UIStrings.clsTitle);
      case 'INP':
        return i18nString(UIStrings.inpTitle);
    }
  }

  #getThresholds(): MetricThresholds {
    switch (this.#data.metric) {
      case 'LCP':
        return LCP_THRESHOLDS;
      case 'CLS':
        return CLS_THRESHOLDS;
      case 'INP':
        return INP_THRESHOLDS;
    }
  }

  #getFormatFn(): (value: number) => string {
    switch (this.#data.metric) {
      case 'LCP':
        return v => i18n.TimeUtilities.millisToString(v);
      case 'CLS':
        return v => v === 0 ? '0' : v.toFixed(2);
      case 'INP':
        return v => i18n.TimeUtilities.millisToString(v);
    }
  }

  #getLocalValue(): number|undefined {
    const {localValue} = this.#data;
    if (localValue === undefined) {
      return;
    }

    return localValue;
  }

  #getFieldValue(): number|undefined {
    let {fieldValue} = this.#data;
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

  #getCompareRating(): 'better'|'worse'|'similar'|undefined {
    const localValue = this.#getLocalValue();
    const fieldValue = this.#getFieldValue();
    if (localValue === undefined || fieldValue === undefined) {
      return;
    }

    const threshold = this.#getThresholds()[0];
    if (localValue - fieldValue > threshold) {
      return 'worse';
    }
    if (fieldValue - localValue > threshold) {
      return 'better';
    }

    return 'similar';
  }

  #renderCompareString(): LitHtml.LitTemplate {
    const localValue = this.#getLocalValue();
    if (localValue === undefined) {
      if (this.#data.metric === 'INP') {
        return html`
          <div class="compare-text">${i18nString(UIStrings.interactToMeasure)}</div>
        `;
      }
      return LitHtml.nothing;
    }

    const compare = this.#getCompareRating();
    const rating = rateMetric(localValue, this.#getThresholds());

    const valueEl = renderMetricValue(
        this.#getMetricValueLogContext(true), localValue, this.#getThresholds(), this.#getFormatFn(), {dim: true});

    // clang-format off
    return html`
      <div class="compare-text">
        ${renderCompareText(rating, compare, {
          PH1: this.#data.metric,
          PH2: valueEl,
        })}
      </div>
    `;
    // clang-format on
  }

  #getMetricValueLogContext(isLocal: boolean): string {
    return `timeline.landing.${isLocal ? 'local' : 'field'}-${this.#data.metric.toLowerCase()}`;
  }

  #renderDetailedCompareString(): LitHtml.LitTemplate {
    const localValue = this.#getLocalValue();
    if (localValue === undefined) {
      if (this.#data.metric === 'INP') {
        return html`
          <div class="detailed-compare-text">${i18nString(UIStrings.interactToMeasure)}</div>
        `;
      }
      return LitHtml.nothing;
    }

    const localRating = rateMetric(localValue, this.#getThresholds());

    const fieldValue = this.#getFieldValue();
    const fieldRating = fieldValue !== undefined ? rateMetric(fieldValue, this.#getThresholds()) : undefined;

    const localValueEl = renderMetricValue(
        this.#getMetricValueLogContext(true), localValue, this.#getThresholds(), this.#getFormatFn(), {dim: true});
    const fieldValueEl = renderMetricValue(
        this.#getMetricValueLogContext(false), fieldValue, this.#getThresholds(), this.#getFormatFn(), {dim: true});

    // clang-format off
    return html`
      <div class="detailed-compare-text">${renderDetailedCompareText(localRating, fieldRating, {
        PH1: this.#data.metric,
        PH2: localValueEl,
        PH3: fieldValueEl,
        PH4: this.#getPercentLabelForRating(localRating),
      })}</div>
    `;
    // clang-format on
  }

  #bucketIndexForRating(rating: MetricRating): number {
    switch (rating) {
      case 'good':
        return 0;
      case 'needs-improvement':
        return 1;
      case 'poor':
        return 2;
    }
  }

  #getBarWidthForRating(rating: MetricRating): string {
    const histogram = this.#data.histogram;
    const density = histogram?.[this.#bucketIndexForRating(rating)].density || 0;
    const percent = Math.round(density * 100);
    return `${percent}%`;
  }

  #getPercentLabelForRating(rating: MetricRating): string {
    const histogram = this.#data.histogram;
    if (histogram === undefined) {
      return '-';
    }

    // A missing density value should be interpreted as 0%
    const density = histogram[this.#bucketIndexForRating(rating)].density || 0;
    const percent = Math.round(density * 100);
    return i18nString(UIStrings.percentage, {PH1: percent});
  }

  #renderFieldHistogram(): LitHtml.LitTemplate {
    const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;

    const format = this.#getFormatFn();
    const thresholds = this.#getThresholds();

    // clang-format off
    const goodLabel = html`
      <div class="bucket-label">
        <span>${i18nString(UIStrings.good)}</span>
        <span class="bucket-range">${i18nString(UIStrings.leqRange, {PH1: format(thresholds[0])})}</span>
      </div>
    `;

    const needsImprovementLabel = html`
      <div class="bucket-label">
        <span>${i18nString(UIStrings.needsImprovement)}</span>
        <span class="bucket-range">${i18nString(UIStrings.betweenRange, {PH1: format(thresholds[0]), PH2: format(thresholds[1])})}</span>
      </div>
    `;

    const poorLabel = html`
      <div class="bucket-label">
        <span>${i18nString(UIStrings.poor)}</span>
        <span class="bucket-range">${i18nString(UIStrings.gtRange, {PH1: format(thresholds[1])})}</span>
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

  #render = (): void => {
    const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;

    // clang-format off
    const output = html`
      <div class="metric-card">
        <h3 class="card-title">
          ${this.#getTitle()}
        </h3>
        <div tabindex="0" class="card-values"
          @mouseenter=${this.#showTooltip}
          @mouseleave=${this.#hideTooltipOnMouseLeave}
          @focusin=${this.#showTooltip}
          @focusout=${this.#hideTooltipOnFocusOut}
          aria-describedby="tooltip"
        >
          <div class="card-value-block">
            <div class="card-value" id="local-value">${renderMetricValue(
              this.#getMetricValueLogContext(true),
              this.#getLocalValue(), this.#getThresholds(), this.#getFormatFn())}</div>
            ${fieldEnabled ? html`<div class="card-metric-label">${i18nString(UIStrings.localValue)}</div>` : nothing}
          </div>
          ${fieldEnabled ? html`
            <div class="card-value-block">
              <div class="card-value" id="field-value">${renderMetricValue(
                this.#getMetricValueLogContext(false),
                this.#getFieldValue(), this.#getThresholds(), this.#getFormatFn())}</div>
              <div class="card-value-label">${i18nString(UIStrings.field75thPercentile)}</div>
            </div>
          `: nothing}
          <div
            id="tooltip"
            class="tooltip"
            role="tooltip"
            aria-label=${i18nString(UIStrings.viewCardDetails)}
            on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
              this.#tooltipEl = node as HTMLElement;
            })}
          >
            ${this.#renderDetailedCompareString()}
            <hr class="divider">
            ${this.#renderFieldHistogram()}
          </div>
        </div>
        ${fieldEnabled ? html`<hr class="divider">` : nothing}
        ${this.#renderCompareString()}
        <slot name="extra-info"><slot>
      </div>
    `;
    LitHtml.render(output, this.#shadow, {host: this});
  };
  // clang-format on
}

export class LiveMetricsView extends LegacyWrapper.LegacyWrapper.WrappableComponent {
  static readonly litTagName = LitHtml.literal`devtools-live-metrics-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #lcpValue?: LiveMetrics.LCPValue;
  #clsValue?: LiveMetrics.CLSValue;
  #inpValue?: LiveMetrics.INPValue;
  #interactions: LiveMetrics.InteractionValue[] = [];

  #cruxPageResult?: CrUXManager.PageResult;

  #fieldDeviceOption: DeviceOption = 'AUTO';
  #fieldPageScope: CrUXManager.PageScope = 'url';

  #toggleRecordAction: UI.ActionRegistration.Action;
  #recordReloadAction: UI.ActionRegistration.Action;

  #tooltipContainerEl?: Element;
  #interactionsListEl?: HTMLElement;
  #interactionsListScrolling = false;

  constructor() {
    super();

    this.#toggleRecordAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.toggle-recording');
    this.#recordReloadAction = UI.ActionRegistry.ActionRegistry.instance().getAction('timeline.record-reload');

    this.#render();
  }

  #onMetricStatus(event: {data: LiveMetrics.StatusEvent}): void {
    this.#lcpValue = event.data.lcp;
    this.#clsValue = event.data.cls;
    this.#inpValue = event.data.inp;

    const hasNewInteraction = this.#interactions.length < event.data.interactions.length;
    this.#interactions = [...event.data.interactions];

    const renderPromise = ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);

    const listEl = this.#interactionsListEl;
    if (!hasNewInteraction || !listEl) {
      return;
    }

    const isAtBottom = Math.abs(listEl.scrollHeight - listEl.clientHeight - listEl.scrollTop) <= 1;

    // We shouldn't scroll to the bottom if the list wasn't already at the bottom.
    // However, if a new item appears while the animation for a previous item is still going,
    // then we should "finish" the scroll by sending another scroll command even if the scroll position
    // the element hasn't scrolled all the way to the bottom yet.
    if (!isAtBottom && !this.#interactionsListScrolling) {
      return;
    }

    void renderPromise.then(() => {
      requestAnimationFrame(() => {
        this.#interactionsListScrolling = true;
        listEl.addEventListener('scrollend', () => {
          this.#interactionsListScrolling = false;
        }, {once: true});
        listEl.scrollTo({top: listEl.scrollHeight, behavior: 'smooth'});
      });
    });
  }

  #onFieldDataChanged(event: {data: CrUXManager.PageResult|undefined}): void {
    this.#cruxPageResult = event.data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #onEmulationChanged(): void {
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  async #refreshFieldDataForCurrentPage(): Promise<void> {
    this.#cruxPageResult = await CrUXManager.CrUXManager.instance().getFieldDataForCurrentPage();
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #getSelectedFieldResponse(): CrUXManager.CrUXResponse|null|undefined {
    const deviceScope = this.#fieldDeviceOption === 'AUTO' ? this.#getAutoDeviceScope() : this.#fieldDeviceOption;
    return this.#cruxPageResult?.[`${this.#fieldPageScope}-${deviceScope}`];
  }

  #getFieldMetricData(fieldMetric: CrUXManager.StandardMetricNames): CrUXManager.MetricResponse|undefined {
    return this.#getSelectedFieldResponse()?.record.metrics[fieldMetric];
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [liveMetricsViewStyles];

    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    liveMetrics.addEventListener(LiveMetrics.Events.Status, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.addEventListener(CrUXManager.Events.FieldDataChanged, this.#onFieldDataChanged, this);

    const emulationModel = this.#deviceModeModel();
    emulationModel?.addEventListener(EmulationModel.DeviceModeModel.Events.Updated, this.#onEmulationChanged, this);

    if (cruxManager.getConfigSetting().get().enabled) {
      void this.#refreshFieldDataForCurrentPage();
    }

    this.#lcpValue = liveMetrics.lcpValue;
    this.#clsValue = liveMetrics.clsValue;
    this.#inpValue = liveMetrics.inpValue;
    this.#interactions = liveMetrics.interactions;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #deviceModeModel(): EmulationModel.DeviceModeModel.DeviceModeModel|null {
    // This is wrapped in a try/catch because in some DevTools entry points
    // (such as worker_app.ts) the Emulation panel is not included and as such
    // the below code fails; it tries to instantiate the model which requires
    // reading the value of a setting which has not been registered.
    // In this case, we fallback to 'ALL'. See crbug.com/361515458 for an
    // example bug that this resolves.
    try {
      return EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    } catch {
      return null;
    }
  }

  disconnectedCallback(): void {
    LiveMetrics.LiveMetrics.instance().removeEventListener(LiveMetrics.Events.Status, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.removeEventListener(CrUXManager.Events.FieldDataChanged, this.#onFieldDataChanged, this);

    this.#deviceModeModel()?.removeEventListener(
        EmulationModel.DeviceModeModel.Events.Updated, this.#onEmulationChanged, this);
  }

  #renderLcpCard(): LitHtml.LitTemplate {
    const fieldData = this.#getFieldMetricData('largest_contentful_paint');
    const node = this.#lcpValue?.node;

    // clang-format off
    return html`
      <${MetricCard.litTagName} .data=${{
        metric: 'LCP',
        localValue: this.#lcpValue?.value,
        fieldValue: fieldData?.percentiles?.p75,
        histogram: fieldData?.histogram,
        tooltipContainer: this.#tooltipContainerEl,
      } as MetricCardData}>
        ${node ? html`
            <div class="related-element-info" slot="extra-info">
              <span class="related-element-label">${i18nString(UIStrings.lcpElement)}</span>
              <span class="related-element-link">${until(Common.Linkifier.Linkifier.linkify(node))}</span>
            </div>
          `
          : nothing}
      </${MetricCard.litTagName}>
    `;
    // clang-format on
  }

  #renderClsCard(): LitHtml.LitTemplate {
    const fieldData = this.#getFieldMetricData('cumulative_layout_shift');

    // clang-format off
    return html`
      <${MetricCard.litTagName} .data=${{
        metric: 'CLS',
        localValue: this.#clsValue?.value,
        fieldValue: fieldData?.percentiles?.p75,
        histogram: fieldData?.histogram,
        tooltipContainer: this.#tooltipContainerEl,
      } as MetricCardData}>
      </${MetricCard.litTagName}>
    `;
    // clang-format on
  }

  #renderInpCard(): LitHtml.LitTemplate {
    const fieldData = this.#getFieldMetricData('interaction_to_next_paint');

    // clang-format off
    return html`
      <${MetricCard.litTagName} .data=${{
        metric: 'INP',
        localValue: this.#inpValue?.value,
        fieldValue: fieldData?.percentiles?.p75,
        histogram: fieldData?.histogram,
        tooltipContainer: this.#tooltipContainerEl,
      } as MetricCardData}>
      </${MetricCard.litTagName}>
    `;
    // clang-format on
  }

  #renderRecordAction(action: UI.ActionRegistration.Action): LitHtml.LitTemplate {
    function onClick(): void {
      void action.execute();
    }

    // clang-format off
    return html`
      <div class="record-action">
        <${Buttons.Button.Button.litTagName} @click=${onClick} .data=${{
            variant: Buttons.Button.Variant.TEXT,
            size: Buttons.Button.Size.REGULAR,
            iconName: action.icon(),
            title: action.title(),
            jslogContext: action.id(),
        } as Buttons.Button.ButtonData}>
          ${action.title()}
        </${Buttons.Button.Button.litTagName}>
        <span class="shortcut-label">${UI.ShortcutRegistry.ShortcutRegistry.instance().shortcutTitleForAction(action.id())}</span>
      </div>
    `;
    // clang-format on
  }

  #getClosestNetworkPreset(): SDK.NetworkManager.Conditions|null {
    const response = this.#getFieldMetricData('round_trip_time');
    if (!response?.percentiles) {
      return null;
    }

    const rtt = Number(response.percentiles.p75);
    if (!Number.isFinite(rtt)) {
      return null;
    }

    if (rtt < RTT_MINIMUM) {
      return SDK.NetworkManager.NoThrottlingConditions;
    }

    let closestPreset: SDK.NetworkManager.Conditions|null = null;
    let smallestDiff = Infinity;
    for (const preset of MobileThrottling.ThrottlingPresets.ThrottlingPresets.networkPresets) {
      const {targetLatency} = preset;
      if (!targetLatency) {
        continue;
      }

      const diff = Math.abs(targetLatency - rtt);
      if (diff > RTT_COMPARISON_THRESHOLD) {
        continue;
      }

      if (smallestDiff < diff) {
        continue;
      }

      closestPreset = preset;
      smallestDiff = diff;
    }

    return closestPreset;
  }

  #getDeviceRec(): Common.UIString.LocalizedString|null {
    // `form_factors` metric is only populated if CrUX data is fetched for all devices.
    const fractions = this.#cruxPageResult?.[`${this.#fieldPageScope}-ALL`]?.record.metrics.form_factors?.fractions;
    if (!fractions) {
      return null;
    }

    if (fractions.desktop > 0.5) {
      return i18nString(UIStrings.mostUsersDesktop);
    }

    if (fractions.phone > 0.5) {
      return i18nString(UIStrings.mostUsersMobile);
    }

    return null;
  }

  #renderRecordingSettings(): LitHtml.LitTemplate {
    const throttlingRec = this.#getClosestNetworkPreset();
    const deviceRec = this.#getDeviceRec();

    let networkRecEl;
    if (throttlingRec) {
      if (throttlingRec === SDK.NetworkManager.NoThrottlingConditions) {
        networkRecEl = i18nString(UIStrings.tryDisablingThrottling);
      } else {
        const title = typeof throttlingRec.title === 'function' ? throttlingRec.title() : throttlingRec.title;

        const recValueEl = document.createElement('span');
        recValueEl.classList.add('throttling-recommendation-value');
        recValueEl.textContent = title;

        networkRecEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.tryUsingThrottling, {PH1: recValueEl});
      }
    }

    // clang-format off
    return html`
      <h3 class="card-title">${i18nString(UIStrings.recordingSettings)}</h3>
      ${deviceRec ? html`<div id="device-recommendation" class="setting-recommendation">${deviceRec}</div>` : nothing}
      ${networkRecEl ? html`<div id="network-recommendation" class="setting-recommendation">${networkRecEl}</div>` : nothing}
      <${CPUThrottlingSelector.litTagName} class="live-metrics-option"></${CPUThrottlingSelector.litTagName}>
      <${NetworkThrottlingSelector.litTagName} class="live-metrics-option"></${NetworkThrottlingSelector.litTagName}>
    `;
    // clang-format on
  }

  #getPageScopeLabel(pageScope: CrUXManager.PageScope): string {
    const key = this.#cruxPageResult?.[`${pageScope}-ALL`]?.record.key[pageScope];
    if (key) {
      return pageScope === 'url' ? i18nString(UIStrings.urlOptionWithKey, {PH1: key}) :
                                   i18nString(UIStrings.originOptionWithKey, {PH1: key});
    }

    const baseLabel = pageScope === 'url' ? i18nString(UIStrings.urlOption) : i18nString(UIStrings.originOption);
    return i18nString(UIStrings.needsDataOption, {PH1: baseLabel});
  }

  #onPageScopeMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    if (event.itemValue === 'url') {
      this.#fieldPageScope = 'url';
    } else {
      this.#fieldPageScope = 'origin';
    }
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #renderPageScopeSetting(): LitHtml.LitTemplate {
    if (!CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled) {
      return LitHtml.nothing;
    }

    const urlLabel = this.#getPageScopeLabel('url');
    const originLabel = this.#getPageScopeLabel('origin');

    const buttonTitle = this.#fieldPageScope === 'url' ? urlLabel : originLabel;
    const accessibleTitle = i18nString(UIStrings.showFieldDataForPage, {PH1: buttonTitle});

    // If there is no data at all we should force users to switch pages or reconfigure CrUX.
    const shouldDisable = !this.#cruxPageResult?.['url-ALL'] && !this.#cruxPageResult?.['origin-ALL'];

    return html`
      <${Menus.SelectMenu.SelectMenu.litTagName}
        id="page-scope-select"
        class="live-metrics-option"
        @selectmenuselected=${this.#onPageScopeMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .showConnector=${false}
        .buttonTitle=${buttonTitle}
        .disabled=${shouldDisable}
        title=${accessibleTitle}
      >
        <${Menus.Menu.MenuItem.litTagName}
          .value=${'url'}
          .selected=${this.#fieldPageScope === 'url'}
        >
          ${urlLabel}
        </${Menus.Menu.MenuItem.litTagName}>
        <${Menus.Menu.MenuItem.litTagName}
          .value=${'origin'}
          .selected=${this.#fieldPageScope === 'origin'}
        >
          ${originLabel}
        </${Menus.Menu.MenuItem.litTagName}>
      </${Menus.SelectMenu.SelectMenu.litTagName}>
    `;
  }

  #getDeviceScopeDisplayName(deviceScope: CrUXManager.DeviceScope): string {
    switch (deviceScope) {
      case 'ALL':
        return i18nString(UIStrings.allDevices);
      case 'DESKTOP':
        return i18nString(UIStrings.desktop);
      case 'PHONE':
        return i18nString(UIStrings.mobile);
      case 'TABLET':
        return i18nString(UIStrings.tablet);
    }
  }

  #getAutoDeviceScope(): CrUXManager.DeviceScope {
    const emulationModel = this.#deviceModeModel();

    if (emulationModel === null) {
      return 'ALL';
    }

    if (emulationModel.isMobile()) {
      if (this.#cruxPageResult?.[`${this.#fieldPageScope}-PHONE`]) {
        return 'PHONE';
      }

      return 'ALL';
    }

    if (this.#cruxPageResult?.[`${this.#fieldPageScope}-DESKTOP`]) {
      return 'DESKTOP';
    }

    return 'ALL';
  }

  #getLabelForDeviceOption(deviceOption: DeviceOption): string {
    const deviceScope = deviceOption === 'AUTO' ? this.#getAutoDeviceScope() : deviceOption;
    const deviceScopeLabel = this.#getDeviceScopeDisplayName(deviceScope);
    const baseLabel = deviceOption === 'AUTO' ? i18nString(UIStrings.auto, {PH1: deviceScopeLabel}) : deviceScopeLabel;

    if (!this.#cruxPageResult) {
      return i18nString(UIStrings.loadingOption, {PH1: baseLabel});
    }

    const result = this.#cruxPageResult[`${this.#fieldPageScope}-${deviceScope}`];
    if (!result) {
      return i18nString(UIStrings.needsDataOption, {PH1: baseLabel});
    }

    return baseLabel;
  }

  #onDeviceOptionMenuItemSelected(event: Menus.SelectMenu.SelectMenuItemSelectedEvent): void {
    this.#fieldDeviceOption = event.itemValue as DeviceOption;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #renderDeviceScopeSetting(): LitHtml.LitTemplate {
    if (!CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled) {
      return LitHtml.nothing;
    }
    // If there is no data at all we should force users to try adjusting the page scope
    // before coming back to this option.
    const shouldDisable = !this.#cruxPageResult?.[`${this.#fieldPageScope}-ALL`];

    const currentDeviceLabel = this.#getLabelForDeviceOption(this.#fieldDeviceOption);

    // clang-format off
    return html`
      <${Menus.SelectMenu.SelectMenu.litTagName}
        id="device-scope-select"
        class="live-metrics-option"
        @selectmenuselected=${this.#onDeviceOptionMenuItemSelected}
        .showDivider=${true}
        .showArrow=${true}
        .sideButton=${false}
        .showSelectedItem=${true}
        .showConnector=${false}
        .buttonTitle=${i18nString(UIStrings.device, {PH1: currentDeviceLabel})}
        .disabled=${shouldDisable}
        title=${i18nString(UIStrings.showFieldDataForDevice, {PH1: currentDeviceLabel})}
      >
        ${DEVICE_OPTION_LIST.map(deviceOption => {
          return html`
            <${Menus.Menu.MenuItem.litTagName}
              .value=${deviceOption}
              .selected=${this.#fieldDeviceOption === deviceOption}
            >
              ${this.#getLabelForDeviceOption(deviceOption)}
            </${Menus.Menu.MenuItem.litTagName}>
          `;
        })}
      </${Menus.SelectMenu.SelectMenu.litTagName}>
    `;
    // clang-format on
  }

  #renderCollectionPeriod(): LitHtml.LitTemplate {
    const selectedResponse = this.#getSelectedFieldResponse();
    if (!selectedResponse) {
      return LitHtml.nothing;
    }

    const {firstDate, lastDate} = selectedResponse.record.collectionPeriod;

    const formattedFirstDate = new Date(
        firstDate.year,
        // CrUX month is 1-indexed but `Date` month is 0-indexed
        firstDate.month - 1,
        firstDate.day,
    );
    const formattedLastDate = new Date(
        lastDate.year,
        // CrUX month is 1-indexed but `Date` month is 0-indexed
        lastDate.month - 1,
        lastDate.day,
    );

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const dateEl = document.createElement('span');
    dateEl.classList.add('collection-period-range');
    dateEl.textContent = i18nString(UIStrings.dateRange, {
      PH1: formattedFirstDate.toLocaleDateString(undefined, options),
      PH2: formattedLastDate.toLocaleDateString(undefined, options),
    });

    return html`
      <div class="field-data-message">
        ${i18nString(UIStrings.collectionPeriod)}
        ${dateEl}
      </div>
    `;
  }

  #renderFieldDataMessage(): LitHtml.LitTemplate {
    if (CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled) {
      return this.#renderCollectionPeriod();
    }

    // "Chrome UX Report" is intentionally left untranslated because it is a product name.
    const linkEl = UI.XLink.XLink.create('https://developer.chrome.com/docs/crux', 'Chrome UX Report');
    const messageEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.seeHowYourLocalMetricsCompare, {PH1: linkEl});

    return html`
      <div class="field-data-message">${messageEl}</div>
    `;
  }

  #renderDataDescriptions(): LitHtml.LitTemplate {
    const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;

    const localLink = UI.XLink.XLink.create(
        'https://web.dev/articles/lab-and-field-data-differences#lab_data', i18nString(UIStrings.localMetricsLink));
    const localEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.theLocalMetricsAre, {PH1: localLink});

    const fieldLink = UI.XLink.XLink.create(
        'https://web.dev/articles/lab-and-field-data-differences#field_data', i18nString(UIStrings.fieldDataLink));
    const fieldEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.theFieldMetricsAre, {PH1: fieldLink});

    return html`
      <div class="data-descriptions">
        <div>${localEl}</div>
        ${fieldEnabled ? html`<div>${fieldEl}</div>` : nothing}
      </div>
    `;
  }

  #render = (): void => {
    const fieldEnabled = CrUXManager.CrUXManager.instance().getConfigSetting().get().enabled;
    const liveMetricsTitle =
        fieldEnabled ? i18nString(UIStrings.localAndFieldMetrics) : i18nString(UIStrings.localMetrics);

    // clang-format off
    const output = html`
      <div class="container">
        <div class="live-metrics-view">
          <main class="live-metrics"
          >
            <h2 class="section-title">${liveMetricsTitle}</h2>
            <div class="metric-cards"
              on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
                this.#tooltipContainerEl = node;
              })}
            >
              <div id="lcp">
                ${this.#renderLcpCard()}
              </div>
              <div id="cls">
                ${this.#renderClsCard()}
              </div>
              <div id="inp">
                ${this.#renderInpCard()}
              </div>
            </div>
            ${this.#renderDataDescriptions()}
            ${this.#interactions.length > 0 ? html`
              <section class="interactions-section" aria-labelledby="interactions-section-title">
                <h2 id="interactions-section-title" class="section-title">${i18nString(UIStrings.interactions)}</h2>
                <ol class="interactions-list"
                  on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
                    this.#interactionsListEl = node as HTMLElement;
                  })}
                >
                  ${this.#interactions.map(interaction => html`
                    <li class="interaction">
                      <span class="interaction-type">${interaction.interactionType}</span>
                      <span class="interaction-node">${
                        interaction.node && until(Common.Linkifier.Linkifier.linkify(interaction.node))}</span>
                      <span class="interaction-duration">
                        ${renderMetricValue(
                          'timeline.landing.interaction-event-timing',
                          interaction.duration, INP_THRESHOLDS, v => i18n.TimeUtilities.millisToString(v), {dim: true})}
                      </span>
                    </li>
                  `)}
                </ol>
              </section>
            ` : nothing}
          </main>
          <aside class="next-steps" aria-labelledby="next-steps-section-title">
            <h2 id="next-steps-section-title" class="section-title">${i18nString(UIStrings.nextSteps)}</h2>
            <div id="field-setup" class="settings-card">
              <h3 class="card-title">${i18nString(UIStrings.fieldData)}</h3>
              ${this.#renderFieldDataMessage()}
              ${this.#renderPageScopeSetting()}
              ${this.#renderDeviceScopeSetting()}
              <div class="field-setup-buttons">
                <${FieldSettingsDialog.litTagName}></${FieldSettingsDialog.litTagName}>
              </div>
            </div>
            <div id="recording-settings" class="settings-card">
              ${this.#renderRecordingSettings()}
            </div>
            <div id="record" class="record-action-card">
              ${this.#renderRecordAction(this.#toggleRecordAction)}
            </div>
            <div id="record-page-load" class="record-action-card">
              ${this.#renderRecordAction(this.#recordReloadAction)}
            </div>
          </aside>
        </div>
      </div>
    `;
    LitHtml.render(output, this.#shadow, {host: this});
  };
  // clang-format on
}

customElements.define('devtools-metric-card', MetricCard);
customElements.define('devtools-live-metrics-view', LiveMetricsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-metric-card': MetricCard;
    'devtools-live-metrics-view': LiveMetricsView;
  }
}
