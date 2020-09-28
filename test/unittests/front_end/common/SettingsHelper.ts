// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../front_end/common/common.js';
import * as Root from '../../../../front_end/root/root.js';

/**
 * This method sets up the local/global settings storage. Settings are not loaded
 * but will have their default values.
 *
 * Call in `before` and `after` hooks of unit tests that utilize settings.
 *
 * IMPORTANT: Clients should also call `resetSettingsStorage` in `after` hooks
 * so settings can't leak between unit tests.
 */
export function resetSettingsStorage(): Common.Settings.Settings {
  Root.Runtime.Runtime.instance({forceNew: true, moduleDescriptors: []});

  return Common.Settings.Settings.instance({
    forceNew: true,
    globalStorage: new Common.Settings.SettingsStorage({}),
    localStorage: new Common.Settings.SettingsStorage({}),
  });
}
