// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

const {assert} = chai;

import * as Common from '../../../../../front_end/core/common/common.js';

const SettingsStorage = Common.Settings.SettingsStorage;
const VersionController = Common.Settings.VersionController;

class MockStore implements Common.Settings.SettingsBackingStore {
  #store = new Map();
  register() {
  }
  set(key: string, value: string) {
    this.#store.set(key, value);
  }
  get(key: string) {
    return this.#store.get(key);
  }
  remove(key: string) {
    this.#store.delete(key);
  }
  clear() {
    this.#store.clear();
  }
}

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
      const mockStore = new MockStore();
      const settingsStorage = new SettingsStorage({}, mockStore);
      settingsStorage.set('test', 'value');

      mockStore.set('test', 'changed');

      assert.strictEqual(await settingsStorage.forceGet('test'), 'changed');
      assert.strictEqual(await settingsStorage.forceGet('test'), 'changed');
    });
    it('updates the cached value of a SettingsStorage', async () => {
      const mockStore = new MockStore();
      const settingsStorage = new SettingsStorage({}, mockStore);
      settingsStorage.set('test', 'value');
      mockStore.set('test', 'changed');
      assert.strictEqual(settingsStorage.get('test'), 'value');

      await settingsStorage.forceGet('test');

      assert.strictEqual(settingsStorage.get('test'), 'changed');
    });
    it('leaves the cached value alone if the backing store has the same value', async () => {
      const mockStore = new MockStore();
      const settingsStorage = new SettingsStorage({}, mockStore);

      mockStore.set('test', 'value');
      settingsStorage.set('test', 'value');

      assert.strictEqual(mockStore.get('test'), 'value');
      assert.strictEqual(await settingsStorage.forceGet('test'), 'value');
      assert.strictEqual(mockStore.get('test'), 'value');
      assert.strictEqual(await settingsStorage.forceGet('test'), 'value');
    });
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

  it('registers settings with the backing store when creating them', () => {
    const registeredSettings = new Set<string>();
    const mockBackingStore: Common.Settings.SettingsBackingStore = {
      ...Common.Settings.NOOP_STORAGE,
      register: (name: string) => registeredSettings.add(name),
    };
    const storage = new SettingsStorage({}, mockBackingStore, '__prefix__.');
    Common.Settings.registerSettingExtension({
      settingName: 'staticGlobalSetting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: Common.Settings.SettingStorageType.Global,
    });

    const settings = Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage: storage, globalStorage: storage, localStorage: storage});
    settings.createSetting('dynamicLocalSetting', 42, Common.Settings.SettingStorageType.Local);
    settings.createSetting('dynamicSyncedSetting', 'foo', Common.Settings.SettingStorageType.Synced);

    assert.isTrue(registeredSettings.has('__prefix__.staticGlobalSetting'));
    assert.isTrue(registeredSettings.has('__prefix__.dynamicLocalSetting'));
    assert.isTrue(registeredSettings.has('__prefix__.dynamicSyncedSetting'));
  });

  describe('forceGet', () => {
    it('triggers a setting changed event in case the value in the backing store got updated and we update the cached value',
       async () => {
         const mockStore = new MockStore();
         const settingsStorage = new SettingsStorage({}, mockStore);
         mockStore.set('test', '"old"');
         const settings = Common.Settings.Settings.instance({
           forceNew: true,
           syncedStorage: settingsStorage,
           globalStorage: settingsStorage,
           localStorage: settingsStorage,
         });
         const testSetting: Common.Settings.Setting<string> =
             settings.createSetting('test', 'default val', Common.Settings.SettingStorageType.Global);
         const changes: string[] = [];
         testSetting.addChangeListener((event: Common.EventTarget.EventTargetEvent<string>) => {
           changes.push(event.data);
         });
         mockStore.set('test', '"new"');
         assert.strictEqual(await testSetting.forceGet(), 'new');
         assert.deepEqual(changes, ['new']);
         assert.strictEqual(mockStore.get('test'), '"new"');
         assert.strictEqual(await settingsStorage.forceGet('test'), '"new"');
         assert.strictEqual(await testSetting.forceGet(), 'new');
       });
  });
});

