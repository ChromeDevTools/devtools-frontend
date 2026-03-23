// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from './common.js';

const InMemoryStorage = Common.Settings.InMemoryStorage;

describe('VersionController', () => {
  let settings: Common.Settings.Settings;
  let syncedStorage: Common.Settings.SettingsStorage;
  let globalStorage: Common.Settings.SettingsStorage;
  let localStorage: Common.Settings.SettingsStorage;

  beforeEach(() => {
    const mockStore = new InMemoryStorage();
    syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    localStorage = new Common.Settings.SettingsStorage({}, mockStore);
    settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      runSettingsMigration: false,
    });
  });

  describe('updateVersion', () => {
    it('initializes version settings with the current version if the setting doesn\'t exist yet', () => {
      assert.isFalse(globalStorage.has(Common.VersionController.VersionController.GLOBAL_VERSION_SETTING_NAME));
      assert.isFalse(syncedStorage.has(Common.VersionController.VersionController.SYNCED_VERSION_SETTING_NAME));
      assert.isFalse(localStorage.has(Common.VersionController.VersionController.LOCAL_VERSION_SETTING_NAME));

      new Common.VersionController.VersionController(settings).updateVersion();

      const currentVersion = Common.VersionController.VersionController.CURRENT_VERSION.toString();
      assert.strictEqual(
          globalStorage.get(Common.VersionController.VersionController.GLOBAL_VERSION_SETTING_NAME), currentVersion);
      assert.strictEqual(
          syncedStorage.get(Common.VersionController.VersionController.SYNCED_VERSION_SETTING_NAME), currentVersion);
      assert.strictEqual(
          localStorage.get(Common.VersionController.VersionController.LOCAL_VERSION_SETTING_NAME), currentVersion);
    });

    function spyAllUpdateMethods(versionController: Common.VersionController.VersionController) {
      const spies: Array<sinon.SinonSpy<unknown[], unknown>> = [];
      for (let i = 0; i < Common.VersionController.VersionController.CURRENT_VERSION; ++i) {
        spies.push(sinon.spy(
            versionController, `updateVersionFrom${i}To${i + 1}` as keyof Common.VersionController.VersionController));
      }
      return spies;
    }

    it('does not run any update* methods if no version setting exist yet', () => {
      const versionController = new Common.VersionController.VersionController(settings);
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      for (const spy of spies) {
        sinon.assert.notCalled(spy);
      }
    });

    it('does not run any update* methods if all version settings are already current', () => {
      const currentVersion = Common.VersionController.VersionController.CURRENT_VERSION.toString();
      globalStorage.set(Common.VersionController.VersionController.GLOBAL_VERSION_SETTING_NAME, currentVersion);
      syncedStorage.set(Common.VersionController.VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      localStorage.set(Common.VersionController.VersionController.LOCAL_VERSION_SETTING_NAME, currentVersion);
      const versionController = new Common.VersionController.VersionController(settings);
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      for (const spy of spies) {
        sinon.assert.notCalled(spy);
      }
    });

    it('runs correct update* methods if the local bucket lags behind', () => {
      const currentVersion = Common.VersionController.VersionController.CURRENT_VERSION.toString();
      const localVersion = (Common.VersionController.VersionController.CURRENT_VERSION - 3).toString();
      globalStorage.set(Common.VersionController.VersionController.GLOBAL_VERSION_SETTING_NAME, currentVersion);
      syncedStorage.set(Common.VersionController.VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      localStorage.set(Common.VersionController.VersionController.LOCAL_VERSION_SETTING_NAME, localVersion);
      const versionController = new Common.VersionController.VersionController(settings);
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      const expectedUncalledSpies = spies.slice(0, -3);
      for (const spy of expectedUncalledSpies) {
        sinon.assert.notCalled(spy);
      }

      const expectedCalledSpies = spies.slice(-3);
      for (const spy of expectedCalledSpies) {
        sinon.assert.called(spy);
      }
    });

    it('runs correct update* methods if the synced bucket runs ahead', () => {
      const currentVersion = Common.VersionController.VersionController.CURRENT_VERSION.toString();
      const oldVersion = (Common.VersionController.VersionController.CURRENT_VERSION - 1).toString();
      globalStorage.set(Common.VersionController.VersionController.GLOBAL_VERSION_SETTING_NAME, oldVersion);
      syncedStorage.set(Common.VersionController.VersionController.SYNCED_VERSION_SETTING_NAME, currentVersion);
      localStorage.set(Common.VersionController.VersionController.LOCAL_VERSION_SETTING_NAME, oldVersion);
      const versionController = new Common.VersionController.VersionController(settings);
      const spies = spyAllUpdateMethods(versionController);

      versionController.updateVersion();

      const expectedUncalledSpies = spies.slice(0, -1);
      for (const spy of expectedUncalledSpies) {
        sinon.assert.notCalled(spy);
      }

      const expectedCalledSpies = spies.slice(-1);
      for (const spy of expectedCalledSpies) {
        sinon.assert.called(spy);
      }
    });
  });

  describe('updateVersionFrom31To32', () => {
    it('correctly adds resourceTypeName to breakpoints', () => {
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
      const showThirdPartyIssuesSetting = settings.createLocalSetting('showThirdPartyIssues', false);
      versionController.updateVersionFrom35To36();
      assert.isTrue(showThirdPartyIssuesSetting.get());
    });
  });

  describe('updateVersionFrom36To37', () => {
    it('updates all keys to kebab case', () => {
      const versionController = new Common.VersionController.VersionController(settings);
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
      const versionController = new Common.VersionController.VersionController(settings);
      settings.globalStorage.set('setting', '123');
      settings.localStorage.set('another-setting', '456');

      versionController.updateVersionFrom36To37();

      assert.deepEqual(settings.globalStorage.keys(), ['setting']);
      assert.strictEqual(settings.globalStorage.get('setting'), '123');
      assert.strictEqual(settings.localStorage.get('another-setting'), '456');
    });

    it('update data grid column weights value', () => {
      const versionController = new Common.VersionController.VersionController(settings);
      settings.globalStorage.set('dataGrid-foo-columnWeights', JSON.stringify({
        columnOne: 1,
        columnTwo: 2,
      }));

      versionController.updateVersionFrom36To37();

      const setting = settings.createSetting('data-grid-foo-column-weights', {});

      assert.deepEqual(setting.get(), {'column-one': 1, 'column-two': 2});
    });

    it('update view manager settings values', () => {
      const versionController = new Common.VersionController.VersionController(settings);
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
    const mockStore = new InMemoryStorage();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

    Common.Settings.registerSettingExtension({
      settingName: 'console-insights-enabled',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: true,
    });

    settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      runSettingsMigration: false,
    });
  });

  afterEach(() => {
    Common.Settings.resetSettings();  // Clear SettingsRegistrations.
  });

  it('disables console insights setting if onboarding not done', () => {
    const versionController = new Common.VersionController.VersionController(settings);
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(true);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', false);

    versionController.updateVersionFrom37To38();
    assert.isFalse(consoleInsightsEnabled.get());
    assert.isFalse(onboardingFinished.get());
  });

  it('preserves state if console insights disabled and not onboarded ', () => {
    const versionController = new Common.VersionController.VersionController(settings);
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(false);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', false);

    versionController.updateVersionFrom37To38();
    assert.isFalse(consoleInsightsEnabled.get());
    assert.isFalse(onboardingFinished.get());
  });

  it('preserves state if console insights enabled and onboarded', () => {
    const versionController = new Common.VersionController.VersionController(settings);
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(true);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', true);

    versionController.updateVersionFrom37To38();
    assert.isTrue(consoleInsightsEnabled.get());
    assert.isTrue(onboardingFinished.get());
  });

  it('resets onboarding if console insights setting is disabled', () => {
    const versionController = new Common.VersionController.VersionController(settings);
    const consoleInsightsEnabled: Common.Settings.Setting<boolean> = settings.moduleSetting('console-insights-enabled');
    consoleInsightsEnabled.set(false);
    const onboardingFinished = settings.createLocalSetting('console-insights-onboarding-finished', true);

    versionController.updateVersionFrom37To38();
    assert.isFalse(consoleInsightsEnabled.get());
    assert.isFalse(onboardingFinished.get());
  });
});

