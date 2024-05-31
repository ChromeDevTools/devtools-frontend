// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import * as LiveMetrics from '../../../models/live-metrics/live-metrics.js';
import * as ComponentHelpers from '../../../ui/components/helpers/helpers.js';
import * as LitHtml from '../../../ui/lit-html/lit-html.js';

const {html, nothing, Directives} = LitHtml;
const {until} = Directives;

export class LiveMetricsView extends HTMLElement {
  static readonly litTagName = LitHtml.literal`devtools-live-metrics-view`;
  readonly #shadow = this.attachShadow({mode: 'open'});

  #liveMetrics: LiveMetrics.LiveMetrics = new LiveMetrics.LiveMetrics();

  #lcpValue?: LiveMetrics.LCPChangeEvent;
  #clsValue?: LiveMetrics.CLSChangeEvent;
  #inpValue?: LiveMetrics.INPChangeEvent;

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

  #renderLcpData(lcpValue: LiveMetrics.LCPChangeEvent): LitHtml.LitTemplate {
    return html`
      <div class="lcp-data">
        <span>LCP: ${Math.round(lcpValue.value)}</span>
        ${lcpValue.node ? until(Common.Linkifier.Linkifier.linkify(lcpValue.node)) : nothing}
      </div>
    `;
  }

  #render = (): void => {
    const output = html`
      <div class="live-lcp">
        ${this.#lcpValue ? this.#renderLcpData(this.#lcpValue) : nothing}
      </div>
      <div class="live-cls">
        ${this.#clsValue ? html`<div class="cls-data">CLS: ${this.#clsValue.value.toFixed(3)}</div>` : nothing}
      </div>
      <div class="live-inp">
        ${this.#inpValue ? html`<div class="inp-data">INP: ${this.#inpValue.value}</div>` : nothing}
      </div>
    `;
    LitHtml.render(output, this.#shadow, {host: this});
  };
}

customElements.define('devtools-live-metrics-view', LiveMetricsView);

declare global {
  interface HTMLElementTagNameMap {
    'devtools-live-metrics-view': LiveMetricsView;
  }
}
