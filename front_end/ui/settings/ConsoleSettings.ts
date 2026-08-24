// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const networkMessagesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'network-messages',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