describe('updateVersionFrom38To39', () => {
  let settings: Common.Settings.Settings;
  let setting: Common.Settings.Setting<{title: string, i18nTitleKey: string}>;

  beforeEach(() => {
    const mockStore = new InMemoryStorage();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

    settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      runSettingsMigration: false,
    });
    setting = settings.createSetting('preferred-network-condition', {title: 'Offline', i18nTitleKey: 'Offline'});
  });

  afterEach(() => {
    Common.Settings.resetSettings();  // Clear SettingsRegistrations.
  });

  it('renames the preferred-network-condition for "Slow 3G"', async () => {
    setting.set({title: 'Slow 3G', i18nTitleKey: 'Slow 3G'});
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom38To39();
    const newSetting = await setting.forceGet();
    assert.strictEqual(newSetting.title, '3G');
    assert.strictEqual(newSetting.i18nTitleKey, '3G');
  });

  it('renames the preferred-network-condition for "Fast 3G"', async () => {
    setting.set({title: 'Fast 3G', i18nTitleKey: 'Fast 3G'});
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom38To39();
    const newSetting = await setting.forceGet();
    assert.strictEqual(newSetting.title, 'Slow 4G');
    assert.strictEqual(newSetting.i18nTitleKey, 'Slow 4G');
  });

  it('does not rename any other setting', async () => {
    setting.set({title: 'Slow 4G', i18nTitleKey: 'Slow 4G'});
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom38To39();
    const newSetting = await setting.forceGet();
    assert.strictEqual(newSetting.title, 'Slow 4G');
    assert.strictEqual(newSetting.i18nTitleKey, 'Slow 4G');
  });

  it('deletes the setting if it does not parse as valid JSON', async () => {
    setting.set({title: 'Slow 4G', i18nTitleKey: 'Slow 4G'});
    sinon.stub(JSON, 'parse').callsFake(() => {
      throw new Error('Invalid JSON');
    });
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom38To39();
    assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
  });

  describe('updateVersionFrom39To40', () => {
    let settings: Common.Settings.Settings;
    let customNetworkCondSetting: Common.Settings.Setting<Array<{key?: string}>>;
    let preferredNetworkCondSetting: Common.Settings.Setting<{i18nTitleKey: string}>;

    beforeEach(() => {
      const mockStore = new InMemoryStorage();
      const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
      const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
      const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

      Common.Settings.registerSettingExtension({
        settingName: 'custom-network-conditions',
        settingType: Common.Settings.SettingType.ARRAY,
        defaultValue: [],
      });

      settings = new Common.Settings.Settings({
        syncedStorage,
        globalStorage,
        localStorage,
        settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
        runSettingsMigration: false,
      });
      customNetworkCondSetting = settings.moduleSetting('custom-network-conditions');
      preferredNetworkCondSetting = settings.createSetting('preferred-network-condition', {i18nTitleKey: 'Offline'});
    });

    afterEach(() => {
      Common.Settings.resetSettings();  // Clear SettingsRegistrations.
    });

    it('updates all settings to have a key', () => {
      // In reality these values are SDK.NetworkManager.Conditions but we
      // cannot refer to SDK here, and for this test we are only testing the
      // addition of the key which does not care about the data in the
      // object.
      customNetworkCondSetting.set([{}, {}]);
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();
      assert.deepEqual(customNetworkCondSetting.get(), [
        {
          key: 'USER_CUSTOM_SETTING_1',
        },
        {
          key: 'USER_CUSTOM_SETTING_2',
        }
      ]);
    });

    it('does not update settings that have a key already', () => {
      customNetworkCondSetting.set([{key: 'KEY'}]);
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();
      assert.deepEqual(customNetworkCondSetting.get(), [
        {
          key: 'KEY',
        },
      ]);
    });

    it('migrates users who have a preferred-network-condition set to "Fast 4G"', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: 'Fast 4G'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      const activeKeySetting = settings.globalStorage.get('active-network-condition-key');
      assert.strictEqual(activeKeySetting, JSON.stringify('SPEED_FAST_4G'));
      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });

    it('migrates users who have a preferred-network-condition set to "Slow 4G"', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: 'Slow 4G'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      const activeKeySetting = settings.globalStorage.get('active-network-condition-key');
      assert.strictEqual(activeKeySetting, JSON.stringify('SPEED_SLOW_4G'));
      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });

    it('migrates users who have a preferred-network-condition set to "3G"', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: '3G'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      const activeKeySetting = settings.globalStorage.get('active-network-condition-key');
      assert.strictEqual(activeKeySetting, JSON.stringify('SPEED_3G'));
      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });

    it('migrates users who have a preferred-network-condition set to "Offline"', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: 'Offline'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      const activeKeySetting = settings.globalStorage.get('active-network-condition-key');
      assert.strictEqual(activeKeySetting, JSON.stringify('OFFLINE'));
      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });

    it('sets the default setting value correctly to No Throttling', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: 'Offline'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      const activeKeySetting = settings.globalStorage.get('active-network-condition-key');
      assert.strictEqual(activeKeySetting, JSON.stringify('OFFLINE'));

      const newSetting = settings.createSetting('active-network-condition-key', 'INVALID');
      assert.strictEqual(newSetting.defaultValue, 'NO_THROTTLING');

      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });

    it('migrates users who have a preferred-network-condition set to "No throttling"', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: 'No throttling'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      const activeKeySetting = settings.globalStorage.get('active-network-condition-key');
      assert.strictEqual(activeKeySetting, JSON.stringify('NO_THROTTLING'));
      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });

    it('ignores any unexpected values and just deletes the old setting', () => {
      preferredNetworkCondSetting.set({i18nTitleKey: 'Not a valid key'});
      const versionController = new Common.VersionController.VersionController(settings);
      versionController.updateVersionFrom39To40();

      // Ensure it does not create the new setting, ensuring that it will be
      // created when the user next navigates to the network / perf panel.
      assert.isFalse(settings.globalStorage.has('active-network-condition-key'));

      // We still get rid of the old value.
      assert.isFalse(settings.globalStorage.has('preferred-network-condition'));
    });
  });
});

