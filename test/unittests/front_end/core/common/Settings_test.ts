// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';

const SettingsStorage = Common.Settings.SettingsStorage;

describe('SettingsStorage class', () => {
  it('is able to set a name', () => {
    const settingsStorage = new SettingsStorage({});
    settingsStorage.set('Test Name', 'Test Value');
    assert.strictEqual(settingsStorage.get('Test Name'), 'Test Value', 'Name was not retrieve correctly');
  });

  it('is able to check if a name that it has exists', () => {
    const settingsStorage = new SettingsStorage({});
    settingsStorage.set('Test Name', 'Test Value');
    assert.isTrue(settingsStorage.has('Test Name'), 'the class should have that name');
  });

  it('is able to check if a name that it does not have exists', () => {
    const settingsStorage = new SettingsStorage({});
    assert.isFalse(settingsStorage.has('Test Name'), 'the class should not have that name');
  });

  it('is able to remove a name', () => {
    const settingsStorage = new SettingsStorage({});
    settingsStorage.set('Test Name', 'Test Value');
    settingsStorage.remove('Test Name');
    assert.isFalse(settingsStorage.has('Test Name'), 'the class should not have that name');
  });

  it('is able to remove all names', () => {
    const settingsStorage = new SettingsStorage({});
    settingsStorage.set('Test Name 1', 'Test Value 1');
    settingsStorage.set('Test Name 2', 'Test Value 2');
    settingsStorage.removeAll();
    assert.isFalse(settingsStorage.has('Test Name 1'), 'the class should not have any names');
    assert.isFalse(settingsStorage.has('Test Name 2'), 'the class should not have any names');
  });
});

describe('Settings instance', () => {
  afterEach(() => {
    Common.Settings.Settings.removeInstance();
    Common.Settings.resetSettings();  // Clear SettingsRegistrations.
  });

  it('can be instantiated in a test', () => {
    const dummyStorage = new SettingsStorage({});

    const settings = Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage: dummyStorage, globalStorage: dummyStorage, localStorage: dummyStorage});

    assert.isOk(settings);
  });

  it('throws when constructed without storage', () => {
    assert.throws(() => Common.Settings.Settings.instance());
    assert.throws(
        () => Common.Settings.Settings.instance(
            {forceNew: true, syncedStorage: null, globalStorage: null, localStorage: null}));
  });

  it('stores synced settings in the correct storage', () => {
    const syncedStorage = new SettingsStorage({});
    const dummyStorage = new SettingsStorage({});
    Common.Settings.registerSettingExtension({
      settingName: 'staticSyncedSetting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: Common.Settings.SettingStorageType.Synced,
    });
    const settings = Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage, globalStorage: dummyStorage, localStorage: dummyStorage});

    const dynamicSetting: Common.Settings.Setting<string> =
        settings.createSetting('dynamicSyncedSetting', 'default val', Common.Settings.SettingStorageType.Synced);
    dynamicSetting.set('foo value');
    const staticSetting: Common.Settings.Setting<boolean> = settings.moduleSetting('staticSyncedSetting');
    staticSetting.set(true);

    assert.isFalse(dummyStorage.has('dynamicSyncedSetting'));
    assert.isFalse(dummyStorage.has('staticSyncedSetting'));
    assert.strictEqual(syncedStorage.get('dynamicSyncedSetting'), '"foo value"');
    assert.strictEqual(syncedStorage.get('staticSyncedSetting'), 'true');
  });
});
