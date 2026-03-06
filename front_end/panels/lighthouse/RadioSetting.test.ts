// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import {assertScreenshot, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';

import type * as LighthouseModule from './lighthouse.js';

describeWithEnvironment('RadioSetting', () => {
  let lighthouse: typeof LighthouseModule;

  beforeEach(async () => {
    lighthouse = await import('./lighthouse.js');
  });

  it('renders correctly', async () => {
    const setting = Common.Settings.Settings.instance().createSetting(
        'test-radio-setting', 'b', Common.Settings.SettingStorageType.LOCAL);
    const options = [
      {value: 'a', label: () => 'Option A' as Common.UIString.LocalizedString},
      {value: 'b', label: () => 'Option B' as Common.UIString.LocalizedString},
      {value: 'c', label: () => 'Option C' as Common.UIString.LocalizedString},
    ];

    const radioSetting = new lighthouse.RadioSetting.RadioSetting(options, setting, 'Test Radio Setting');
    renderElementIntoDOM(radioSetting.element);

    await assertScreenshot('lighthouse/RadioSetting.png');
  });
});
