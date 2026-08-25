// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Protocol from '../../generated/protocol.js';
import * as Root from '../root/root.js';

import {EmulationModel} from './EmulationModel.js';
import {cpuPerformanceSettingDescriptor} from './SDKSettings.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

export enum CalibrationError {
  DEVICE_TOO_WEAK = 'DEVICE_TOO_WEAK',
}

export interface CalibratedCPUThrottling {
  low?: number|CalibrationError;
  mid?: number|CalibrationError;
  actualScore?: number;
}

export import CPUPerformanceTier = Protocol.Emulation.SetCPUPerformanceOverrideRequestPerformanceTier;

export function numberToTier(value: number): CPUPerformanceTier {
  switch (value) {
    case 1:
      return CPUPerformanceTier.Low;
    case 2:
      return CPUPerformanceTier.Mid;
    case 3:
      return CPUPerformanceTier.High;
    case 4:
      return CPUPerformanceTier.Ultra;
    default:
      // This defaults to UNKNOWN (0) if the value is out of range.
      return CPUPerformanceTier.Unknown;
  }
}

export function tierToNumber(tier: CPUPerformanceTier): number {
  switch (tier) {
    case CPUPerformanceTier.Unknown:
      return 0;
    case CPUPerformanceTier.Low:
      return 1;
    case CPUPerformanceTier.Mid:
      return 2;
    case CPUPerformanceTier.High:
      return 3;
    case CPUPerformanceTier.Ultra:
      return 4;
  }
}

export class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDKModelObserver<EmulationModel> {
  readonly #calibratedCpuThrottlingSetting: Common.Settings.Setting<CalibratedCPUThrottling>;
  readonly #cpuPerformanceSetting: Common.Settings.Setting<string>;
  readonly #targetManager: TargetManager;
  #cpuThrottlingRate: number;
  #hardwareConcurrency?: number;
  #hostDefaultCPUPerformanceTier?: CPUPerformanceTier;
  #manualCPUPerformanceOverride?: CPUPerformanceTier;
  #pendingMainTargetPromise?: (r: number) => void;

  constructor(settings: Common.Settings.Settings, targetManager: TargetManager) {
    super();
    this.#targetManager = targetManager;
    this.#cpuThrottlingRate = 1;  // No throttling
    this.#calibratedCpuThrottlingSetting = settings.createSetting<CalibratedCPUThrottling>(
        'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
    this.#cpuPerformanceSetting = settings.resolve(cpuPerformanceSettingDescriptor);
  }

  initialize(): void {
    this.#targetManager.observeModels(EmulationModel, this);
    this.#cpuPerformanceSetting.addChangeListener(this.#onCPUPerformanceSettingChanged, this);
    this.#onCPUPerformanceSettingChanged();
  }

  static instance(opts: {
    forceNew?: boolean|null,
    settings?: Common.Settings.Settings,
    targetManager?: TargetManager,
  } = {forceNew: null}): CPUThrottlingManager {
    const {forceNew} = opts;
    if (!Root.DevToolsContext.globalInstance().has(CPUThrottlingManager) || forceNew) {
      /* eslint-disable @devtools/no-instance-of-migrated-singletons */
      const manager = new CPUThrottlingManager(opts.settings ?? Common.Settings.Settings.instance(),
                                               opts.targetManager ?? TargetManager.instance());
      /* eslint-enable @devtools/no-instance-of-migrated-singletons */
      manager.initialize();
      Root.DevToolsContext.globalInstance().set(CPUThrottlingManager, manager);
    }

    return Root.DevToolsContext.globalInstance().get(CPUThrottlingManager);
  }

  static removeInstance(): void {
    Root.DevToolsContext.globalInstance().delete(CPUThrottlingManager);
  }

  cpuThrottlingRate(): number {
    return this.#cpuThrottlingRate;
  }

