// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const showOptionsToGenerateHarWithSensitiveDataSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'network.show-options-to-generate-har-with-sensitive-data',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const colorCodeResourceTypesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'network-color-code-resource-types',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const groupByFrameSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'network.group-by-frame',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
