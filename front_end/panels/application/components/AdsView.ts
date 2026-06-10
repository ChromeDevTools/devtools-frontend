// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as SDK from '../../../core/sdk/sdk.js';
import type * as Protocol from '../../../generated/protocol.js';
import * as UI from '../../../ui/legacy/legacy.js';
import * as Lit from '../../../ui/lit/lit.js';

import adsViewStyles from './adsView.css.js';

const {html} = Lit;

const UIStrings = {
  /**
   * @description Title for a metric showing the percentage of the viewport covered by ads.
   */
  viewportAdDensity: 'Viewport ad density',
  /**
   * @description Title for a metric showing the number of ads in the viewport.
   */
  viewportAdCount: 'Viewport ad count',
  /**
   * @description Title for a metric showing the total CPU usage by ads.
   */
  totalCpuUsage: 'Total CPU usage by ads',
  /**
   * @description Title for a metric showing the total network usage by ads.
   */
  totalNetworkUsage: 'Total network usage by ads',
  /**
   * @description Subtext showing the average value of a metric.
   * @example {5.00%} PH1
   */
  average: '(Average: {PH1})',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/application/components/AdsView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  metrics: Protocol.Ads.AdMetrics;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement|DocumentFragment) => void;

const DEFAULT_VIEW: View = (input, output, target) => {
  const metrics = input.metrics;

  const formatValue = (val: number, isPercentage: boolean): string => {
    if (isPercentage) {
      return new Intl
          .NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
            style: 'percent',
            maximumFractionDigits: 0,
          })
          .format(val / 100);
    }
    return new Intl.NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale).format(val);
  };

  const formatAverage = (val: number, isPercentage: boolean): string => {
    if (isPercentage) {
      return new Intl
          .NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
            style: 'percent',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })
          .format(val / 100);
    }
    return new Intl
        .NumberFormat(i18n.DevToolsLocale.DevToolsLocale.instance().locale, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
        .format(val);
  };

  const formatCpu = (val: number): string => {
    return i18n.TimeUtilities.preciseMillisToString(val, 1);
  };

  const formatNetwork = (val: number): string => {
    return i18n.ByteUtilities.bytesToString(val);
  };

  // clang-format off
  Lit.render(html`
    <style>${adsViewStyles}</style>
    <dl class="metrics-container">
      <div class="metric-box">
        <dt class="metric-title">${i18nString(UIStrings.viewportAdDensity)}</dt>
        <dd class="metric-value">
          <span>${formatValue(metrics.viewportAdDensityByArea, true)}</span>
          <span class="metric-average">${i18nString(UIStrings.average, {PH1: formatAverage(metrics.averageViewportAdDensityByArea, true)})}</span>
        </dd>
      </div>
      <div class="metric-box">
        <dt class="metric-title">${i18nString(UIStrings.viewportAdCount)}</dt>
        <dd class="metric-value">
          <span>${formatValue(metrics.viewportAdCount, false)}</span>
          <span class="metric-average">${i18nString(UIStrings.average, {PH1: formatAverage(metrics.averageViewportAdCount, false)})}</span>
        </dd>
      </div>
      <div class="metric-box">
        <dt class="metric-title">${i18nString(UIStrings.totalCpuUsage)}</dt>
        <dd class="metric-value">
          <span>${formatCpu(metrics.totalAdCpuTime)}</span>
        </dd>
      </div>
      <div class="metric-box">
        <dt class="metric-title">${i18nString(UIStrings.totalNetworkUsage)}</dt>
        <dd class="metric-value">
          <span>${formatNetwork(metrics.totalAdNetworkBytes)}</span>
        </dd>
      </div>
    </dl>
  `, target);
  // clang-format on
};

export class AdsView extends UI.Widget.Widget {
  #currentMetrics: Protocol.Ads.AdMetrics;
  #pollTimer?: number;
  #isPolling = false;
  #pollSessionId = 0;
  #view: View;

  constructor(view: View = DEFAULT_VIEW) {
    super({useShadowDom: true});
    this.#view = view;
    this.#currentMetrics = {
      viewportAdDensityByArea: 0,
      averageViewportAdDensityByArea: 0,
      viewportAdCount: 0,
      averageViewportAdCount: 0,
      totalAdCpuTime: 0,
      totalAdNetworkBytes: 0,
    };
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#startPolling();
    SDK.TargetManager.TargetManager.instance().addModelListener(SDK.ResourceTreeModel.ResourceTreeModel,
                                                                SDK.ResourceTreeModel.Events.PrimaryPageChanged,
                                                                this.#onPrimaryPageChanged, this);
  }

  override willHide(): void {
    this.#stopPolling();
    SDK.TargetManager.TargetManager.instance().removeModelListener(SDK.ResourceTreeModel.ResourceTreeModel,
                                                                   SDK.ResourceTreeModel.Events.PrimaryPageChanged,
                                                                   this.#onPrimaryPageChanged, this);
    super.willHide();
  }

  #startPolling(): void {
    if (this.#isPolling) {
      return;
    }
    this.#isPolling = true;
    this.#pollSessionId++;
    void this.#pollMetrics(this.#pollSessionId);
  }

  #stopPolling(): void {
    this.#isPolling = false;
    if (this.#pollTimer !== undefined) {
      window.clearTimeout(this.#pollTimer);
      this.#pollTimer = undefined;
    }
  }

  async #pollMetrics(sessionId: number): Promise<void> {
    if (!this.#isPolling || this.#pollSessionId !== sessionId) {
      return;
    }
    const target = SDK.TargetManager.TargetManager.instance().primaryPageTarget();
    if (target) {
      const adsAgent = target.adsAgent();
      if (adsAgent) {
        const response = await adsAgent.invoke_getAdMetrics();
        if (!this.#isPolling || this.#pollSessionId !== sessionId) {
          return;
        }
        if (!response.getError()) {
          this.#currentMetrics = response.metrics;
          this.requestUpdate();
        }
      }
    }
    if (this.#isPolling && this.#pollSessionId === sessionId) {
      this.#pollTimer = window.setTimeout(() => this.#pollMetrics(sessionId), 500);
    }
  }

  #onPrimaryPageChanged(): void {
    this.#currentMetrics = {
      viewportAdDensityByArea: 0,
      averageViewportAdDensityByArea: 0,
      viewportAdCount: 0,
      averageViewportAdCount: 0,
      totalAdCpuTime: 0,
      totalAdNetworkBytes: 0,
    };
    this.requestUpdate();
  }

  override performUpdate(): void {
    const viewInput: ViewInput = {
      metrics: this.#currentMetrics,
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}
