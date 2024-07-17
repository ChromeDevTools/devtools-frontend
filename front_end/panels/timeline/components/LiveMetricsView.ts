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
   * @description Label for an select box that selects which device type should be used for field data (e.g. desktop/mobile/etc).
   */
  deviceType: 'Device type:',
  /**
   * @description Label for an select box that selects either the page URL or page origin for field data collection.
   */
  urlOrOrigin: 'URL/Origin:',
  /**
   * @description Label for an select box that selects which network throttling preset to use.
   */
  networkThrottling: 'Network throttling:',
  /**
   * @description Label for an select box that selects which CPU throttling preset to use.
   */
  cpuThrottling: 'CPU throttling:',
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
  urlOptionWithKey: 'URL ({PH1})',
  /**
   * @description Label for an option that selects the page's entire origin/domain as opposed to it's specific URL.
   * @example {https://example.com} PH1
   */
  originOptionWithKey: 'Origin ({PH1})',
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
   * @description Text label for a link to a DOM node.
   */
  relatedNode: 'Related node',
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
   * @description Text for a percentage value
   * @example {13} PH1
   */
  percentage: '{PH1}%',
};

const str_ = i18n.i18n.registerUIStrings('panels/timeline/components/LiveMetricsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class MetricCard extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-metric-card`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();

    this.#render();
  }

  #metricValuesEl?: Element;
  #dialog?: Dialogs.Dialog.Dialog|null;

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

  #render = (): void => {
    // clang-format off
    const output = html`
      <div class="card metric-card">
        <div class="card-title">
          <slot name="headline"></slot>
        </div>
        <div class="card-metric-values"
          @mouseenter=${this.#showDialog}
          @mouseleave=${this.#closeDialog}
          on-render=${ComponentHelpers.Directives.nodeRenderedCallback(node => {
            this.#metricValuesEl = node;
          })}
        >
          <span class="local-value">
            <slot name="local-value"></slot>
          </span>
          <span class="field-value">
            <slot name="field-value"></slot>
          </span>
          <span class="metric-value-label">${i18nString(UIStrings.localValue)}</span>
          <span class="metric-value-label">${i18nString(UIStrings.field75thPercentile)}</span>
        </div>
        <${Dialogs.Dialog.Dialog.litTagName}
          @pointerleftdialog=${() => this.#closeDialog()}
          .showConnector=${true}
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
          <div class="tooltip-content">
            <slot name="tooltip"></slot>
          </div>
        </${Dialogs.Dialog.Dialog.litTagName}>
        <hr class="divider">
        <div class="metric-card-element">
          <slot name="related-element"><slot>
        </div>
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

  #getFieldMetricData(fieldMetric: CrUXManager.MetricNames): CrUXManager.MetricResponse|undefined {
    const deviceScope = this.#fieldDeviceOption === 'AUTO' ? this.#getAutoDeviceScope() : this.#fieldDeviceOption;
    return this.#cruxPageResult?.[`${this.#fieldPageScope}-${deviceScope}`]?.record.metrics[fieldMetric];
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

  #renderMetricValue(value: number|string|undefined, thresholds: MetricThresholds, format: (value: number) => string):
      LitHtml.LitTemplate {
    if (value === undefined) {
      return html`<span class="metric-value waiting">-<span>`;
    }

    if (typeof value === 'string') {
      value = Number(value);
    }

    const rating = this.#rateMetric(value, thresholds);
    const valueString = format(value);
    return html`
      <span class=${`metric-value ${rating}`}>${valueString}</span>
    `;
  }

  #renderLcpCard(): LitHtml.LitTemplate {
    const fieldData = this.#getFieldMetricData('largest_contentful_paint');

    return this.#renderMetricCard(
        i18nString(UIStrings.lcpTitle),
        this.#lcpValue?.value,
        fieldData?.percentiles?.p75,
        fieldData?.histogram,
        LCP_THRESHOLDS,
        v => i18n.TimeUtilities.millisToString(v),
        this.#lcpValue?.node,
    );
  }

  #renderClsCard(): LitHtml.LitTemplate {
    const fieldData = this.#getFieldMetricData('cumulative_layout_shift');

    return this.#renderMetricCard(
        i18nString(UIStrings.clsTitle),
        this.#clsValue?.value,
        fieldData?.percentiles?.p75,
        fieldData?.histogram,
        CLS_THRESHOLDS,
        v => v === 0 ? '0' : v.toFixed(2),
    );
  }

  #renderInpCard(): LitHtml.LitTemplate {
    const fieldData = this.#getFieldMetricData('interaction_to_next_paint');

    return this.#renderMetricCard(
        i18nString(UIStrings.inpTitle),
        this.#inpValue?.value,
        fieldData?.percentiles?.p75,
        fieldData?.histogram,
        INP_THRESHOLDS,
        v => i18n.TimeUtilities.millisToString(v),
    );
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

  #renderFieldHistogram(
      histogram: CrUXManager.MetricResponse['histogram']|undefined, thresholds: MetricThresholds,
      format: (value: number) => string): LitHtml.LitTemplate {
    const goodPercent = this.#densityToCSSPercent(histogram?.[0].density);
    const needsImprovementPercent = this.#densityToCSSPercent(histogram?.[1].density);
    const poorPercent = this.#densityToCSSPercent(histogram?.[2].density);
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

  #rateMetric(value: number, thresholds: MetricThresholds): MetricRating {
    if (value <= thresholds[0]) {
      return 'good';
    }
    if (value <= thresholds[1]) {
      return 'needs-improvement';
    }
    return 'poor';
  }

  #renderMetricCard(
      title: string, localValue: number|undefined, fieldValue: number|string|undefined,
      histogram: CrUXManager.MetricResponse['histogram']|undefined, thresholds: MetricThresholds,
      format: (value: number) => string, node?: SDK.DOMModel.DOMNode): LitHtml.LitTemplate {
    // clang-format off
    return html`
      <${MetricCard.litTagName}>
        <div slot="headline">${title}</div>
        <span slot="local-value">${this.#renderMetricValue(localValue, thresholds, format)}</span>
        <span slot="field-value">${this.#renderMetricValue(fieldValue, thresholds, format)}</span>
        <div slot="tooltip">
          ${this.#renderFieldHistogram(histogram, thresholds, format)}
        </div>
        <div slot="related-element">
          ${node ? html`
              <div class="card-section-title">${i18nString(UIStrings.relatedNode)}</div>
              <div>${until(Common.Linkifier.Linkifier.linkify(node))}</div>`
            : nothing}
        </div>
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

    let recStr;
    if (throttlingRec) {
      if (throttlingRec === SDK.NetworkManager.NoThrottlingConditions) {
        recStr = i18nString(UIStrings.tryDisablingThrottling);
      } else {
        const title = typeof throttlingRec.title === 'function' ? throttlingRec.title() : throttlingRec.title;
        recStr = i18nString(UIStrings.tryUsingThrottling, {PH1: title});
      }
    }

    // clang-format off
    return html`
      <div class="card-title">${i18nString(UIStrings.throttling)}</div>
      ${recStr ? html`<div class="throttling-recommendation">${recStr}</div>` : nothing}
      <span class="live-metrics-option">
        ${i18nString(UIStrings.cpuThrottling)}<${CPUThrottlingSelector.litTagName}>
        </${CPUThrottlingSelector.litTagName}>
      </span>
      <span class="live-metrics-option">
        ${i18nString(UIStrings.networkThrottling)}
        <${NetworkThrottlingSelector.litTagName}></${NetworkThrottlingSelector.litTagName}>
      </span>
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

    return html`
      <span id="page-scope-select" class="live-metrics-option">
        ${i18nString(UIStrings.urlOrOrigin)}
        <${Menus.SelectMenu.SelectMenu.litTagName}
          @selectmenuselected=${this.#onPageScopeMenuItemSelected}
          .showDivider=${true}
          .showArrow=${true}
          .sideButton=${false}
          .showSelectedItem=${true}
          .showConnector=${false}
          .buttonTitle=${this.#fieldPageScope === 'url' ? urlLabel : originLabel}
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
      </span>
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

    // clang-format off
    return html`
      <span id="device-scope-select" class="live-metrics-option">
        ${i18nString(UIStrings.deviceType)}
        <${Menus.SelectMenu.SelectMenu.litTagName}
          @selectmenuselected=${this.#onDeviceOptionMenuItemSelected}
          .showDivider=${true}
          .showArrow=${true}
          .sideButton=${false}
          .showSelectedItem=${true}
          .showConnector=${false}
          .buttonTitle=${this.#getLabelForDeviceOption(this.#fieldDeviceOption)}
          .disabled=${shouldDisable}
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
      </span>
    `;
    // clang-format on
  }

  #render = (): void => {
    // clang-format off
    const output = html`
      <div class="container">
        <div class="live-metrics-view">
          <div class="live-metrics" slot="main">
            <h3>${i18nString(UIStrings.localAndFieldMetrics)}</h3>
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
            <h3>${i18nString(UIStrings.interactions)}</h3>
            <ol class="interactions-list">
              ${this.#interactions.map((interaction, index) => html`
                ${index === 0 ? html`<hr class="divider">` : nothing}
                <li class="interaction">
                  <span class="interaction-type">${interaction.interactionType}</span>
                  <span class="interaction-node">${
                    interaction.node && until(Common.Linkifier.Linkifier.linkify(interaction.node))}</span>
                  <span class="interaction-duration">
                    ${this.#renderMetricValue(interaction.duration, INP_THRESHOLDS, v => i18n.TimeUtilities.millisToString(v))}
                  </span>
                </li>
                <hr class="divider">
              `)}
            </ol>
          </div>
          <div class="next-steps" slot="sidebar">
            <h3>${i18nString(UIStrings.nextSteps)}</h3>
            <div id="field-setup" class="card">
              <div class="card-title">${i18nString(UIStrings.fieldData)}</div>
              ${this.#renderPageScopeSetting()}
              ${this.#renderDeviceScopeSetting()}
              <${FieldSettingsDialog.litTagName}></${FieldSettingsDialog.litTagName}>
            </div>
            <div id="throttling" class="card">
              ${this.#renderThrottlingSettings()}
            </div>
            <div id="record" class="card">
              ${this.#renderRecordAction(this.#toggleRecordAction)}
            </div>
            <div id="record-page-load" class="card">
              ${this.#renderRecordAction(this.#recordReloadAction)}
            </div>
          </div>
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
