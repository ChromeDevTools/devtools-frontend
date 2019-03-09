// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Runnable}
 * @implements {SDK.SDKModelObserver<!SDK.HeapProfilerModel>}
 */
PerfUI.LiveHeapProfile = class {
  /**
   * @override
   */
  run() {
    SDK.targetManager.observeModels(SDK.HeapProfilerModel, this);
    requestIdleCallback(() => this.onUpdateProfiles(), {timeout: 100});
    PerfUI.LiveHeapProfile.hasStartedForTest(true);
  }

  /**
   * @param {boolean=} started
   * @return {!Promise}
   */
  static hasStartedForTest(started) {
    if (!PerfUI.LiveHeapProfile._startedPromise)
      PerfUI.LiveHeapProfile._startedPromise = new Promise(r => PerfUI.LiveHeapProfile._startedCallback = r);
    if (started)
      PerfUI.LiveHeapProfile._startedCallback();
    return PerfUI.LiveHeapProfile._startedPromise;
  }

  /**
   * @override
   * @param {!SDK.HeapProfilerModel} model
   */
  modelAdded(model) {
    model.startSampling(1024);
  }

  /**
   * @override
   * @param {!SDK.HeapProfilerModel} model
   */
  modelRemoved(model) {
    model.stopSampling();
  }

  async onUpdateProfiles() {
    const models = SDK.targetManager.models(SDK.HeapProfilerModel);
    const profiles = await Promise.all(models.map(model => model.getSamplingProfile()));
    const lineLevelProfile = PerfUI.LineLevelProfile.Memory.instance();
    lineLevelProfile.reset();
    for (let i = 0; i < profiles.length; ++i) {
      if (profiles[i])
        lineLevelProfile.appendHeapProfile(profiles[i], models[i].target());
    }
    const updateInterval = Host.isUnderTest() ? 10 : 5000;
    setTimeout(() => requestIdleCallback(() => this.onUpdateProfiles(), {timeout: 100}), updateInterval);
  }
};
