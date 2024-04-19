// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Main from './main.js';

describeWithEnvironment('SettingTracker', () => {
  let settingTracker: Main.SettingTracker.SettingTracker|null;

  afterEach(() => {
    settingTracker?.dispose();
  });

  it('resets console-insights-onboarding-finished if console-insights-enabled becomes true', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).set(true);
    // Force instance that will track the settings.
    settingTracker = new Main.SettingTracker.SettingTracker();
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    assert.strictEqual(
        Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).get(),
        false);
  });

  it('sets console-insights-enabled to false if ci_disabledByDefault is true', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    const toggledSetting = Common.Settings.Settings.instance().createLocalSetting('console-insights-toggled', false);
    toggledSetting.set(false);
    Root.Runtime.Runtime.setQueryParamForTesting('ci_disabledByDefault', 'true');
    settingTracker = new Main.SettingTracker.SettingTracker();
    assert.strictEqual(Common.Settings.moduleSetting('console-insights-enabled').get(), false);
    assert.strictEqual(toggledSetting.get(), false);
  });

  it('sets console-insights-enabled to true if ci_disabledByDefault is false', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    const toggledSetting = Common.Settings.Settings.instance().createLocalSetting('console-insights-toggled', false);
    toggledSetting.set(false);
    Root.Runtime.Runtime.setQueryParamForTesting('ci_disabledByDefault', 'false');
    settingTracker = new Main.SettingTracker.SettingTracker();
    assert.strictEqual(Common.Settings.moduleSetting('console-insights-enabled').get(), true);
    assert.strictEqual(toggledSetting.get(), false);
  });

  it('does not change console-insights-enabled if console-insights-toggled is true', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.Settings.instance().createLocalSetting('console-insights-toggled', false).set(true);
    Root.Runtime.Runtime.setQueryParamForTesting('ci_disabledByDefault', 'true');
    settingTracker = new Main.SettingTracker.SettingTracker();
    assert.strictEqual(Common.Settings.moduleSetting('console-insights-enabled').get(), true);
  });
});