describe('updateVersionFrom40To41', () => {
  let settings: Common.Settings.Settings;
  let hideNetworkMessagesSetting: Common.Settings.Setting<boolean>;
  let networkMessagesSetting: Common.Settings.Setting<boolean>;
  let hideChromeFrameSetting: Common.Settings.Setting<boolean>;
  let chromeFrameSetting: Common.Settings.Setting<boolean>;

  beforeEach(() => {
    const mockStore = new InMemoryStorage();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

    settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      runSettingsMigration: false,
    });
    hideNetworkMessagesSetting =
        settings.createSetting('hide-network-messages', false, Common.Settings.SettingStorageType.SYNCED);
    networkMessagesSetting =
        settings.createSetting('network-messages', true, Common.Settings.SettingStorageType.SYNCED);
    hideChromeFrameSetting =
        settings.createSetting('frame-viewer-hide-chrome-window', false, Common.Settings.SettingStorageType.SYNCED);
    chromeFrameSetting =
        settings.createSetting('frame-viewer-chrome-window', true, Common.Settings.SettingStorageType.SYNCED);
  });

  it('migrates network messages setting', () => {
    hideNetworkMessagesSetting.set(true);  // User had "Hide network messages" changed from default value to ON
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom40To41();
    assert.isFalse(networkMessagesSetting.get());  // Should now have "Network messages" OFF
    assert.isFalse(settings.syncedStorage.has('hide-network-messages'));
  });

  it('migrates chrome frame setting', () => {
    hideChromeFrameSetting.set(true);  // User had "Hide chrome frame" changed from default value to ON
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom40To41();
    assert.isFalse(chromeFrameSetting.get());  // Should now have "Chrome frame" OFF
    assert.isFalse(settings.syncedStorage.has('frame-viewer-hide-chrome-window'));
  });

  it('does not overwrite existing new settings', () => {
    hideNetworkMessagesSetting.set(true);
    hideChromeFrameSetting.set(true);

    // User already started using the new setting
    networkMessagesSetting.set(true);
    chromeFrameSetting.set(true);

    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom40To41();

    assert.isTrue(networkMessagesSetting.get());
    assert.isTrue(chromeFrameSetting.get());

    // Should NOT have been flipped to false
    assert.isFalse(settings.syncedStorage.has('hide-network-messages'));
    assert.isFalse(settings.syncedStorage.has('frame-viewer-hide-chrome-window'));
  });
});

