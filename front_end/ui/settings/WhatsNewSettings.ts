// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const showReleaseNoteSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'help.show-release-note',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
};
