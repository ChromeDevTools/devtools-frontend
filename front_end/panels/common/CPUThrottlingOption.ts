// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';

export type CalibratedCPUThrottling = SDK.CPUThrottlingManager.CalibratedCPUThrottling;
export import CalibrationError = SDK.CPUThrottlingManager.CalibrationError;
export import CPUPerformanceTier = SDK.CPUThrottlingManager.CPUPerformanceTier;

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
const str_ = i18n.i18n.registerUIStrings('panels/common/CPUThrottlingOption.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

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

export const NoThrottlingOption: CPUThrottlingOption =
    makeFixedPresetThrottlingOption(CPUThrottlingRates.NO_THROTTLING);
export const MidTierThrottlingOption: CPUThrottlingOption =
    makeFixedPresetThrottlingOption(CPUThrottlingRates.MID_TIER_MOBILE);
export const LowTierThrottlingOption: CPUThrottlingOption =
    makeFixedPresetThrottlingOption(CPUThrottlingRates.LOW_TIER_MOBILE);
export const ExtraSlowThrottlingOption: CPUThrottlingOption =
    makeFixedPresetThrottlingOption(CPUThrottlingRates.EXTRA_SLOW);

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

export const CalibratedLowTierMobileThrottlingOption: CPUThrottlingOption =
    makeCalibratedThrottlingOption('low-tier-mobile');
export const CalibratedMidTierMobileThrottlingOption: CPUThrottlingOption =
    makeCalibratedThrottlingOption('mid-tier-mobile');

export function calibrationErrorToString(error: CalibrationError): string {
  if (error === CalibrationError.DEVICE_TOO_WEAK) {
    return i18nString(UIStrings.calibrationErrorDeviceTooWeak);
  }

  return error;
}

export const cpuThrottlingPresets: CPUThrottlingOption[] = [
  NoThrottlingOption,
  MidTierThrottlingOption,
  LowTierThrottlingOption,
  ExtraSlowThrottlingOption,
  CalibratedLowTierMobileThrottlingOption,
  CalibratedMidTierMobileThrottlingOption,
];

export function determineOptionFromRate(rate: number, currentOption?: CPUThrottlingOption): CPUThrottlingOption {
  if (currentOption && currentOption.rate() === rate) {
    return currentOption;
  }
  return cpuThrottlingPresets.find(o => o.rate() === rate) || NoThrottlingOption;
}
