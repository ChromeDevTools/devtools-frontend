// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';

import * as Common from './common.js';

describe('SettingRegistration', () => {
  beforeEach(() => Common.Settings.resetSettings());
  afterEach(() => Common.Settings.resetSettings());

  const settingName = 'mock-setting';  // Moved into a variable to prevent KnownContextValue linter to pick it up.

  it('throws an error when trying to register a duplicated setting name', () => {
    Common.Settings.registerSettingExtension({
      settingName,
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });

    assert.throws(() => {
      Common.Settings.registerSettingExtension({
        settingName,
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      });
    });
  });

  it('deletes a registered setting using its name', () => {
    Common.Settings.registerSettingExtension({
      settingName,
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });

    const removalResult = Common.Settings.maybeRemoveSettingExtension(settingName);

    assert.isTrue(removalResult);
    assert.doesNotThrow(() => {
      Common.Settings.registerSettingExtension({
        settingName,
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      });
    });
  });

  it('can handle settings with condition which depends on host config', () => {
    updateHostConfig({
      devToolsConsoleInsights: {
        modelId: 'mockModel',
        temperature: -1,
        enabled: true,
      },
    });
    const settingRegistrations: Common.SettingRegistration.SettingRegistration[] = [{
      settingName,
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      condition: config => {
        return config?.devToolsConsoleInsights?.enabled === true;
      },
    }];

    const dummyStorage = new Common.Settings.SettingsStorage({});
    const settings = new Common.Settings.Settings({
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
      settingRegistrations,
    });
    const setting = settings.moduleSetting(settingName);
    assert.isNotNull(setting);
    assert.isFalse(setting.get());
  });
});
