// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as i18n from '../../../core/i18n/i18n.js';
import type * as SDK from '../../../core/sdk/sdk.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

import liveMetricsViewStyles from './liveMetricsView.css.js';

const {html, nothing, Directives} = LitHtml;
const {until, classMap} = Directives;

export class LiveMetricsNextSteps extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-live-metrics-next-steps`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  constructor() {
    super();
    this.#render();
  }

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [liveMetricsViewStyles];
  }

  #render(): void {
    const output = html`
      <div class="next-steps">
        <h3>Next steps</h3>
      </div>
    `;
    LitHtml.render(output, this.#shadow, {host: this});
  }
}

export class LiveMetricsView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-live-metrics-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #liveMetrics: LiveMetrics.LiveMetrics = new LiveMetrics.LiveMetrics();

  #lcpValue?: LiveMetrics.LCPChangeEvent;
  #clsValue?: LiveMetrics.CLSChangeEvent;
  #inpValue?: LiveMetrics.INPChangeEvent;

  constructor() {
    super();
    this.#render();
  }

  #onReset = (): void => {
    this.#lcpValue = undefined;
    this.#clsValue = undefined;
    this.#inpValue = undefined;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  };

  #onLcpChange = (event: {data: LiveMetrics.LCPChangeEvent}): void => {
    this.#lcpValue = event.data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  };

  #onClsChange = (event: {data: LiveMetrics.CLSChangeEvent}): void => {
    this.#clsValue = event.data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  };

  #onInpChange = (event: {data: LiveMetrics.INPChangeEvent}): void => {
    this.#inpValue = event.data;
    void ComponentHelpers.ScheduledRender.scheduleRender(this, this.#render);
  };

  connectedCallback(): void {
    this.#shadow.adoptedStyleSheets = [liveMetricsViewStyles];
    this.#liveMetrics.addEventListener(LiveMetrics.Events.Reset, this.#onReset);
    this.#liveMetrics.addEventListener(LiveMetrics.Events.LCPChanged, this.#onLcpChange);
    this.#liveMetrics.addEventListener(LiveMetrics.Events.CLSChanged, this.#onClsChange);
    this.#liveMetrics.addEventListener(LiveMetrics.Events.INPChanged, this.#onInpChange);
  }

  disconnectedCallback(): void {
    this.#liveMetrics.removeEventListener(LiveMetrics.Events.Reset, this.#onReset);
    this.#liveMetrics.removeEventListener(LiveMetrics.Events.LCPChanged, this.#onLcpChange);
    this.#liveMetrics.removeEventListener(LiveMetrics.Events.CLSChanged, this.#onClsChange);
    this.#liveMetrics.removeEventListener(LiveMetrics.Events.INPChanged, this.#onInpChange);
  }

  #renderLiveLcp(lcpValue: LiveMetrics.LCPChangeEvent|undefined): LitHtml.LitTemplate {
    const title = 'Largest Contentful Paint (LCP)';
    if (!lcpValue) {
      return this.#renderLiveMetric(title);
    }

    return this.#renderLiveMetric(
        title,
        i18n.TimeUtilities.millisToString(lcpValue.value),
        lcpValue.rating,
        lcpValue?.node,
    );
  }

  #renderLiveCls(clsValue: LiveMetrics.CLSChangeEvent|undefined): LitHtml.LitTemplate {
    const title = 'Cumulative Layout Shift (CLS)';
    if (!clsValue) {
      return this.#renderLiveMetric(title);
    }

    return this.#renderLiveMetric(
        title,
        clsValue.value === 0 ? '0' : clsValue.value.toFixed(3),
        clsValue.rating,
    );
  }

  #renderLiveInp(inpValue: LiveMetrics.INPChangeEvent|undefined): LitHtml.LitTemplate {
    const title = 'Interaction to Next Paint (INP)';
    if (!inpValue) {
      return this.#renderLiveMetric(title);
    }

    return this.#renderLiveMetric(
        title,
        i18n.TimeUtilities.millisToString(inpValue.value),
        inpValue.rating,
        inpValue.node,
    );
  }

  #renderLiveMetric(title: string, valueStr?: string, rating?: LiveMetrics.Rating, node?: SDK.DOMModel.DOMNode):
      LitHtml.LitTemplate {
    const ratingClass = rating || 'waiting';
    // clang-format off
    return html`
      <div class="metric-card">
        <div class="metric-card-title">${title}</div>
        <div class=${classMap({
          'metric-card-value': true,
          [ratingClass]: true,
        })}>
          ${valueStr || '-'}
        </div>
        <div class="metric-card-element">
          ${node ? html`
              <div class="metric-card-section-title">Related node</div>
              <div>${until(Common.Linkifier.Linkifier.linkify(node))}</div>`
            : nothing}
        </div>
      </div>
    `;
    // clang-format on
  }

  #render = (): void => {
    const output = html`
      <div class="live-metrics">
        <h3>Local and Field Metrics</h3>
        <div class="metric-cards">
          <div>
            ${this.#renderLiveLcp(this.#lcpValue)}
          </div>
          <div>
            ${this.#renderLiveCls(this.#clsValue)}
          </div>
          <div>
            ${this.#renderLiveInp(this.#inpValue)}
          </div>
        </div>
        <h3>Interactions</h3>
      </div>
    `;
    LitHtml.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-live-metrics-view', LiveMetricsView);
customElements.define('devtools-live-metrics-next-steps', LiveMetricsNextSteps);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-live-metrics-view': LiveMetricsView;
    'devtools-live-metrics-next-steps': LiveMetricsNextSteps;
  }
}
