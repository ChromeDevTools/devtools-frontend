// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const navigatorGroupByFolderSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'navigator-group-by-folder',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
};

export const navigatorGroupByAuthoredSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'navigator-group-by-authored',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};
