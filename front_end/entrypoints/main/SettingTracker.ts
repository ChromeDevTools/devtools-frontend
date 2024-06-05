// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

const consoleInsightsToggledSettingName = 'console-insights-toggled';
// Keep setting names in sync with front_end/panels/explain/*.
const consoleInsightsEnabledSettingName = 'console-insights-enabled';

export class SettingTracker {
  constructor() {
    this.#syncConsoleInsightSettingsWithQueryParams();
    this.#trackConsoleInsightSettingChange();
  }

  #onConsoleInsightSettingChange(): void {
    // If setting was turned on, reset the consent.
    if (this.#getModuleSetting(consoleInsightsEnabledSettingName)?.get()) {
      Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).set(false);
    }
    // If console-insights-enabled was edited by the user, it becomes "sticky",
    // which means Finch won't change the setting state.
    Common.Settings.Settings.instance().createLocalSetting(consoleInsightsToggledSettingName, false).set(true);
  }

  #trackConsoleInsightSettingChange(): void {
    this.#getModuleSetting(consoleInsightsEnabledSettingName)
        ?.addChangeListener(this.#onConsoleInsightSettingChange, this);
  }

  dispose(): void {
    this.#getModuleSetting(consoleInsightsEnabledSettingName)
        ?.removeChangeListener(this.#onConsoleInsightSettingChange, this);
  }

  #getModuleSetting(name: string): Common.Settings.Setting<unknown>|undefined {
    try {
      return Common.Settings.moduleSetting(name);
    } catch {
      return;
    }
  }

  #syncConsoleInsightSettingsWithQueryParams(): void {
    const toggledSetting =
        Common.Settings.Settings.instance().createLocalSetting(consoleInsightsToggledSettingName, false);
    const enabledSetting = this.#getModuleSetting(consoleInsightsEnabledSettingName);
    if (!toggledSetting.get()) {
      // If the setting was not toggled, update according to host config.
      const config = Common.Settings.Settings.instance().getHostConfig();
      enabledSetting?.set(config?.devToolsConsoleInsights.optIn !== true);
    }
  }
}
