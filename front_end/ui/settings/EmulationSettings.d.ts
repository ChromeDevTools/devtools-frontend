import * as Common from '../../core/common/common.js';
export declare const showMediaQueryInspectorSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const showRulersSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export interface LocationDescription {
    title: string;
    lat: number;
    long: number;
    timezoneId: string;
    locale: string;
    accuracy?: number;
}
export declare const emulationLocationsSettingDescriptor: Common.Settings.SettingDescriptor<LocationDescription[]>;
