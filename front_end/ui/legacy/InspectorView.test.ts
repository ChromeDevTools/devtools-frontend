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
const DRAWER_ORIENTATION_SETTING_NAME = 'inspector.use-vertical-drawer-orientation';

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

  it('drawer orientation and setting default to horizontal', () => {
    const inspectorView = InspectorView.instance({forceNew: true});
    assert.isFalse(inspectorView.isDrawerOrientationVertical());
    const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
    assert.isFalse(setting.get());
  });

  it('drawer orientation setting updates after each toggle', () => {
    const inspectorView = InspectorView.instance({forceNew: true});
    const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
    assert.isFalse(setting.get());

    inspectorView.toggleDrawerOrientation();
    assert.isTrue(setting.get());

    inspectorView.toggleDrawerOrientation();
    assert.isFalse(setting.get());
  });

  it('drawer starts vertical if setting is true', () => {
    Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, true);
    const inspectorView = InspectorView.instance({forceNew: true});
    assert.isTrue(inspectorView.isDrawerOrientationVertical());
  });
});
