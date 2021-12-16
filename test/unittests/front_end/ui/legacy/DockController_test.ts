// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../../front_end/core/common/common.js';
import * as Root from '../../../../../front_end/core/root/root.js';
import type * as Platform from '../../../../../front_end/core/platform/platform.js';
import * as LegacyUI from '../../../../../front_end/ui/legacy/legacy.js';

import {deinitializeGlobalVars, initializeGlobalVars} from '../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

async function registerDockingSettings(currentValue: string) {
  Common.Settings.registerSettingsForTest([{
    category: Common.Settings.SettingCategory.GLOBAL,
    settingName: 'currentDockState',
    settingType: Common.Settings.SettingType.ENUM,
    defaultValue: currentValue,
    options: [
      {
        value: 'right',
        text: () => 'right' as Platform.UIString.LocalizedString,
        title: () => 'Dock to right' as Platform.UIString.LocalizedString,
        raw: false,
      },
      {
        value: 'bottom',
        text: () => 'bottom' as Platform.UIString.LocalizedString,
        title: () => 'Dock to bottom' as Platform.UIString.LocalizedString,
        raw: false,
      },
      {
        value: 'left',
        text: () => 'left' as Platform.UIString.LocalizedString,
        title: () => 'Dock to left' as Platform.UIString.LocalizedString,
        raw: false,
      },
      {
        value: 'undocked',
        text: () => 'undocked' as Platform.UIString.LocalizedString,
        title: () => 'Undock' as Platform.UIString.LocalizedString,
        raw: false,
      },
    ],
  }]);
  Root.Runtime.experiments.clearForTest();
  await initializeGlobalVars({reset: false});
}

describe('DockController', () => {
  after(async () => {
    await deinitializeGlobalVars();
  });
  it('defaults the dockside to undefined when first created', async () => {
    /* Note: this seems like weird behaviour, but updating DockController to
     * explicitly set DockSide by default seems to cause issues in Chrome web
     * tests, so adding this test here to ensure we don't cause any problems.
     */
    await registerDockingSettings('left');
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    assert.strictEqual(dockController.dockSide(), undefined);
  });

  it('falls back to undefined if the setting value is unexpected', async () => {
    await registerDockingSettings('woah-not-a-real-setting-value');
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    assert.strictEqual(dockController.dockSide(), undefined);
  });

  it('sets the dockSide to undocked if the dock cannot be docked', async () => {
    await registerDockingSettings('left');
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: false});
    assert.strictEqual(dockController.dockSide(), LegacyUI.DockController.DockState.UNDOCKED);
  });

  it('can toggle the dock between two settings', async () => {
    await registerDockingSettings('left');
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    dockController.toggleDockSide();
    assert.strictEqual(dockController.dockSide(), LegacyUI.DockController.DockState.BOTTOM);
    dockController.toggleDockSide();
    assert.strictEqual(dockController.dockSide(), LegacyUI.DockController.DockState.LEFT);
    dockController.toggleDockSide();
    assert.strictEqual(dockController.dockSide(), LegacyUI.DockController.DockState.BOTTOM);
  });
});
