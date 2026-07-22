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
     * If a setting is deprecated, define this notice to show an appropriate warning according to the `warning` property.
     * If `disabled` is set, the setting will be disabled in the settings UI. In that case, `experiment` optionally can be
     * set to link to an experiment (by experiment name). The information icon in the settings UI can then be clicked to
     * jump to the experiment. If a setting is not disabled, the experiment entry will be ignored.
     */
    deprecationNotice?: {
        disabled: boolean;
        warning: () => Platform.UIString.LocalizedString;
        experiment?: string;
    };
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
export declare function maybeResolve(settingDescriptor: Common.Settings.SettingDescriptor<unknown>): SettingUIDescriptor | null;
export declare function resolve(settingDescriptor: Common.Settings.SettingDescriptor<unknown>): SettingUIDescriptor;
export declare function resetSettings(): void;
