// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';

import * as LegacyUI from './legacy.js';

const InspectorView = LegacyUI.InspectorView.InspectorView;
const Settings = Common.Settings.Settings;
const DrawerOrientation = LegacyUI.InspectorView.DrawerOrientation;
const {DockState} = LegacyUI.DockController;
const {DockMode} = LegacyUI.InspectorView;
const DRAWER_ORIENTATION_SETTING_NAME = 'inspector.drawer-orientation-by-dock-mode';

function getDrawerOrientationSettingByDock(dockMode: LegacyUI.InspectorView.DockMode):
    LegacyUI.InspectorView.DrawerOrientation {
  const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
  return (setting.get() as LegacyUI.InspectorView.DrawerOrientationByDockMode)[dockMode];
}

describeWithEnvironment('InspectorView', () => {
  function createInspectorViewWithDockState(dockState: LegacyUI.DockController.DockState): {
    inspectorView: LegacyUI.InspectorView.InspectorView,
    dockController: LegacyUI.DockController.DockController,
  } {
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    dockController.setDockSide(dockState);

    const inspectorView = InspectorView.instance({forceNew: true});
    inspectorView.markAsRoot();
    renderElementIntoDOM(inspectorView);

    return {inspectorView, dockController};
  }

  beforeEach(() => {
    const storage = new Common.Settings.SettingsStorage({}, Common.Settings.NOOP_STORAGE, 'test');
    Common.Settings.Settings.instance(
        {forceNew: true, syncedStorage: storage, globalStorage: storage, localStorage: storage});
    // `setIsDocked` resolves async and leaves elements in the body after the test is finished.
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setIsDocked');
  });

  describe('toggleDrawerOrientation', () => {
    it('drawer orientation and setting updates after each toggle for current dock mode', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

      assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), DrawerOrientation.UNSET);
      inspectorView.toggleDrawerOrientation();

      assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), DrawerOrientation.HORIZONTAL);
      assert.isFalse(inspectorView.isDrawerOrientationVertical());

      inspectorView.toggleDrawerOrientation();
      assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), DrawerOrientation.VERTICAL);
      assert.isTrue(inspectorView.isDrawerOrientationVertical());
    });

    for (const settingValue of [DrawerOrientation.UNSET, DrawerOrientation.VERTICAL, DrawerOrientation.HORIZONTAL]) {
      it(`drawer orientation stays ${settingValue} when toggled while drawer is hidden`, () => {
        const dockSpecificValue = {
          [DockMode.BOTTOM]: settingValue,
          [DockMode.SIDE]: DrawerOrientation.UNSET,
          [DockMode.UNDOCKED]: DrawerOrientation.UNSET,
        };
        const setting = Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, dockSpecificValue);
        const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
        assert.isFalse(inspectorView.drawerVisible());
        assert.deepEqual(setting.get(), dockSpecificValue);
        const drawerOrientation = inspectorView.isDrawerOrientationVertical();

        inspectorView.toggleDrawerOrientation();
        assert.deepEqual(setting.get(), dockSpecificValue, 'setting value should not change');
        assert.strictEqual(
            inspectorView.isDrawerOrientationVertical(), drawerOrientation, 'drawer orientation should not change');

        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
        assert.deepEqual(setting.get(), dockSpecificValue, 'setting value should not change when forced horizontal');
        assert.strictEqual(
            inspectorView.isDrawerOrientationVertical(), drawerOrientation,
            'drawer orientation should not change when forced horizontal');

        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.VERTICAL});
        assert.deepEqual(setting.get(), dockSpecificValue, 'setting value should not change when forced vertical');
        assert.strictEqual(
            inspectorView.isDrawerOrientationVertical(), drawerOrientation,
            'drawer orientation should not change when forced vertical');
      });
    }

    for (const settingValue of [DrawerOrientation.VERTICAL, DrawerOrientation.HORIZONTAL]) {
      it(`drawer starts ${settingValue} if setting is ${settingValue}`, () => {
        const dockSpecificValue = {
          [DockMode.BOTTOM]: settingValue,
          [DockMode.SIDE]: DrawerOrientation.UNSET,
          [DockMode.UNDOCKED]: DrawerOrientation.UNSET,
        };
        Settings.instance().createSetting(DRAWER_ORIENTATION_SETTING_NAME, dockSpecificValue);
        const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), settingValue === DrawerOrientation.VERTICAL);
      });
    }

    for (const {force, isVertical} of
             [{force: DrawerOrientation.HORIZONTAL, isVertical: false},
              {force: DrawerOrientation.VERTICAL, isVertical: true},
    ]) {
      it(`toggleDrawerOrientation can force ${force} orientation`, () => {
        const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
        inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
        assert.isTrue(inspectorView.isDrawerOrientationVertical());
        assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), DrawerOrientation.UNSET);

        // from unset
        inspectorView.toggleDrawerOrientation({force});

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
        assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), force);

        // from same orientation
        inspectorView.toggleDrawerOrientation({force});

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
        assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), force);

        // from the other orientation
        inspectorView.toggleDrawerOrientation();
        inspectorView.toggleDrawerOrientation({force});

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
        assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), force);
      });
    }
  });

  describe('isUserExplicitlyUpdatedDrawerOrientation', () => {
    it('isUserExplicitlyUpdatedDrawerOrientation returns false by default', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);

      assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
    });

    it('isUserExplicitlyUpdatedDrawerOrientation returns true when orientation is toggled', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);

      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      inspectorView.toggleDrawerOrientation();

      assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
    });

    it('returns true only for current dock mode', async () => {
      const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
      const onDockSideChangeHandledForTestStub =
          sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest');
      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

      // Set bottom preference
      inspectorView.toggleDrawerOrientation();
      assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

      // Switch to side dock - should be false (no preference set)
      const waitForFirstDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
      dockController.setDockSide(DockState.RIGHT);
      await waitForFirstDockSideChangeHandled;
      assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

      // Set side preference
      inspectorView.toggleDrawerOrientation();
      assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

      // Switch to undocked dock - should be false (no preference set)
      const waitForSecondDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
      dockController.setDockSide(DockState.UNDOCKED);
      await waitForSecondDockSideChangeHandled;
      assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

      // Set undocked preference
      inspectorView.toggleDrawerOrientation();
      assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());
    });
  });

  describe('dock-specific drawer orientation', () => {
    describe('default orientations by dock state', () => {
      it('defaults to horizontal orientation for RIGHT dock position', () => {
        const {inspectorView} = createInspectorViewWithDockState(DockState.RIGHT);
        assert.isFalse(inspectorView.isDrawerOrientationVertical());
      });

      it('defaults to horizontal orientation for LEFT dock position', () => {
        const {inspectorView} = createInspectorViewWithDockState(DockState.LEFT);
        assert.isFalse(inspectorView.isDrawerOrientationVertical());
      });

      it('defaults to horizontal orientation for UNDOCKED dock position', () => {
        const {inspectorView} = createInspectorViewWithDockState(DockState.UNDOCKED);
        assert.isFalse(inspectorView.isDrawerOrientationVertical());
      });

      it('defaults to vertical orientation for BOTTOM dock position', () => {
        const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
        assert.isTrue(inspectorView.isDrawerOrientationVertical());
      });
    });

    describe('automatic dock state change handling', () => {
      it('automatically updates drawer orientation when switching from bottom to side dock', async () => {
        const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
        const waitForDockSideChangeHandled = expectCall(
            sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));
        inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

        assert.isTrue(inspectorView.isDrawerOrientationVertical());
        dockController.setDockSide(DockState.RIGHT);
        await waitForDockSideChangeHandled;

        assert.isFalse(inspectorView.isDrawerOrientationVertical());
      });

      it('automatically updates drawer orientation when switching from side to bottom dock', async () => {
        const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.RIGHT);
        const waitForDockSideChangeHandled = expectCall(
            sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));
        inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

        assert.isFalse(inspectorView.isDrawerOrientationVertical());
        dockController.setDockSide(DockState.BOTTOM);
        await waitForDockSideChangeHandled;

        assert.isTrue(inspectorView.isDrawerOrientationVertical());
      });

      it('respects saved preferences when switching dock positions', async () => {
        const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
        const onDockSideChangeHandledForTestStub =
            sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest');
        const waitForFirstDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

        // Set bottom preference to horizontal
        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
        assert.isFalse(inspectorView.isDrawerOrientationVertical());

        // Switch to side dock and set side preference to vertical
        dockController.setDockSide(DockState.RIGHT);
        await waitForFirstDockSideChangeHandled;
        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.VERTICAL});
        assert.isTrue(inspectorView.isDrawerOrientationVertical());

        // Switch to undocked and set preference to horizontal
        const waitForSecondDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        dockController.setDockSide(DockState.UNDOCKED);
        await waitForSecondDockSideChangeHandled;
        inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
        assert.isFalse(inspectorView.isDrawerOrientationVertical());

        // Switch back to bottom - should use saved bottom preference
        const waitForThirdDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        dockController.setDockSide(DockState.BOTTOM);
        await waitForThirdDockSideChangeHandled;
        assert.isFalse(inspectorView.isDrawerOrientationVertical());

        // Switch back to side - should use saved side preference
        const waitForFourthDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        dockController.setDockSide(DockState.LEFT);
        await waitForFourthDockSideChangeHandled;
        assert.isTrue(inspectorView.isDrawerOrientationVertical());

        // Switch back to undocked - should use saved undocked preference
        const waitForFifthDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        dockController.setDockSide(DockState.UNDOCKED);
        await waitForFifthDockSideChangeHandled;
        assert.isFalse(inspectorView.isDrawerOrientationVertical());
      });

      it('does not change orientation when drawer is closed during dock switch', async () => {
        const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
        const waitForDockSideChangeHandled = expectCall(
            sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));

        // Drawer is closed by default
        assert.isFalse(inspectorView.drawerVisible());
        const initialOrientation = inspectorView.isDrawerOrientationVertical();

        dockController.setDockSide(DockState.RIGHT);
        await waitForDockSideChangeHandled;

        assert.strictEqual(inspectorView.isDrawerOrientationVertical(), initialOrientation);
      });

      it('updates orientation correctly when showing the drawer for the first time after a dock switch', async () => {
        const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
        const waitForDockSideChangeHandled = expectCall(
            sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));

        // Start with drawer closed and docked to the bottom.
        assert.isFalse(inspectorView.drawerVisible());
        assert.isTrue(
            inspectorView.isDrawerOrientationVertical(), 'Drawer should be vertical when docked at the bottom');

        // Switch dock to the right side while the drawer is closed.
        dockController.setDockSide(DockState.RIGHT);
        await waitForDockSideChangeHandled;

        // Show the drawer.
        inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

        // The orientation should now be horizontal, reflecting the new dock position.
        assert.isFalse(
            inspectorView.isDrawerOrientationVertical(), 'Drawer should become horizontal when docked to the right');
      });
    });
  });
});
