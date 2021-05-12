// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Platform from '../platform/platform.js';
import type * as ProtocolProxyApi from '../../generated/protocol-proxy-api.js';

import type {Target} from './SDKModel.js';
import {Capability, SDKModel} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class PerformanceMetricsModel extends SDKModel {
  _agent: ProtocolProxyApi.PerformanceApi;
  _metricModes: Map<string, MetricMode>;
  _metricData: Map<string, {
    lastValue: (number | undefined),
    lastTimestamp: (number|undefined),
  }>;

  constructor(target: Target) {
    super(target);
    this._agent = target.performanceAgent();

    this._metricModes = new Map([
      ['TaskDuration', MetricMode.CumulativeTime],
      ['ScriptDuration', MetricMode.CumulativeTime],
      ['LayoutDuration', MetricMode.CumulativeTime],
      ['RecalcStyleDuration', MetricMode.CumulativeTime],
      ['LayoutCount', MetricMode.CumulativeCount],
      ['RecalcStyleCount', MetricMode.CumulativeCount],
    ]);

    this._metricData = new Map();
  }

  enable(): Promise<Object> {
    return this._agent.invoke_enable({});
  }

  disable(): Promise<Object> {
    return this._agent.invoke_disable();
  }

  async requestMetrics(): Promise<{
    metrics: Map<string, number>,
    timestamp: number,
  }> {
    const rawMetrics = await this._agent.invoke_getMetrics() || [];
    const metrics = new Map<string, number>();
    const timestamp = performance.now();
    for (const metric of rawMetrics.metrics) {
      let data = this._metricData.get(metric.name);
      if (!data) {
        data = {lastValue: undefined, lastTimestamp: undefined};
        this._metricData.set(metric.name, data);
      }
      let value;
      switch (this._metricModes.get(metric.name)) {
        case MetricMode.CumulativeTime:
          value = (data.lastTimestamp && data.lastValue) ?
              Platform.NumberUtilities.clamp(
                  (metric.value - data.lastValue) * 1000 / (timestamp - data.lastTimestamp), 0, 1) :
              0;
          data.lastValue = metric.value;
          data.lastTimestamp = timestamp;
          break;
        case MetricMode.CumulativeCount:
          value = (data.lastTimestamp && data.lastValue) ?
              Math.max(0, (metric.value - data.lastValue) * 1000 / (timestamp - data.lastTimestamp)) :
              0;
          data.lastValue = metric.value;
          data.lastTimestamp = timestamp;
          break;
        default:
          value = metric.value;
          break;
      }
      metrics.set(metric.name, value);
    }
    return {metrics: metrics, timestamp: timestamp};
  }
}

const enum MetricMode {
  CumulativeTime = 'CumulativeTime',
  CumulativeCount = 'CumulativeCount',
}

SDKModel.register(PerformanceMetricsModel, {capabilities: Capability.DOM, autostart: false});