  calculatedCPUPerformanceTier(): CPUPerformanceTier|undefined {
    // Return the calculated tier, based on the host hardware baseline and any active CPU throttling multiplier,
    // ignoring any manual override via the sensors panel.
    // https://docs.google.com/document/d/1cVUQxigT9GMJweyR4c5Gmj16DEE7GnMTWy-FFPMkl14
    const NOMINAL_SCORES = {
      LOW: 264,
      MID: 1000,
      HIGH: 2350,
      ULTRA: 3000,
    };

    const calibratedSetting = this.#calibratedCpuThrottlingSetting.get();
    const isCalibrated = typeof calibratedSetting.actualScore === 'number' && calibratedSetting.actualScore > 0;

    let rLow: number;
    let rMid: number;
    let rHigh: number;
    let rUltra: number;

    if (isCalibrated) {
      const sHost = calibratedSetting.actualScore as number;
      rLow = typeof calibratedSetting.low === 'number' ? calibratedSetting.low : 1.0;
      rMid = typeof calibratedSetting.mid === 'number' ? calibratedSetting.mid : 1.0;
      rHigh = Math.min(rMid, Math.max(sHost / NOMINAL_SCORES.HIGH, 1.0));
      rUltra = Math.min(rHigh, Math.max(sHost / NOMINAL_SCORES.ULTRA, 1.0));
    } else {
      // If the host default tier is undefined or unknown, return that.
      const hostTier = this.#hostDefaultCPUPerformanceTier;
      if (!hostTier || hostTier === CPUPerformanceTier.Unknown) {
        return hostTier;
      }

      let sHost;
      switch (hostTier) {
        case CPUPerformanceTier.Low:
          sHost = NOMINAL_SCORES.LOW;
          break;
        case CPUPerformanceTier.Mid:
          sHost = NOMINAL_SCORES.MID;
          break;
        case CPUPerformanceTier.High:
          sHost = NOMINAL_SCORES.HIGH;
          break;
        default:
          sHost = NOMINAL_SCORES.ULTRA;
          break;
      }
      rLow = Math.max(sHost / NOMINAL_SCORES.LOW, 1.0);
      rMid = Math.max(sHost / NOMINAL_SCORES.MID, 1.0);
      rHigh = Math.max(sHost / NOMINAL_SCORES.HIGH, 1.0);
      rUltra = Math.max(sHost / NOMINAL_SCORES.ULTRA, 1.0);
    }

    const thetaLow = Math.sqrt(rLow * rMid);
    const thetaMid = Math.sqrt(rMid * rHigh);
    const thetaHigh = Math.sqrt(rHigh * rUltra);

    if (this.#cpuThrottlingRate >= thetaLow) {
      return CPUPerformanceTier.Low;
    }
    if (this.#cpuThrottlingRate >= thetaMid) {
      return CPUPerformanceTier.Mid;
    }
    if (this.#cpuThrottlingRate >= thetaHigh) {
      return CPUPerformanceTier.High;
    }
    return CPUPerformanceTier.Ultra;
  }

  effectiveCPUPerformanceTier(): CPUPerformanceTier|undefined {
    // Return the tier, applying the manual override, if any.
    if (this.#manualCPUPerformanceOverride !== undefined) {
      return this.#manualCPUPerformanceOverride;
    }
    return this.calculatedCPUPerformanceTier();
  }

