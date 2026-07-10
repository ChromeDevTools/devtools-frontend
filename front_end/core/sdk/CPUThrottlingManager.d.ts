import * as Common from '../../core/common/common.js';
import { EmulationModel } from './EmulationModel.js';
import { type SDKModelObserver, TargetManager } from './TargetManager.js';
export declare class CPUThrottlingManager extends Common.ObjectWrapper.ObjectWrapper<EventTypes> implements SDKModelObserver<EmulationModel> {
    #private;
    constructor(settings: Common.Settings.Settings, targetManager: TargetManager);
    initialize(): void;
    static instance(opts?: {
        forceNew?: boolean | null;
        settings?: Common.Settings.Settings;
        targetManager?: TargetManager;
    }): CPUThrottlingManager;
    static removeInstance(): void;
    cpuThrottlingRate(): number;
    setCPUThrottlingRate(rate: number): void;
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
