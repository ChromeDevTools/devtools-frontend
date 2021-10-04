// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {EmulationModel} from './EmulationModel.js';
import type {SDKModelObserver} from './TargetManager.js';
import {TargetManager} from './TargetManager.js';

let throttlingManagerInstance: CPUThrottlingManager;

export class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDKModelObserver<EmulationModel> {
  #cpuThrottlingRateInternal: number;

  private constructor() {
    super();
    this.#cpuThrottlingRateInternal = CPUThrottlingRates.NoThrottling;
    TargetManager.instance().observeModels(EmulationModel, this);
  }

  static instance(opts: {forceNew: boolean|null} = {forceNew: null}): CPUThrottlingManager {
    const {forceNew} = opts;
    if (!throttlingManagerInstance || forceNew) {
      throttlingManagerInstance = new CPUThrottlingManager();
    }

    return throttlingManagerInstance;
  }

  cpuThrottlingRate(): number {
    return this.#cpuThrottlingRateInternal;
  }

  setCPUThrottlingRate(rate: number): void {
    this.#cpuThrottlingRateInternal = rate;
    for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
      emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRateInternal);
    }
    this.dispatchEventToListeners(Events.RateChanged, this.#cpuThrottlingRateInternal);
  }

  modelAdded(emulationModel: EmulationModel): void {
    if (this.#cpuThrottlingRateInternal !== CPUThrottlingRates.NoThrottling) {
      emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRateInternal);
    }
  }

  modelRemoved(_emulationModel: EmulationModel): void {
    // Implemented as a requirement for being a SDKModelObserver.
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  RateChanged = 'RateChanged',
}

export type EventTypes = {
  [Events.RateChanged]: number,
};

export function throttlingManager(): CPUThrottlingManager {
  return CPUThrottlingManager.instance();
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum CPUThrottlingRates {
  NoThrottling = 1,
  MidTierMobile = 4,
  LowEndMobile = 6,
}
