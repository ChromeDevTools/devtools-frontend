// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import type * as Platform from '../../core/platform/platform.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {MockStore} from '../../testing/MockSettingStorage.js';

import * as LegacyUI from './legacy.js';

const InspectorView = LegacyUI.InspectorView.InspectorView;
const Settings = Common.Settings.Settings;
const DrawerOrientation = LegacyUI.InspectorView.DrawerOrientation;
const DRAWER_ORIENTATION_SETTING_NAME = 'inspector.drawer-orientation';

describeWithEnvironment('InspectorView', () => {
  beforeEach(() => {
    // Register settings required for InspectorView to instantiate
    Common.Settings.registerSettingsForTest([
      {
        category: Common.Settings.SettingCategory.GLOBAL,
        settingName: 'language',
        settingType: Common.Settings.SettingType.ENUM,
        defaultValue: 'en-US',
      },
      {
        category: Common.Settings.SettingCategory.GLOBAL,
        settingName: 'shortcut-panel-switch',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      },
      {
        category: Common.Settings.SettingCategory.GLOBAL,
        settingName: 'currentDockState',
        settingType: Common.Settings.SettingType.ENUM,
        defaultValue: 'undocked',
        options: [
          {
            value: 'right',
            text: (): Platform.UIString.LocalizedString => 'right' as Platform.UIString.LocalizedString,
            title: (): Platform.UIString.LocalizedString => 'Dock to right' as Platform.UIString.LocalizedString,
            raw: false,
          },
          {
            value: 'bottom',
            text: (): Platform.UIString.LocalizedString => 'bottom' as Platform.UIString.LocalizedString,
            title: (): Platform.UIString.LocalizedString => 'Dock to bottom' as Platform.UIString.LocalizedString,
            raw: false,
          },
          {
            value: 'left',
            text: (): Platform.UIString.LocalizedString => 'left' as Platform.UIString.LocalizedString,
            title: (): Platform.UIString.LocalizedString => 'Dock to left' as Platform.UIString.LocalizedString,
            raw: false,
          },
          {
            value: 'undocked',
            text: (): Platform.UIString.LocalizedString => 'undocked' as Platform.UIString.LocalizedString,
            title: (): Platform.UIString.LocalizedString => 'Undock' as Platform.UIString.LocalizedString,
            raw: false,
          },
        ],
      },
    ]);

    // Reset settings for each test
    const mockStore = new MockStore();
    const syncedStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const globalStorage = new Common.Settings.SettingsStorage({}, mockStore);
    const localStorage = new Common.Settings.SettingsStorage({}, mockStore);

    Common.Settings.Settings.instance({forceNew: true, syncedStorage, globalStorage, localStorage});
  });

  it('drawer orientation and setting default to unset', () => {
    const inspectorView = InspectorView.instance({forceNew: true});
    assert.isFalse(inspectorView.isDrawerOrientationVertical());
    const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
    assert.strictEqual(setting.get(), DrawerOrientation.UNSET);
  });

  it('drawer orientation setting updates after each toggle', () => {
    const inspectorView = InspectorView.instance({forceNew: true});
    const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
    assert.strictEqual(setting.get(), DrawerOrientation.UNSET);

    inspectorView.toggleDrawerOrientation();
    assert.strictEqual(setting.get(), DrawerOrientation.VERTICAL);

    inspectorView.toggleDrawerOrientation();
    assert.strictEqual(setting.get(), DrawerOrientation.HORIZONTAL);
  });

  it('drawer starts vertical if setting is vertical', () => {
    Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, DrawerOrientation.VERTICAL);
    const inspectorView = InspectorView.instance({forceNew: true});
    assert.isTrue(inspectorView.isDrawerOrientationVertical());
  });

  it('isUserExplicitlyUpdatedDrawerOrientation returns false by default', () => {
    const inspectorView = InspectorView.instance({forceNew: true});
    assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
  });

  it('isUserExplicitlyUpdatedDrawerOrientation returns true when orientation is toggled', () => {
    const inspectorView = InspectorView.instance({forceNew: true});

    inspectorView.toggleDrawerOrientation();

    assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
  });

  it('toggleDrawerOrientation can force vertical orientation', () => {
    const inspectorView = InspectorView.instance({forceNew: true});
    const orientationSetting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
    const updatedSetting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);

    assert.isFalse(inspectorView.isDrawerOrientationVertical());

    inspectorView.toggleDrawerOrientation({force: 'vertical'});

    assert.isTrue(inspectorView.isDrawerOrientationVertical());
    assert.strictEqual(orientationSetting.get(), DrawerOrientation.VERTICAL);
    assert.strictEqual(updatedSetting.get(), DrawerOrientation.VERTICAL);
  });

  it('toggleDrawerOrientation can force horizontal orientation', () => {
    Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, DrawerOrientation.VERTICAL);
    const inspectorView = InspectorView.instance({forceNew: true});
    const orientationSetting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);

    assert.isTrue(inspectorView.isDrawerOrientationVertical());

    inspectorView.toggleDrawerOrientation({force: 'horizontal'});

    assert.isFalse(inspectorView.isDrawerOrientationVertical());
    assert.strictEqual(orientationSetting.get(), DrawerOrientation.HORIZONTAL);
  });
});
