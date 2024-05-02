// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export class SettingTracker {
  constructor() {
    this.#trackConsoleInsightSettingChange();
  }

  #trackConsoleInsightSettingChange(): void {
    // Keep setting names in sync with front_end/panels/explain/*.
    let setting: Common.Settings.Setting<unknown>;
    try {
      setting = Common.Settings.moduleSetting('console-insights-enabled');
    } catch {
      return;
    }
    setting.addChangeListener(() => {
      // If setting was turned on, reset the consent.
      if (setting.get()) {
        Common.Settings.Settings.instance()
            .createLocalSetting('console-insights-onboarding-finished', false)
            .set(false);
      }
    });
  }
}