describe('VersionController', () => {
  let settings: Common.Settings.Settings;
  let settingsStorage: Common.Settings.SettingsStorage;

  beforeEach(() => {
    const mockStore = new MockStore();
    settingsStorage = new Common.Settings.SettingsStorage({}, mockStore);
    settings = Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: settingsStorage,
      globalStorage: settingsStorage,
      localStorage: settingsStorage,
    });
  });

  afterEach(() => {
    Common.Settings.Settings.removeInstance();
  });

  describe('updateVersion', () => {
    it('initializes version settings with the current version if the setting doesn\'t exist yet', () => {
      assert.isFalse(settingsStorage.has(VersionController.GLOBAL_VERSION_SETTING_NAME));
      assert.isFalse(settingsStorage.has(VersionController.SYNCED_VERSION_SETTING_NAME));
      assert.isFalse(settingsStorage.has(VersionController.LOCAL_VERSION_SETTING_NAME));

      new VersionController().updateVersion();

      const currentVersion = VersionController.CURRENT_VERSION.toString();
      assert.strictEqual(settingsStorage.get(VersionController.GLOBAL_VERSION_SETTING_NAME), currentVersion);
      assert.strictEqual(settingsStorage.get(VersionController.SYNCED_VERSION_SETTING_NAME), currentVersion);
      assert.strictEqual(settingsStorage.get(VersionController.LOCAL_VERSION_SETTING_NAME), currentVersion);
    });

    function spyAllUpdateMethods(versionController: Common.Settings.VersionController) {
      const spies: Array<sinon.SinonSpy<unknown[], unknown>> = [];
      for (let i = 0; i < VersionController.CURRENT_VERSION; ++i) {
        spies.push(
            sinon.spy(versionController, `updateVersionFrom${i}To${i + 1}` as keyof Common.Settings.VersionController));
      }
      assert.lengthOf(spies, VersionController.CURRENT_VERSION);
      return spies;
    }

    it('does not run any update* methods if no version setting exist yet', () => {
      const versionController = new VersionController();
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      for (const spy of spies) {
        assert.isFalse(spy.called);
      }
    });

    it('does not run any update* methods if all version settings are already current', () => {
      const currentVersion = VersionController.CURRENT_VERSION.toString();
      settingsStorage.set(VersionController.GLOBAL_VERSION_SETTING_NAME, currentVersion);
      settingsStorage.set(VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      settingsStorage.set(VersionController.LOCAL_VERSION_SETTING_NAME, currentVersion);
      const versionController = new VersionController();
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      for (const spy of spies) {
        assert.isFalse(spy.called);
      }
    });

    it('runs correct update* methods if the local bucket lags behind', () => {
      const currentVersion = VersionController.CURRENT_VERSION.toString();
      const localVersion = (VersionController.CURRENT_VERSION - 3).toString();
      settingsStorage.set(VersionController.GLOBAL_VERSION_SETTING_NAME, currentVersion);
      settingsStorage.set(VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      settingsStorage.set(VersionController.LOCAL_VERSION_SETTING_NAME, localVersion);
      const versionController = new VersionController();
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      const expectedUncalledSpies = spies.slice(0, -3);
      for (const spy of expectedUncalledSpies) {
        assert.isFalse(spy.called);
      }

      const expectedCalledSpies = spies.slice(-3);
      for (const spy of expectedCalledSpies) {
        assert.isTrue(spy.called);
      }
    });

    it('runs correct update* methods if the synced bucket runs ahead', () => {
      const currentVersion = VersionController.CURRENT_VERSION.toString();
      const oldVersion = (VersionController.CURRENT_VERSION - 1).toString();
      settingsStorage.set(VersionController.GLOBAL_VERSION_SETTING_NAME, oldVersion);
      settingsStorage.set(VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      settingsStorage.set(VersionController.LOCAL_VERSION_SETTING_NAME, oldVersion);
      const versionController = new VersionController();
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      const expectedUncalledSpies = spies.slice(0, -1);
      for (const spy of expectedUncalledSpies) {
        assert.isFalse(spy.called);
      }

      const expectedCalledSpies = spies.slice(-1);
      for (const spy of expectedCalledSpies) {
        assert.isTrue(spy.called);
      }
    });
  });

  describe('updateVersionFrom31To32', () => {
    it('correctly adds resourceTypeName to breakpoints', () => {
      const versionController = new VersionController();
      const breakpointsSetting = settings.createLocalSetting('breakpoints', [
        {url: 'webpack:///src/foo.ts', lineNumber: 4, condition: '', enabled: false},
        {url: 'foo.js', lineNumber: 1, columnNumber: 42, condition: 'false', enabled: true},
      ]);
      versionController.updateVersionFrom31To32();
      const breakpoints = breakpointsSetting.get();
      assert.lengthOf(breakpoints, 2);
      assert.propertyVal(breakpoints[0], 'url', 'webpack:///src/foo.ts');
      assert.propertyVal(breakpoints[0], 'resourceTypeName', 'script');
      assert.propertyVal(breakpoints[0], 'lineNumber', 4);
      assert.notProperty(breakpoints[0], 'columnNumber');
      assert.propertyVal(breakpoints[0], 'condition', '');
      assert.propertyVal(breakpoints[0], 'enabled', false);
      assert.propertyVal(breakpoints[1], 'url', 'foo.js');
      assert.propertyVal(breakpoints[1], 'resourceTypeName', 'script');
      assert.propertyVal(breakpoints[1], 'lineNumber', 1);
      assert.propertyVal(breakpoints[1], 'columnNumber', 42);
      assert.propertyVal(breakpoints[1], 'condition', 'false');
      assert.propertyVal(breakpoints[1], 'enabled', true);
    });
  });

  describe('updateVersionFrom32To33', () => {
    it('correctly discards previously viewed files without url properties', () => {
      const versionController = new VersionController();
      const previouslyViewedFilesSetting = settings.createLocalSetting('previouslyViewedFiles', [
        {url: 'http://localhost:3000', scrollLineNumber: 1},
        {scrollLineNumber: 1},
        {},
        {url: 'webpack:///src/foo.ts'},
      ]);
      versionController.updateVersionFrom32To33();
      const previouslyViewedFiles = previouslyViewedFilesSetting.get();
      assert.lengthOf(previouslyViewedFiles, 2);
      assert.propertyVal(previouslyViewedFiles[0], 'url', 'http://localhost:3000');
      assert.notProperty(previouslyViewedFiles[0], 'selectionRange');
      assert.propertyVal(previouslyViewedFiles[0], 'scrollLineNumber', 1);
      assert.propertyVal(previouslyViewedFiles[1], 'url', 'webpack:///src/foo.ts');
      assert.notProperty(previouslyViewedFiles[1], 'selectionRange');
      assert.notProperty(previouslyViewedFiles[1], 'scrollLineNumber');
    });

    it('correctly adds resourceTypeName to previously viewed files', () => {
      const versionController = new VersionController();
      const previouslyViewedFilesSetting = settings.createLocalSetting('previouslyViewedFiles', [
        {url: 'http://localhost:3000', scrollLineNumber: 1},
        {url: 'webpack:///src/foo.ts'},
      ]);
      versionController.updateVersionFrom32To33();
      const previouslyViewedFiles = previouslyViewedFilesSetting.get();
      assert.lengthOf(previouslyViewedFiles, 2);
      assert.propertyVal(previouslyViewedFiles[0], 'url', 'http://localhost:3000');
      assert.propertyVal(previouslyViewedFiles[0], 'resourceTypeName', 'script');
      assert.notProperty(previouslyViewedFiles[0], 'selectionRange');
      assert.propertyVal(previouslyViewedFiles[0], 'scrollLineNumber', 1);
      assert.propertyVal(previouslyViewedFiles[1], 'url', 'webpack:///src/foo.ts');
      assert.propertyVal(previouslyViewedFiles[1], 'resourceTypeName', 'script');
      assert.notProperty(previouslyViewedFiles[1], 'selectionRange');
      assert.notProperty(previouslyViewedFiles[1], 'scrollLineNumber');
    });
  });

  describe('updateVersionFrom33To34', () => {
    it('correctly adds isLogpoint to breakpoints', () => {
      const versionController = new VersionController();
      const breakpointsSetting = settings.createLocalSetting('breakpoints', [
        {
          url: 'webpack:///src/foo.ts',
          lineNumber: 4,
          resourceTypeName: 'script',
          condition: '/** DEVTOOLS_LOGPOINT */ console.log(foo.property)',
          enabled: true,
        },
        {
          url: 'foo.js',
          lineNumber: 1,
          columnNumber: 42,
          resourceTypeName: 'script',
          condition: 'x === 42',
          enabled: true,
        },
        {url: 'bar.js', lineNumber: 5, columnNumber: 1, resourceTypeName: 'script', condition: '', enabled: true},
      ]);

      versionController.updateVersionFrom33To34();
      const breakpoints = breakpointsSetting.get();

      assert.propertyVal(breakpoints[0], 'isLogpoint', true);
      assert.propertyVal(breakpoints[1], 'isLogpoint', false);
      assert.propertyVal(breakpoints[2], 'isLogpoint', false);
    });
  });

  describe('updateVersionFrom34To35', () => {
    it('removes the logpoint prefix/suffix from logpoints', () => {
      const versionController = new VersionController();
      const breakpointsSetting =
          settings.createLocalSetting('breakpoints', [{
                                        url: 'webpack:///src/foo.ts',
                                        lineNumber: 4,
                                        resourceTypeName: 'script',
                                        condition: '/** DEVTOOLS_LOGPOINT */ console.log(foo.property)',
                                        enabled: true,
                                        isLogpoint: true,
                                      }]);

      versionController.updateVersionFrom34To35();

      const breakpoints = breakpointsSetting.get();
      assert.lengthOf(breakpoints, 1);
      assert.propertyVal(breakpoints[0], 'condition', 'foo.property');
    });

    it('leaves conditional breakpoints alone', () => {
      const versionController = new VersionController();
      const breakpointsSetting = settings.createLocalSetting('breakpoints', [{
                                                               url: 'webpack:///src/foo.ts',
                                                               lineNumber: 4,
                                                               resourceTypeName: 'script',
                                                               condition: 'x === 42',
                                                               enabled: true,
                                                               isLogpoint: false,
                                                             }]);

      versionController.updateVersionFrom34To35();

      const breakpoints = breakpointsSetting.get();
      assert.lengthOf(breakpoints, 1);
      assert.propertyVal(breakpoints[0], 'condition', 'x === 42');
    });
  });

  describe('updateVersionFrom35To36', () => {
    it('update showThirdPartyIssues setting value to true', () => {
      const versionController = new VersionController();
      const showThirdPartyIssuesSetting = settings.createLocalSetting('showThirdPartyIssues', false);
      versionController.updateVersionFrom35To36();
      assert.isTrue(showThirdPartyIssuesSetting.get());
    });
  });
});
