// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const showPaintsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'frame-viewer-show-paints',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const showSlowScrollRectsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'frame-viewer-show-slow-scroll-rects',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const chromeWindowSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'frame-viewer-chrome-window',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
