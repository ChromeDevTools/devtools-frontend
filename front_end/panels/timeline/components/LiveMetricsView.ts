// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as CrUXManager from '../../../models/crux-manager/crux-manager.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as Settings from '../../../ui/components/settings/settings.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import liveMetricsViewStyles from './liveMetricsView.css.js';

const {html, nothing, Directives} = LitHtml;
const {until, classMap} = Directives;

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

  constructor() {
    super();
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

  #renderLiveLcp(lcpValue: LiveMetrics.LCPValue|undefined): LitHtml.LitTemplate {
    const title = 'Largest Contentful Paint (LCP)';
    const fieldData = this.#getFieldMetricData('largest_contentful_paint');

    if (!lcpValue) {
      return this.#renderLiveMetric(title, fieldData);
    }

    return this.#renderLiveMetric(
        title,
        fieldData,
        i18n.TimeUtilities.millisToString(lcpValue.value),
        lcpValue.rating,
        lcpValue?.node,
    );
  }

  #renderLiveCls(clsValue: LiveMetrics.CLSValue|undefined): LitHtml.LitTemplate {
    const title = 'Cumulative Layout Shift (CLS)';
    const fieldData = this.#getFieldMetricData('cumulative_layout_shift');

    if (!clsValue) {
      return this.#renderLiveMetric(title, fieldData);
    }

    return this.#renderLiveMetric(
        title,
        fieldData,
        clsValue.value === 0 ? '0' : clsValue.value.toFixed(3),
        clsValue.rating,
    );
  }

  #renderLiveInp(inpValue: LiveMetrics.INPValue|undefined): LitHtml.LitTemplate {
    const title = 'Interaction to Next Paint (INP)';
    const fieldData = this.#getFieldMetricData('interaction_to_next_paint');

    if (!inpValue) {
      return this.#renderLiveMetric(title, fieldData);
    }

    return this.#renderLiveMetric(
        title,
        fieldData,
        i18n.TimeUtilities.millisToString(inpValue.value),
        inpValue.rating,
    );
  }

  #densityAsPercent(density?: number): string {
    if (density === undefined) {
      density = 0;
    }
    const percent = Math.round(density * 100);
    return `${percent}%`;
  }

  #renderFieldHistogram(histogram: CrUXManager.MetricResponse['histogram']): LitHtml.LitTemplate {
    const goodPercent = this.#densityAsPercent(histogram[0].density);
    const needsImprovementPercent = this.#densityAsPercent(histogram[1].density);
    const poorPercent = this.#densityAsPercent(histogram[2].density);
    return html`
      <div class="field-data">
        <span class="histogram-bar good-bg" style="width: ${goodPercent}"></span>
        <span>${goodPercent}</span>
        <span class="histogram-bar needs-improvement-bg" style="width: ${needsImprovementPercent}"></span>
        <span>${needsImprovementPercent}</span>
        <span class="histogram-bar poor-bg" style="width: ${poorPercent}"></span>
        <span>${poorPercent}</span>
      </div>
    `;
  }

  #renderLiveMetric(
      title: string, cruxData?: CrUXManager.MetricResponse, valueStr?: string, rating?: LiveMetrics.Rating,
      node?: SDK.DOMModel.DOMNode): LitHtml.LitTemplate {
    const ratingClass = rating || 'waiting';
    const histogram = cruxData?.histogram;
    // clang-format off
    return html`
      <div class="card">
        <div class="card-title">${title}</div>
        <div class="metric-card-value">
          <div class=${classMap({
            'local-metric-value': true,
            [ratingClass]: true,
          })}>
            ${valueStr || '-'}
          </div>
          ${histogram ? this.#renderFieldHistogram(histogram) : nothing}
        </div>
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
                ${this.#renderLiveLcp(this.#lcpValue)}
              </div>
              <div id="cls">
                ${this.#renderLiveCls(this.#clsValue)}
              </div>
              <div id="inp">
                ${this.#renderLiveInp(this.#inpValue)}
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
                  <span class=${`interaction-duration ${interaction.rating}`}>${i18n.TimeUtilities.millisToString(interaction.duration)}</span>
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
