import type * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import type { SettingStorageType } from './Settings.js';
export declare function registerSettingExtension(registration: SettingRegistration): void;
export declare function getRegisteredSettings(): SettingRegistration[];
export declare function registerSettingsForTest(settings: SettingRegistration[], forceReset?: boolean): void;
export declare function resetSettings(): void;
export declare function maybeRemoveSettingExtension(settingName: string): boolean;
export declare const enum SettingCategory {
    NONE = "",// `NONE` must be a falsy value. Legacy code uses if-checks for the category.
    ELEMENTS = "ELEMENTS",
    AI = "AI",
    APPEARANCE = "APPEARANCE",
    SOURCES = "SOURCES",
    NETWORK = "NETWORK",
    PERFORMANCE = "PERFORMANCE",
    CONSOLE = "CONSOLE",
    PERSISTENCE = "PERSISTENCE",
    DEBUGGER = "DEBUGGER",
    GLOBAL = "GLOBAL",
    RENDERING = "RENDERING",
    GRID = "GRID",
    MOBILE = "MOBILE",
    EMULATION = "EMULATION",
    MEMORY = "MEMORY",
    EXTENSIONS = "EXTENSIONS",
    ADORNER = "ADORNER",
    ACCOUNT = "ACCOUNT",
    PRIVACY = "PRIVACY"
}
export declare function getLocalizedSettingsCategory(category: SettingCategory): Platform.UIString.LocalizedString;
export declare const enum SettingType {
    ARRAY = "array",
    REGEX = "regex",
    ENUM = "enum",
    BOOLEAN = "boolean"
}
export interface RegExpSettingItem {
    /**
     * A regular expression matched against URLs for ignore listing.
     */
    pattern: string;
    /**
     * If true, ignore this rule.
     */
    disabled?: boolean;
    /**
     * When a rule is disabled due to requesting through a script's context menu
     * that it no longer be ignore listed, this field is set to the URL of that
     * script, so that if the user requests through the same context menu to
     * enable ignore listing, the rule can be reenabled.
     */
    disabledForUrl?: Platform.DevToolsPath.UrlString;
}
export interface SettingRegistration {
    /**
     * The category with which the setting is displayed in the UI.
     */
    category?: SettingCategory;
    /**
     * Used to sort on screen the settings that belong to the same category.
     */
    order?: number;
    /**
     * The title with which the setting is shown on screen.
     */
    title?: () => Platform.UIString.LocalizedString;
    /**
     * The identifier of the setting.
     */
    settingName: string;
    /**
     * Determines how the possible values of the setting are expressed.
     *
     * - If the setting can only be enabled and disabled use BOOLEAN
     * - If the setting has a list of possible values use ENUM
     * - If each setting value is a set of objects use ARRAY
     * - If the setting value is a regular expression use REGEX
     */
    settingType: SettingType;
    /**
     * The value set by default to the setting.
     */
    defaultValue: unknown;
    /**
     * Words used to find a setting in the Command Menu.
     */
    tags?: Array<() => Platform.UIString.LocalizedString>;
    /**
     * The possible values the setting can have, each with a description composed of a title and an optional text.
     */
    options?: SettingExtensionOption[];
    /**
     * Whether DevTools must be reloaded for a change in the setting to take effect.
     */
    reloadRequired?: boolean;
    /**
     * Determines if the setting value is stored in the global, local or session storage.
     */
    storageType?: SettingStorageType;
    /**
     * A condition that, when present in the queryParamsObject of Runtime, constraints the value
     * of the setting to be changed only if the user set it.
     */
    userActionCondition?: string;
    /**
     * The name of the experiment a setting is associated with. Enabling and disabling the declared
     * experiment will enable and disable the setting respectively.
     */
    experiment?: Root.Runtime.ExperimentName;
    /**
     * A condition is a function that will make the setting available if it
     * returns true, and not available, otherwise. Make sure that objects you
     * access from inside the condition function are ready at the time when the
     * setting conditions are checked.
     */
    condition?: Root.Runtime.Condition;
    /**
     * A function that returns true if the setting should be disabled, along with
     * the reason why.
     */
    disabledCondition?: (config?: Root.Runtime.HostConfig) => DisabledConditionResult;
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
    learnMore?: LearnMore;
}
/**
 * Optional information to learn more about the setting.
 *
 * If tooltip is provided creates a (i) icon with rich tooltip with said tooltip
 *
 * If url is provided creates a (?) icon with a link to said url
 *
 * If both tooltip is provided creates a (i) icon with rich tooltip
 * and a link inside the rich tool tip with text `Learn more`
 */
export interface LearnMore {
    tooltip?: () => Platform.UIString.LocalizedString;
    url?: Platform.DevToolsPath.UrlString;
}
interface LocalizedSettingExtensionOption {
    value: boolean | string;
    title: () => Platform.UIString.LocalizedString;
    text?: () => Platform.UIString.LocalizedString;
    raw?: false;
}
interface RawSettingExtensionOption {
    value: boolean | string;
    title: () => Platform.UIString.LocalizedString;
    /**
     * Text used to describe the option. Must be localized if 'raw' is false.
     */
    text?: string;
    raw: true;
}
export type SettingExtensionOption = LocalizedSettingExtensionOption | RawSettingExtensionOption;
export type DisabledConditionResult = {
    disabled: true;
    reasons: Platform.UIString.LocalizedString[];
} | {
    disabled: false;
};
export {};