  #onCPUPerformanceSettingChanged(): void {
    const val = this.#cpuPerformanceSetting.get();
    this.#manualCPUPerformanceOverride = val === 'no-override' ? undefined : val as CPUPerformanceTier;
    this.#syncCPUPerformanceTier();
    if (this.#hostDefaultCPUPerformanceTier === undefined) {
      void this.updateHostDefaultCPUPerformanceTier();
    }
  }

  #isCPUPerformanceOverrideActive(): boolean {
    return this.#manualCPUPerformanceOverride !== undefined || this.#cpuThrottlingRate !== 1;
  }

  #syncCPUPerformanceTier(): void {
    const effectiveTier = this.effectiveCPUPerformanceTier();
    // Synchronize with Chromium backend, via CDP.
    const activeOverride = this.#isCPUPerformanceOverrideActive() ? effectiveTier : undefined;
    for (const emulationModel of this.#targetManager.models(EmulationModel)) {
      void emulationModel.setCPUPerformanceOverride(activeOverride);
    }
    // Notify UI and other listeners.
    this.dispatchEventToListeners(Events.CPU_PERFORMANCE_TIER_CHANGED, effectiveTier);
  }

  setCPUThrottlingRate(rate: number): void {
    if (rate === this.#cpuThrottlingRate) {
      return;
    }

    this.#cpuThrottlingRate = rate;
    for (const emulationModel of this.#targetManager.models(EmulationModel)) {
      void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRate);
    }
    this.dispatchEventToListeners(Events.RATE_CHANGED, this.#cpuThrottlingRate);

    // Propagate changes to the effective tier only if not manually overridden.
    if (this.#manualCPUPerformanceOverride === undefined) {
      this.#syncCPUPerformanceTier();
      if (this.#hostDefaultCPUPerformanceTier === undefined) {
        void this.updateHostDefaultCPUPerformanceTier();
      }
    }
  }

  setHardwareConcurrency(concurrency: number): void {
    this.#hardwareConcurrency = concurrency;
    for (const emulationModel of this.#targetManager.models(EmulationModel)) {
      void emulationModel.setHardwareConcurrency(concurrency);
    }
    this.dispatchEventToListeners(Events.HARDWARE_CONCURRENCY_CHANGED, this.#hardwareConcurrency);
  }

  setCPUPerformanceTier(tier?: CPUPerformanceTier): void {
    this.#cpuPerformanceSetting.set(tier ?? 'no-override');
  }

  hasPrimaryPageTargetSet(): boolean {
    // In some environments, such as Node, trying to check if we have a page
    // target may error. So if we get any errors here at all, assume that we do
    // not have a target.
    try {
      return this.#targetManager.primaryPageTarget() !== null;
    } catch {
      return false;
    }
  }

  async getHardwareConcurrency(): Promise<number> {
    const target = this.#targetManager.primaryPageTarget();
    const existingCallback = this.#pendingMainTargetPromise;

    // If the main target hasn't attached yet, block callers until it appears.
    if (!target) {
      if (existingCallback) {
        return await new Promise(r => {
          this.#pendingMainTargetPromise = (result: number) => {
            r(result);
            existingCallback(result);
          };
        });
      }
      return await new Promise(r => {
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

  async updateHostDefaultCPUPerformanceTier(): Promise<void> {
    if (this.#manualCPUPerformanceOverride !== undefined) {
      // We do not want to update the host default tier when it is manually overridden
      // via the sensors panel (in which case, `navigator.cpuPerformance` would return the override).
      return;
    }
    const target = this.#targetManager.primaryPageTarget();
    if (!target) {
      return;
    }
    const evalResult = await target.runtimeAgent().invoke_evaluate(
        {expression: 'navigator.cpuPerformance', returnByValue: true, silent: true, throwOnSideEffect: true});
    if (evalResult.getError()) {
      return;
    }
    const {result, exceptionDetails} = evalResult;
    if (exceptionDetails || typeof result.value !== 'number') {
      return;
    }
    const detectedTier = numberToTier(result.value);
    if (this.#hostDefaultCPUPerformanceTier !== detectedTier) {
      this.#hostDefaultCPUPerformanceTier = detectedTier;
      this.#syncCPUPerformanceTier();
    }
  }

  modelAdded(emulationModel: EmulationModel): void {
    if (this.#cpuThrottlingRate !== 1) {
      void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingRate);
    }
    if (this.#hardwareConcurrency !== undefined) {
      void emulationModel.setHardwareConcurrency(this.#hardwareConcurrency);
    }
    if (this.#isCPUPerformanceOverrideActive()) {
      void emulationModel.setCPUPerformanceOverride(this.effectiveCPUPerformanceTier());
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
  CPU_PERFORMANCE_TIER_CHANGED = 'CpuPerformanceTierChanged',
}

export interface EventTypes {
  [Events.RATE_CHANGED]: number;
  [Events.HARDWARE_CONCURRENCY_CHANGED]: number;
  [Events.CPU_PERFORMANCE_TIER_CHANGED]: CPUPerformanceTier|undefined;
}
