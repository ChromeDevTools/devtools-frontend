import * as SDK from '../../core/sdk/sdk.js';
export declare class ThrottlingPresets {
    static getNoThrottlingConditions(): Conditions;
    static getOfflineConditions(): Conditions;
    static getLowEndMobileConditions(): Conditions;
    static getMidTierMobileConditions(): Conditions;
    static getCustomConditions(): PlaceholderConditions;
    static getMobilePresets(): Array<Conditions | PlaceholderConditions>;
    static getAdvancedMobilePresets(): Conditions[];
    static networkPresets: SDK.NetworkManager.Conditions[];
    static cpuThrottlingPresets: SDK.CPUThrottlingManager.CPUThrottlingOption[];
}
export interface Conditions {
    title: string;
    description: string;
    network: SDK.NetworkManager.Conditions;
    cpuThrottlingOption: SDK.CPUThrottlingManager.CPUThrottlingOption;
    jslogContext?: string;
}
export interface NetworkThrottlingConditionsGroup {
    title: string;
    items: SDK.NetworkManager.ThrottlingConditions[];
}
export interface MobileThrottlingConditionsGroup {
    title: string;
    items: Array<Conditions | PlaceholderConditions>;
}
export type ConditionsList = Array<Conditions | PlaceholderConditions | null>;
export interface PlaceholderConditions {
    title: string;
    description: string;
    jslogContext?: string;
}
