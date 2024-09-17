// Copyright 2019 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

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

    const settings = Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: dummyStorage,
      globalStorage: dummyStorage,
      localStorage: dummyStorage,
    });

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
      settingName: 'static-synced-setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: Common.Settings.SettingStorageType.SYNCED,
    });
    const settings = Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage, globalStorage: dummyStorage, localStorage: dummyStorage});

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

  it('registers settings with the backing store when creating them', () => {
    const registeredSettings = new Set<string>();
    const mockBackingStore: Common.Settings.SettingsBackingStore = {
      ...Common.Settings.NOOP_STORAGE,
      register: (name: string) => registeredSettings.add(name),
    };
    const storage = new SettingsStorage({}, mockBackingStore, '__prefix__.');
    Common.Settings.registerSettingExtension({
      settingName: 'static-global-setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: Common.Settings.SettingStorageType.GLOBAL,
    });

    const settings = Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage: storage, globalStorage: storage, localStorage: storage});
    settings.createSetting('dynamic-local-setting', 42, Common.Settings.SettingStorageType.LOCAL);
    settings.createSetting('dynamic-synced-setting', 'foo', Common.Settings.SettingStorageType.SYNCED);

    assert.isTrue(registeredSettings.has('__prefix__.static-global-setting'));
    assert.isTrue(registeredSettings.has('__prefix__.dynamic-local-setting'));
    assert.isTrue(registeredSettings.has('__prefix__.dynamic-synced-setting'));
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
             settings.createSetting('test', 'default val', Common.Settings.SettingStorageType.GLOBAL);
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

  it('getIfNotDisabled returns the setting\'s value only if the setting is not disabled', async () => {
    const registeredSettings = new Set<string>();
    const mockBackingStore: Common.Settings.SettingsBackingStore = {
      ...Common.Settings.NOOP_STORAGE,
      register: (name: string) => registeredSettings.add(name),
    };
    const storage = new SettingsStorage({}, mockBackingStore, '__prefix__.');
    const settings = Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage: storage, globalStorage: storage, localStorage: storage});
    const testSetting = settings.createSetting('test-setting', 'some value');
    assert.strictEqual(testSetting.getIfNotDisabled(), 'some value');

    testSetting.setDisabled(true);
    assert.isUndefined(testSetting.getIfNotDisabled());

    testSetting.setDisabled(false);
    assert.strictEqual(testSetting.getIfNotDisabled(), 'some value');
  });
});

