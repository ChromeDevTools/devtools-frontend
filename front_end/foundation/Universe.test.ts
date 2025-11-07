// Copyright 2025 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';

import * as Foundation from './foundation.js';

describe('Universe', () => {
  it('can be instantiated', () => {
    new Foundation.Universe.Universe({
      syncedStorage: new Common.Settings.SettingsStorage({}),
      globalStorage: new Common.Settings.SettingsStorage({}),
      localStorage: new Common.Settings.SettingsStorage({}),
    });
  });
});
