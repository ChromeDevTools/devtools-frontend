// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';

import {Capability, SDKModel, Target} from './SDKModel.js';  // eslint-disable-line no-unused-vars

export class PerformanceMetricsModel extends SDKModel {
  /**
   * @param {!Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.performanceAgent();

    const mode = MetricMode;
    /** @type {!Map<string, !MetricMode>} */
    this._metricModes = new Map([
      ['TaskDuration', mode.CumulativeTime], ['ScriptDuration', mode.CumulativeTime],
      ['LayoutDuration', mode.CumulativeTime], ['RecalcStyleDuration', mode.CumulativeTime],
      ['LayoutCount', mode.CumulativeCount], ['RecalcStyleCount', mode.CumulativeCount]
    ]);

    /** @type {!Map<string, !{lastValue: (number|undefined), lastTimestamp: (number|undefined)}>} */
    this._metricData = new Map();
  }

  /**
   * @return {!Promise}
   */
  enable() {
    return this._agent.enable();
  }

  /**
   * @return {!Promise}
   */
  disable() {
    return this._agent.disable();
  }

  /**
   * @return {!Promise<!{metrics: !Map<string, number>, timestamp: number}>}
   */
  async requestMetrics() {
    const rawMetrics = await this._agent.getMetrics() || [];
    const metrics = new Map();
    const timestamp = performance.now();
    for (const metric of rawMetrics) {
      let data = this._metricData.get(metric.name);
      if (!data) {
        data = {};
        this._metricData.set(metric.name, data);
      }
      let value;
      switch (this._metricModes.get(metric.name)) {
        case MetricMode.CumulativeTime:
          value = data.lastTimestamp ?
              Platform.NumberUtilities.clamp(
                  (metric.value - data.lastValue) * 1000 / (timestamp - data.lastTimestamp), 0, 1) :
              0;
          data.lastValue = metric.value;
          data.lastTimestamp = timestamp;
          break;
        case MetricMode.CumulativeCount:
          value = data.lastTimestamp ?
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

/** @enum {symbol} */
const MetricMode = {
  CumulativeTime: Symbol('CumulativeTime'),
  CumulativeCount: Symbol('CumulativeCount'),
};

SDKModel.register(PerformanceMetricsModel, Capability.DOM, false);
