// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const catPerfSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'lighthouse.cat-perf',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const catA11ySettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'lighthouse.cat-a11y',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const catBestPracticesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'lighthouse.cat-best-practices',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const catSeoSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'lighthouse.cat-seo',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const catAgenticBrowsingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'lighthouse.cat-agentic-browsing',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const deviceTypeSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'lighthouse.device-type',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'mobile',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const modeSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'lighthouse.mode',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'navigation',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const throttlingSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'lighthouse.throttling',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'simulate',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const clearStorageSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'lighthouse.clear-storage',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
