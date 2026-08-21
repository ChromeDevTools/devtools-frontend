// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const adBlockingEnabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'network.ad-blocking-enabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};
