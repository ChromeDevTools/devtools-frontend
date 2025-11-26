import * as Common from '../core/common/common.js';
export declare function stubNoopSettings(): void;
export declare const DEFAULT_SETTING_REGISTRATIONS_FOR_TEST: Common.SettingRegistration.SettingRegistration[];
export declare function setupSettings(reset: boolean): void;
export declare function cleanupSettings(): void;
export declare function setupSettingsHooks(): void;
export declare function createSettingsForTest(settingRegistrations?: Common.SettingRegistration.SettingRegistration[]): Common.Settings.Settings;
