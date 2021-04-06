// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';  // eslint-disable-line no-unused-vars
import * as Host from '../core/host/host.js';
import * as SDK from '../core/sdk/sdk.js';

import {Memory} from './LineLevelProfile.js';

let liveHeapProfileInstance: LiveHeapProfile;
export class LiveHeapProfile implements Common.Runnable.Runnable,
                                        SDK.SDKModel.SDKModelObserver<SDK.HeapProfilerModel.HeapProfilerModel> {
  _running: boolean;
  _sessionId: number;
  _loadEventCallback: (arg0?: Function|null) => void;
  _setting: Common.Settings.Setting<boolean>;

  private constructor() {
    this._running = false;
    this._sessionId = 0;
    this._loadEventCallback = (): void => {};
    this._setting = Common.Settings.Settings.instance().moduleSetting('memoryLiveHeapProfile');
    this._setting.addChangeListener(event => event.data ? this._startProfiling() : this._stopProfiling());
    if (this._setting.get()) {
      this._startProfiling();
    }
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): LiveHeapProfile {
    const {forceNew} = opts;
    if (!liveHeapProfileInstance || forceNew) {
      liveHeapProfileInstance = new LiveHeapProfile();
    }

    return liveHeapProfileInstance;
  }

  run(): Promise<void> {
    return Promise.resolve();
  }

  modelAdded(model: SDK.HeapProfilerModel.HeapProfilerModel): void {
    model.startSampling(1e4);
  }

  modelRemoved(_model: SDK.HeapProfilerModel.HeapProfilerModel): void {
    // Cannot do much when the model has already been removed.
  }

  async _startProfiling(): Promise<void> {
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
        new Promise(r => setTimeout(r, Host.InspectorFrontendHost.isUnderTest() ? 10 : 5000)),
        new Promise(r => {
          this._loadEventCallback = r;
        }),
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

  _stopProfiling(): void {
    if (!this._running) {
      return;
    }
    this._running = false;
    this._sessionId++;
  }

  _loadEventFired(): void {
    this._loadEventCallback();
  }
}
