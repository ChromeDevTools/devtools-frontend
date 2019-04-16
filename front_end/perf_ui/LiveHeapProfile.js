// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @implements {Common.Runnable}
 * @implements {SDK.SDKModelObserver<!SDK.HeapProfilerModel>}
 */
PerfUI.LiveHeapProfile = class {
  constructor() {
    this._running = false;
    this._sessionId = 0;
    this._loadEventCallback = () => {};
    this._setting = Common.settings.moduleSetting('memoryLiveHeapProfile');
    this._setting.addChangeListener(event => event.data ? this._startProfiling() : this._stopProfiling());
    if (this._setting.get())
      this._startProfiling();
  }

  /**
   * @override
   */
  run() {
  }

  /**
   * @override
   * @param {!SDK.HeapProfilerModel} model
   */
  modelAdded(model) {
    model.startSampling(1e4);
  }

  /**
   * @override
   * @param {!SDK.HeapProfilerModel} model
   */
  modelRemoved(model) {
    // Cannot do much when the model has already been removed.
  }

  async _startProfiling() {
    if (this._running)
      return;
    this._running = true;
    const sessionId = this._sessionId;
    SDK.targetManager.observeModels(SDK.HeapProfilerModel, this);
    SDK.targetManager.addModelListener(
        SDK.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);

    do {
      const models = SDK.targetManager.models(SDK.HeapProfilerModel);
      const profiles = await Promise.all(models.map(model => model.getSamplingProfile()));
      if (sessionId !== this._sessionId)
        break;
      const lineLevelProfile = self.runtime.sharedInstance(PerfUI.LineLevelProfile.Memory);
      lineLevelProfile.reset();
      for (let i = 0; i < profiles.length; ++i) {
        if (profiles[i])
          lineLevelProfile.appendHeapProfile(profiles[i], models[i].target());
      }
      await Promise.race([
        new Promise(r => setTimeout(r, Host.isUnderTest() ? 10 : 5000)), new Promise(r => this._loadEventCallback = r)
      ]);
    } while (sessionId === this._sessionId);

    SDK.targetManager.unobserveModels(SDK.HeapProfilerModel, this);
    SDK.targetManager.removeModelListener(
        SDK.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
    for (const model of SDK.targetManager.models(SDK.HeapProfilerModel))
      model.stopSampling();
    self.runtime.sharedInstance(PerfUI.LineLevelProfile.Memory).reset();
  }

  _stopProfiling() {
    if (!this._running)
      return;
    this._running = 0;
    this._sessionId++;
  }

  _loadEventFired() {
    this._loadEventCallback();
  }
};
