// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {after, afterEach, before, beforeEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import {assertScreenshot, raf, renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {deinitializeGlobalVars, initializeGlobalVars, updateHostConfig} from '../../testing/EnvironmentHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';

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
    it('displays both debugged tab and devtools reload warnings independently', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayDebuggedTabReloadRequiredWarning('Debugged tab reload required');
      inspectorView.displayReloadRequiredWarning('DevTools reload required');

      // The infobars are added to a flex-none div within the content element.
      // We expect two children in that div.
      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 2);

      const firstInfobar = infoBarDiv.children[0];
      const secondInfobar = infoBarDiv.children[1];

      assert.exists(firstInfobar.shadowRoot);
      assert.exists(secondInfobar.shadowRoot);

      const firstLabel = firstInfobar.shadowRoot.querySelector('.infobar-info-text');
      const secondLabel = secondInfobar.shadowRoot.querySelector('.infobar-info-text');

      assert.exists(firstLabel);
      assert.exists(secondLabel);
      assert.strictEqual(firstLabel.textContent, 'Debugged tab reload required');
      assert.strictEqual(secondLabel.textContent, 'DevTools reload required');
    });
  });

  describe('Chrome restart required warnings', () => {
    function assertShowsOnlyChromeRestartWarning(inspectorView: LegacyUI.InspectorView.InspectorView) {
      const infoBarDiv = inspectorView.contentElement.querySelector('.flex-none');
      assert.exists(infoBarDiv);
      assert.strictEqual(infoBarDiv.childElementCount, 1);

      const infobar = infoBarDiv.children[0];
      assert.exists(infobar.shadowRoot);
      const label = infobar.shadowRoot.querySelector('.infobar-info-text');
      assert.exists(label);
      assert.strictEqual(label.textContent, 'Chrome restart required');
    }

    it('displays Chrome restart warning', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayChromeRestartRequiredWarning('Chrome restart required');
      assertShowsOnlyChromeRestartWarning(inspectorView);
    });

    it('hides reload warning when Chrome restart warning is displayed', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayReloadRequiredWarning('Reload required');
      inspectorView.displayChromeRestartRequiredWarning('Chrome restart required');
      assertShowsOnlyChromeRestartWarning(inspectorView);
    });

    it('does not display reload warning when Chrome restart warning is already displayed', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      inspectorView.displayChromeRestartRequiredWarning('Chrome restart required');
      inspectorView.displayReloadRequiredWarning('Reload required');
      assertShowsOnlyChromeRestartWarning(inspectorView);
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

    it('is not shown again after the user closes it', () => {
      const {inspectorView} = createInspectorViewWithDockState(DockState.BOTTOM);
      const infobar = findLanguageMismatchInfobar(inspectorView);
      assert.exists(infobar);

      const closeButton = infobar.shadowRoot?.querySelector<HTMLElement>('dt-close-button');
      assert.exists(closeButton);
      closeButton.click();

      assert.isTrue(Common.Settings.Settings.instance().createSetting('disable-locale-info-bar', false).get());
      assert.notExists(findLanguageMismatchInfobar(InspectorView.instance({forceNew: true})));
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
});
