// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const uiThemeSettingDescriptor = {
    name: 'ui-theme',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'systemPreferred',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const chromeThemeColorsSettingDescriptor = {
    name: 'chrome-theme-colors',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const sidebarPositionSettingDescriptor = {
    name: 'sidebar-position',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'auto',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const languageSettingDescriptor = {
    name: 'language',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'en-US',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const shortcutPanelSwitchSettingDescriptor = {
    name: 'shortcut-panel-switch',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const currentDockStateSettingDescriptor = {
    name: 'currentDockState',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'right',
};
export const activeKeybindSetSettingDescriptor = {
    name: 'active-keybind-set',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'devToolsDefault',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
// This name must be kept in sync with DevToolsSettings::kSyncDevToolsPreferencesFrontendName.
export const syncPreferencesSettingDescriptor = {
    name: 'sync-preferences',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
};
export const userShortcutsSettingDescriptor = {
    name: 'user-shortcuts',
    type: "array" /* Common.Settings.SettingType.ARRAY */,
    defaultValue: [],
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const searchAsYouTypeSettingDescriptor = {
    name: 'search-as-you-type',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Local" /* Common.Settings.SettingStorageType.LOCAL */,
};
//# sourceMappingURL=MainSettings.js.map