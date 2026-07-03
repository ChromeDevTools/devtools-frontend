// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/common/CPUThrottlingOption.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
export var CPUThrottlingRates;
(function (CPUThrottlingRates) {
    CPUThrottlingRates[CPUThrottlingRates["NO_THROTTLING"] = 1] = "NO_THROTTLING";
    CPUThrottlingRates[CPUThrottlingRates["MID_TIER_MOBILE"] = 4] = "MID_TIER_MOBILE";
    CPUThrottlingRates[CPUThrottlingRates["LOW_TIER_MOBILE"] = 6] = "LOW_TIER_MOBILE";
    CPUThrottlingRates[CPUThrottlingRates["EXTRA_SLOW"] = 20] = "EXTRA_SLOW";
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
    CPUThrottlingRates[CPUThrottlingRates["MidTierMobile"] = 4] = "MidTierMobile";
    // eslint-disable-next-line @typescript-eslint/naming-convention -- Used by web_tests.
    CPUThrottlingRates[CPUThrottlingRates["LowEndMobile"] = 6] = "LowEndMobile";
})(CPUThrottlingRates || (CPUThrottlingRates = {}));
function makeFixedPresetThrottlingOption(rate) {
    return {
        title: rate === 1 ? i18nLazyString(UIStrings.noThrottling) : i18nLazyString(UIStrings.dSlowdown, { PH1: rate }),
        rate: () => rate,
        jslogContext: rate === 1 ? 'cpu-no-throttling' : `cpu-throttled-${rate}`,
    };
}
export const NoThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.NO_THROTTLING);
export const MidTierThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.MID_TIER_MOBILE);
export const LowTierThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.LOW_TIER_MOBILE);
export const ExtraSlowThrottlingOption = makeFixedPresetThrottlingOption(CPUThrottlingRates.EXTRA_SLOW);
function makeCalibratedThrottlingOption(calibratedDeviceType) {
    const getSettingValue = () => {
        const setting = Common.Settings.Settings.instance().createSetting('calibrated-cpu-throttling', {}, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
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
        title() {
            const typeString = calibratedDeviceType === 'low-tier-mobile' ? i18nString(UIStrings.calibratedLowTierMobile) :
                i18nString(UIStrings.calibratedMidTierMobile);
            const value = getSettingValue();
            if (typeof value === 'number') {
                return `${typeString} – ${value.toFixed(1)}×`;
            }
            return typeString;
        },
        rate() {
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
export var CalibrationError;
(function (CalibrationError) {
    CalibrationError["DEVICE_TOO_WEAK"] = "DEVICE_TOO_WEAK";
})(CalibrationError || (CalibrationError = {}));
export function calibrationErrorToString(error) {
    if (error === CalibrationError.DEVICE_TOO_WEAK) {
        return i18nString(UIStrings.calibrationErrorDeviceTooWeak);
    }
    return error;
}
export const cpuThrottlingPresets = [
    NoThrottlingOption,
    MidTierThrottlingOption,
    LowTierThrottlingOption,
    ExtraSlowThrottlingOption,
    CalibratedLowTierMobileThrottlingOption,
    CalibratedMidTierMobileThrottlingOption,
];
export function determineOptionFromRate(rate, currentOption) {
    if (currentOption && currentOption.rate() === rate) {
        return currentOption;
    }
    return cpuThrottlingPresets.find(o => o.rate() === rate) || NoThrottlingOption;
}
//# sourceMappingURL=CPUThrottlingOption.js.map