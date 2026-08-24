// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const uiThemeSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'ui-theme',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'systemPreferred',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const chromeThemeColorsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'chrome-theme-colors',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const sidebarPositionSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'sidebar-position',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'auto',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const languageSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'language',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'en-US',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const shortcutPanelSwitchSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'shortcut-panel-switch',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const currentDockStateSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'currentDockState',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'right',
};

export const activeKeybindSetSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'active-keybind-set',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'devToolsDefault',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
