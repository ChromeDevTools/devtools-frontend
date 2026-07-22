import * as Common from '../core/common/common.js';
declare function createSettingValue(category: Common.Settings.SettingCategory, settingName: string, defaultValue: unknown, settingType?: Common.SettingRegistration.SettingType, title?: string | (() => Common.UIString.LocalizedString)): Common.Settings.SettingRegistration;
export declare function stubNoopSettings(): void;
export declare const DEFAULT_SETTING_REGISTRATIONS_FOR_TEST: ReadonlyArray<ReturnType<typeof createSettingValue>>;
export declare function setupSettings(reset: boolean): void;
export declare function cleanupSettings(): void;
export declare function setupSettingsHooks(): void;
export declare function createSettingsForTest(settingRegistrations?: Common.SettingRegistration.SettingRegistration[]): Common.Settings.Settings;
export {};
