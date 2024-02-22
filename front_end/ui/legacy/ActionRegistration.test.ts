// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {describeWithEnvironment} from '../../../test/unittests/front_end/helpers/EnvironmentHelpers.js';
import * as Common from '../../core/common/common.js';

import * as UI from './legacy.js';

const {assert} = chai;

describeWithEnvironment('ActionRegistration', () => {
  it('toggling settings affects registered actions', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'test-setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });

    // Force new instance for the setting extension to apply.
    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });

    UI.ActionRegistration.registerActionExtension({
      actionId: 'test-action',
      category: UI.ActionRegistration.ActionCategory.GLOBAL,
      setting: 'test-setting',
    });

    let list = UI.ActionRegistration.getRegisteredActionExtensions();
    assert.lengthOf(list, 0);

    Common.Settings.moduleSetting('test-setting').set(true);
    list = UI.ActionRegistration.getRegisteredActionExtensions();
    assert.lengthOf(list, 1);

    Common.Settings.moduleSetting('test-setting').set(false);
    list = UI.ActionRegistration.getRegisteredActionExtensions();
    assert.lengthOf(list, 0);
  });
});
