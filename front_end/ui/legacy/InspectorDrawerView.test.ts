// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, afterEach, before, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import {getElementWithinComponent, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as Buttons from '../components/buttons/buttons.js';
import {html, render} from '../lit/lit.js';

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

describe('InspectorDrawerView', () => {
  setupSettingsHooks();

  before(async () => await initializeGlobalVars());
  after(async () => await deinitializeGlobalVars());

  function createInspectorViewWithDockState(dockState: LegacyUI.DockController.DockState): {
    inspectorView: LegacyUI.InspectorView.InspectorView,
    dockController: LegacyUI.DockController.DockController,
  } {
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    dockController.setDockSide(dockState);

    const inspectorView = InspectorView.instance({forceNew: true});
    renderElementIntoDOM(inspectorView);

    return {inspectorView, dockController};
  }

  function getDrawerSplitWidget(inspectorView: LegacyUI.InspectorView.InspectorView): LegacyUI.SplitWidget.SplitWidget {
    const splitElement = inspectorView.element.querySelector('.split-widget');
    assert.instanceOf(splitElement, HTMLElement);
    const splitWidget = LegacyUI.Widget.Widget.get(splitElement);
    assert.instanceOf(splitWidget, LegacyUI.SplitWidget.SplitWidget);
    return splitWidget;
  }

  function getDrawerTabbedPane(inspectorView: LegacyUI.InspectorView.InspectorView): LegacyUI.TabbedPane.TabbedPane {
    const location = inspectorView.resolveLocation('drawer-view') as LegacyUI.View.TabbedViewLocation | null;
    assert.exists(location);
    return location.tabbedPane();
  }

  function createUnattachedDrawerView({
    isVertical = false,
    enableOrientationToggle = true,
    onToggleMinimized = () => {},
    onHide = () => {},
    onToggleOrientation = () => {},
    setInspectorMinimumSize = sinon.spy(),
    onTabSelected = sinon.spy(),
    toolbarView,
  }: {
    isVertical?: boolean,
    enableOrientationToggle?: boolean,
    onToggleMinimized?: () => void,
    onHide?: () => void,
    onToggleOrientation?: () => void,
    setInspectorMinimumSize?: sinon.SinonSpy,
    onTabSelected?: sinon.SinonSpy,
    toolbarView?: LegacyUI.InspectorDrawerView.ToolbarView,
  } = {}): LegacyUI.InspectorDrawerView.InspectorDrawerView {
    return new LegacyUI.InspectorDrawerView.InspectorDrawerView({
      revealDrawer: () => {},
      isVisible: () => true,
      drawerLabel: 'Drawer',
      onToggleMinimized,
      onHide,
      onToggleOrientation,
      onExpandFromMinimized: () => {},
      onMinimizeFromTabInteraction: () => {},
      onTabSelected,
      isConsoleOpenInMainAndDrawer: () => false,
      tabDelegate: new LegacyUI.InspectorView.InspectorViewTabDelegate(),
      enableOrientationToggle,
      isVertical,
      verticalExpandedMinimumWidth: 280,
      minimumSizes: {
        inspectorWidthWhenVertical: 530,
        inspectorWidthWhenHorizontal: 250,
        inspectorHeight: 72,
      },
      setInspectorMinimumSize,
      toolbarView,
    });
  }

  beforeEach(() => {
    // `setIsDocked` resolves async and leaves elements in the body after the test is finished.
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setIsDocked');
  });

  afterEach(() => {
    InspectorView.removeInstance();
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

    it('showDrawer({focus: true}) followed by closeDrawer() restores focus to the previous element', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const previousFocusElement = document.createElement('button');
      renderElementIntoDOM(previousFocusElement, {allowMultipleChildren: true});
      previousFocusElement.focus();
      assert.strictEqual(document.activeElement, previousFocusElement);

      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      assert.notStrictEqual(document.activeElement, previousFocusElement);

      inspectorView.closeDrawer();

      assert.strictEqual(document.activeElement, previousFocusElement);
    });

    it('minimizeDrawer does not restore focus to avoid main panel content shift', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const previousFocusElement = document.createElement('button');
      renderElementIntoDOM(previousFocusElement, {allowMultipleChildren: true});
      previousFocusElement.focus();
      assert.strictEqual(document.activeElement, previousFocusElement);

      inspectorView.showDrawer({focus: true, hasTargetDrawer: false});
      assert.notStrictEqual(document.activeElement, previousFocusElement);

      inspectorView.minimizeDrawer();

      assert.isTrue(inspectorView.isDrawerMinimized());
      assert.notStrictEqual(document.activeElement, previousFocusElement);

      inspectorView.closeDrawer();

      assert.notStrictEqual(document.activeElement, previousFocusElement);
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

      const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
      const hideSidebarSpy = sinon.spy(drawerSplitWidget, 'hideSidebar');

      inspectorView.closeDrawer();

      sinon.assert.calledOnceWithExactly(hideSidebarSpy, true);
    });

    it('closeDrawer disables animation when drawer is minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
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

      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
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

      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
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

      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
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

      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
      drawerTabbedPane.dispatchEventToListeners(LegacyUI.TabbedPane.Events.TabInvoked, {
        tabId: 'console-view',
        prevTabId: 'console-view',
        isUserGesture: true,
      });

      assert.isFalse(inspectorView.isDrawerMinimized());
    });

    it('clicking drawer console tab does not expand when main console tab is active', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      sinon.stub(inspectorView.tabbedPane, 'selectedTabId').get(() => 'console');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
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
    });

    it('clicking drawer console tab minimizes when main console tab is active and drawer is expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      sinon.stub(inspectorView.tabbedPane, 'selectedTabId').get(() => 'console');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerMinimized());

      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
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
    });

    it('clicking expand drawer button does not expand when main console tab is active', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      sinon.stub(inspectorView.tabbedPane, 'selectedTabId').get(() => 'console');
      const drawerTabbedPane = getDrawerTabbedPane(inspectorView);
      sinon.stub(drawerTabbedPane, 'selectedTabId').get(() => 'console-view');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerMinimized());

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.instanceOf(drawerElement, HTMLElement);
      const expandButton = getElementWithinComponent(drawerElement, 'devtools-button[accessibleLabel="Expand drawer"]',
                                                     Buttons.Button.Button);

      expandButton.click();

      assert.isTrue(inspectorView.isDrawerMinimized());
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

          const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
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

          const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
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

          const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
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

        it('updates orientation when drawer is closed during dock switch', async () => {
          const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
          const waitForDockSideChangeHandled = expectCall(
              sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));

          assert.isFalse(inspectorView.drawerVisible());
          assert.isTrue(inspectorView.isDrawerOrientationVertical());

          dockController.setDockSide(DockState.RIGHT);
          await waitForDockSideChangeHandled;

          assert.isFalse(inspectorView.isDrawerOrientationVertical());
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
      const expandButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Expand drawer"]');
      assert.exists(expandButton, 'button should have "Expand drawer" title when minimized');
    });

    it('button title is "Minimize drawer" when horizontal and expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.RIGHT);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isFalse(inspectorView.isDrawerOrientationVertical());

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const minimizeButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Minimize drawer"]');
      assert.exists(minimizeButton, 'button should have "Minimize drawer" title when expanded');
    });

    it('button title is "Expand drawer" when vertical and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const expandButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Expand drawer"]');
      assert.exists(expandButton, 'button should have "Expand drawer" title when minimized');
    });

    it('button title is "Minimize drawer" when vertical and expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const minimizeButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Minimize drawer"]');
      assert.exists(minimizeButton, 'button should have "Minimize drawer" title when expanded');
    });

    it('title updates when orientation changes while minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      let expandButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Expand drawer"]');
      assert.exists(expandButton, 'button should show "Expand drawer" when minimized in vertical');

      inspectorView.toggleDrawerOrientation({force: LegacyUI.InspectorView.DrawerOrientation.HORIZONTAL});

      expandButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Expand drawer"]');
      assert.exists(expandButton, 'button should show "Expand drawer" when minimized in horizontal');
    });
  });

  describe('drawer resizability', () => {
    it('drawer is not resizable when minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);

      const resizerElement = getDrawerSplitWidget(inspectorView).resizerElement();
      assert.instanceOf(resizerElement, HTMLElement);
      assert.strictEqual(
          resizerElement.style.getPropertyValue('cursor'), '', 'resizer cursor should be removed when minimized');
    });

    it('drawer becomes resizable when expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      inspectorView.setDrawerMinimized(true);
      inspectorView.setDrawerMinimized(false);

      const resizerElement = getDrawerSplitWidget(inspectorView).resizerElement();
      assert.instanceOf(resizerElement, HTMLElement);
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
      const orientationButton =
          drawerElement.shadowRoot!.querySelector('[accessibleLabel="Toggle drawer orientation"]');
      assert.exists(orientationButton, 'toggle orientation button should exist in drawer toolbar');
    });

    it('close drawer button remains visible when vertical and minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const closeButton = drawerElement.shadowRoot!.querySelector('[accessibleLabel="Close drawer"]');
      assert.exists(closeButton, 'close drawer button should exist in drawer toolbar');
    });

    it('hides the plus button when vertical and minimized', () => {
      // The plus button is slotted into the `trailing-button` slot,
      // which lives inside `headerContentsElement`. When the drawer is
      // vertically minimized `headerContentsElement` receives the
      // `hide-element` class — hiding the slot (and therefore the
      // slotted plus button) along with the tab strip. If the slot
      // is ever relocated outside that container the plus button would
      // remain visible in the collapsed drawer strip and overlap the
      // close/orientation buttons.
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.setDrawerMinimized(true);

      const drawerElement = inspectorView.element.querySelector('.drawer-tabbed-pane');
      assert.exists(drawerElement);
      const trailingSlot = drawerElement.shadowRoot!.querySelector('slot[name="trailing-button"]');
      assert.exists(trailingSlot, 'drawer TabbedPane must declare a `trailing-button` slot for the plus button');
      const hiddenAncestor = trailingSlot.closest('.hide-element');
      assert.exists(hiddenAncestor,
                    'trailing-button slot must live inside a `.hide-element` container while vertically minimized');
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

  describe('inspector minimum width', () => {
    it('uses horizontal minimum width when vertical drawer is hidden', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      assert.isTrue(inspectorView.isDrawerOrientationVertical());
      assert.isFalse(inspectorView.drawerVisible());

      // 250px corresponds to MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER
      // (minimum main panel width + slack for borders).
      assert.strictEqual(inspectorView.constraints().minimum.width, 250);
    });

    it('uses vertical minimum width when vertical drawer is shown and expanded', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.isDrawerOrientationVertical());
      assert.isTrue(inspectorView.drawerVisible());
      assert.isFalse(inspectorView.isDrawerMinimized());

      // 530px corresponds to MIN_INSPECTOR_WIDTH_VERTICAL_DRAWER
      // (minimum main panel width + minimum vertical drawer width + slack for borders).
      assert.strictEqual(inspectorView.constraints().minimum.width, 530);
    });

    it('uses horizontal minimum width when vertical drawer is minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      assert.isTrue(inspectorView.isDrawerOrientationVertical());
      assert.isTrue(inspectorView.drawerVisible());
      assert.isTrue(inspectorView.isDrawerMinimized());

      // 250px corresponds to MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER
      assert.strictEqual(inspectorView.constraints().minimum.width, 250);
    });

    it('uses horizontal minimum width when vertical drawer is closed after being open', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      // 530px corresponds to MIN_INSPECTOR_WIDTH_VERTICAL_DRAWER
      assert.strictEqual(inspectorView.constraints().minimum.width, 530);

      inspectorView.closeDrawer();

      // 250px corresponds to MIN_INSPECTOR_WIDTH_HORIZONTAL_DRAWER
      assert.strictEqual(inspectorView.constraints().minimum.width, 250);
    });

    it('uses horizontal minimum width when switched from bottom dock to side dock', async () => {
      const {inspectorView, dockController} = createInspectorViewWithDockState(DockState.BOTTOM);
      const waitForDockSideChangeHandled = expectCall(
          sinon.stub(LegacyUI.InspectorView.InspectorView.instance(), 'applyDrawerOrientationForDockSideForTest'));

      dockController.setDockSide(DockState.RIGHT);
      await waitForDockSideChangeHandled;

      assert.strictEqual(inspectorView.constraints().minimum.width, 250);
    });
  });

  describe('lazy SplitWidget attachment', () => {
    it('can be constructed without a SplitWidget', () => {
      const setInspectorMinimumSize = sinon.spy();
      const drawerView = createUnattachedDrawerView({isVertical: false, setInspectorMinimumSize});

      assert.strictEqual(drawerView.showMode(), LegacyUI.SplitWidget.ShowMode.ONLY_MAIN);
      assert.isFalse(drawerView.sidebarIsShowing());
      assert.isFalse(drawerView.drawerVisible());
      assert.isFalse(drawerView.isMinimized());
      assert.isFalse(drawerView.isVertical());
      sinon.assert.calledOnceWithExactly(setInspectorMinimumSize, 250, 72);
    });

    it('mirrors state before attachSplitWidget and applies it on attachment idempotently', () => {
      const drawerView = createUnattachedDrawerView({isVertical: false});

      drawerView.show(false);
      assert.strictEqual(drawerView.showMode(), LegacyUI.SplitWidget.ShowMode.BOTH);
      assert.isTrue(drawerView.sidebarIsShowing());
      assert.isTrue(drawerView.drawerVisible());

      drawerView.setVertical(true);
      assert.isTrue(drawerView.isVertical());

      drawerView.setDrawerSize(320);
      assert.strictEqual(drawerView.drawerSize(), 320);

      drawerView.setMinimized(true);
      assert.isTrue(drawerView.isMinimized());

      drawerView.hide();
      assert.strictEqual(drawerView.showMode(), LegacyUI.SplitWidget.ShowMode.ONLY_MAIN);
      assert.isFalse(drawerView.sidebarIsShowing());
      assert.isFalse(drawerView.isMinimized());

      drawerView.show(false);
      drawerView.setDrawerSize(300);
      drawerView.setMinimized(true);

      const splitWidget = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      splitWidget.hideSidebar();
      renderElementIntoDOM(splitWidget, {includeCommonStyles: true, width: 800, height: 600});
      const installResizerSpy = sinon.spy(splitWidget, 'installResizer');

      drawerView.attachSplitWidget(splitWidget);

      assert.strictEqual(splitWidget.sidebarWidget(), drawerView.tabbedPane);
      assert.isTrue(splitWidget.isVertical());
      assert.strictEqual(splitWidget.showMode(), LegacyUI.SplitWidget.ShowMode.BOTH);
      assert.isTrue(splitWidget.isSidebarMinimized());
      assert.isFalse(splitWidget.isResizable());
      sinon.assert.calledOnceWithExactly(installResizerSpy, drawerView.tabbedPane.headerElement());

      drawerView.attachSplitWidget(splitWidget);
      sinon.assert.calledOnce(installResizerSpy);

      drawerView.setMinimized(false);
      assert.strictEqual(splitWidget.sidebarSize(), 300);
    });

    it('preserves pre-existing ShowMode.BOTH on attached SplitWidget when no explicit show mode was set', () => {
      const drawerView = createUnattachedDrawerView({isVertical: true});
      const splitWidget = new LegacyUI.SplitWidget.SplitWidget(true, true, undefined, 200, 200);
      renderElementIntoDOM(splitWidget, {includeCommonStyles: true, width: 800, height: 600});

      drawerView.attachSplitWidget(splitWidget);

      assert.strictEqual(splitWidget.showMode(), LegacyUI.SplitWidget.ShowMode.BOTH);
      assert.strictEqual(drawerView.showMode(), LegacyUI.SplitWidget.ShowMode.BOTH);
      assert.isTrue(drawerView.sidebarIsShowing());
      assert.isTrue(drawerView.drawerVisible());
    });

    it('applies pending drawer size when attached expanded', () => {
      const expandedDrawerView = createUnattachedDrawerView({isVertical: false});
      expandedDrawerView.show(false);
      expandedDrawerView.setDrawerSize(300);

      const expandedSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      expandedSplit.hideSidebar();
      renderElementIntoDOM(expandedSplit, {includeCommonStyles: true, width: 800, height: 600});
      expandedDrawerView.attachSplitWidget(expandedSplit);
      assert.strictEqual(expandedSplit.sidebarSize(), 300);
    });

    it('applies pending drawer size when un-minimized after attach and mount', () => {
      const minimizedDrawerView = createUnattachedDrawerView({isVertical: false});
      minimizedDrawerView.show(false);
      minimizedDrawerView.setDrawerSize(300);
      minimizedDrawerView.setMinimized(true);

      const minimizedSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      minimizedSplit.hideSidebar();
      minimizedDrawerView.attachSplitWidget(minimizedSplit);
      renderElementIntoDOM(minimizedSplit, {includeCommonStyles: true, width: 800, height: 600});

      assert.isTrue(minimizedSplit.isSidebarMinimized());
      minimizedDrawerView.setMinimized(false);
      assert.strictEqual(minimizedSplit.sidebarSize(), 300);
    });

    it('preserves minimized setting across unattached setVertical before restoreMinimizedStateFromSettings', () => {
      const minimizedSetting = Settings.instance().createLocalSetting(DRAWER_MINIMIZED_SETTING_NAME, true);
      minimizedSetting.set(true);

      const drawerView = createUnattachedDrawerView({isVertical: false});
      drawerView.setVertical(true);
      assert.isTrue(minimizedSetting.get());

      drawerView.restoreMinimizedStateFromSettings();

      const splitWidget = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      splitWidget.hideSidebar();
      renderElementIntoDOM(splitWidget, {includeCommonStyles: true, width: 800, height: 600});
      drawerView.attachSplitWidget(splitWidget);

      assert.isTrue(splitWidget.isVertical());
      assert.strictEqual(splitWidget.showMode(), LegacyUI.SplitWidget.ShowMode.BOTH);
      assert.isTrue(splitWidget.isSidebarMinimized());
    });

    it('uninstalls resizer from previous SplitWidget and carries over state when replaced', () => {
      const firstSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      renderElementIntoDOM(firstSplit,
                           {includeCommonStyles: true, width: 800, height: 600, allowMultipleChildren: true});
      const drawerView = new LegacyUI.InspectorDrawerView.InspectorDrawerView({
        revealDrawer: () => {},
        isVisible: () => true,
        drawerLabel: 'Drawer',
        onToggleMinimized: () => {},
        onHide: () => {},
        onToggleOrientation: () => {},
        onExpandFromMinimized: () => {},
        onMinimizeFromTabInteraction: () => {},
        onTabSelected: () => {},
        isConsoleOpenInMainAndDrawer: () => false,
        tabDelegate: new LegacyUI.InspectorView.InspectorViewTabDelegate(),
        enableOrientationToggle: true,
        isVertical: false,
        verticalExpandedMinimumWidth: 280,
        minimumSizes: {
          inspectorWidthWhenVertical: 530,
          inspectorWidthWhenHorizontal: 250,
          inspectorHeight: 72,
        },
        setInspectorMinimumSize: () => {},
        splitWidget: firstSplit,
      });

      drawerView.show(false);
      drawerView.setVertical(true);
      drawerView.setDrawerSize(320);

      const uninstallResizerSpy = sinon.spy(firstSplit, 'uninstallResizer');
      const secondSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      secondSplit.hideSidebar();
      renderElementIntoDOM(secondSplit,
                           {includeCommonStyles: true, width: 800, height: 600, allowMultipleChildren: true});

      drawerView.attachSplitWidget(secondSplit);

      sinon.assert.calledOnceWithExactly(uninstallResizerSpy, drawerView.tabbedPane.headerElement());
      assert.isTrue(secondSplit.isVertical());
      assert.strictEqual(secondSplit.showMode(), LegacyUI.SplitWidget.ShowMode.BOTH);
      assert.strictEqual(secondSplit.sidebarSize(), 320);
      assert.strictEqual(secondSplit.sidebarWidget(), drawerView.tabbedPane);
    });

    it('fires onTabSelected once when a tab is appended and a mounted SplitWidget in ShowMode.BOTH is attached', () => {
      const onTabSelected = sinon.spy();
      const drawerView = createUnattachedDrawerView({isVertical: false, onTabSelected});
      drawerView.tabbedPane.appendTab('console-view', 'Console', new LegacyUI.Widget.Widget());
      sinon.assert.notCalled(onTabSelected);

      const firstSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      renderElementIntoDOM(firstSplit,
                           {includeCommonStyles: true, width: 800, height: 600, allowMultipleChildren: true});
      drawerView.attachSplitWidget(firstSplit);
      sinon.assert.calledOnceWithExactly(onTabSelected, 'console-view');

      const secondSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      renderElementIntoDOM(secondSplit,
                           {includeCommonStyles: true, width: 800, height: 600, allowMultipleChildren: true});
      drawerView.attachSplitWidget(secondSplit);
      sinon.assert.calledOnceWithExactly(onTabSelected, 'console-view');
    });

    it('does not re-fire onTabSelected on attach when a tab was already selected while unattached', () => {
      const onTabSelected = sinon.spy();
      const drawerView = createUnattachedDrawerView({isVertical: false, onTabSelected});
      drawerView.tabbedPane.appendTab('console-view', 'Console', new LegacyUI.Widget.Widget());
      drawerView.tabbedPane.selectTab('console-view');
      sinon.assert.calledOnceWithExactly(onTabSelected, 'console-view');

      const splitWidget = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      renderElementIntoDOM(splitWidget, {includeCommonStyles: true, width: 800, height: 600});
      drawerView.attachSplitWidget(splitWidget);
      sinon.assert.calledOnceWithExactly(onTabSelected, 'console-view');
    });

    it('reports a pre-selected tab restored during createTabbedLocation once showMode is not ONLY_MAIN', () => {
      const testTabId = 'test-preselected-drawer-tab';
      LegacyUI.ViewManager.registerViewExtension({
        id: testTabId,
        location: LegacyUI.ViewManager.ViewLocationValues.DRAWER_VIEW,
        persistence: LegacyUI.ViewManager.ViewPersistence.PERMANENT,
        commandPrompt: () => i18n.i18n.lockedString('Test drawer tab'),
        title: () => i18n.i18n.lockedString('Test drawer tab'),
        async loadView() {
          return new LegacyUI.Widget.Widget();
        },
      });
      Settings.instance().createSetting('drawer-view-selected-tab', testTabId).set(testTabId);
      LegacyUI.ViewManager.ViewManager.instance({forceNew: true, universe: new TestUniverse()});

      try {
        const onTabSelected = sinon.spy();
        const drawerView = createUnattachedDrawerView({isVertical: false, onTabSelected});
        assert.strictEqual(drawerView.tabbedPane.selectedTabId, testTabId);
        sinon.assert.notCalled(onTabSelected);

        drawerView.show(false);
        sinon.assert.calledOnceWithExactly(onTabSelected, testTabId);

        const splitWidget = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
        renderElementIntoDOM(splitWidget, {includeCommonStyles: true, width: 800, height: 600});
        drawerView.attachSplitWidget(splitWidget);
        sinon.assert.calledOnceWithExactly(onTabSelected, testTabId);
      } finally {
        LegacyUI.ViewManager.maybeRemoveViewExtension(testTabId);
        LegacyUI.ViewManager.ViewManager.removeInstance();
      }
    });

    it('flushes in-flight hide animation on previous SplitWidget when replaced', async () => {
      const firstSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      renderElementIntoDOM(firstSplit,
                           {includeCommonStyles: true, width: 800, height: 600, allowMultipleChildren: true});
      const drawerView = createUnattachedDrawerView({isVertical: false});
      drawerView.attachSplitWidget(firstSplit);
      drawerView.show(false);

      const clock = sinon.useFakeTimers({toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance']});
      try {
        drawerView.hide();

        const secondSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
        renderElementIntoDOM(secondSplit,
                             {includeCommonStyles: true, width: 800, height: 600, allowMultipleChildren: true});
        drawerView.attachSplitWidget(secondSplit);
        drawerView.show(false);

        clock.tick(100);
        assert.strictEqual(secondSplit.sidebarWidget(), drawerView.tabbedPane);
        assert.isTrue(drawerView.tabbedPane.isShowing());
      } finally {
        clock.restore();
      }
      await raf();
    });

    it('detaches tabbedPane from previous devtools-split-view in ShowMode.ONLY_MAIN when replaced', () => {
      const container = renderElementIntoDOM(new LegacyUI.Widget.VBox());
      let firstSplit!: LegacyUI.SplitWidget.SplitWidget;
      let secondSplit!: LegacyUI.SplitWidget.SplitWidget;
      render(html`
            <devtools-split-view show="both" ${
                 LegacyUI.Widget.widgetRef(LegacyUI.SplitWidget.SplitWidget,
                                           w => {
                                             firstSplit = w;
                                           })}></devtools-split-view>
            <devtools-split-view show="main" ${
                 LegacyUI.Widget.widgetRef(LegacyUI.SplitWidget.SplitWidget,
                                           w => {
                                             secondSplit = w;
                                           })}></devtools-split-view>
          `,
             container.contentElement);

      const drawerView = createUnattachedDrawerView({isVertical: false});
      drawerView.attachSplitWidget(firstSplit);
      drawerView.hide();
      assert.strictEqual(firstSplit.showMode(), LegacyUI.SplitWidget.ShowMode.ONLY_MAIN);
      assert.isTrue(firstSplit.element.contains(drawerView.tabbedPane.element));

      drawerView.attachSplitWidget(secondSplit);
      assert.isFalse(firstSplit.element.contains(drawerView.tabbedPane.element));
      assert.notInclude(firstSplit.children(), drawerView.tabbedPane);
      assert.strictEqual(secondSplit.sidebarWidget(), drawerView.tabbedPane);
    });

    it('preserves #drawerSizeBeforeMinimize across SplitWidget replacement while minimized', () => {
      const firstSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      renderElementIntoDOM(firstSplit, {includeCommonStyles: true, width: 800, height: 600});
      const drawerView = createUnattachedDrawerView({isVertical: false});
      drawerView.attachSplitWidget(firstSplit);
      drawerView.show(false);
      drawerView.setDrawerSize(320);
      drawerView.setMinimized(true);

      firstSplit.detach();
      const secondSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      secondSplit.hideSidebar();
      renderElementIntoDOM(secondSplit, {width: 800, height: 600, allowMultipleChildren: true});
      drawerView.attachSplitWidget(secondSplit);

      assert.isTrue(drawerView.isMinimized());
      assert.isTrue(secondSplit.isSidebarMinimized());

      drawerView.setMinimized(false);
      assert.strictEqual(secondSplit.sidebarSize(), 320);
    });

    it('keeps drawerVisible() true after show(false) when attached to an unmounted SplitWidget', () => {
      const drawerView = createUnattachedDrawerView({isVertical: false});
      drawerView.show(false);

      const unmountedSplit = new LegacyUI.SplitWidget.SplitWidget(false, true, undefined, 200, 200);
      unmountedSplit.hideSidebar();
      drawerView.attachSplitWidget(unmountedSplit);

      assert.isFalse(unmountedSplit.isShowing());
      assert.isTrue(drawerView.drawerVisible());
    });
  });

  describe('toolbar view', () => {
    function createToolbarInput(overrides: Partial<LegacyUI.InspectorDrawerView.ToolbarViewInput> = {}):
        LegacyUI.InspectorDrawerView.ToolbarViewInput {
      return {
        isVertical: false,
        isMinimized: false,
        showOrientationToggle: true,
        onToggleOrientation: sinon.spy(),
        onToggleMinimized: sinon.spy(),
        onClose: sinon.spy(),
        ...overrides,
      };
    }

    function getToolbarButtons(target: HTMLElement): Buttons.Button.Button[] {
      return [...target.querySelectorAll<Buttons.Button.Button>('devtools-button')];
    }

    it('renders minimize/expand and close buttons, and includes orientation toggle only when enabled', () => {
      const target = document.createElement('devtools-toolbar');
      renderElementIntoDOM(target);

      LegacyUI.InspectorDrawerView.DEFAULT_TOOLBAR_VIEW(createToolbarInput({showOrientationToggle: false}), undefined,
                                                        target);
      assert.deepEqual(getToolbarButtons(target).map(button => button.accessibleLabel),
                       ['Minimize drawer', 'Close drawer']);

      LegacyUI.InspectorDrawerView.DEFAULT_TOOLBAR_VIEW(createToolbarInput({showOrientationToggle: true}), undefined,
                                                        target);
      assert.deepEqual(getToolbarButtons(target).map(button => button.accessibleLabel),
                       ['Toggle drawer orientation', 'Minimize drawer', 'Close drawer']);
    });

    it('updates button labels, titles, and icons across all orientation and minimized combinations', () => {
      const target = document.createElement('devtools-toolbar');
      renderElementIntoDOM(target);

      const cases = [
        {
          isVertical: true,
          isMinimized: false,
          orientationIcon: 'dock-bottom',
          minimizeLabel: 'Minimize drawer',
          minimizeIcon: 'right-panel-close',
        },
        {
          isVertical: true,
          isMinimized: true,
          orientationIcon: 'dock-bottom',
          minimizeLabel: 'Expand drawer',
          minimizeIcon: 'right-panel-open',
        },
        {
          isVertical: false,
          isMinimized: false,
          orientationIcon: 'dock-right',
          minimizeLabel: 'Minimize drawer',
          minimizeIcon: 'bottom-panel-close',
        },
        {
          isVertical: false,
          isMinimized: true,
          orientationIcon: 'dock-right',
          minimizeLabel: 'Expand drawer',
          minimizeIcon: 'bottom-panel-open',
        },
      ];

      for (const testCase of cases) {
        LegacyUI.InspectorDrawerView.DEFAULT_TOOLBAR_VIEW(
            createToolbarInput({isVertical: testCase.isVertical, isMinimized: testCase.isMinimized}), undefined,
            target);
        const [orientationButton, minimizeButton, closeButton] = getToolbarButtons(target);
        assert.instanceOf(orientationButton, Buttons.Button.Button);
        assert.instanceOf(minimizeButton, Buttons.Button.Button);
        assert.instanceOf(closeButton, Buttons.Button.Button);

        assert.strictEqual(orientationButton.accessibleLabel, 'Toggle drawer orientation');
        assert.strictEqual(orientationButton.title, 'Toggle drawer orientation');
        assert.strictEqual(orientationButton.iconName, testCase.orientationIcon);

        assert.strictEqual(minimizeButton.accessibleLabel, testCase.minimizeLabel);
        assert.strictEqual(minimizeButton.title, testCase.minimizeLabel);
        assert.strictEqual(minimizeButton.iconName, testCase.minimizeIcon);

        assert.strictEqual(closeButton.accessibleLabel, 'Close drawer');
        assert.strictEqual(closeButton.title, 'Close drawer');
        assert.strictEqual(closeButton.iconName, 'cross');
      }
    });

    it('invokes toolbar callbacks on button click', () => {
      const target = document.createElement('devtools-toolbar');
      renderElementIntoDOM(target);
      const onToggleOrientation = sinon.spy();
      const onToggleMinimized = sinon.spy();
      const onClose = sinon.spy();

      LegacyUI.InspectorDrawerView.DEFAULT_TOOLBAR_VIEW(
          createToolbarInput({onToggleOrientation, onToggleMinimized, onClose}), undefined, target);
      const [orientationButton, minimizeButton, closeButton] = getToolbarButtons(target);

      orientationButton.click();
      sinon.assert.calledOnce(onToggleOrientation);
      sinon.assert.notCalled(onToggleMinimized);
      sinon.assert.notCalled(onClose);

      minimizeButton.click();
      sinon.assert.calledOnce(onToggleMinimized);

      closeButton.click();
      sinon.assert.calledOnce(onClose);
    });

    it('passes state and delegates callbacks to injected toolbarView', () => {
      let latestInput: LegacyUI.InspectorDrawerView.ToolbarViewInput|undefined;
      const toolbarView = sinon.spy<LegacyUI.InspectorDrawerView.ToolbarView>(input => {
        latestInput = input;
      });
      const onToggleOrientation = sinon.spy();
      const onToggleMinimized = sinon.spy();
      const onHide = sinon.spy();

      const drawerView = createUnattachedDrawerView({
        enableOrientationToggle: true,
        isVertical: false,
        onToggleOrientation,
        onToggleMinimized,
        onHide,
        toolbarView,
      });

      sinon.assert.calledOnce(toolbarView);
      assert.exists(latestInput);
      assert.isFalse(latestInput.isVertical);
      assert.isFalse(latestInput.isMinimized);
      assert.isTrue(latestInput.showOrientationToggle);

      latestInput.onToggleOrientation();
      sinon.assert.calledOnce(onToggleOrientation);
      latestInput.onToggleMinimized();
      sinon.assert.calledOnce(onToggleMinimized);
      latestInput.onClose();
      sinon.assert.calledOnce(onHide);

      drawerView.setVertical(true);
      sinon.assert.calledTwice(toolbarView);
      assert.isTrue(latestInput.isVertical);
      assert.isFalse(latestInput.isMinimized);

      drawerView.setMinimized(true);
      sinon.assert.calledThrice(toolbarView);
      assert.isTrue(latestInput.isVertical);
      assert.isTrue(latestInput.isMinimized);
    });

    it('forwards enableOrientationToggle=false to injected toolbarView', () => {
      let latestInput: LegacyUI.InspectorDrawerView.ToolbarViewInput|undefined;
      const toolbarView = sinon.spy<LegacyUI.InspectorDrawerView.ToolbarView>(input => {
        latestInput = input;
      });

      createUnattachedDrawerView({enableOrientationToggle: false, toolbarView});

      sinon.assert.calledOnce(toolbarView);
      assert.exists(latestInput);
      assert.isFalse(latestInput.showOrientationToggle);
    });
  });
});
