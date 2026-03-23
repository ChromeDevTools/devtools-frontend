// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const InMemoryStorage = Common.Settings.InMemoryStorage;
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

  describe('forceGet', () => {
    it('returns the value of the backing store, not the cached one', async () => {
      const mockStore = new InMemoryStorage();
      const settingsStorage = new SettingsStorage({}, mockStore);
      settingsStorage.set('test', 'value');

      mockStore.set('test', 'changed');

      assert.strictEqual(await settingsStorage.forceGet('test'), 'changed');
      assert.strictEqual(await settingsStorage.forceGet('test'), 'changed');
    });
    it('updates the cached value of a SettingsStorage', async () => {
      const mockStore = new InMemoryStorage();
      const settingsStorage = new SettingsStorage({}, mockStore);
      settingsStorage.set('test', 'value');
      mockStore.set('test', 'changed');
      assert.strictEqual(settingsStorage.get('test'), 'value');

      await settingsStorage.forceGet('test');

      assert.strictEqual(settingsStorage.get('test'), 'changed');
    });
    it('leaves the cached value alone if the backing store has the same value', async () => {
      const mockStore = new InMemoryStorage();
      const settingsStorage = new SettingsStorage({}, mockStore);

      mockStore.set('test', 'value');
      settingsStorage.set('test', 'value');

      assert.strictEqual(await mockStore.get('test'), 'value');
      assert.strictEqual(await settingsStorage.forceGet('test'), 'value');
      assert.strictEqual(await mockStore.get('test'), 'value');
      assert.strictEqual(await settingsStorage.forceGet('test'), 'value');
    });
  });
});

describe('Settings instance', () => {
  afterEach(() => {
    Common.Settings.resetSettings();  // Clear SettingsRegistrations.
  });

  it('can be instantiated in a test', () => {
    const dummyStorage = new SettingsStorage({});

    const settings = new Common.Settings.Settings({
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
    });

    assert.isOk(settings);
  });

  it('throws when constructed without storage', () => {
    Common.Settings.Settings.removeInstance();  // Some tests don't clean up well.
    assert.throws(() => Common.Settings.Settings.instance());
    assert.throws(() => Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: null,
      globalStorage: null,
      localStorage: null,
      settingRegistrations: null
    }));
  });

  it('stores synced settings in the correct storage', () => {
    const syncedStorage = new SettingsStorage({});
    const dummyStorage = new SettingsStorage({});
    Common.Settings.registerSettingExtension({
      settingName: 'static-synced-setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: Common.Settings.SettingStorageType.SYNCED,
    });
    const settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings()
    });

    const dynamicSetting: Common.Settings.Setting<string> =
        settings.createSetting('dynamic-synced-setting', 'default val', Common.Settings.SettingStorageType.SYNCED);
    dynamicSetting.set('foo value');
    const staticSetting: Common.Settings.Setting<boolean> = settings.moduleSetting('static-synced-setting');
    staticSetting.set(true);

    assert.isFalse(dummyStorage.has('dynamic-synced-setting'));
    assert.isFalse(dummyStorage.has('static-synced-setting'));
    assert.strictEqual(syncedStorage.get('dynamic-synced-setting'), '"foo value"');
    assert.strictEqual(syncedStorage.get('static-synced-setting'), 'true');
  });

  it('registers settings with the backing store when creating them', async () => {
    const inMemoryStorage = new Common.Settings.InMemoryStorage();
    const spy = sinon.spy(inMemoryStorage, 'register');

    const storage = new SettingsStorage({}, inMemoryStorage, '__prefix__.');
    Common.Settings.registerSettingExtension({
      settingName: 'static-global-setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: Common.Settings.SettingStorageType.GLOBAL,
    });
    const settings = new Common.Settings.Settings({
      syncedStorage: storage,
      globalStorage: storage,
      localStorage: storage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings()
    });
    settings.createSetting('dynamic-local-setting', 42, Common.Settings.SettingStorageType.LOCAL);
    settings.createSetting('dynamic-synced-setting', 'foo', Common.Settings.SettingStorageType.SYNCED);

    sinon.assert.calledWith(spy.firstCall, '__prefix__.static-global-setting');
    sinon.assert.calledWith(spy.secondCall, '__prefix__.dynamic-local-setting');
    sinon.assert.calledWith(spy.thirdCall, '__prefix__.dynamic-synced-setting');
  });

  describe('forceGet', () => {
    it('triggers a setting changed event in case the value in the backing store got updated and we update the cached value',
       async () => {
         const mockStore = new InMemoryStorage();
         const settingsStorage = new SettingsStorage({}, mockStore);
         mockStore.set('test', '"old"');
         const settings = new Common.Settings.Settings({
           syncedStorage: settingsStorage,
           globalStorage: settingsStorage,
           localStorage: settingsStorage,
           settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
         });
         const testSetting: Common.Settings.Setting<string> =
             settings.createSetting('test', 'default val', Common.Settings.SettingStorageType.GLOBAL);
         const changes: string[] = [];
         testSetting.addChangeListener((event: Common.EventTarget.EventTargetEvent<string>) => {
           changes.push(event.data);
         });
         mockStore.set('test', '"new"');
         assert.strictEqual(await testSetting.forceGet(), 'new');
         assert.deepEqual(changes, ['new']);
         assert.strictEqual(await mockStore.get('test'), '"new"');
         assert.strictEqual(await settingsStorage.forceGet('test'), '"new"');
         assert.strictEqual(await testSetting.forceGet(), 'new');
       });
  });

  it('getIfNotDisabled returns the setting\'s value only if the setting is not disabled', async () => {
    const storage = new SettingsStorage({}, undefined, '__prefix__.');
    const settings = new Common.Settings.Settings({
      syncedStorage: storage,
      globalStorage: storage,
      localStorage: storage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      runSettingsMigration: false,
    });
    const testSetting = settings.createSetting('test-setting', 'some value');
    assert.strictEqual(testSetting.getIfNotDisabled(), 'some value');

    testSetting.setDisabled(true);
    assert.isUndefined(testSetting.getIfNotDisabled());

    testSetting.setDisabled(false);
    assert.strictEqual(testSetting.getIfNotDisabled(), 'some value');
  });

  it('notifies change listeners when updating a setting', () => {
    const storage = new Common.Settings.SettingsStorage({});
    const settings = new Common.Settings.Settings({
      syncedStorage: storage,
      globalStorage: storage,
      localStorage: storage,
      settingRegistrations: [],
    });
    const setting = settings.createSetting('test-setting', 'initial value');
    const changeStub = sinon.stub();
    setting.addChangeListener(changeStub);

    setting.set('new value');

    sinon.assert.calledOnceWithMatch(changeStub, sinon.match(event => {
      return event.data === 'new value';
    }));
  });

  it('retrieves registered settings', () => {
    const storage = new Common.Settings.SettingsStorage({});
    const settings = new Common.Settings.Settings({
      syncedStorage: storage,
      globalStorage: storage,
      localStorage: storage,
      settingRegistrations: [{
        category: Common.Settings.SettingCategory.CONSOLE,
        settingType: Common.Settings.SettingType.BOOLEAN,
        settingName: 'test-setting',
        defaultValue: false,
      }],
    });

    const setting = settings.moduleSetting('test-setting');

    assert.isFalse(setting.get());
    assert.strictEqual(setting.category(), Common.Settings.SettingCategory.CONSOLE);
  });
});
