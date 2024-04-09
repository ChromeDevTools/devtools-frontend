// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Root from '../../core/root/root.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Main from './main.js';

describeWithEnvironment('SettingTracker', () => {
  it('resets console-insights-onboarding-finished if console-insights-enabled becomes true', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).set(true);
    // Force instance that will track the settings.
    new Main.SettingTracker.SettingTracker();
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    assert.strictEqual(
        Common.Settings.Settings.instance().createLocalSetting('console-insights-onboarding-finished', false).get(),
        false);
  });

  it('sets console-insights-enabled to false if ci_disabledByDefault is true', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.Settings.instance().createLocalSetting('console-insights-toggled', false).set(false);
    Root.Runtime.Runtime.setQueryParamForTesting('ci_disabledByDefault', 'true');
    new Main.SettingTracker.SettingTracker();
    assert.strictEqual(Common.Settings.moduleSetting('console-insights-enabled').get(), false);
  });

  it('sets console-insights-enabled to true if ci_disabledByDefault is false', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(false);
    Common.Settings.Settings.instance().createLocalSetting('console-insights-toggled', false).set(false);
    Root.Runtime.Runtime.setQueryParamForTesting('ci_disabledByDefault', 'false');
    new Main.SettingTracker.SettingTracker();
    assert.strictEqual(Common.Settings.moduleSetting('console-insights-enabled').get(), true);
  });

  it('does not change console-insights-enabled if console-insights-toggled is true', async () => {
    Common.Settings.moduleSetting('console-insights-enabled').set(true);
    Common.Settings.Settings.instance().createLocalSetting('console-insights-toggled', false).set(true);
    Root.Runtime.Runtime.setQueryParamForTesting('ci_disabledByDefault', 'true');
    new Main.SettingTracker.SettingTracker();
    assert.strictEqual(Common.Settings.moduleSetting('console-insights-enabled').get(), true);
  });
});
