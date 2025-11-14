// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../i18n/i18n.js';
import { EmulationModel } from './EmulationModel.js';
import { TargetManager } from './TargetManager.js';
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
const str_ = i18n.i18n.registerUIStrings('core/sdk/CPUThrottlingManager.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let throttlingManagerInstance;
export class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper {
    #cpuThrottlingOption;
    #calibratedThrottlingSetting;
    #hardwareConcurrency;
    #pendingMainTargetPromise;
    constructor() {
        super();
        this.#cpuThrottlingOption = NoThrottlingOption;
        this.#calibratedThrottlingSetting = Common.Settings.Settings.instance().createSetting('calibrated-cpu-throttling', {}, "Global" /* Common.Settings.SettingStorageType.GLOBAL */);
        this.#calibratedThrottlingSetting.addChangeListener(this.#onCalibratedSettingChanged, this);
        TargetManager.instance().observeModels(EmulationModel, this);
    }
    static instance(opts = { forceNew: null }) {
        const { forceNew } = opts;
        if (!throttlingManagerInstance || forceNew) {
            throttlingManagerInstance = new CPUThrottlingManager();
        }
        return throttlingManagerInstance;
    }
    cpuThrottlingRate() {
        return this.#cpuThrottlingOption.rate();
    }
    cpuThrottlingOption() {
        return this.#cpuThrottlingOption;
    }
    #onCalibratedSettingChanged() {
        // If a calibrated option is selected, need to propagate new rate.
        const currentOption = this.#cpuThrottlingOption;
        if (!currentOption.calibratedDeviceType) {
            return;
        }
        const rate = this.#cpuThrottlingOption.rate();
        if (rate === 0) {
            // This calibrated option is no longer valid.
            this.setCPUThrottlingOption(NoThrottlingOption);
            return;
        }
        for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
            void emulationModel.setCPUThrottlingRate(rate);
        }
        this.dispatchEventToListeners("RateChanged" /* Events.RATE_CHANGED */, rate);
    }
    setCPUThrottlingOption(option) {
        if (option === this.#cpuThrottlingOption) {
            return;
        }
        this.#cpuThrottlingOption = option;
        for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
            void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingOption.rate());
        }
        this.dispatchEventToListeners("RateChanged" /* Events.RATE_CHANGED */, this.#cpuThrottlingOption.rate());
    }
    setHardwareConcurrency(concurrency) {
        this.#hardwareConcurrency = concurrency;
        for (const emulationModel of TargetManager.instance().models(EmulationModel)) {
            void emulationModel.setHardwareConcurrency(concurrency);
        }
        this.dispatchEventToListeners("HardwareConcurrencyChanged" /* Events.HARDWARE_CONCURRENCY_CHANGED */, this.#hardwareConcurrency);
    }
    hasPrimaryPageTargetSet() {
        // In some environments, such as Node, trying to check if we have a page
        // target may error. So if we get any errors here at all, assume that we do
        // not have a target.
        try {
            return TargetManager.instance().primaryPageTarget() !== null;
        }
        catch {
            return false;
        }
    }
    async getHardwareConcurrency() {
        const target = TargetManager.instance().primaryPageTarget();
        const existingCallback = this.#pendingMainTargetPromise;
        // If the main target hasn't attached yet, block callers until it appears.
        if (!target) {
            if (existingCallback) {
                return await new Promise(r => {
                    this.#pendingMainTargetPromise = (result) => {
                        r(result);
                        existingCallback(result);
                    };
                });
            }
            return await new Promise(r => {
                this.#pendingMainTargetPromise = r;
            });
        }
        const evalResult = await target.runtimeAgent().invoke_evaluate({ expression: 'navigator.hardwareConcurrency', returnByValue: true, silent: true, throwOnSideEffect: true });
        const error = evalResult.getError();
        if (error) {
            throw new Error(error);
        }
        const { result, exceptionDetails } = evalResult;
        if (exceptionDetails) {
            throw new Error(exceptionDetails.text);
        }
        return result.value;
    }
    modelAdded(emulationModel) {
        if (this.#cpuThrottlingOption !== NoThrottlingOption) {
            void emulationModel.setCPUThrottlingRate(this.#cpuThrottlingOption.rate());
        }
        if (this.#hardwareConcurrency !== undefined) {
            void emulationModel.setHardwareConcurrency(this.#hardwareConcurrency);
        }
        // If there are any callers blocked on a getHardwareConcurrency call, let's wake them now.
        if (this.#pendingMainTargetPromise) {
            const existingCallback = this.#pendingMainTargetPromise;
            this.#pendingMainTargetPromise = undefined;
            void this.getHardwareConcurrency().then(existingCallback);
        }
    }
    modelRemoved(_emulationModel) {
        // Implemented as a requirement for being a SDKModelObserver.
    }
}
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
//# sourceMappingURL=CPUThrottlingManager.js.map