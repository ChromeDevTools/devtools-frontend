// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../host/host.js';
import * as SDK from '../sdk/sdk.js';

import {Memory} from './LineLevelProfile.js';

/**
 * @implements {Common.Runnable.Runnable}
 * @implements {SDK.SDKModel.SDKModelObserver<!SDK.HeapProfilerModel.HeapProfilerModel>}
 */
export class LiveHeapProfile {
  constructor() {
    this._running = false;
    this._sessionId = 0;
    /** @type {function(?Function=):void} */
    this._loadEventCallback = () => {};
    this._setting = Common.Settings.Settings.instance().moduleSetting('memoryLiveHeapProfile');
    this._setting.addChangeListener(event => event.data ? this._startProfiling() : this._stopProfiling());
    if (this._setting.get()) {
      this._startProfiling();
    }
  }

  /**
   * @override
   */
  run() {
    return Promise.resolve();
  }

  /**
   * @override
   * @param {!SDK.HeapProfilerModel.HeapProfilerModel} model
   */
  modelAdded(model) {
    model.startSampling(1e4);
  }

  /**
   * @override
   * @param {!SDK.HeapProfilerModel.HeapProfilerModel} model
   */
  modelRemoved(model) {
    // Cannot do much when the model has already been removed.
  }

  async _startProfiling() {
    if (this._running) {
      return;
    }
    this._running = true;
    const sessionId = this._sessionId;
    SDK.SDKModel.TargetManager.instance().observeModels(SDK.HeapProfilerModel.HeapProfilerModel, this);
    SDK.SDKModel.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);

    do {
      const models = SDK.SDKModel.TargetManager.instance().models(SDK.HeapProfilerModel.HeapProfilerModel);
      const profiles = await Promise.all(models.map(model => model.getSamplingProfile()));
      if (sessionId !== this._sessionId) {
        break;
      }
      Memory.instance().reset();
      for (let i = 0; i < profiles.length; ++i) {
        const profile = profiles[i];
        if (!profile) {
          continue;
        }

        Memory.instance().appendHeapProfile(profile, models[i].target());
      }
      await Promise.race([
        new Promise(r => setTimeout(r, Host.InspectorFrontendHost.isUnderTest() ? 10 : 5000)), new Promise(r => {
          this._loadEventCallback = r;
        })
      ]);
    } while (sessionId === this._sessionId);

    SDK.SDKModel.TargetManager.instance().unobserveModels(SDK.HeapProfilerModel.HeapProfilerModel, this);
    SDK.SDKModel.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this._loadEventFired, this);
    for (const model of SDK.SDKModel.TargetManager.instance().models(SDK.HeapProfilerModel.HeapProfilerModel)) {
      model.stopSampling();
    }
    Memory.instance().reset();
  }

  _stopProfiling() {
    if (!this._running) {
      return;
    }
    this._running = false;
    this._sessionId++;
  }

  _loadEventFired() {
    this._loadEventCallback();
  }
}
