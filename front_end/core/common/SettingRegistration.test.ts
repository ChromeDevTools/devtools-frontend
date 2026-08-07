// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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

  it('throws an error when trying to register a duplicate order value for the same category', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'mock-setting-1',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      category: Common.Settings.SettingCategory.CONSOLE,
      order: 1,
    });

    assert.throws(() => {
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-2',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        category: Common.Settings.SettingCategory.CONSOLE,
        order: 1,
      });
    }, 'Duplicate order value \'1\' for settings category \'CONSOLE\'');
  });

  it('allows registering settings with the same order value in different categories', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'mock-setting-1',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      category: Common.Settings.SettingCategory.CONSOLE,
      order: 1,
    });

    assert.doesNotThrow(() => {
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-2',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        category: Common.Settings.SettingCategory.ELEMENTS,
        order: 1,
      });
    });
  });

  it('allows registering settings without order or category', () => {
    assert.doesNotThrow(() => {
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-1',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      });
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-2',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        category: Common.Settings.SettingCategory.CONSOLE,
      });
    });
  });

  it('allows registering order 0 and throws on duplicate order 0 in the same category', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'mock-setting-1',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      category: Common.Settings.SettingCategory.DEBUGGER,
      order: 0,
    });

    assert.throws(() => {
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-2',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        category: Common.Settings.SettingCategory.DEBUGGER,
        order: 0,
      });
    }, 'Duplicate order value \'0\' for settings category \'DEBUGGER\'');
  });

  it('allows re-registering an order after removing the setting with maybeRemoveSettingExtension', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'mock-setting-1',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      category: Common.Settings.SettingCategory.CONSOLE,
      order: 1,
    });

    const removalResult = Common.Settings.maybeRemoveSettingExtension('mock-setting-1');
    assert.isTrue(removalResult);

    assert.doesNotThrow(() => {
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-2',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        category: Common.Settings.SettingCategory.CONSOLE,
        order: 1,
      });
    });
  });

  it('allows re-registering an order after resetSettings', () => {
    Common.Settings.registerSettingExtension({
      settingName: 'mock-setting-1',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      category: Common.Settings.SettingCategory.CONSOLE,
      order: 1,
    });

    Common.Settings.resetSettings();

    assert.doesNotThrow(() => {
      Common.Settings.registerSettingExtension({
        settingName: 'mock-setting-2',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        category: Common.Settings.SettingCategory.CONSOLE,
        order: 1,
      });
    });
  });
});
