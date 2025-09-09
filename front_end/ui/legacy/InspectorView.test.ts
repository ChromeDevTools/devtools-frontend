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
  function createVisibleInspector(): LegacyUI.InspectorView.InspectorView {
    const inspectorView = InspectorView.instance({forceNew: true});
    inspectorView.markAsRoot();
    inspectorView.show(document.createElement('div'), null);
    return inspectorView;
  }

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

  describe('toggleDrawerOrientation', () => {
    it('drawer orientation setting default to unset and that translates to horizontal', () => {
      const inspectorView = createVisibleInspector();
      assert.isFalse(inspectorView.isDrawerOrientationVertical(), 'drawer did not start horizontal');
      const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
      assert.strictEqual(setting.get(), DrawerOrientation.UNSET, 'drawer orientation setting did not start unset');
    });

    it('drawer orientation and setting updates after each toggle', () => {
      const inspectorView = createVisibleInspector();
      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      assert.isTrue(inspectorView.drawerVisible());

      const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
      assert.strictEqual(setting.get(), DrawerOrientation.UNSET);

      inspectorView.toggleDrawerOrientation();
      assert.strictEqual(setting.get(), DrawerOrientation.VERTICAL, 'did not correctly toggle unset to vertical');
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.toggleDrawerOrientation();
      assert.strictEqual(
          setting.get(), DrawerOrientation.HORIZONTAL, 'did not correctly toggle vertical to horizontal');
      assert.isFalse(inspectorView.isDrawerOrientationVertical());

      inspectorView.toggleDrawerOrientation();
      assert.strictEqual(setting.get(), DrawerOrientation.VERTICAL, 'did not correctly toggle horizontal to vertical');
      assert.isTrue(inspectorView.isDrawerOrientationVertical());
    });

    for (const settingValue of [DrawerOrientation.UNSET, DrawerOrientation.VERTICAL, DrawerOrientation.HORIZONTAL]) {
      it(`drawer orientation stays ${settingValue} when toggled while drawer is hidden`, () => {
        const setting = Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, settingValue);
        const inspectorView = createVisibleInspector();
        assert.isFalse(inspectorView.drawerVisible());
        assert.strictEqual(setting.get(), settingValue);
        const drawerOrientation = inspectorView.isDrawerOrientationVertical();

        inspectorView.toggleDrawerOrientation();
        assert.strictEqual(setting.get(), settingValue, 'setting value should not change');
        assert.strictEqual(
            inspectorView.isDrawerOrientationVertical(), drawerOrientation, 'drawer orientation should not change');

        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
        assert.strictEqual(setting.get(), settingValue, 'setting value should not change when forced horizontal');
        assert.strictEqual(
            inspectorView.isDrawerOrientationVertical(), drawerOrientation,
            'drawer orientation should not change when forced horizontal');

        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.VERTICAL});
        assert.strictEqual(setting.get(), settingValue, 'setting value should not change when forced vertical');
        assert.strictEqual(
            inspectorView.isDrawerOrientationVertical(), drawerOrientation,
            'drawer orientation should not change when forced vertical');
      });
    }

    for (const settingValue of [DrawerOrientation.VERTICAL, DrawerOrientation.HORIZONTAL]) {
      it(`drawer starts ${settingValue} if setting is ${settingValue}`, () => {
        Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, settingValue);
        const inspectorView = createVisibleInspector();
        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), settingValue === DrawerOrientation.VERTICAL);
      });
    }

    for (const {force, isVertical} of
             [{force: DrawerOrientation.HORIZONTAL, isVertical: false},
              {force: DrawerOrientation.VERTICAL, isVertical: true},
    ]) {
      it(`toggleDrawerOrientation can force ${force} orientation`, () => {
        const inspectorView = createVisibleInspector();
        inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
        const orientationSetting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
        assert.isFalse(inspectorView.isDrawerOrientationVertical());
        assert.strictEqual(orientationSetting.get(), DrawerOrientation.UNSET);

        // from unset
        inspectorView.toggleDrawerOrientation({force});

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
        assert.strictEqual(orientationSetting.get(), force);

        // from same orientation
        inspectorView.toggleDrawerOrientation({force});

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
        assert.strictEqual(orientationSetting.get(), force);

        // from the other orientation
        inspectorView.toggleDrawerOrientation();
        inspectorView.toggleDrawerOrientation({force});

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
        assert.strictEqual(orientationSetting.get(), force);
      });
    }
  });

  describe('isUserExplicitlyUpdatedDrawerOrientation', () => {
    it('isUserExplicitlyUpdatedDrawerOrientation returns false by default', () => {
      const inspectorView = createVisibleInspector();

      assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
    });

    it('isUserExplicitlyUpdatedDrawerOrientation returns true when orientation is toggled', () => {
      const inspectorView = createVisibleInspector();

      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      inspectorView.toggleDrawerOrientation();

      assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
    });
  });
});