describe('updateVersionFrom41To42', () => {
  let settings: Common.Settings.Settings;
  let recordingsSetting: Common.Settings.Setting<Array<{storageName: string, flow: {title: string, steps: unknown[]}}>>;
  beforeEach(() => {
    const mockStore = new InMemoryStorage();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

    settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      runSettingsMigration: false,
    });
    recordingsSetting = settings.createSetting('recorder-recordings-ng', []);
  });

  it('work if setting is empty', () => {
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom41To42();
    assert.deepEqual(recordingsSetting.get(), []);
  });

  it('trims title', () => {
    recordingsSetting.set([
      {storageName: '1', flow: {title: 'a'.repeat(350), steps: []}}
    ]);  // User had "Hide chrome frame" changed from default value to ON
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom41To42();
    const first = recordingsSetting.get()[0];
    assert.isTrue(first.flow.title.length <= 300);
  });

  it('trims steps', async () => {
    recordingsSetting.set([
      {storageName: '1', flow: {title: 'a', steps: Array(5000).fill({})}}
    ]);  // User had "Hide chrome frame" changed from default value to ON
    const versionController = new Common.VersionController.VersionController(settings);
    versionController.updateVersionFrom41To42();
    const first = recordingsSetting.get()[0];
    assert.isTrue(first.flow.steps.length <= 4096);
  });
});

describe('access logging', () => {
  let settings: Common.Settings.Settings;
  let logSettingAccess!: sinon.SinonSpy;

  beforeEach(() => {
    const mockStore = new InMemoryStorage();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);
    logSettingAccess = sinon.spy();
    settings = new Common.Settings.Settings({
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      logSettingAccess,
    });
  });

  it('logs access on the first read', async () => {
    const setting = settings.createSetting('test-setting', false);
    sinon.assert.notCalled(logSettingAccess);

    setting.get();
    assert.isTrue(logSettingAccess.calledOnceWith('test-setting', false));

    setting.get();
    sinon.assert.calledOnce(logSettingAccess);
  });

  it('logs access on the every write', async () => {
    const setting = settings.createSetting('test-setting', false);

    setting.set(true);
    assert.isTrue(logSettingAccess.calledOnceWith('test-setting', true));

    setting.set(false);
    sinon.assert.calledTwice(logSettingAccess);
    assert.deepEqual(logSettingAccess.secondCall.args, ['test-setting', false]);
  });
});
