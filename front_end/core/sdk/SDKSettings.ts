// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

export const jsSourceMapsEnabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'js-source-maps-enabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const cssSourceMapsEnabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'css-source-maps-enabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
