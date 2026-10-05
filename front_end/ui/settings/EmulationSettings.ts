// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const showMediaQueryInspectorSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-media-query-inspector',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const showRulersSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'emulation.show-rulers',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};
