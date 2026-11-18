// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, afterEach, before, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import {assertScreenshot, getElementWithinComponent, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  createTarget,
  deinitializeGlobalVars,
  initializeGlobalVars,
  updateHostConfig,
} from '../../testing/EnvironmentHelpers.js';
import {expectCall} from '../../testing/ExpectStubCall.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import {createViewFunctionStub} from '../../testing/ViewFunctionHelpers.js';

import * as LegacyUI from './legacy.js';

const InspectorView = LegacyUI.InspectorView.InspectorView;
const {DockState} = LegacyUI.DockController;

describe('InspectorView', () => {
  setupSettingsHooks();

  before(async () => await initializeGlobalVars());
  after(async () => await deinitializeGlobalVars());

  function createInspectorViewWithDockState(dockState: LegacyUI.DockController.DockState,
                                            renderOptions?: Parameters<typeof renderElementIntoDOM>[1]): {
    inspectorView: LegacyUI.InspectorView.InspectorView,
    dockController: LegacyUI.DockController.DockController,
  } {
    const dockController = LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true});
    dockController.setDockSide(dockState);

    const inspectorView = InspectorView.instance({forceNew: true});
    renderElementIntoDOM(inspectorView, renderOptions);

    return {inspectorView, dockController};
  }

  function getDrawerSplitWidget(inspectorView: LegacyUI.InspectorView.InspectorView): LegacyUI.SplitWidget.SplitWidget {
    const splitElement = inspectorView.element.querySelector('.split-widget');
    assert.instanceOf(splitElement, HTMLElement);
    const splitWidget = LegacyUI.Widget.Widget.get(splitElement);
    assert.instanceOf(splitWidget, LegacyUI.SplitWidget.SplitWidget);
    return splitWidget;
  }

  async function finishAnimations(root: Element): Promise<void> {
    await raf();
    const finishInRoot = (node: Element|ShadowRoot): void => {
      for (const animation of node.getAnimations()) {
        animation.finish();
      }
      for (const element of node.querySelectorAll('*')) {
        if (element.shadowRoot) {
          finishInRoot(element.shadowRoot);
        }
      }
    };
    for (const animation of root.getAnimations({subtree: true})) {
      animation.finish();
    }
    finishInRoot(root);
    await raf();
  }

  beforeEach(() => {
    // `setIsDocked` resolves async and leaves elements in the body after the test is finished.
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setIsDocked');
  });

  afterEach(() => {
    InspectorView.removeInstance();
  });

  describe('reload required warnings', () => {
    it('displays both debugged tab and devtools reload warnings independently', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayDebuggedTabReloadRequiredWarning('Debugged tab reload required');
      inspectorView.displayReloadRequiredWarning('DevTools reload required');
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      // The infobars are added to a flex-none div within the content element.
      // We expect two children in that div.
      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 2);

      const firstInfobar = infoBarDiv.children[0];
      const secondInfobar = infoBarDiv.children[1];

      assert.instanceOf(firstInfobar, HTMLElement);
      assert.instanceOf(secondInfobar, HTMLElement);

      const firstLabel = getElementWithinComponent(firstInfobar, '.infobar-info-text', HTMLElement);
      const secondLabel = getElementWithinComponent(secondInfobar, '.infobar-info-text', HTMLElement);

      assert.strictEqual(firstLabel.textContent, 'Debugged tab reload required');
      assert.strictEqual(secondLabel.textContent, 'DevTools reload required');
    });

    it('removes debugged tab reload warning and allows showing it again', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.removeDebuggedTabReloadRequiredWarning();
      inspectorView.displayDebuggedTabReloadRequiredWarning('Debugged tab reload required');
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 1);

      inspectorView.removeDebuggedTabReloadRequiredWarning();
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      assert.isNull(inspectorView.contentElement.querySelector('.flex-none'));

      inspectorView.displayDebuggedTabReloadRequiredWarning('Debugged tab reload required again');
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const readdedInfoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(readdedInfoBarDiv);
      assert.strictEqual(readdedInfoBarDiv.childElementCount, 1);
      const readdedInfobar = readdedInfoBarDiv.children[0];
      assert.instanceOf(readdedInfobar, HTMLElement);
      const label = getElementWithinComponent(readdedInfobar, '.infobar-info-text', HTMLElement);
      assert.strictEqual(label.textContent, 'Debugged tab reload required again');
    });
  });

  describe('select override folder infobar', () => {
    it('displays the infobar once until dismissed and invokes the callback on action click', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const firstCallback = sinon.spy();
      const secondCallback = sinon.spy();

      inspectorView.displaySelectOverrideFolderInfobar(firstCallback);
      inspectorView.displaySelectOverrideFolderInfobar(secondCallback);
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 1);

      const infobar = infoBarDiv.children[0];
      assert.instanceOf(infobar, HTMLElement);
      const label = getElementWithinComponent(infobar, '.infobar-info-text', HTMLElement);
      assert.strictEqual(label.textContent, 'Select a folder to store override files in');

      const selectButton = getElementWithinComponent(infobar, 'devtools-button', HTMLElement);
      selectButton.click();
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      sinon.assert.calledOnce(firstCallback);
      sinon.assert.notCalled(secondCallback);
      assert.isNull(inspectorView.contentElement.querySelector('.flex-none'));

      inspectorView.displaySelectOverrideFolderInfobar(secondCallback);
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const readdedInfoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(readdedInfoBarDiv);
      assert.strictEqual(readdedInfoBarDiv.childElementCount, 1);
    });
  });

  describe('Chrome restart required warnings', () => {
    async function assertShowsOnlyChromeRestartWarning(inspectorView: LegacyUI.InspectorView.InspectorView) {
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 1);

      const infobar = infoBarDiv.children[0];
      assert.instanceOf(infobar, HTMLElement);
      const label = getElementWithinComponent(infobar, '.infobar-info-text', HTMLElement);
      assert.strictEqual(label.textContent, 'Chrome restart required');
    }

    it('displays Chrome restart warning', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayChromeRestartRequiredWarning('Chrome restart required');
      await assertShowsOnlyChromeRestartWarning(inspectorView);
    });

    it('hides reload warning when Chrome restart warning is displayed', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayReloadRequiredWarning('Reload required');
      inspectorView.displayChromeRestartRequiredWarning('Chrome restart required');
      await assertShowsOnlyChromeRestartWarning(inspectorView);
    });

    it('does not display reload warning when Chrome restart warning is already displayed', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayChromeRestartRequiredWarning('Chrome restart required');
      inspectorView.displayReloadRequiredWarning('Reload required');
      await assertShowsOnlyChromeRestartWarning(inspectorView);
    });
  });

  describe('language mismatch infobar', () => {
    function createDevToolsLocale(navigatorLanguage: string): void {
      i18n.DevToolsLocale.DevToolsLocale.instance({
        create: true,
        data: {
          navigatorLanguage,
          settingLanguage: 'en-US',
          lookupClosestDevToolsLocale: locale => locale.startsWith('de') ? 'de' : 'en-US',
        },
      });
    }

    function findLanguageMismatchInfobar(inspectorView: LegacyUI.InspectorView.InspectorView): Element|undefined {
      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      return [...infoBarDiv?.children ?? []].find(
          infobar => infobar.shadowRoot?.querySelector('.infobar-info-text')?.textContent ===
              'DevTools is now available in German');
    }

    beforeEach(() => {
      sinon.stub(navigator, 'language').get(() => 'de-DE');
      createDevToolsLocale('de-DE');
    });

    afterEach(() => {
      createDevToolsLocale('en-US');
    });

    it('is not shown again after the user closes it', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const infobar = findLanguageMismatchInfobar(inspectorView);
      assert.instanceOf(infobar, HTMLElement);

      const closeButton = getElementWithinComponent(infobar, 'dt-close-button', HTMLElement);
      closeButton.click();

      assert.isTrue(Common.Settings.Settings.instance().createSetting('disable-locale-info-bar', false).get());
      const nextInspectorView = InspectorView.instance({forceNew: true});
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      assert.notExists(findLanguageMismatchInfobar(nextInspectorView));
    });

    it('focuses the main tabbed pane when the language mismatch infobar is shown on a connected element', async () => {
      const container = renderElementIntoDOM(new LegacyUI.Widget.VBox());
      const host = container.contentElement.createChild('div');
      LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true}).setDockSide(DockState.BOTTOM);
      const inspectorView = new InspectorView(host);
      inspectorView.show(container.contentElement);
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      assert.exists(findLanguageMismatchInfobar(inspectorView));

      inspectorView.focus();

      assert.isTrue(inspectorView.tabbedPane.hasFocus());
    });
  });

  describe('action delegate', () => {
    it('main.toggle-drawer triggers animated hide when drawer is expanded and visible', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      assert.isTrue(inspectorView.drawerVisible());
      const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
      const hideSidebarSpy = sinon.spy(drawerSplitWidget, 'hideSidebar');

      const delegate = new LegacyUI.InspectorView.ActionDelegate();
      delegate.handleAction({} as LegacyUI.Context.Context, 'main.toggle-drawer');

      sinon.assert.calledOnceWithExactly(hideSidebarSpy, true);
    });

    it('main.toggle-drawer hides without animation when drawer is minimized', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);
      const drawerSplitWidget = getDrawerSplitWidget(inspectorView);
      const hideSidebarSpy = sinon.spy(drawerSplitWidget, 'hideSidebar');

      const delegate = new LegacyUI.InspectorView.ActionDelegate();
      delegate.handleAction({} as LegacyUI.Context.Context, 'main.toggle-drawer');

      sinon.assert.calledOnceWithExactly(hideSidebarSpy, false);
      assert.isFalse(inspectorView.drawerVisible());
    });

    it('main.toggle-drawer shows drawer when hidden', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      assert.isFalse(inspectorView.drawerVisible());

      const delegate = new LegacyUI.InspectorView.ActionDelegate();
      delegate.handleAction({} as LegacyUI.Context.Context, 'main.toggle-drawer');

      assert.isTrue(inspectorView.drawerVisible());
      assert.isFalse(inspectorView.isDrawerMinimized());
    });
  });

  describe('panel locking', () => {
    it('restricts panel selection to the active panel when targets are suspended', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.tabbedPane.appendTab('panel-a', 'Panel A', new LegacyUI.Widget.Widget());
      inspectorView.tabbedPane.appendTab('panel-b', 'Panel B', new LegacyUI.Widget.Widget());
      inspectorView.tabbedPane.selectTab('panel-a');

      assert.isTrue(inspectorView.canSelectPanel('panel-a'));
      assert.isTrue(inspectorView.canSelectPanel('panel-b'));

      inspectorView.onSuspendStateChanged(true);
      assert.isTrue(inspectorView.canSelectPanel('panel-a'));
      assert.isFalse(inspectorView.canSelectPanel('panel-b'));
      assert.isTrue(inspectorView.tabbedPane.headerElement().classList.contains('locked'));
      assert.isFalse(inspectorView.tabbedPane.leftToolbar().enabled);
      assert.isFalse(inspectorView.tabbedPane.rightToolbar().enabled);

      inspectorView.onSuspendStateChanged(false);
      assert.isTrue(inspectorView.canSelectPanel('panel-a'));
      assert.isTrue(inspectorView.canSelectPanel('panel-b'));
      assert.isFalse(inspectorView.tabbedPane.headerElement().classList.contains('locked'));
      assert.isTrue(inspectorView.tabbedPane.leftToolbar().enabled);
      assert.isTrue(inspectorView.tabbedPane.rightToolbar().enabled);
    });
  });

  describe('panel warnings', () => {
    it('sets, updates, and clears warning icons on main panel and drawer tabs', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM, {width: 640, height: 360});
      inspectorView.tabbedPane.appendTab('panel-a', 'Panel A', new LegacyUI.Widget.Widget());
      const drawerLocation = inspectorView.resolveLocation('drawer-view') as LegacyUI.View.TabbedViewLocation | null;
      assert.exists(drawerLocation);
      const drawerTabbedPane = drawerLocation.tabbedPane();
      drawerTabbedPane.appendTab('drawer-tab', 'Drawer Tab', new LegacyUI.Widget.Widget());
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      inspectorView.setPanelWarnings('panel-a', ['First warning']);
      const mainWarningIcon =
          inspectorView.tabbedPane.headerElement().querySelector('.tabbed-pane-header-tab-suffix-element .warning');
      assert.instanceOf(mainWarningIcon, HTMLElement);
      assert.strictEqual(mainWarningIcon.title, 'First warning');

      inspectorView.setPanelWarnings('panel-a', ['Warning one', 'Warning two']);
      const updatedMainWarningIcon =
          inspectorView.tabbedPane.headerElement().querySelector('.tabbed-pane-header-tab-suffix-element .warning');
      assert.instanceOf(updatedMainWarningIcon, HTMLElement);
      assert.strictEqual(updatedMainWarningIcon.title, '· Warning one\n· Warning two');

      inspectorView.setPanelWarnings('panel-a', []);
      assert.isNull(
          inspectorView.tabbedPane.headerElement().querySelector('.tabbed-pane-header-tab-suffix-element .warning'));

      inspectorView.setPanelWarnings('drawer-tab', ['Drawer warning']);
      const drawerWarningIcon =
          drawerTabbedPane.headerElement().querySelector('.tabbed-pane-header-tab-suffix-element .warning');
      assert.instanceOf(drawerWarningIcon, HTMLElement);
      assert.strictEqual(drawerWarningIcon.title, 'Drawer warning');

      inspectorView.setPanelWarnings('drawer-tab', []);
      assert.isNull(drawerTabbedPane.headerElement().querySelector('.tabbed-pane-header-tab-suffix-element .warning'));

      inspectorView.setPanelWarnings('nonexistent-tab', ['Ignored']);
      assert.isNull(inspectorView.tabbedPane.headerElement().querySelector('.warning'));
      assert.isNull(drawerTabbedPane.headerElement().querySelector('.warning'));
    });
  });

  describe('window layout CSS variables', () => {
    it('sets --devtools-window-* custom properties on documentElement root', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const rootStyle = inspectorView.element.ownerDocument.documentElement.style;
      assert.isNotEmpty(rootStyle.getPropertyValue('--devtools-window-width'));
      assert.isNotEmpty(rootStyle.getPropertyValue('--devtools-window-height'));
      assert.isNotEmpty(rootStyle.getPropertyValue('--devtools-window-left'));
      assert.isNotEmpty(rootStyle.getPropertyValue('--devtools-window-top'));
    });
  });

  describe('screenshots', () => {
    function createScreenshotTabPanel(text: string): LegacyUI.Widget.VBox {
      const panel = new LegacyUI.Widget.VBox();
      const content = document.createElement('div');
      content.style.padding = '12px';
      content.textContent = text;
      panel.contentElement.appendChild(content);
      return panel;
    }

    function populateScreenshotTabs(inspectorView: LegacyUI.InspectorView.InspectorView): void {
      inspectorView.tabbedPane.appendTab('elements', 'Elements', createScreenshotTabPanel('Main panel content'));
      inspectorView.tabbedPane.selectTab('elements');

      const drawerLocation = inspectorView.resolveLocation('drawer-view') as LegacyUI.View.TabbedViewLocation | null;
      assert.exists(drawerLocation);
      const drawerTabbedPane = drawerLocation.tabbedPane();
      drawerTabbedPane.appendTab('console-view', 'Console', createScreenshotTabPanel('Drawer panel content'));
      drawerTabbedPane.selectTab('console-view');
    }

    it('renders horizontal drawer open with an infobar', async () => {
      const {inspectorView} =
          createInspectorViewWithDockState(DockState.RIGHT, {includeCommonStyles: true, width: 640, height: 360});
      populateScreenshotTabs(inspectorView);
      inspectorView.displayReloadRequiredWarning(
          'One or more settings have changed which requires a reload to take effect.');
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});

      assert.isFalse(inspectorView.isDrawerOrientationVertical());
      assert.isTrue(inspectorView.drawerVisible());

      await LegacyUI.Widget.Widget.allUpdatesComplete;
      await finishAnimations(inspectorView.element);
      await assertScreenshot('inspector_view/drawer-and-infobar.png');
    });

    it('renders vertical minimized drawer', async () => {
      updateHostConfig({devToolsFlexibleLayout: {verticalDrawerEnabled: true}});
      const {inspectorView} =
          createInspectorViewWithDockState(DockState.BOTTOM, {includeCommonStyles: true, width: 640, height: 360});
      populateScreenshotTabs(inspectorView);
      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.setDrawerMinimized(true);

      assert.isTrue(inspectorView.isDrawerOrientationVertical());
      assert.isTrue(inspectorView.isDrawerMinimized());

      await LegacyUI.Widget.Widget.allUpdatesComplete;
      await finishAnimations(inspectorView.element);
      await assertScreenshot('inspector_view/vertical-minimized-drawer.png');
    });
  });

  describe('drawer initialization and orientation', () => {
    it('returns false without throwing when VIEW_VISIBILITY_CHANGED queries isViewVisible during construction', () => {
      const testViewId = 'test-drawer-visibility-view';
      LegacyUI.ViewManager.registerViewExtension({
        id: testViewId,
        location: LegacyUI.ViewManager.ViewLocationValues.DRAWER_VIEW,
        persistence: LegacyUI.ViewManager.ViewPersistence.PERMANENT,
        commandPrompt: () => i18n.i18n.lockedString('Test drawer view'),
        title: () => i18n.i18n.lockedString('Test drawer view'),
        async loadView() {
          return new LegacyUI.Widget.Widget();
        },
      });
      Common.Settings.Settings.instance().createSetting('drawer-view-selected-tab', testViewId).set(testViewId);
      const viewManager = LegacyUI.ViewManager.ViewManager.instance({forceNew: true, universe: new TestUniverse()});
      const observedVisibilities: boolean[] = [];
      const listener = viewManager.addEventListener(LegacyUI.ViewManager.Events.VIEW_VISIBILITY_CHANGED, () => {
        observedVisibilities.push(viewManager.isViewVisible(testViewId));
      });

      try {
        LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true}).setDockSide(DockState.BOTTOM);
        InspectorView.instance({forceNew: true});
        assert.deepEqual(observedVisibilities, [false]);
      } finally {
        Common.EventTarget.removeEventListeners([listener]);
        LegacyUI.ViewManager.maybeRemoveViewExtension(testViewId);
        LegacyUI.ViewManager.ViewManager.removeInstance();
      }
    });

    it('updates drawer orientation when toggleDrawerOrientation is called on an unmounted InspectorView', () => {
      LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true}).setDockSide(DockState.BOTTOM);
      const inspectorView = InspectorView.instance({forceNew: true});
      assert.isFalse(inspectorView.isShowing());
      assert.isTrue(inspectorView.isDrawerOrientationVertical());

      inspectorView.showDrawer({focus: false, hasTargetDrawer: false});
      inspectorView.toggleDrawerOrientation();

      assert.isFalse(inspectorView.isDrawerOrientationVertical());
    });
  });

  describe('presenter', () => {
    it('removes debugged tab reload warning on PrimaryPageChanged', async () => {
      LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true}).setDockSide(DockState.BOTTOM);
      const view = createViewFunctionStub(InspectorView);
      const inspectorView = new InspectorView(undefined, view);
      const target = createTarget();

      try {
        const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        assert.exists(resourceTreeModel);

        inspectorView.displayDebuggedTabReloadRequiredWarning('Reload page msg');
        let input = await view.nextInput;
        assert.lengthOf(input.infobars, 1);

        resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
          frame: sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame),
          type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
        });
        input = await view.nextInput;
        assert.isEmpty(input.infobars);
      } finally {
        inspectorView.removeDebuggedTabReloadRequiredWarning();
        target.dispose('test');
      }
    });

    it('unregisters PrimaryPageChanged listener when debugged tab reload warning is closed', async () => {
      LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true}).setDockSide(DockState.BOTTOM);
      const view = createViewFunctionStub(InspectorView);
      const inspectorView = new InspectorView(undefined, view);
      const removeSpy = sinon.spy(inspectorView, 'removeDebuggedTabReloadRequiredWarning');
      const target = createTarget();

      try {
        const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
        assert.exists(resourceTreeModel);

        inspectorView.displayDebuggedTabReloadRequiredWarning('Reload page msg');
        let input = await view.nextInput;
        assert.lengthOf(input.infobars, 1);

        input.infobars[0].onClose();
        input = await view.nextInput;
        assert.isEmpty(input.infobars);

        resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
          frame: sinon.createStubInstance(SDK.ResourceTreeModel.ResourceTreeFrame),
          type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
        });
        sinon.assert.notCalled(removeSpy);
      } finally {
        inspectorView.removeDebuggedTabReloadRequiredWarning();
        target.dispose('test');
      }
    });

    it('calls doResize when infobars are added and removed while showing', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const doResizeStub = sinon.stub(inspectorView, 'doResize');

      const addResize = expectCall(doResizeStub);
      inspectorView.displayDebuggedTabReloadRequiredWarning('Reload page msg');
      await addResize;
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      sinon.assert.calledOnce(doResizeStub);

      doResizeStub.resetHistory();
      const removeResize = expectCall(doResizeStub);
      inspectorView.removeDebuggedTabReloadRequiredWarning();
      await removeResize;
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      sinon.assert.calledOnce(doResizeStub);
    });

    it('renders and unmounts StatusBarWidget based on renderStatusBar and triggers doResize', async () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const doResizeStub = sinon.stub(inspectorView, 'doResize');

      inspectorView.renderStatusBar(false);
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      assert.isNull(inspectorView.contentElement.querySelector('devtools-widget.flex-none'));
      sinon.assert.notCalled(doResizeStub);

      const showResize = expectCall(doResizeStub);
      inspectorView.renderStatusBar(true);
      await showResize;
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      const statusBarHost = inspectorView.contentElement.querySelector('devtools-widget.flex-none');
      assert.exists(statusBarHost);
      const statusBarWidget = LegacyUI.Widget.Widget.get(statusBarHost);
      assert.instanceOf(statusBarWidget, LegacyUI.StatusBar.StatusBarWidget);
      assert.isTrue(statusBarWidget.isShowing());

      doResizeStub.resetHistory();
      const hideResize = expectCall(doResizeStub);
      inspectorView.renderStatusBar(false);
      await hideResize;
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      await new Promise(resolve => setTimeout(resolve, 0));
      assert.isNull(inspectorView.contentElement.querySelector('devtools-widget.flex-none'));
      assert.isFalse(statusBarWidget.isShowing());
    });

    it('renders pending infobar updates when re-shown after detach', async () => {
      const container = renderElementIntoDOM(new LegacyUI.Widget.VBox());
      LegacyUI.DockController.DockController.instance({forceNew: true, canDock: true}).setDockSide(DockState.BOTTOM);
      const inspectorView = InspectorView.instance({forceNew: true});
      inspectorView.show(container.contentElement);
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      inspectorView.displayReloadRequiredWarning('DevTools reload required');
      inspectorView.detach();
      await LegacyUI.Widget.Widget.allUpdatesComplete;
      assert.isNull(inspectorView.contentElement.querySelector('.flex-none'));

      inspectorView.show(container.contentElement);
      await LegacyUI.Widget.Widget.allUpdatesComplete;

      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 1);
      const infobar = infoBarDiv.children[0];
      assert.instanceOf(infobar, HTMLElement);
      const label = getElementWithinComponent(infobar, '.infobar-info-text', HTMLElement);
      assert.strictEqual(label.textContent, 'DevTools reload required');
    });
  });
});
