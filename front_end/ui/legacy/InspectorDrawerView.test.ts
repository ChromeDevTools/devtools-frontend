// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {describeWithEnvironment, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

import * as LegacyUI from './legacy.js';

const InspectorView = LegacyUI.InspectorView.InspectorView;
const Settings = Common.Settings.Settings;
const DrawerOrientation = LegacyUI.InspectorView.DrawerOrientation;
const {DockState} = LegacyUI.DockController;
const {DockMode} = LegacyUI.InspectorView;
const DRAWER_MINIMIZED_SETTING_NAME = 'inspector.drawer-minimized';
const DRAWER_ORIENTATION_SETTING_NAME = 'inspector.drawer-orientation-by-dock-mode';

function getDrawerOrientationSettingByDock(dockMode: LegacyUI.InspectorView.DockMode):
    LegacyUI.InspectorView.DrawerOrientation {
  const setting = Settings.instance().settingForTest(DRAWER_ORIENTATION_SETTING_NAME);
  return (setting.get() as LegacyUI.InspectorView.DrawerOrientationByDockMode)[dockMode];
}

describeWithEnvironment('InspectorDrawerView', () => {
  setupSettingsHooks();

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
    // `setIsDocked` resolves async and leaves elements in the body after the test is finished.
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setIsDocked');
  });

  describe('drawer minimize/expand', () => {
    it('setDrawerMinimized(true) minimizes the drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      assert.isFalse(inspectorView.isDrawerMinimized());
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());
    });

    it('setDrawerMinimized(false) expands the drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      inspectorView.setDrawerMinimized(false);
      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('toggleDrawerMinimized toggles between minimized and expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      assert.isFalse(inspectorView.isDrawerMinimized());

      inspectorView.toggleDrawerMinimized();
      assert.isTrue(inspectorView.isDrawerMinimized());

      inspectorView.toggleDrawerMinimized();
      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('toggleDrawerMinimized shows drawer if it is hidden', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      assert.isFalse(inspectorView.drawerVisible());

      inspectorView.toggleDrawerMinimized();
      assert.isTrue(inspectorView.drawerVisible());
      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('minimizeDrawer minimizes the drawer without fully hiding', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.drawerVisible());

      inspectorView.minimizeDrawer();
      assert.isTrue(inspectorView.drawerVisible(), 'drawer should still be visible');
      assert.isTrue(inspectorView.isDrawerMinimized(), 'drawer should be minimized');
    });

    it('minimizeDrawer does not restore focus to avoid main panel content shift', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      const focusRestorer =
          (inspectorView as unknown as {focusRestorer: LegacyUI.Widget.WidgetFocusRestorer | null}).focusRestorer;
      assert.exists(focusRestorer);
      const restoreSpy = sinon.spy(focusRestorer, 'restore');

      inspectorView.minimizeDrawer();

      sinon.assert.notCalled(restoreSpy);
      assert.isTrue(inspectorView.isDrawerMinimized());
    });

    it('closeDrawer fully hides the drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.drawerVisible());

      inspectorView.closeDrawer();
      assert.isFalse(inspectorView.isDrawerMinimized(), 'drawer should not be minimized after hiding');
      const setting = Settings.instance().settingForTest(DRAWER_MINIMIZED_SETTING_NAME);
      assert.isFalse(setting.get(), 'minimized setting should be false after hiding');
    });

    it('closeDrawer uses animated close when drawer is expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      const drawerSplitWidget =
          (inspectorView as unknown as {drawerSplitWidget: LegacyUI.SplitWidget.SplitWidget}).drawerSplitWidget;
      const hideSidebarSpy = sinon.spy(drawerSplitWidget, 'hideSidebar');

      inspectorView.closeDrawer();

      sinon.assert.calledOnceWithExactly(hideSidebarSpy, true);
    });

    it('closeDrawer disables animation when drawer is minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerSplitWidget =
          (inspectorView as unknown as {drawerSplitWidget: LegacyUI.SplitWidget.SplitWidget}).drawerSplitWidget;
      const hideSidebarSpy = sinon.spy(drawerSplitWidget, 'hideSidebar');

      inspectorView.closeDrawer();

      sinon.assert.calledOnceWithExactly(hideSidebarSpy, false);
    });

    it('closeDrawer resets minimized state so drawer opens expanded next time', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());
      inspectorView.closeDrawer();

      const setting = Settings.instance().settingForTest(DRAWER_MINIMIZED_SETTING_NAME);
      assert.isFalse(setting.get());
    });

    it('minimized state persists to setting', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      const setting = Settings.instance().settingForTest(DRAWER_MINIMIZED_SETTING_NAME);
      assert.isFalse(setting.get());

      inspectorView.setDrawerMinimized(true);
      assert.isTrue(setting.get());

      inspectorView.setDrawerMinimized(false);
      assert.isFalse(setting.get());
    });

    it('showDrawer with focus expands a minimized drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('showDrawer without focus keeps drawer minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      inspectorView.showDrawer({focus: false, hasTargetDrawer: true});
      assert.isTrue(inspectorView.isDrawerMinimized());
    });

    it('emits pane visibility events when minimizing and restoring the drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      const paneVisibilityEvents: boolean[] = [];
      drawerTabbedPane.addEventListener(LegacyUI.TabbedPane.Events.PaneVisibilityChanged, event => {
        paneVisibilityEvents.push(event.data.isVisible);
      });

      inspectorView.setDrawerMinimized(true);
      inspectorView.setDrawerMinimized(false);

      assert.deepEqual(paneVisibilityEvents, [false, true]);
    });

    it('emits pane visibility events when hiding and showing the drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      const paneVisibilityEvents: boolean[] = [];
      drawerTabbedPane.addEventListener(LegacyUI.TabbedPane.Events.PaneVisibilityChanged, event => {
        paneVisibilityEvents.push(event.data.isVisible);
      });

      inspectorView.closeDrawer();
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      assert.isAtLeast(paneVisibilityEvents.length, 2);
      assert.isFalse(paneVisibilityEvents[0]);
      assert.isTrue(paneVisibilityEvents[paneVisibilityEvents.length - 1]);
    });

    it('switching to another drawer tab with user gesture expands a minimized drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabSelected, {
        tabId: 'elements',
        prevTabId: 'console-view',
        isUserGesture: true,
      });

      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('clicking the active drawer tab with user gesture expands a minimized drawer', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabInvoked, {
        tabId: 'console-view',
        prevTabId: 'console-view',
        isUserGesture: true,
      });

      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('clicking drawer console tab does not expand when main console tab is active', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const selectedTabIdStub = sinon.stub(inspectorView.tabbedPane, 'selectedTabId').get(() => 'console');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabInvoked, {
        tabId: 'console-view',
        prevTabId: 'elements',
        isUserGesture: true,
      });
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabSelected, {
        tabId: 'console-view',
        prevTabId: 'elements',
        isUserGesture: true,
      });

      assert.isTrue(inspectorView.isDrawerMinimized());
      selectedTabIdStub.restore();
    });

    it('clicking drawer console tab minimizes when main console tab is active and drawer is expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const selectedTabIdStub = sinon.stub(inspectorView.tabbedPane, 'selectedTabId').get(() => 'console');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerMinimized());

      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabInvoked, {
        tabId: 'console-view',
        prevTabId: 'elements',
        isUserGesture: true,
      });
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabSelected, {
        tabId: 'console-view',
        prevTabId: 'elements',
        isUserGesture: true,
      });

      assert.isTrue(inspectorView.isDrawerMinimized());
      selectedTabIdStub.restore();
    });

    it('clicking expand drawer button does not expand when main console tab is active', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const selectedTabIdStub = sinon.stub(inspectorView.tabbedPane, 'selectedTabId').get(() => 'console');
      const drawerTabbedPane =
          (inspectorView as unknown as {drawerTabbedPane: LegacyUI.TabbedPane.TabbedPane}).drawerTabbedPane;
      const drawerSelectedTabIdStub = sinon.stub(drawerTabbedPane, 'selectedTabId').get(() => 'console-view');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const expandButton = drawerElement.shadowRoot!.querySelector('[aria-label="Expand drawer"]') as HTMLElement;
      assert.exists(expandButton);

      expandButton.click();

      assert.isTrue(inspectorView.isDrawerMinimized());
      drawerSelectedTabIdStub.restore();
      selectedTabIdStub.restore();
    });
  });

  describe('drawer orientation', () => {
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

          inspectorView.toggleDrawerOrientation({force});

          assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
          assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), force);

          inspectorView.toggleDrawerOrientation({force});

          assert.strictEqual(inspectorView.isDrawerOrientationVertical(), isVertical);
          assert.strictEqual(getDrawerOrientationSettingByDock(DockMode.BOTTOM), force);

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

        inspectorView.toggleDrawerOrientation();
        assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

        const waitForFirstDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        dockController.setDockSide(DockState.RIGHT);
        await waitForFirstDockSideChangeHandled;
        assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

        inspectorView.toggleDrawerOrientation();
        assert.isTrue(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

        const waitForSecondDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
        dockController.setDockSide(DockState.UNDOCKED);
        await waitForSecondDockSideChangeHandled;
        assert.isFalse(inspectorView.isUserExplicitlyUpdatedDrawerOrientation());

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

        it('keeps the drawer minimized when switching from bottom dock to undocked', async () => {
          const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
          const waitForDockSideChangeHandled = expectCall(
              sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));
          inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
          inspectorView.setDrawerMinimized(true);

          assert.isTrue(inspectorView.isDrawerMinimized());
          assert.isTrue(inspectorView.isDrawerOrientationVertical());

          dockController.setDockSide(DockState.UNDOCKED);
          await waitForDockSideChangeHandled;

          const drawerSplitWidget =
              (inspectorView as unknown as {drawerSplitWidget: LegacyUI.SplitWidget.SplitWidget}).drawerSplitWidget;
          assert.isTrue(inspectorView.isDrawerMinimized());
          assert.isFalse(inspectorView.isDrawerOrientationVertical());
          assert.isFalse(drawerSplitWidget.isResizable());
        });

        it('keeps the drawer minimized when switching from right dock to undocked', async () => {
          const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.RIGHT);
          const waitForDockSideChangeHandled = expectCall(
              sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));
          inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
          inspectorView.setDrawerMinimized(true);

          assert.isTrue(inspectorView.isDrawerMinimized());
          assert.isFalse(inspectorView.isDrawerOrientationVertical());

          dockController.setDockSide(DockState.UNDOCKED);
          await waitForDockSideChangeHandled;

          const drawerSplitWidget =
              (inspectorView as unknown as {drawerSplitWidget: LegacyUI.SplitWidget.SplitWidget}).drawerSplitWidget;
          assert.isTrue(inspectorView.isDrawerMinimized());
          assert.isFalse(inspectorView.isDrawerOrientationVertical());
          assert.isFalse(drawerSplitWidget.isResizable());
        });

        it('keeps the drawer minimized when switching from undocked to right dock after dock completes', () => {
          const setIsDockedStub =
              Host.InspectorFrontendHost.InspectorFrontendHostInstance.setIsDocked as sinon.SinonStub;
          setIsDockedStub.callsFake((_isDocked: boolean, callback: () => void) => callback());

          const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.UNDOCKED);
          inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
          inspectorView.setDrawerMinimized(true);

          assert.isTrue(inspectorView.isDrawerMinimized());
          dockController.setDockSide(DockState.RIGHT);

          const drawerSplitWidget =
              (inspectorView as unknown as {drawerSplitWidget: LegacyUI.SplitWidget.SplitWidget}).drawerSplitWidget;
          assert.isTrue(inspectorView.drawerVisible());
          assert.isTrue(inspectorView.isDrawerMinimized());
          assert.isFalse(drawerSplitWidget.isResizable());
        });

        it('respects saved preferences when switching dock positions', async () => {
          const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
          const onDockSideChangeHandledForTestStub =
              sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest');
          const waitForFirstDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
          inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

          inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
          assert.isFalse(inspectorView.isDrawerOrientationVertical());

          dockController.setDockSide(DockState.RIGHT);
          await waitForFirstDockSideChangeHandled;
          inspectorView.toggleDrawerOrientation({force: DrawerOrientation.VERTICAL});
          assert.isTrue(inspectorView.isDrawerOrientationVertical());

          const waitForSecondDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
          dockController.setDockSide(DockState.UNDOCKED);
          await waitForSecondDockSideChangeHandled;
          inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
          assert.isFalse(inspectorView.isDrawerOrientationVertical());

          const waitForThirdDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
          dockController.setDockSide(DockState.BOTTOM);
          await waitForThirdDockSideChangeHandled;
          assert.isFalse(inspectorView.isDrawerOrientationVertical());

          const waitForFourthDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
          dockController.setDockSide(DockState.LEFT);
          await waitForFourthDockSideChangeHandled;
          assert.isTrue(inspectorView.isDrawerOrientationVertical());

          const waitForFifthDockSideChangeHandled = expectCall(onDockSideChangeHandledForTestStub);
          dockController.setDockSide(DockState.UNDOCKED);
          await waitForFifthDockSideChangeHandled;
          assert.isFalse(inspectorView.isDrawerOrientationVertical());
        });

        it('does not change orientation when drawer is closed during dock switch', async () => {
          const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
          const waitForDockSideChangeHandled = expectCall(
              sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));

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

          assert.isFalse(inspectorView.drawerVisible());
          assert.isTrue(
              inspectorView.isDrawerOrientationVertical(), 'Drawer should be vertical when docked at the bottom');

          dockController.setDockSide(DockState.RIGHT);
          await waitForDockSideChangeHandled;

          inspectorView.showDrawer({focus: true, hasTargetDrawer: false});

          assert.isFalse(
              inspectorView.isDrawerOrientationVertical(), 'Drawer should become horizontal when docked to the right');
        });
      });
    });
  });

  describe('vertical minimized drawer', () => {
    it('adds drawer-minimized-vertical CSS class when vertical and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      assert.isTrue(drawerElement.classList.contains('drawer-minimized-vertical'));
    });

    it('removes drawer-minimized-vertical CSS class when expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      assert.isTrue(drawerElement.classList.contains('drawer-minimized-vertical'));

      inspectorView.setDrawerMinimized(false);
      assert.isFalse(drawerElement.classList.contains('drawer-minimized-vertical'));
    });

    it('does not add drawer-minimized-vertical when horizontal and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.RIGHT);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      assert.isFalse(drawerElement.classList.contains('drawer-minimized-vertical'));
    });

    it('adds collapsed-vertical-drawer CSS classes on sub-elements when vertical and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);

      const shadow = drawerElement.shadowRoot;
      assert.exists(shadow);

      const header = shadow.querySelector('.tabbed-pane-header');
      assert.exists(header);
      assert.isTrue(header.classList.contains('collapsed-vertical-drawer-header'));

      const headerContents = shadow.querySelector('.tabbed-pane-header-contents');
      assert.exists(headerContents);
      assert.isTrue(headerContents.classList.contains('hide-element'));

      const content = shadow.querySelector('.tabbed-pane-content');
      assert.exists(content);
      assert.isTrue(content.classList.contains('hide-element'));
    });

    it('removes collapsed CSS classes when expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      inspectorView.setDrawerMinimized(false);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);

      const shadow = drawerElement.shadowRoot;
      assert.exists(shadow);

      const header = shadow.querySelector('.tabbed-pane-header');
      assert.exists(header);
      assert.isFalse(header.classList.contains('collapsed-vertical-drawer-header'));

      const headerContents = shadow.querySelector('.tabbed-pane-header-contents');
      assert.exists(headerContents);
      assert.isFalse(headerContents.classList.contains('hide-element'));
    });
  });

  describe('minimize/expand button title', () => {
    it('button title is "Expand drawer" when horizontal and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.RIGHT);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const expandButton = drawerElement.shadowRoot!.querySelector('[aria-label="Expand drawer"]');
      assert.exists(expandButton, 'button should have "Expand drawer" title when minimized');
    });

    it('button title is "Minimize drawer" when horizontal and expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.RIGHT);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerOrientationVertical());

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const minimizeButton = drawerElement.shadowRoot!.querySelector('[aria-label="Minimize drawer"]');
      assert.exists(minimizeButton, 'button should have "Minimize drawer" title when expanded');
    });

    it('button title is "Expand drawer" when vertical and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const expandButton = drawerElement.shadowRoot!.querySelector('[aria-label="Expand drawer"]');
      assert.exists(expandButton, 'button should have "Expand drawer" title when minimized');
    });

    it('button title is "Minimize drawer" when vertical and expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const minimizeButton = drawerElement.shadowRoot!.querySelector('[aria-label="Minimize drawer"]');
      assert.exists(minimizeButton, 'button should have "Minimize drawer" title when expanded');
    });

    it('title updates when orientation changes while minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      let expandButton = drawerElement.shadowRoot!.querySelector('[aria-label="Expand drawer"]');
      assert.exists(expandButton, 'button should show "Expand drawer" when minimized in vertical');

      inspectorView.toggleDrawerOrientation({force: LegacyUI.InspectorView.DrawerOrientation.HORIZONTAL});

      expandButton = drawerElement.shadowRoot!.querySelector('[aria-label="Expand drawer"]');
      assert.exists(expandButton, 'button should show "Expand drawer" when minimized in horizontal');
    });
  });

  describe('drawer resizability', () => {
    it('drawer is not resizable when minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);

      const splitWidgetElement = inspectorView.element.querySelector('.split-widget');
      assert.exists(splitWidgetElement);
      const resizerElement =
          splitWidgetElement.shadowRoot!.querySelector('.shadow-split-widget-resizer') as HTMLElement | null;
      assert.exists(resizerElement);
      assert.strictEqual(
          resizerElement.style.getPropertyValue('cursor'), '', 'resizer cursor should be removed when minimized');
    });

    it('drawer becomes resizable when expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);
      inspectorView.setDrawerMinimized(false);

      const splitWidgetElement = inspectorView.element.querySelector('.split-widget');
      assert.exists(splitWidgetElement);
      const resizerElement =
          splitWidgetElement.shadowRoot!.querySelector('.shadow-split-widget-resizer') as HTMLElement | null;
      assert.exists(resizerElement);
      assert.isNotEmpty(resizerElement.style.getPropertyValue('cursor'), 'resizer cursor should be set when expanded');
    });
  });

  describe('toolbar button visibility in vertical minimized mode', () => {
    it('toggle orientation button remains visible when vertical and minimized', () => {
      updateHostConfig({devToolsFlexibleLayout: {verticalDrawerEnabled: true}});
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const orientationButton = drawerElement.shadowRoot!.querySelector('[aria-label="Toggle drawer orientation"]');
      assert.exists(orientationButton, 'toggle orientation button should exist in drawer toolbar');
    });

    it('close drawer button remains visible when vertical and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const closeButton = drawerElement.shadowRoot!.querySelector('[aria-label="Close drawer"]');
      assert.exists(closeButton, 'close drawer button should exist in drawer toolbar');
    });
  });

  describe('drawer minimize/expand with orientation changes', () => {
    it('vertical minimized state clears when switching to horizontal', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);
      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      assert.isTrue(drawerElement.classList.contains('drawer-minimized-vertical'));

      inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});

      assert.isFalse(drawerElement.classList.contains('drawer-minimized-vertical'));
    });

    it('minimized state persists across orientation toggles', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      inspectorView.toggleDrawerOrientation({force: DrawerOrientation.HORIZONTAL});
      assert.isTrue(inspectorView.isDrawerMinimized());

      inspectorView.toggleDrawerOrientation({force: DrawerOrientation.VERTICAL});
      assert.isTrue(inspectorView.isDrawerMinimized());
    });
  });
});