describe('VersionController', () => {
  let settings: Common.Settings.Settings;
  let syncedStorage: Common.Settings.SettingsStorage;
  let globalStorage: Common.Settings.SettingsStorage;
  let localStorage: Common.Settings.SettingsStorage;

  beforeEach(() => {
    const mockStore = new MockStore();
    syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    localStorage = new Common.Settings.SettingsStorage({}, mockStore);
    settings = Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage,
      globalStorage,
      localStorage,
    });
  });

  afterEach(() => {
    Common.Settings.Settings.removeInstance();
  });

  describe('updateVersion', () => {
    it('initializes version settings with the current version if the setting doesn\'t exist yet', () => {
      assert.isFalse(globalStorage.has(VersionController.GLOBAL_VERSION_SETTING_NAME));
      assert.isFalse(syncedStorage.has(VersionController.SYNCED_VERSION_SETTING_NAME));
      assert.isFalse(localStorage.has(VersionController.LOCAL_VERSION_SETTING_NAME));

      new VersionController().updateVersion();

      const currentVersion = VersionController.CURRENT_VERSION.toString();
      assert.strictEqual(globalStorage.get(VersionController.GLOBAL_VERSION_SETTING_NAME), currentVersion);
      assert.strictEqual(syncedStorage.get(VersionController.SYNCED_VERSION_SETTING_NAME), currentVersion);
      assert.strictEqual(localStorage.get(VersionController.LOCAL_VERSION_SETTING_NAME), currentVersion);
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
      globalStorage.set(VersionController.GLOBAL_VERSION_SETTING_NAME, currentVersion);
      syncedStorage.set(VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      localStorage.set(VersionController.LOCAL_VERSION_SETTING_NAME, currentVersion);
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
      globalStorage.set(VersionController.GLOBAL_VERSION_SETTING_NAME, currentVersion);
      syncedStorage.set(VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      localStorage.set(VersionController.LOCAL_VERSION_SETTING_NAME, localVersion);
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
      globalStorage.set(VersionController.GLOBAL_VERSION_SETTING_NAME, oldVersion);
      syncedStorage.set(VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      localStorage.set(VersionController.LOCAL_VERSION_SETTING_NAME, oldVersion);
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

  describe('updateVersionFrom36To37', () => {
    it('updates all keys to kebab case', () => {
      const versionController = new VersionController();
      settings.globalStorage.set('globalSetting1', '');
      settings.globalStorage.set('globalSetting2', '');
      settings.localStorage.set('localSetting', '');
      settings.syncedStorage.set('syncedSetting', '');

      versionController.updateVersionFrom36To37();

      assert.deepEqual(settings.globalStorage.keys(), ['global-setting-1', 'global-setting-2']);
      assert.deepEqual(settings.localStorage.keys(), ['local-setting']);
      assert.deepEqual(settings.syncedStorage.keys(), ['synced-setting']);
    });

    it('keeps kebab case settings as is', () => {
      const versionController = new VersionController();
      settings.globalStorage.set('setting', '123');
      settings.localStorage.set('another-setting', '456');

      versionController.updateVersionFrom36To37();

      assert.deepEqual(settings.globalStorage.keys(), ['setting']);
      assert.strictEqual(settings.globalStorage.get('setting'), '123');
      assert.strictEqual(settings.localStorage.get('another-setting'), '456');
    });

    it('update data grid column weights value', () => {
      const versionController = new VersionController();
      settings.globalStorage.set('dataGrid-foo-columnWeights', JSON.stringify({
        columnOne: 1,
        columnTwo: 2,
      }));

      versionController.updateVersionFrom36To37();

      const setting = settings.createSetting('data-grid-foo-column-weights', {});

      assert.deepEqual(setting.get(), {'column-one': 1, 'column-two': 2});
    });

    it('update view manager settings values', () => {
      const versionController = new VersionController();
      settings.globalStorage.set('viewsLocationOverride', JSON.stringify({
        somePanel: 'main',
        other_panel: 'drawer',
      }));
      settings.globalStorage.set('closeableTabs', JSON.stringify({
        somePanel: false,
        other_panel: true,
      }));
      settings.globalStorage.set('main-tabOrder', JSON.stringify({
        somePanel: 2,
        other_panel: 1,
      }));
      settings.globalStorage.set('main-selectedTab', JSON.stringify('somePanel'));

      versionController.updateVersionFrom36To37();

      assert.deepEqual(
          settings.createSetting('views-location-override', {}).get(), {'some-panel': 'main', 'other-panel': 'drawer'});
      assert.deepEqual(settings.createSetting('closeable-tabs', {}).get(), {'some-panel': false, 'other-panel': true});
      assert.deepEqual(settings.createSetting('main-tab-order', {}).get(), {'some-panel': 2, 'other-panel': 1});
      assert.deepEqual(settings.createSetting('main-selected-tab', '').get(), 'some-panel');
    });
  });
});

describe('updateVersionFrom37To38', () => {
  let settings: Common.Settings.Settings;

  beforeEach(() => {
    const mockStore = new MockStore();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

    Common.Settings.registerSettingExtension({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: true,
    });

    settings = Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage,
      globalStorage,
      localStorage,
    });
  });

  afterEach(() => {
    Common.Settings.Settings.removeInstance();
    Common.Settings.resetSettings();  // Clear SettingsRegistrations.
  });

  it('disables console insights setting if onboarding not done', () => {
    const versionController = new VersionController();
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(true);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', false);

    versionController.updateVersionFrom37To38();
    assert.isFalse(consoleInsightsEnabled.get());
    assert.isFalse(onboardingFinished.get());
  });

  it('preserves state if console insights disabled and not onboarded ', () => {
    const versionController = new VersionController();
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(false);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', false);

    versionController.updateVersionFrom37To38();
    assert.isFalse(consoleInsightsEnabled.get());
    assert.isFalse(onboardingFinished.get());
  });

  it('preserves state if console insights enabled and onboarded', () => {
    const versionController = new VersionController();
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(true);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', true);

    versionController.updateVersionFrom37To38();
    assert.isTrue(consoleInsightsEnabled.get());
    assert.isTrue(onboardingFinished.get());
  });

  it('resets onboarding if console insights setting is disabled', () => {
    const versionController = new VersionController();
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(false);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', true);

    versionController.updateVersionFrom37To38();
    assert.isFalse(consoleInsightsEnabled.get());
    assert.isFalse(onboardingFinished.get());
  });
});
