// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import * as Main from './main.js';

const {assert} = chai;

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
});
