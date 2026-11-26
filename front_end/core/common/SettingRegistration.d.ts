import type * as Platform from '../platform/platform.js';
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
    ACCOUNT = "ACCOUNT"
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
export {};
