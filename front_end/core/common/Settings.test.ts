// Copyright 2019 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Root from '../root/root.js';

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
      console: new Common.Console.Console(),
    });

    assert.isOk(settings);
  });

  it('throws when constructed without storage', () => {
    Common.Settings.Settings.removeInstance();  // Some tests don't clean up well.
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    assert.throws(() => Common.Settings.Settings.instance());
    // eslint-disable-next-line @devtools/no-instance-of-migrated-singletons
    assert.throws(() => Common.Settings.Settings.instance({
      forceNew: true,
      syncedStorage: null,
      globalStorage: null,
      localStorage: null,
      settingRegistrations: null,
      console: null,
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
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      console: new Common.Console.Console(),
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
      settingRegistrations: Common.SettingRegistration.getRegisteredSettings(),
      console: new Common.Console.Console(),
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
           console: new Common.Console.Console(),
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
      console: new Common.Console.Console(),
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
      console: new Common.Console.Console(),
    });
    const setting = settings.createSetting('test-setting', 'initial value');
    const changeStub = sinon.stub();
    setting.addChangeListener(changeStub);

    setting.set('new value');

    sinon.assert.calledOnceWithMatch(changeStub, sinon.match((event: Common.EventTarget.EventTargetEvent<string>) => {
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
      console: new Common.Console.Console(),
    });

    const setting = settings.moduleSetting('test-setting');

    assert.isFalse(setting.get());
    assert.strictEqual(setting.category(), Common.Settings.SettingCategory.CONSOLE);
    assert.deepEqual(setting.descriptor(), {
      name: 'test-setting',
      type: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      storageType: undefined,
    });
  });

  describe('resolve', () => {
    let dummyStorage: Common.Settings.SettingsStorage;
    let settings: Common.Settings.Settings;

    beforeEach(() => {
      dummyStorage = new SettingsStorage({});
      settings = new Common.Settings.Settings({
        syncedStorage: dummyStorage,
        globalStorage: dummyStorage,
        localStorage: dummyStorage,
        settingRegistrations: [],
        console: new Common.Console.Console(),
      });
    });

    it('fails TS compilation when passing a ConditionalSettingDescriptor', () => {
      const conditionalDescriptor: Common.Settings.ConditionalSettingDescriptor<boolean, string> = {
        name: 'conditional-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        isAvailable: () => ({status: Common.Settings.SettingAvailability.AVAILABLE}),
      };
      assert.throws(() => {
        // @ts-expect-error: This is the test assertion. Passing ConditionalSettingDescriptor to resolve() should fail compilation.
        settings.resolve(conditionalDescriptor);
      }, 'Use Settings#maybeResolve for conditional descriptors.');
    });

    it('throws when passing a ConditionalSettingDescriptor down-cast to a SettingDescriptor', () => {
      const conditionalDescriptor = {
        name: 'conditional-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        isAvailable: () => ({status: Common.Settings.SettingAvailability.AVAILABLE}),
      };
      assert.throws(() => {
        settings.resolve(conditionalDescriptor as unknown as Common.Settings.SettingDescriptor<boolean>);
      }, 'Use Settings#maybeResolve for conditional descriptors.');
    });

    it('returns the same setting instance when resolving the same descriptor twice', () => {
      const descriptor: Common.Settings.SettingDescriptor<boolean> = {
        name: 'test-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      };
      const setting1 = settings.resolve(descriptor);
      const setting2 = settings.resolve(descriptor);
      assert.strictEqual(setting1, setting2);
    });

    it('returns different setting instances when resolving the same descriptor in different Settings instances', () => {
      const descriptor: Common.Settings.SettingDescriptor<boolean> = {
        name: 'test-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      };
      const settings2 = new Common.Settings.Settings({
        syncedStorage: dummyStorage,
        globalStorage: dummyStorage,
        localStorage: dummyStorage,
        settingRegistrations: [],
        console: new Common.Console.Console(),
      });
      const setting1 = settings.resolve(descriptor);
      const setting2 = settings2.resolve(descriptor);
      assert.notStrictEqual(setting1, setting2);
    });

    it('supports defaultValue as a function', () => {
      let passedConfig: Root.Runtime.HostConfig|null = null;
      const defaultValueFunc = (config: Root.Runtime.HostConfig) => {
        passedConfig = config;
        return true;
      };
      const descriptor: Common.Settings.SettingDescriptor<boolean> = {
        name: 'test-setting-func-default',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: defaultValueFunc,
      };
      const setting = settings.resolve(descriptor);
      assert.isTrue(setting.get());
      assert.strictEqual(passedConfig, Root.Runtime.hostConfig);
    });

    it('sets the setting type from the descriptor', () => {
      const descriptor: Common.Settings.SettingDescriptor<boolean> = {
        name: 'test-setting-type-from-descriptor',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: true,
      };
      const setting = settings.resolve(descriptor);
      assert.strictEqual(setting.type(), Common.Settings.SettingType.BOOLEAN);
    });

    it('returns the same setting instance when resolving two different descriptors with the same name', () => {
      const descriptor1: Common.Settings.SettingDescriptor<boolean> = {
        name: 'test-setting-shared-name',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      };
      const descriptor2: Common.Settings.SettingDescriptor<boolean> = {
        name: 'test-setting-shared-name',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: true,
      };
      const setting1 = settings.resolve(descriptor1);
      const setting2 = settings.resolve(descriptor2);
      assert.strictEqual(setting1, setting2);
      assert.isFalse(setting2.get());
    });

    it('produces the same setting instance as moduleSetting when resolving a descriptor matching a registration',
       () => {
         const registration: Common.SettingRegistration.SettingRegistration = {
           settingName: 'registered-setting',
           settingType: Common.Settings.SettingType.BOOLEAN,
           defaultValue: false,
         };
         const settingsWithReg = new Common.Settings.Settings({
           syncedStorage: dummyStorage,
           globalStorage: dummyStorage,
           localStorage: dummyStorage,
           settingRegistrations: [registration],
           console: new Common.Console.Console(),
         });
         const descriptor: Common.Settings.SettingDescriptor<boolean> = {
           name: 'registered-setting',
           type: Common.Settings.SettingType.BOOLEAN,
           defaultValue: false,
         };
         const settingFromModule = settingsWithReg.moduleSetting('registered-setting');
         const settingFromResolve = settingsWithReg.resolve(descriptor);
         assert.strictEqual(settingFromModule, settingFromResolve);
       });

    it('fails TS compilation if the setting type is a function', () => {
      const descriptor: Common.Settings.SettingDescriptor<() => void> = {
        name: 'function-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: () => {},
      };
      // @ts-expect-error: This is the test assertion. Setting type cannot be a function.
      settings.resolve(descriptor);
    });
  });

  describe('maybeResolve', () => {
    let dummyStorage: Common.Settings.SettingsStorage;
    let settings: Common.Settings.Settings;

    beforeEach(() => {
      dummyStorage = new SettingsStorage({});
      settings = new Common.Settings.Settings({
        syncedStorage: dummyStorage,
        globalStorage: dummyStorage,
        localStorage: dummyStorage,
        settingRegistrations: [],
        console: new Common.Console.Console(),
      });
    });

    it('returns the setting if it is available', () => {
      const descriptor: Common.Settings.ConditionalSettingDescriptor<boolean, string> = {
        name: 'test-conditional-available',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        isAvailable: () => ({status: Common.Settings.SettingAvailability.AVAILABLE}),
      };
      const result = settings.maybeResolve(descriptor);
      assert.property(result, 'setting');
      assert.propertyVal((result as {setting: Common.Settings.Setting<boolean>}).setting, 'name',
                         'test-conditional-available');
    });

    it('returns unavailable status and reason if it is unavailable', () => {
      const descriptor: Common.Settings.ConditionalSettingDescriptor<boolean, string> = {
        name: 'test-conditional-unavailable',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        isAvailable: () => ({
          status: Common.Settings.SettingAvailability.UNAVAILABLE,
          reason: 'Not supported on this platform',
        }),
      };
      const result = settings.maybeResolve(descriptor);
      assert.notProperty(result, 'setting');
      assert.deepEqual(result, {
        status: Common.Settings.SettingAvailability.UNAVAILABLE,
        reason: 'Not supported on this platform',
      });
    });

    it('returns disabled status and reason if it is disabled', () => {
      const descriptor: Common.Settings.ConditionalSettingDescriptor<boolean, string> = {
        name: 'test-conditional-disabled',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        isAvailable: () => ({
          status: Common.Settings.SettingAvailability.DISABLED,
          reason: 'Requires feature flag X',
        }),
      };
      const result = settings.maybeResolve(descriptor);
      assert.notProperty(result, 'setting');
      assert.deepEqual(result, {
        status: Common.Settings.SettingAvailability.DISABLED,
        reason: 'Requires feature flag X',
      });
    });

    it('fails TS compilation when passing a SettingDescriptor', () => {
      const regularDescriptor: Common.Settings.SettingDescriptor<boolean> = {
        name: 'regular-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      };
      assert.throws(() => {
        // @ts-expect-error: This is the test assertion. Passing SettingDescriptor to maybeResolve() should fail compilation.
        settings.maybeResolve(regularDescriptor);
      });
    });

    it('passes hostConfig to isAvailable function', () => {
      let passedConfig: Root.Runtime.HostConfig|null = null;
      const descriptor: Common.Settings.ConditionalSettingDescriptor<boolean, string> = {
        name: 'test-conditional-config-check',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
        isAvailable: config => {
          passedConfig = config;
          return {status: Common.Settings.SettingAvailability.AVAILABLE};
        },
      };
      settings.maybeResolve(descriptor);
      assert.strictEqual(passedConfig, Root.Runtime.hostConfig);
    });

    it('fails TS compilation if the setting type is a function', () => {
      const descriptor: Common.Settings.ConditionalSettingDescriptor<() => void, string> = {
        name: 'function-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: () => {},
        isAvailable: () => ({status: Common.Settings.SettingAvailability.AVAILABLE}),
      };
      // @ts-expect-error: This is the test assertion. Setting type cannot be a function.
      settings.maybeResolve(descriptor);
    });
  });
});
