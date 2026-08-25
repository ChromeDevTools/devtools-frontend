import * as Common from '../../core/common/common.js';
export declare const uiThemeSettingDescriptor: Common.Settings.SettingDescriptor<string>;
export declare const chromeThemeColorsSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const sidebarPositionSettingDescriptor: Common.Settings.SettingDescriptor<string>;
export declare const languageSettingDescriptor: Common.Settings.SettingDescriptor<string>;
export declare const shortcutPanelSwitchSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export declare const currentDockStateSettingDescriptor: Common.Settings.SettingDescriptor<string>;
export declare const activeKeybindSetSettingDescriptor: Common.Settings.SettingDescriptor<string>;
export declare const syncPreferencesSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
export interface UserShortcut {
    action: string;
    descriptors: Array<{
        key: number;
        name: string;
    }>;
    type: string;
}
export declare const userShortcutsSettingDescriptor: Common.Settings.SettingDescriptor<UserShortcut[]>;
export declare const searchAsYouTypeSettingDescriptor: Common.Settings.SettingDescriptor<boolean>;
