// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as Buttons from '../../../ui/components/buttons/buttons.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Settings from '../../../ui/components/settings/settings.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import {CPUThrottlingSelector} from './CPUThrottlingSelector.js';
import liveMetricsViewStyles from './liveMetricsView.css.js';
import {NetworkThrottlingSelector} from './NetworkThrottlingSelector.js';

const {html, nothing, Directives} = LitHtml;
const {until} = Directives;

type MetricRating = 'good'|'needs-improvement'|'poor';
type MetricThresholds = [number, number];

// TODO: Consolidate our metric rating logic with the trace engine.
const LCP_THRESHOLDS = [2500, 4000] as MetricThresholds;
const CLS_THRESHOLDS = [0.1, 0.25] as MetricThresholds;
const INP_THRESHOLDS = [200, 500] as MetricThresholds;

export class LiveMetricsView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-live-metrics-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #lcpValue?: LiveMetrics.LCPValue;
  #clsValue?: LiveMetrics.CLSValue;
  #inpValue?: LiveMetrics.INPValue;
  #interactions: LiveMetrics.InteractionValue[] = [];

  #cruxPageResult?: CrUXManager.PageResult;

  // TODO: Link these to real setting inputs
  #fieldDeviceScope: CrUXManager.DeviceScope = 'ALL';
  #fieldPreferURL = true;

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

  async #refreshFieldDataForCurrentPage(): Promise<void> {
    this.#cruxPageResult = await CrUXManager.CrUXManager.instance().getFieldDataForCurrentPage();
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  }

  #getFieldMetricData(fieldMetric: CrUXManager.MetricNames): CrUXManager.MetricResponse|undefined {
    const originResponse = this.#cruxPageResult?.[`origin-${this.#fieldDeviceScope}`];
    const urlResponse = this.#cruxPageResult?.[`url-${this.#fieldDeviceScope}`];
    if (this.#fieldPreferURL && urlResponse) {
      return urlResponse?.record.metrics[fieldMetric];
    }
    return originResponse?.record.metrics[fieldMetric];
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [liveMetricsViewStyles];

    const liveMetrics = LiveMetrics.LiveMetrics.instance();
    liveMetrics.addEventListener(LiveMetrics.Events.Status, this.#onMetricStatus, this);

    const cruxManager = CrUXManager.CrUXManager.instance();
    cruxManager.addEventListener(CrUXManager.Events.FieldDataChanged, this.#onFieldDataChanged, this);

    if (cruxManager.getAutomaticSetting().get()) {
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
    const title = 'Largest Contentful Paint (LCP)';
    const fieldData = this.#getFieldMetricData('largest_contentful_paint');

    return this.#renderMetricCard(
        title,
        this.#lcpValue?.value,
        fieldData?.percentiles.p75,
        fieldData?.histogram,
        LCP_THRESHOLDS,
        v => i18n.TimeUtilities.millisToString(v),
        this.#lcpValue?.node,
    );
  }

  #renderClsCard(): LitHtml.LitTemplate {
    const title = 'Cumulative Layout Shift (CLS)';
    const fieldData = this.#getFieldMetricData('cumulative_layout_shift');

    return this.#renderMetricCard(
        title,
        this.#clsValue?.value,
        fieldData?.percentiles.p75,
        fieldData?.histogram,
        CLS_THRESHOLDS,
        v => v === 0 ? '0' : v.toFixed(2),
    );
  }

  #renderInpCard(): LitHtml.LitTemplate {
    const title = 'Interaction to Next Paint (INP)';
    const fieldData = this.#getFieldMetricData('interaction_to_next_paint');

    return this.#renderMetricCard(
        title,
        this.#inpValue?.value,
        fieldData?.percentiles.p75,
        fieldData?.histogram,
        INP_THRESHOLDS,
        v => i18n.TimeUtilities.millisToString(v),
    );
  }

  #densityAsPercent(density?: number): string {
    if (density === undefined) {
      density = 0;
    }
    const percent = Math.round(density * 100);
    return `${percent}%`;
  }

  #renderFieldHistogram(
      histogram: CrUXManager.MetricResponse['histogram'], thresholds: MetricThresholds,
      format: (value: number) => string): LitHtml.LitTemplate {
    const goodPercent = this.#densityAsPercent(histogram[0].density);
    const needsImprovementPercent = this.#densityAsPercent(histogram[1].density);
    const poorPercent = this.#densityAsPercent(histogram[2].density);
    return html`
      <div class="field-data-histogram">
        <span class="histogram-label">Good <span class="histogram-range">(&le;${format(thresholds[0])})</span></span>
        <span class="histogram-bar good-bg" style="width: ${goodPercent}"></span>
        <span>${goodPercent}</span>
        <span class="histogram-label">Needs improvement <span class="histogram-range">(${format(thresholds[0])}-${
        format(thresholds[1])})</span></span>
        <span class="histogram-bar needs-improvement-bg" style="width: ${needsImprovementPercent}"></span>
        <span>${needsImprovementPercent}</span>
        <span class="histogram-label">Poor <span class="histogram-range">(&gt;${format(thresholds[1])})</span></span>
        <span class="histogram-bar poor-bg" style="width: ${poorPercent}"></span>
        <span>${poorPercent}</span>
      </div>
    `;
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
      <div class="card">
        <div class="card-title">${title}</div>
        <div class="card-metric-values">
          <span class="local-value">${this.#renderMetricValue(localValue, thresholds, format)}</span>
          <span class="field-value">${this.#renderMetricValue(fieldValue, thresholds, format)}</span>
          <span class="metric-value-label">Local</span>
          <span class="metric-value-label">Field 75th Percentile</span>
        </div>
        <hr class="divider">
        ${histogram ? this.#renderFieldHistogram(histogram, thresholds, format) : nothing}
        <div class="metric-card-element">
          ${node ? html`
              <div class="card-section-title">Related node</div>
              <div>${until(Common.Linkifier.Linkifier.linkify(node))}</div>`
            : nothing}
        </div>
      </div>
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

  #renderThrottlingSettings(): LitHtml.LitTemplate {
    return html`
      <div class="card-title">Throttling</div>
      <span class="throttling-setting">CPU: <${CPUThrottlingSelector.litTagName}></${
        CPUThrottlingSelector.litTagName}></span>
      <span class="throttling-setting">Network: <${NetworkThrottlingSelector.litTagName}></${
        NetworkThrottlingSelector.litTagName}></span>
    `;
  }

  #render = (): void => {
    const automaticSetting = CrUXManager.CrUXManager.instance().getAutomaticSetting();

    // clang-format off
    const output = html`
      <div class="container">
        <div class="live-metrics-view">
          <div class="live-metrics" slot="main">
            <h3>Local and Field Metrics</h3>
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
            <h3>Interactions</h3>
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
            <h3>Next steps</h3>
            <div id="field-setup" class="card">
              <div class="card-title">Field data</div>
              <button @click=${this.#refreshFieldDataForCurrentPage}>Get field data</button>
              <${Settings.SettingCheckbox.SettingCheckbox.litTagName} .data=${
                  {setting: automaticSetting} as Settings.SettingCheckbox.SettingCheckboxData}>
              </${Settings.SettingCheckbox.SettingCheckbox.litTagName}>
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

customElements.define('devtools-live-metrics-view', LiveMetricsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-live-metrics-view': LiveMetricsView;
  }
}
