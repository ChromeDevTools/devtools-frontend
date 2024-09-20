// Copyright (c) 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../testing/EnvironmentHelpers.js';
import * as QuickOpen from '../../ui/legacy/components/quick_open/quick_open.js';
import * as i18n from '../i18n/i18n.js';
import type * as Root from '../root/root.js';

import * as Common from './common.js';

const settingName = 'mock-setting';
const settingTitle = 'Mock setting';
const enableTitle = 'Enable mock setting';
const disableTitle = 'Disable mock setting';

describe('SettingRegistration', () => {
  // const enum `SettingCategory` not available in top level scope, thats why
  // its initialized here.
  const settingCategory = Common.Settings.SettingCategory.CONSOLE;

  before(async () => {
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
    await initializeGlobalVars({reset: false});
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  it('retrieves a registered setting', () => {
    try {
      const preRegisteredSetting =
          Common.Settings.Settings.instance().moduleSetting(settingName) as Common.Settings.Setting<boolean>;
      assert.strictEqual(preRegisteredSetting.title(), settingTitle, 'Setting title is not returned correctly');
      assert.strictEqual(
          preRegisteredSetting.category(), settingCategory, 'Setting category is not returned correctly');
      assert.isNotTrue(preRegisteredSetting.get(), 'Setting value is not returned correctly');
    } catch (error) {
      assert.fail('Failed to find setting registration');
    }
  });

  it('adds commands for changing a setting\'s value', () => {
    const allCommands = QuickOpen.CommandMenu.CommandMenu.instance({forceNew: true}).commands();
    const disableSettingCommands = allCommands.filter(
        command => command.title === disableTitle &&
            command.category === Common.Settings.getLocalizedSettingsCategory(settingCategory));
    const enableSettingCommands = allCommands.filter(
        command => command.title === enableTitle &&
            command.category === Common.Settings.getLocalizedSettingsCategory(settingCategory));
    assert.strictEqual(
        disableSettingCommands.length, 1, 'Commands for changing a setting\'s value were not added correctly');
    assert.strictEqual(
        enableSettingCommands.length, 1, 'Commands for changing a setting\'s value were not added correctly');
  });

  it('triggers a setting\'s change listener when a setting is set', () => {
    const preRegisteredSetting = Common.Settings.Settings.instance().moduleSetting(settingName);
    let settingChanged = false;
    preRegisteredSetting.addChangeListener(() => {
      settingChanged = true;
    });
    preRegisteredSetting.set(true);
    assert.isTrue(settingChanged, 'Setting\'s change listener was not triggered after the setting was set');
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
      config: {
        devToolsConsoleInsights: {
          modelId: 'mockModel',
          temperature: -1,
          enabled: true,
        },
      } as Root.Runtime.HostConfig,
    });
    const setting = Common.Settings.Settings.instance().moduleSetting(configSettingName);
    assert.isNotNull(setting);
    assert.isFalse(setting.get());
  });
});
