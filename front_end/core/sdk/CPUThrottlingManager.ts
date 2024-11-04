// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

import {EmulationModel} from './EmulationModel.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

let throttlingManagerInstance: CPUThrottlingManager;

export class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDKModelObserver<EmulationModel> {
  #cpuThrottlingRateInternal: number;
  #hardwareConcurrencyInternal?: number;
  #pendingMainTargetPromise?: (r: number) => void;

  private constructor() {
    super();
    this.#cpuThrottlingRateInternal = CPUThrottlingRates.NO_THROTTLING;
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
    if (rate === this.#cpuThrottlingRateInternal) {
      return;
    }

    this.#cpuThrottlingRateInternal = rate;
    for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
      void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRateInternal);
    }
    this.dispatchEventToListeners(Events.RATE_CHANGED, this.#cpuThrottlingRateInternal);
  }

  setHardwareConcurrency(concurrency: number): void {
    this.#hardwareConcurrencyInternal = concurrency;
    for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
      void emulationModel.setHardwareConcurrency(concurrency);
    }
    this.dispatchEventToListeners(Events.HARDWARE_CONCURRENCY_CHANGED, this.#hardwareConcurrencyInternal);
  }

  hasPrimaryPageTargetSet(): boolean {
    // In some environments, such as Node, trying to check if we have a page
    // target may error. So if we get any errors here at all, assume that we do
    // not have a target.
    try {
      return TargetManager.instance().primaryPageTarget() !== null;
    } catch {
      return false;
    }
  }

  async getHardwareConcurrency(): Promise<number> {
    const target = TargetManager.instance().primaryPageTarget();
    const existingCallback = this.#pendingMainTargetPromise;

    // If the main target hasn't attached yet, block callers until it appears.
    if (!target) {
      if (existingCallback) {
        return new Promise(r => {
          this.#pendingMainTargetPromise = (result: number) => {
            r(result);
            existingCallback(result);
          };
        });
      }
      return new Promise(r => {
        this.#pendingMainTargetPromise = r;
      });
    }

    const evalResult = await target.runtimeAgent().invoke_evaluate(
        {expression: 'navigator.hardwareConcurrency', returnByValue: true, silent: true, throwOnSideEffect: true});
    const error = evalResult.getError();
    if (error) {
      throw new Error(error);
    }
    const {result, exceptionDetails} = evalResult;
    if (exceptionDetails) {
      throw new Error(exceptionDetails.text);
    }
    return result.value;
  }

  modelAdded(emulationModel: EmulationModel): void {
    if (this.#cpuThrottlingRateInternal !== CPUThrottlingRates.NO_THROTTLING) {
      void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRateInternal);
    }
    if (this.#hardwareConcurrencyInternal !== undefined) {
      void emulationModel.setHardwareConcurrency(this.#hardwareConcurrencyInternal);
    }

    // If there are any callers blocked on a getHardwareConcurrency call, let's wake them now.
    if (this.#pendingMainTargetPromise) {
      const existingCallback = this.#pendingMainTargetPromise;
      this.#pendingMainTargetPromise = undefined;
      void this.getHardwareConcurrency().then(existingCallback);
    }
  }

  modelRemoved(_emulationModel: EmulationModel): void {
    // Implemented as a requirement for being a SDKModelObserver.
  }
}

export const enum Events {
  RATE_CHANGED = 'RateChanged',
  HARDWARE_CONCURRENCY_CHANGED = 'HardwareConcurrencyChanged',
}

export type EventTypes = {
  [Events.RATE_CHANGED]: number,
  [Events.HARDWARE_CONCURRENCY_CHANGED]: number,
};

export function throttlingManager(): CPUThrottlingManager {
  return CPUThrottlingManager.instance();
}

export enum CPUThrottlingRates {
  NO_THROTTLING = 1,
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
  MidTierMobile = 4,
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
  LowEndMobile = 6,
  EXTRA_SLOW = 20,
}
