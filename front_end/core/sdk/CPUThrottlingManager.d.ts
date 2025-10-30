import * as Common from '../../core/common/common.js';
import { EmulationModel } from './EmulationModel.js';
import { type SDKModelObserver } from './TargetManager.js';
export declare class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDKModelObserver<EmulationModel> {
    #private;
    private constructor();
    static instance(opts?: {
        forceNew: boolean | null;
    }): CPUThrottlingManager;
    cpuThrottlingRate(): number;
    cpuThrottlingOption(): CPUThrottlingOption;
    setCPUThrottlingOption(option: CPUThrottlingOption): void;
    setHardwareConcurrency(concurrency: number): void;
    hasPrimaryPageTargetSet(): boolean;
    getHardwareConcurrency(): Promise<number>;
    modelAdded(emulationModel: EmulationModel): void;
    modelRemoved(_emulationModel: EmulationModel): void;
}
export declare const enum Events {
    RATE_CHANGED = "RateChanged",
    HARDWARE_CONCURRENCY_CHANGED = "HardwareConcurrencyChanged"
}
export interface EventTypes {
    [Events.RATE_CHANGED]: number;
    [Events.HARDWARE_CONCURRENCY_CHANGED]: number;
}
export declare function throttlingManager(): CPUThrottlingManager;
export declare enum CPUThrottlingRates {
    NO_THROTTLING = 1,
    MID_TIER_MOBILE = 4,
    LOW_TIER_MOBILE = 6,
    EXTRA_SLOW = 20,
    MidTierMobile = 4,
    LowEndMobile = 6
}
export type CalibratedDeviceType = 'low-tier-mobile' | 'mid-tier-mobile';
export interface CPUThrottlingOption {
    title: () => string;
    rate: () => number;
    calibratedDeviceType?: CalibratedDeviceType;
    jslogContext: string;
}
export declare const NoThrottlingOption: CPUThrottlingOption;
export declare const MidTierThrottlingOption: CPUThrottlingOption;
export declare const LowTierThrottlingOption: CPUThrottlingOption;
export declare const ExtraSlowThrottlingOption: CPUThrottlingOption;
export declare const CalibratedLowTierMobileThrottlingOption: CPUThrottlingOption;
export declare const CalibratedMidTierMobileThrottlingOption: CPUThrottlingOption;
export interface CalibratedCPUThrottling {
    /** Either the CPU multiplier, or an error code for why it could not be determined. */
    low?: number | CalibrationError;
    mid?: number | CalibrationError;
}
export declare enum CalibrationError {
    DEVICE_TOO_WEAK = "DEVICE_TOO_WEAK"
}
export declare function calibrationErrorToString(error: CalibrationError): string;
