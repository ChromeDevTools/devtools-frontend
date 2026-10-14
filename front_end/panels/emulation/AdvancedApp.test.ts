// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, beforeEach, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import type * as Platform from '../../core/platform/platform.js';
import {renderElementIntoDOM} from '../../testing/DOMHelpers.js';
import {
  deinitializeGlobalVars,
  describeWithEnvironment,
  initializeGlobalVars,
} from '../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {setupSettingsHooks} from '../../testing/SettingsHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as ThemeSupport from '../../ui/legacy/theme_support/theme_support.js';

import * as Emulation from './emulation.js';

describeWithEnvironment('AdvancedApp', () => {
  beforeEach(async () => {
    await deinitializeGlobalVars();
    Common.Settings.registerSettingsForTest([
      {
        category: Common.Settings.SettingCategory.GLOBAL,
        settingName: 'currentDockState',
        settingType: Common.Settings.SettingType.ENUM,
        defaultValue: 'right',
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
      },
      {
        category: Common.Settings.SettingCategory.APPEARANCE,
        storageType: Common.Settings.SettingStorageType.SYNCED,
        settingName: 'chrome-theme-colors',
        settingType: Common.Settings.SettingType.BOOLEAN,
        defaultValue: true,
        reloadRequired: true,
      },
    ]);
    await initializeGlobalVars({reset: false});
  });

  afterEach(async () => {
    Emulation.AdvancedApp.AdvancedApp.removeInstance();
    await deinitializeGlobalVars();
  });

  it('updates colors node link on ColorThemeChanged', async () => {
    const advancedApp = Emulation.AdvancedApp.AdvancedApp.instance(new TestUniverse());
    assert.exists(advancedApp);

    const fetchColorsSpy = sinon.spy(ThemeSupport.ThemeSupport.instance(), 'fetchColorsAndApplyHostTheme');

    Host.InspectorFrontendHost.InspectorFrontendHostInstance.events.dispatchEventToListeners(
        Host.InspectorFrontendHostAPI.Events.ColorThemeChanged);

    sinon.assert.called(fetchColorsSpy);
  });
});

describeWithEnvironment('AdvancedApp docking', () => {
  setupLocaleHooks();
  setupSettingsHooks();
  setupRuntimeHooks();

  const {DockState} = UI.DockController;

  // Holds the callbacks passed to `setIsDocked` until the test lets the embedder respond.
  let pendingSetIsDockedResponses: Array<() => void>;
  // Stands in for the toolbox window that the AdvancedApp opens when DevTools is undocked.
  let toolboxFrame: HTMLIFrameElement;

  function respondToSetIsDocked(): void {
    for (const respond of pendingSetIsDockedResponses.splice(0)) {
      respond();
    }
  }

  /**
   * The toolbox entrypoint (device_mode_emulation_frame.ts) loads the DOM extensions into the toolbox realm.
   * Do the same for the iframe by copying them over from this realm.
   */
  function installDOMExtensions(frameWindow: Window): void {
    const frameRealm = frameWindow as Window & typeof globalThis;
    const prototypes = [
      [Node.prototype, frameRealm.Node.prototype],
      [Element.prototype, frameRealm.Element.prototype],
      [DocumentFragment.prototype, frameRealm.DocumentFragment.prototype],
      [Event.prototype, frameRealm.Event.prototype],
    ];
    for (const [prototype, framePrototype] of prototypes) {
      for (const name of Object.getOwnPropertyNames(prototype)) {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
        if (!(name in framePrototype) && descriptor) {
          Object.defineProperty(framePrototype, name, descriptor);
        }
      }
    }
  }

  beforeEach(() => {
    UI.ActionRegistration.registerActionExtension({
      actionId: 'emulation.toggle-device-mode',
      category: UI.ActionRegistration.ActionCategory.NONE,
    });
    UI.ZoomManager.ZoomManager.instance({
      forceNew: true,
      win: window,
      frontendHost: Host.InspectorFrontendHost.InspectorFrontendHostInstance,
    });
    pendingSetIsDockedResponses = [];
    sinon.stub(Host.InspectorFrontendHost.InspectorFrontendHostInstance, 'setIsDocked')
        .callsFake((_isDocked, callback) => pendingSetIsDockedResponses.push(callback));
    toolboxFrame = document.createElement('iframe');
    renderElementIntoDOM(toolboxFrame);
    assert.exists(toolboxFrame.contentWindow);
    installDOMExtensions(toolboxFrame.contentWindow);
    sinon.stub(window, 'open').returns(toolboxFrame.contentWindow);
  });

  afterEach(() => {
    for (const rootView of document.body.querySelectorAll(':scope > .root-view')) {
      UI.Widget.Widget.get(rootView)?.detach();
    }
    UI.InspectorView.InspectorView.removeInstance();
    Emulation.AdvancedApp.AdvancedApp.removeInstance();
    Emulation.InspectedPagePlaceholder.InspectedPagePlaceholder.instance({forceNew: true});
    UI.ActionRegistration.maybeRemoveActionExtension('emulation.toggle-device-mode');
  });

  /**
   * Presents the AdvancedApp docked to the right, after it was undocked once so that the toolbox is loaded.
   */
  function presentAppWithLoadedToolbox(): {
    dockController: UI.DockController.DockController,
    rootSplitWidget: UI.SplitWidget.SplitWidget,
  } {
    const dockController = UI.DockController.DockController.instance({forceNew: true, canDock: true});
    const app = Emulation.AdvancedApp.AdvancedApp.instance(new TestUniverse());
    dockController.initialize();
    app.presentUI(document);
    respondToSetIsDocked();

    dockController.setDockSide(DockState.UNDOCKED);
    const toolboxDocument = toolboxFrame.contentDocument;
    assert.exists(toolboxDocument);
    app.deviceModeEmulationFrameLoaded(toolboxDocument);
    respondToSetIsDocked();
    dockController.setDockSide(DockState.RIGHT);
    respondToSetIsDocked();

    const rootSplitWidget = UI.InspectorView.InspectorView.instance().parentWidget();
    assert.instanceOf(rootSplitWidget, UI.SplitWidget.SplitWidget);
    assert.strictEqual(rootSplitWidget.showMode(), UI.SplitWidget.ShowMode.BOTH);
    return {dockController, rootSplitWidget};
  }

  it('shows the inspector view after undocking and docking again in quick succession', () => {
    const {dockController, rootSplitWidget} = presentAppWithLoadedToolbox();

    dockController.setDockSide(DockState.UNDOCKED);
    dockController.setDockSide(DockState.BOTTOM);
    respondToSetIsDocked();

    assert.strictEqual(rootSplitWidget.showMode(), UI.SplitWidget.ShowMode.BOTH);
    assert.isTrue(UI.InspectorView.InspectorView.instance().isShowing());
  });

  it('only shows the inspector view after docking and undocking again in quick succession', () => {
    const {dockController, rootSplitWidget} = presentAppWithLoadedToolbox();
    dockController.setDockSide(DockState.UNDOCKED);
    respondToSetIsDocked();

    dockController.setDockSide(DockState.RIGHT);
    dockController.setDockSide(DockState.UNDOCKED);
    respondToSetIsDocked();

    // The device mode view lives in the toolbox window, so the inspector view must take up the whole DevTools window.
    assert.strictEqual(rootSplitWidget.showMode(), UI.SplitWidget.ShowMode.ONLY_SIDEBAR);
    assert.isTrue(UI.InspectorView.InspectorView.instance().isShowing());
  });
});
