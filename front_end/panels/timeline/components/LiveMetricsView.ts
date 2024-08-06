// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as EmulationModel from '../../../models/emulation/emulation.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as Dialogs from '../../../ui/components/dialogs/dialogs.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Menus from '../../../ui/components/menus/menus.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';
import * as MobileThrottling from '../../mobile_throttling/mobile_throttling.js';

import {CPUThrottlingSelector} from './CPUThrottlingSelector.js';
import {FieldSettingsDialog} from './FieldSettingsDialog.js';
import liveMetricsViewStyles from './liveMetricsView.css.js';
import {renderCompareText} from './MetricCompareStrings.js';
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
   * @description Title of a view that shows metrics from the local environment and field metrics collected from real users in the field.
   */
  localAndFieldMetrics: 'Local and Field Metrics',
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
   * @description Title of a section that shows throttling settings.
   */
  throttling: 'Throttling',
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
    value: number|undefined, thresholds: MetricThresholds, format: (value: number) => string,
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
}

export class MetricCard extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-metric-card`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();

    this.#render();
  }

  #metricValuesEl?: Element;
  #dialog?: Dialogs.Dialog.Dialog|null;

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

  #showDialog(): void {
    if (!this.#dialog) {
      return;
    }
    void this.#dialog.setDialogVisible(true);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #closeDialog(event?: Event): void {
    if (!this.#dialog || !this.#metricValuesEl) {
      return;
    }

    if (event) {
      const path = event.composedPath();
      if (path.includes(this.#metricValuesEl)) {
        return;
      }
      if (path.includes(this.#dialog)) {
        return;
      }
    }

    void this.#dialog.setDialogVisible(false);
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
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

    const valueEl = renderMetricValue(localValue, this.#getThresholds(), this.#getFormatFn(), {dim: true});
    valueEl.classList.add('metric-value-label');

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

  #densityToCSSPercent(density?: number): string {
    if (density === undefined) {
      density = 0;
    }
    const percent = Math.round(density * 100);
    return `${percent}%`;
  }

  #getBucketLabel(histogram: CrUXManager.MetricResponse['histogram']|undefined, bucket: number): string {
    if (histogram === undefined) {
      return '-';
    }

    // A missing density value should be interpreted as 0%
    const density = histogram[bucket].density || 0;
    const percent = Math.round(density * 100);
    return i18nString(UIStrings.percentage, {PH1: percent});
  }

  #renderFieldHistogram(): LitHtml.LitTemplate {
    const histogram = this.#data.histogram;

    const goodPercent = this.#densityToCSSPercent(histogram?.[0].density);
    const needsImprovementPercent = this.#densityToCSSPercent(histogram?.[1].density);
    const poorPercent = this.#densityToCSSPercent(histogram?.[2].density);

    const format = this.#getFormatFn();
    const thresholds = this.#getThresholds();

    // clang-format off
    return html`
      <div class="field-data-histogram">
        <span class="histogram-label">
          ${i18nString(UIStrings.good)}
          <span class="histogram-range">${i18nString(UIStrings.leqRange, {PH1: format(thresholds[0])})}</span>
        </span>
        <span class="histogram-bar good-bg" style="width: ${goodPercent}"></span>
        <span class="histogram-percent">${this.#getBucketLabel(histogram, 0)}</span>
        <span class="histogram-label">
          ${i18nString(UIStrings.needsImprovement)}
          <span class="histogram-range">${i18nString(UIStrings.betweenRange, {PH1: format(thresholds[0]), PH2: format(thresholds[1])})}</span>
        </span>
        <span class="histogram-bar needs-improvement-bg" style="width: ${needsImprovementPercent}"></span>
        <span class="histogram-percent">${this.#getBucketLabel(histogram, 1)}</span>
        <span class="histogram-label">
          ${i18nString(UIStrings.poor)}
          <span class="histogram-range">${i18nString(UIStrings.gtRange, {PH1: format(thresholds[1])})}</span>
        </span>
        <span class="histogram-bar poor-bg" style="width: ${poorPercent}"></span>
        <span class="histogram-percent">${this.#getBucketLabel(histogram, 2)}</span>
      </div>
    `;
    // clang-format on
  }

  #render = (): void => {
    const hasFieldData = this.#getFieldValue() !== undefined;

    // clang-format off
    const output = html`
      <div class="metric-card">
        <h3 class="card-title">
          ${this.#getTitle()}
        </h3>
        <div class="card-metric-values"
          @mouseenter=${this.#showDialog}
          @mouseleave=${this.#closeDialog}
          on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
            this.#metricValuesEl = node;
          })}
          aria-describedby="tooltip-content"
        >
          <span class="local-value">
            ${renderMetricValue(this.#getLocalValue(), this.#getThresholds(), this.#getFormatFn())}
          </span>
          ${hasFieldData ? html`
            <span class="field-value">
              ${renderMetricValue(this.#getFieldValue(), this.#getThresholds(), this.#getFormatFn())}
            </span>
            <span class="metric-value-label">${i18nString(UIStrings.localValue)}</span>
            <span class="metric-value-label">${i18nString(UIStrings.field75thPercentile)}</span>
          `: nothing}
        </div>
        <${Dialogs.Dialog.Dialog.litTagName}
          @pointerleftdialog=${() => this.#closeDialog()}
          .showConnector=${false}
          .centered=${true}
          .closeOnScroll=${false}
          .origin=${() => {
            if (!this.#metricValuesEl) {
              throw new Error('No metric values element');
            }
            return this.#metricValuesEl;
          }}
          on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
            this.#dialog = node as Dialogs.Dialog.Dialog;
          })}
        >
          <div id="tooltip-content" class="tooltip-content" role="tooltip" aria-label=${i18nString(UIStrings.viewCardDetails)}>
            ${this.#renderFieldHistogram()}
          </div>
        </${Dialogs.Dialog.Dialog.litTagName}>
        ${hasFieldData ? html`<hr class="divider">` : nothing}
        ${this.#renderCompareString()}
        <slot name="extra-info"><slot>
      </div>
    `;
    LitHtml.render(output, this.#shadow, {host: this});
  };
  // clang-format on
}

export class LiveMetricsView extends HTMLElement {
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
    this.#interactions = event.data.interactions;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
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

  #getFieldMetricData(fieldMetric: CrUXManager.MetricNames): CrUXManager.MetricResponse|undefined {
    return this.#getSelectedFieldResponse()?.record.metrics[fieldMetric];
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [liveMetricsViewStyles];

    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    liveMetrics.addEventListener(LiveMetrics.Events.Status, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.addEventListener(CrUXManager.Events.FieldDataChanged, this.#onFieldDataChanged, this);

    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    emulationModel.addEventListener(EmulationModel.DeviceModeModel.Events.Updated, this.#onEmulationChanged, this);

    if (cruxManager.getConfigSetting().get().enabled) {
      void this.#refreshFieldDataForCurrentPage();
    }

    this.#lcpValue = liveMetrics.lcpValue;
    this.#clsValue = liveMetrics.clsValue;
    this.#inpValue = liveMetrics.inpValue;
    this.#interactions = liveMetrics.interactions;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  disconnectedCallback(): void {
    LiveMetrics.LiveMetrics.instance().removeEventListener(LiveMetrics.Events.Status, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.removeEventListener(CrUXManager.Events.FieldDataChanged, this.#onFieldDataChanged, this);

    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    emulationModel.removeEventListener(EmulationModel.DeviceModeModel.Events.Updated, this.#onEmulationChanged, this);
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

  #renderThrottlingSettings(): LitHtml.LitTemplate {
    const throttlingRec = this.#getClosestNetworkPreset();

    let recEl;
    if (throttlingRec) {
      if (throttlingRec === SDK.NetworkManager.NoThrottlingConditions) {
        recEl = i18nString(UIStrings.tryDisablingThrottling);
      } else {
        const title = typeof throttlingRec.title === 'function' ? throttlingRec.title() : throttlingRec.title;

        const recValueEl = document.createElement('span');
        recValueEl.classList.add('throttling-recommendation-value');
        recValueEl.textContent = title;

        recEl = i18n.i18n.getFormatLocalizedString(str_, UIStrings.tryUsingThrottling, {PH1: recValueEl});
      }
    }

    // clang-format off
    return html`
      <h3 class="card-title">${i18nString(UIStrings.throttling)}</h3>
      ${recEl ? html`<div class="throttling-recommendation">${recEl}</div>` : nothing}
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
    const emulationModel = EmulationModel.DeviceModeModel.DeviceModeModel.instance();
    if (emulationModel.device()?.mobile()) {
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

  #render = (): void => {
    // clang-format off
    const output = html`
      <div class="container">
        <div class="live-metrics-view">
          <main class="live-metrics">
            <h2 class="section-title">${i18nString(UIStrings.localAndFieldMetrics)}</h2>
            <div class="metric-cards">
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
            ${this.#interactions.length > 0 ? html`
              <section class="interactions-section" aria-labelledby="interactions-section-title">
                <h2 id="interactions-section-title" class="section-title">${i18nString(UIStrings.interactions)}</h2>
                <ol class="interactions-list">
                  ${this.#interactions.map(interaction => html`
                    <li class="interaction">
                      <span class="interaction-type">${interaction.interactionType}</span>
                      <span class="interaction-node">${
                        interaction.node && until(Common.Linkifier.Linkifier.linkify(interaction.node))}</span>
                      <span class="interaction-duration">
                        ${renderMetricValue(interaction.duration, INP_THRESHOLDS, v => i18n.TimeUtilities.millisToString(v), {dim: true})}
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
            <div id="throttling" class="settings-card">
              ${this.#renderThrottlingSettings()}
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
