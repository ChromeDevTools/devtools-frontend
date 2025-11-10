// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {setupSettings} from '../../testing/SettingsHelpers.js';
import * as i18n from '../i18n/i18n.js';

import * as Common from './common.js';

const settingName = 'mock-setting';
const settingTitle = 'Mock setting';
const enableTitle = 'Enable mock setting';
const disableTitle = 'Disable mock setting';

describe('SettingRegistration', () => {
  // const enum `SettingCategory` not available in top level scope, thats why
  // its initialized here.
  const settingCategory = Common.Settings.SettingCategory.CONSOLE;

  beforeEach(() => {
    Common.Settings.registerSettingsForTest(
        [{
          category: settingCategory,
          title: i18n.i18n.lockedLazyString(settingTitle),
          settingType: Common.Settings.SettingType.BOOLEAN,
          settingName,
          defaultValue: false,
          options: [
            {
              value: true,
              title: i18n.i18n.lockedLazyString(enableTitle),
            },
            {
              value: false,
              title: i18n.i18n.lockedLazyString(disableTitle),
            },
          ],
        }],
        true);

    setupSettings(false);
  });

  it('retrieves a registered setting', () => {
    const preRegisteredSetting = Common.Settings.Settings.instance().moduleSetting(settingName);
    assert.strictEqual(preRegisteredSetting.title(), settingTitle, 'Setting title is not returned correctly');
    assert.strictEqual(preRegisteredSetting.category(), settingCategory, 'Setting category is not returned correctly');
    assert.isNotTrue(preRegisteredSetting.get(), 'Setting value is not returned correctly');
  });

  it('throws an error when trying to register a duplicated setting name', () => {
    assert.throws(() => {
      Common.Settings.registerSettingExtension({
        settingName,
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      });
    });
  });

  it('deletes a registered setting using its name', () => {
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
    const configSettingName = 'mock-setting-with-host-config';
    updateHostConfig({
      devToolsConsoleInsights: {
        modelId: 'mockModel',
        temperature: -1,
        enabled: true,
      },
    });
    Common.Settings.registerSettingExtension({
      settingName: configSettingName,
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      condition: config => {
        return config?.devToolsConsoleInsights?.enabled === true;
      },
    });
    assert.throws(() => Common.Settings.Settings.instance().moduleSetting(configSettingName));

    const dummyStorage = new Common.Settings.SettingsStorage({});
    Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
    });
    const setting = Common.Settings.Settings.instance().moduleSetting(configSettingName);
    assert.isNotNull(setting);
    assert.isFalse(setting.get());
  });
});
