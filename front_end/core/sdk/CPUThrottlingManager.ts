// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../i18n/i18n.js';

import {EmulationModel} from './EmulationModel.js';
import {type SDKModelObserver, TargetManager} from './TargetManager.js';

const UIStrings = {
  /**
   * @description Text label for a menu item indicating that no throttling is applied.
   */
  noThrottling: 'No throttling',
  /**
   * @description Text label for a menu item indicating that a specific slowdown multiplier is applied.
   * @example {2} PH1
   */
  dSlowdown: '{PH1}× slowdown',
  /**
   * @description Text label for a menu item indicating an average mobile device.
   */
  calibratedMidTierMobile: 'Mid-tier mobile',
  /**
   * @description Text label for a menu item indicating a below-average mobile device.
   */
  calibratedLowTierMobile: 'Low-tier mobile',
  /**
   * @description Text label indicating why an option is not available, because the user's device is not fast enough to emulate a device.
   */
  calibrationErrorDeviceTooWeak: 'Device is not powerful enough',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/CPUThrottlingManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let throttlingManagerInstance: CPUThrottlingManager;

export class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements
    SDKModelObserver<EmulationModel> {
  #cpuThrottlingOptionInternal: CPUThrottlingOption;
  #calibratedThrottlingSetting: Common.Settings.Setting<CalibratedCPUThrottling>;
  #hardwareConcurrencyInternal?: number;
  #pendingMainTargetPromise?: (r: number) => void;

  private constructor() {
    super();
    this.#cpuThrottlingOptionInternal = NoThrottlingOption;
    this.#calibratedThrottlingSetting = Common.Settings.Settings.instance().createSetting<CalibratedCPUThrottling>(
        'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
    this.#calibratedThrottlingSetting.addChangeListener(this.#onCalibratedSettingChanged, this);
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
    return this.#cpuThrottlingOptionInternal.rate();
  }

  cpuThrottlingOption(): CPUThrottlingOption {
    return this.#cpuThrottlingOptionInternal;
  }

  #onCalibratedSettingChanged(): void {
    // If a calibrated option is selected, need to propagate new rate.
    const currentOption = this.#cpuThrottlingOptionInternal;
    if (!currentOption.calibratedDeviceType) {
      return;
    }

    const rate = this.#cpuThrottlingOptionInternal.rate();
    if (rate === 0) {
      // This calibrated option is no longer valid.
      this.setCPUThrottlingOption(NoThrottlingOption);
      return;
    }

    for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
      void emulationModel.setCPUThrottlingRate(rate);
    }
    this.dispatchEventToListeners(Events.RATE_CHANGED, rate);
  }

  setCPUThrottlingOption(option: CPUThrottlingOption): void {
    if (option === this.#cpuThrottlingOptionInternal) {
      return;
    }

    this.#cpuThrottlingOptionInternal = option;
    for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
      void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingOptionInternal.rate());
    }
    this.dispatchEventToListeners(Events.RATE_CHANGED, this.#cpuThrottlingOptionInternal.rate());
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

  modelAdded(emulationModel: EmulationModel): void {
    if (this.#cpuThrottlingOptionInternal !== NoThrottlingOption) {
      void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingOptionInternal.rate());
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

export interface EventTypes {
  [Events.RATE_CHANGED]: number;
  [Events.HARDWARE_CONCURRENCY_CHANGED]: number;
}

export function throttlingManager(): CPUThrottlingManager {
  return CPUThrottlingManager.instance();
}

export enum CPUThrottlingRates {
  NO_THROTTLING = 1,
  MID_TIER_MOBILE = 4,
  LOW_TIER_MOBILE = 6,
  EXTRA_SLOW = 20,

  // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
  MidTierMobile = MID_TIER_MOBILE,
  // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
  LowEndMobile = LOW_TIER_MOBILE,
}

export type CalibratedDeviceType = 'low-tier-mobile'|'mid-tier-mobile';

export interface CPUThrottlingOption {
  title: () => string;
  rate: () => number;
  calibratedDeviceType?: CalibratedDeviceType;
  jslogContext: string;
}

function makeFixedPresetThrottlingOption(rate: CPUThrottlingRates): CPUThrottlingOption {
  return {
    title: rate === 1 ? i18nLazyString(UIStrings.noThrottling) : i18nLazyString(UIStrings.dSlowdown, {PH1: rate}),
    rate: () => rate,
    jslogContext: rate === 1 ? 'cpu-no-throttling' : `cpu-throttled-${rate}`,
  };
}

export const NoThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.NO_THROTTLING);
export const MidTierThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.MID_TIER_MOBILE);
export const LowTierThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.LOW_TIER_MOBILE);
export const ExtraSlowThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.EXTRA_SLOW);

function makeCalibratedThrottlingOption(calibratedDeviceType: CalibratedDeviceType): CPUThrottlingOption {
  const getSettingValue = (): number|CalibrationError|null => {
    const setting = Common.Settings.Settings.instance().createSetting<CalibratedCPUThrottling>(
        'calibrated-cpu-throttling', {}, Common.Settings.SettingStorageType.GLOBAL);
    const value = setting.get();
    if (calibratedDeviceType === 'low-tier-mobile') {
      return value.low ?? null;
    }
    if (calibratedDeviceType === 'mid-tier-mobile') {
      return value.mid ?? null;
    }
    return null;
  };

  return {
    title(): string {
      const typeString = calibratedDeviceType === 'low-tier-mobile' ? i18nString(UIStrings.calibratedLowTierMobile) :
                                                                      i18nString(UIStrings.calibratedMidTierMobile);

      const value = getSettingValue();
      if (typeof value === 'number') {
        return `${typeString} – ${value.toFixed(1)}×`;
      }

      return typeString;
    },
    rate(): number {
      const value = getSettingValue();
      if (typeof value === 'number') {
        return value;
      }
      return 0;
    },
    calibratedDeviceType,
    jslogContext: `cpu-throttled-calibrated-${calibratedDeviceType}`,
  };
}

export const CalibratedLowTierMobileThrottlingOption = makeCalibratedThrottlingOption('low-tier-mobile');
export const CalibratedMidTierMobileThrottlingOption = makeCalibratedThrottlingOption('mid-tier-mobile');

export interface CalibratedCPUThrottling {
  /** Either the CPU multiplier, or an error code for why it could not be determined. */
  low?: number|CalibrationError;
  mid?: number|CalibrationError;
}

export enum CalibrationError {
  DEVICE_TOO_WEAK = 'DEVICE_TOO_WEAK',
}

export function calibrationErrorToString(error: CalibrationError): string {
  if (error === CalibrationError.DEVICE_TOO_WEAK) {
    return i18nString(UIStrings.calibrationErrorDeviceTooWeak);
  }

  return error;
}
