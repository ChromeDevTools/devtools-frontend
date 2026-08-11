import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
export interface SettingUIDescriptor {
    /**
     * The category with which the setting is displayed in the UI.
     */
    category?: Common.SettingRegistration.SettingCategory;
    /**
     * Used to sort on screen the settings that belong to the same category.
     */
    order?: number;
    /**
     * The title with which the setting is shown on screen.
     */
    title?: () => Platform.UIString.LocalizedString;
    /**
     * Words used to find a setting in the Command Menu.
     */
    tags?: Array<() => Platform.UIString.LocalizedString>;
    /**
     * The possible values the setting can have, each with a description composed of a title and an optional text.
     */
    options?: Common.SettingRegistration.SettingExtensionOption[];
    /**
     * Whether DevTools must be reloaded for a change in the setting to take effect.
     */
    reloadRequired?: boolean;
    /**
     * See {@link LearnMore} for more info.
     */
    learnMore?: Common.SettingRegistration.LearnMore;
}
export interface RegisteredSettingUI {
    descriptor: Common.Settings.SettingDescriptor<unknown>;
    uiDescriptor: SettingUIDescriptor;
}
export declare function register(settingDescriptor: Common.Settings.SettingDescriptor<unknown>, settingUIDescriptor: SettingUIDescriptor): void;
export declare function getRegisteredSettings(): readonly RegisteredSettingUI[];
export interface SimpleSettingOption {
    value: string | boolean;
    title: Platform.UIString.LocalizedString;
    text?: Platform.UIString.LocalizedString | string;
    raw?: boolean;
}
export declare class SettingUI {
    #private;
    constructor(raw: SettingUIDescriptor);
    get title(): Platform.UIString.LocalizedString;
    get category(): Common.SettingRegistration.SettingCategory | null;
    get order(): number | null;
    get tags(): string;
    get options(): SimpleSettingOption[];
    get reloadRequired(): boolean;
    get learnMore(): Common.SettingRegistration.LearnMore | null;
}
export declare function maybeResolve(settingDescriptor: Common.Settings.SettingDescriptor<unknown>): SettingUI | null;
export declare function resolve(settingDescriptor: Common.Settings.SettingDescriptor<unknown>): SettingUI;
export declare function resetSettings(): void;
