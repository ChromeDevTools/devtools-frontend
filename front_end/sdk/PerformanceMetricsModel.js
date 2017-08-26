// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

SDK.PerformanceMetricsModel = class extends SDK.SDKModel {
  /**
   * @param {!SDK.Target} target
   */
  constructor(target) {
    super(target);
    this._agent = target.performanceAgent();
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
   * @return {!Promise<!Array<!Protocol.Performance.Metric>>}
   */
  async requestMetrics() {
    return await this._agent.getMetrics() || [];
  }
};

SDK.SDKModel.register(SDK.PerformanceMetricsModel, SDK.Target.Capability.Browser, false);
