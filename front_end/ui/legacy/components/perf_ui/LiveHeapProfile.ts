// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as SDK from '../../../../core/sdk/sdk.js';

import {Memory} from './LineLevelProfile.js';

let liveHeapProfileInstance: LiveHeapProfile;
export class LiveHeapProfile implements Common.Runnable.Runnable,
                                        SDK.TargetManager.SDKModelObserver<SDK.HeapProfilerModel.HeapProfilerModel> {
  private running: boolean;
  private sessionId: number;
  private loadEventCallback: (arg0?: Function|null) => void;
  private readonly setting: Common.Settings.Setting<boolean>;

  private constructor() {
    this.running = false;
    this.sessionId = 0;
    this.loadEventCallback = () => {};
    this.setting = Common.Settings.Settings.instance().moduleSetting('memory-live-heap-profile');
    this.setting.addChangeListener(event => event.data ? this.startProfiling() : this.stopProfiling());
    if (this.setting.get()) {
      void this.startProfiling();
    }
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): LiveHeapProfile {
    const {forceNew} = opts;
    if (!liveHeapProfileInstance || forceNew) {
      liveHeapProfileInstance = new LiveHeapProfile();
    }

    return liveHeapProfileInstance;
  }

  async run(): Promise<void> {
    return;
  }

  modelAdded(model: SDK.HeapProfilerModel.HeapProfilerModel): void {
    void model.startSampling(1e4);
  }

  modelRemoved(_model: SDK.HeapProfilerModel.HeapProfilerModel): void {
    // Cannot do much when the model has already been removed.
  }

  private async startProfiling(): Promise<void> {
    if (this.running) {
      return;
    }
    this.running = true;
    const sessionId = this.sessionId;
    SDK.TargetManager.TargetManager.instance().observeModels(SDK.HeapProfilerModel.HeapProfilerModel, this);
    SDK.TargetManager.TargetManager.instance().addModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);

    do {
      const models = SDK.TargetManager.TargetManager.instance().models(SDK.HeapProfilerModel.HeapProfilerModel);
      const profiles = await Promise.all(models.map(model => model.getSamplingProfile()));
      if (sessionId !== this.sessionId) {
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
        new Promise(r => window.setTimeout(r, Host.InspectorFrontendHost.isUnderTest() ? 10 : 5000)),
        new Promise(r => {
          this.loadEventCallback = r;
        }),
      ]);
    } while (sessionId === this.sessionId);

    SDK.TargetManager.TargetManager.instance().unobserveModels(SDK.HeapProfilerModel.HeapProfilerModel, this);
    SDK.TargetManager.TargetManager.instance().removeModelListener(
        SDK.ResourceTreeModel.ResourceTreeModel, SDK.ResourceTreeModel.Events.Load, this.loadEventFired, this);
    for (const model of SDK.TargetManager.TargetManager.instance().models(SDK.HeapProfilerModel.HeapProfilerModel)) {
      void model.stopSampling();
    }
    Memory.instance().reset();
  }

  private stopProfiling(): void {
    if (!this.running) {
      return;
    }
    this.running = false;
    this.sessionId++;
  }

  private loadEventFired(): void {
    this.loadEventCallback();
  }
}
