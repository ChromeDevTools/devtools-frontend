// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const timelineShowAllEventsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-show-all-events',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const timelineDebugModeSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-debug-mode',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const annotationsHiddenSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'annotations-hidden',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const timelineInvalidationTrackingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-invalidation-tracking',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
