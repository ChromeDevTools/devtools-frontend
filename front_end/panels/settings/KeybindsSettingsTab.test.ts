// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import {getAxeViolations} from '../../testing/AxeHelpers.js';
import {renderElementIntoDOM, setTestUniverseForWidgets} from '../../testing/DOMHelpers.js';
import {setupLocaleHooks} from '../../testing/LocaleHelpers.js';
import {setupRuntimeHooks} from '../../testing/RuntimeHelpers.js';
import {TestUniverse} from '../../testing/TestUniverse.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import * as Settings from './settings.js';

describe('KeybindsSettingsTab', () => {
  setupLocaleHooks();
  setupRuntimeHooks();

  function setup(): void {
    const universe = new TestUniverse();
    setTestUniverseForWidgets(universe);
    sinon.stub(Common.Settings.Settings, 'instance').returns(universe.settings);

    const zoomManager = sinon.createStubInstance(UI.ZoomManager.ZoomManager);
    zoomManager.zoomFactor.returns(1);
    zoomManager.cssToDIP.callsFake(value => value);
    zoomManager.dipToCSS.callsFake(value => value);
    sinon.stub(UI.ZoomManager.ZoomManager, 'instance').returns(zoomManager);
    sinon.stub(UI.DockController.DockController, 'instance').returns(new UI.DockController.DockController(false));
    sinon.stub(UI.UIUserMetrics.UIUserMetrics, 'instance').returns(new UI.UIUserMetrics.UIUserMetrics());

    universe.settings.resolve(SettingsUI.MainSettings.activeKeybindSetSettingDescriptor)
        .set(UI.ShortcutRegistry.DefaultShortcutSetting);

    SettingsUI.SettingUIRegistration.register(SettingsUI.MainSettings.activeKeybindSetSettingDescriptor, {
      options: [
        {
          value: 'devToolsDefault',
          title: () => i18n.i18n.lockedString('DevTools (Default)'),
          text: () => i18n.i18n.lockedString('DevTools (Default)'),
        },
        {
          value: 'vsCode',
          title: () => i18n.i18n.lockedString('Visual Studio Code'),
          text: () => i18n.i18n.lockedString('Visual Studio Code'),
        },
      ],
    });

    const actionRegistrations: UI.ActionRegistration.ActionRegistration[] = [
      {
        category: UI.ActionRegistration.ActionCategory.SETTINGS,
        actionId: 'settings.show',
        title: () => i18n.i18n.lockedString('Settings'),
        async loadActionDelegate() {
          return new Settings.SettingsScreen.ActionDelegate();
        },
        bindings: [
          {
            shortcut: 'F1',
            keybindSets: [UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT],
          },
          {
            shortcut: 'Shift+?',
          },
          {
            platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
            shortcut: 'Ctrl+,',
            keybindSets: [UI.ActionRegistration.KeybindSet.VS_CODE],
          },
          {
            platform: UI.ActionRegistration.Platforms.MAC,
            shortcut: 'Meta+,',
            keybindSets: [UI.ActionRegistration.KeybindSet.VS_CODE],
          },
        ],
      },
      {
        category: UI.ActionRegistration.ActionCategory.ELEMENTS,
        actionId: 'elements.toggle-element-search',
        title: () => i18n.i18n.lockedString('Select an element in the page to inspect it'),
        bindings: [
          {
            platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
            shortcut: 'Ctrl+Shift+C',
            keybindSets: [UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT],
          },
          {
            platform: UI.ActionRegistration.Platforms.MAC,
            shortcut: 'Meta+Shift+C',
            keybindSets: [UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT],
          },
        ],
      },
      {
        category: UI.ActionRegistration.ActionCategory.SOURCES,
        actionId: 'sources.search',
        title: () => i18n.i18n.lockedString('Search all files'),
        bindings: [
          {
            platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
            shortcut: 'Ctrl+Shift+F',
          },
          {
            platform: UI.ActionRegistration.Platforms.MAC,
            shortcut: 'Meta+Alt+F',
          },
        ],
      },
      {
        category: UI.ActionRegistration.ActionCategory.SETTINGS,
        actionId: 'settings.documentation',
        title: () => i18n.i18n.lockedString('Documentation'),
        async loadActionDelegate() {
          return new Settings.SettingsScreen.ActionDelegate();
        },
      },
      {
        category: UI.ActionRegistration.ActionCategory.SETTINGS,
        actionId: 'settings.shortcuts',
        title: () => i18n.i18n.lockedString('Show Shortcuts'),
        async loadActionDelegate() {
          return new Settings.SettingsScreen.ActionDelegate();
        },
        bindings: [
          {
            platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
            shortcut: 'Ctrl+K Ctrl+S',
            keybindSets: [UI.ActionRegistration.KeybindSet.VS_CODE],
          },
          {
            platform: UI.ActionRegistration.Platforms.MAC,
            shortcut: 'Meta+K Meta+S',
            keybindSets: [UI.ActionRegistration.KeybindSet.VS_CODE],
          },
        ],
      },
    ];
    for (const action of actionRegistrations) {
      UI.ActionRegistration.registerActionExtension(action);
    }
    const actionRegistry = UI.ActionRegistry.ActionRegistry.instance({forceNew: true});
    UI.ShortcutRegistry.ShortcutRegistry.instance({forceNew: true, actionRegistry});

    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.PANEL,
      category: UI.ViewManager.ViewLocationCategory.PANEL,
      async loadResolver() {
        return UI.InspectorView.InspectorView.instance();
      },
    });
    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
      category: UI.ViewManager.ViewLocationCategory.SETTINGS,
      async loadResolver() {
        return Settings.SettingsScreen.SettingsScreen.instance();
      },
    });

    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.PANEL,
      id: 'sources',
      title: () => i18n.i18n.lockedString('Sources'),
      commandPrompt: () => i18n.i18n.lockedString('Show Sources'),
      async loadView() {
        return new UI.Widget.VBox();
      },
    });
    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
      id: 'preferences',
      title: () => i18n.i18n.lockedString('Preferences'),
      commandPrompt: () => i18n.i18n.lockedString('Show Preferences'),
      order: 0,
      async loadView() {
        return new UI.Widget.VBox();
      },
      iconName: 'gear',
    });
    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
      id: 'keybinds',
      title: () => i18n.i18n.lockedString('Shortcuts'),
      commandPrompt: () => i18n.i18n.lockedString('Show Shortcuts'),
      order: 100,
      async loadView() {
        return new Settings.KeybindsSettingsTab.KeybindsSettingsTab();
      },
      iconName: 'keyboard',
    });

    UI.ViewManager.ViewManager.instance({forceNew: true, universe});
    renderElementIntoDOM(
        UI.InspectorView.InspectorView.instance(),
        {width: 800, height: 600, includeCommonStyles: true},
    );
  }

  afterEach(() => {
    while (UI.Dialog.Dialog.hasInstance()) {
      UI.Dialog.Dialog.getInstance()?.hide();
    }
    Settings.SettingsScreen.SettingsScreen.removeInstanceForTesting();
    UI.InspectorView.InspectorView.removeInstance();
    UI.ViewManager.ViewManager.removeInstance();
    UI.ViewManager.resetViewRegistration();
    UI.ShortcutRegistry.ShortcutRegistry.removeInstance();
    UI.ActionRegistry.ActionRegistry.reset();
    SettingsUI.SettingUIRegistration.resetSettings();
  });

  it('has no axe-core violations when opened via the settings.shortcuts action', async () => {
    setup();

    await UI.ViewManager.ViewManager.instance().showView('sources');
    await UI.ActionRegistry.ActionRegistry.instance().getAction('settings.shortcuts').execute();

    const keybindsView = UI.ViewManager.ViewManager.instance().view('keybinds');
    assert.exists(keybindsView);
    const keybindsWidget = await keybindsView.widget();
    await UI.Widget.Widget.allUpdatesComplete;

    assert.instanceOf(keybindsWidget, Settings.KeybindsSettingsTab.KeybindsSettingsTab);
    assert.isTrue(keybindsWidget.isShowing());

    const settingsScreen = Settings.SettingsScreen.SettingsScreen.instance();
    const tabbedPaneElement = settingsScreen.contentElement.querySelector('devtools-tabbed-pane');
    assert.exists(tabbedPaneElement);
    const settingsTabbedPane = UI.Widget.Widget.get(tabbedPaneElement);
    assert.exists(settingsTabbedPane);

    const settingsPaneElement = settingsTabbedPane.contentElement;
    const paneRect = settingsPaneElement.getBoundingClientRect();
    assert.isAbove(paneRect.width, 0);
    assert.isAbove(paneRect.height, 0);

    const keybindsRoot = keybindsWidget.contentElement;
    const card = keybindsRoot.querySelector('devtools-card');
    assert.exists(card);
    assert.strictEqual(card.getAttribute('heading'), 'Shortcuts');

    const presetSelect = keybindsRoot.querySelector<HTMLSelectElement>('.keybinds-set-select select');
    assert.exists(presetSelect);
    assert.deepEqual(
        Array.from(presetSelect.options, option => option.text),
        ['DevTools (Default)', 'Visual Studio Code'],
    );
    assert.strictEqual(presetSelect.value, 'devToolsDefault');

    const shortcutList = keybindsRoot.querySelector('.shortcut-list');
    assert.exists(shortcutList);
    assert.strictEqual(shortcutList.getAttribute('role'), 'list');
    assert.strictEqual(shortcutList.getAttribute('aria-label'), 'Keyboard shortcuts list');

    const categoryHeaders = Array.from(
        keybindsRoot.querySelectorAll('.keybinds-category-header'),
        element => element.textContent?.trim(),
    );
    assert.deepEqual(categoryHeaders, ['Elements', 'Settings', 'Sources']);

    const actionTitles = Array.from(
        keybindsRoot.querySelectorAll('.keybinds-action-name'),
        element => element.textContent?.trim(),
    );
    assert.deepEqual(actionTitles, [
      'Select an element in the page to inspect it',
      'Documentation',
      'Show Shortcuts',
      'Settings',
      'Search all files',
    ]);

    const keyBadges = Array.from(
        keybindsRoot.querySelectorAll('.keybinds-key'),
        element => element.textContent?.trim(),
    );
    const expectedShift = Host.Platform.isMac() ? '\u21e7' : 'Shift';
    assert.includeMembers(keyBadges, ['F1', expectedShift, '?']);

    const emptyShortcuts = keybindsRoot.querySelectorAll('.keybinds-shortcut[aria-label="No shortcut for action"]');
    assert.lengthOf(emptyShortcuts, 2);

    const violations = await getAxeViolations(settingsPaneElement);
    assert.isEmpty(violations);
  });
});
