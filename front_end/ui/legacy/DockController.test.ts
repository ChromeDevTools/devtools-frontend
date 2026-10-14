// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../testing/EnvironmentHelpers.js';

import * as LegacyUI from './legacy.js';

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
  afterEach(async () => {
    await deinitializeGlobalVars();
  });
  it('defaults the dockside to undefined when first created', async () => {
    /* Note: this seems like weird behaviour, but updating DockController to
     * explicitly set DockSide by default seems to cause issues in Chrome web
     * tests, so adding this test here to ensure we don't cause any problems.
     */
    await registerDockingSettings('left');
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    assert.isUndefined(dockController.dockSide());
  });

  it('falls back to undefined if the setting value is unexpected', async () => {
    await registerDockingSettings('woah-not-a-real-setting-value');
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    assert.isUndefined(dockController.dockSide());
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

  describe('AFTER_DOCK_SIDE_CHANGED', () => {
    const {DockState, Events} = LegacyUI.DockController;

    // Holds the callbacks passed to `setIsDocked` until the test lets the embedder respond.
    let pendingSetIsDockedResponses: Array<() => void>;

    function respondToSetIsDocked(): void {
      for (const respond of pendingSetIsDockedResponses.splice(0)) {
        respond();
      }
    }

    async function createDockController(): Promise<{
      dockController: LegacyUI.DockController.DockController,
      afterEvents: LegacyUI.DockController.ChangeEvent[],
    }> {
      await registerDockingSettings('right');
      pendingSetIsDockedResponses = [];
      sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setIsDocked')
          .callsFake((_isDocked, callback) => pendingSetIsDockedResponses.push(callback));
      const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
      dockController.initialize();
      respondToSetIsDocked();

      const afterEvents: LegacyUI.DockController.ChangeEvent[] = [];
      dockController.addEventListener(Events.AFTER_DOCK_SIDE_CHANGED, ({data}) => afterEvents.push(data));
      return {dockController, afterEvents};
    }

    it('is dispatched once the embedder acknowledges each dock side change', async () => {
      const {dockController, afterEvents} = await createDockController();

      dockController.setDockSide(DockState.UNDOCKED);
      assert.isEmpty(afterEvents);
      respondToSetIsDocked();
      dockController.setDockSide(DockState.BOTTOM);
      respondToSetIsDocked();

      assert.deepEqual(afterEvents, [
        {from: DockState.RIGHT, to: DockState.UNDOCKED},
        {from: DockState.UNDOCKED, to: DockState.BOTTOM},
      ]);
    });

    it('is only dispatched for the latest of overlapping dock side changes', async () => {
      const {dockController, afterEvents} = await createDockController();

      // The dock side changes again before the embedder acknowledges the first change, e.g. when the
      // toggle dock side shortcut is pressed twice in quick succession.
      dockController.setDockSide(DockState.UNDOCKED);
      dockController.setDockSide(DockState.BOTTOM);
      assert.lengthOf(pendingSetIsDockedResponses, 2);
      respondToSetIsDocked();

      assert.deepEqual(afterEvents, [{from: DockState.UNDOCKED, to: DockState.BOTTOM}]);
      assert.strictEqual(dockController.dockSide(), DockState.BOTTOM);
    });
  });
});
