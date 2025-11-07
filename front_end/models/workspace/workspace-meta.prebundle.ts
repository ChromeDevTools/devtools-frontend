// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'skip-stack-frames-pattern',
  settingType: Common.Settings.SettingType.REGEX,
  defaultValue: '/node_modules/|^node:',
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'skip-content-scripts',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'automatically-ignore-list-known-third-party-scripts',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'skip-anonymous-scripts',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'enable-ignore-listing',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});
