// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {
  deinitializeGlobalVars,
  initializeGlobalVars,
} from '../../../../testing/EnvironmentHelpers.js';
import * as UI from '../../legacy.js';

import * as QuickOpen from './quick_open.js';

describe('CommandMenu', () => {
  const settingName = 'mock-setting';
  const settingTitle = 'Mock setting';
  const enableTitle = 'Enable mock setting';
  const disableTitle = 'Disable mock setting';
  const settingCategory = Common.Settings.SettingCategory.CONSOLE;

  before(async () => {
    Common.Settings.registerSettingsForTest(
        [{
          category: settingCategory,
          title: i18n.i18n.lockedLazyString(settingTitle),
          settingType: Common.Settings.SettingType.BOOLEAN,
          settingName,
          defaultValue: false,
          options: [
            {
              value: true,
              title: i18n.i18n.lockedLazyString(enableTitle),
            },
            {
              value: false,
              title: i18n.i18n.lockedLazyString(disableTitle),
            },
          ],
        }],
        true);
    await initializeGlobalVars({reset: false});
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  it('adds commands for changing a setting\'s value', async () => {
    const settingCategory = Common.Settings.SettingCategory.CONSOLE;
    Common.Settings.registerSettingsForTest(
        [{
          category: settingCategory,
          title: i18n.i18n.lockedLazyString(settingTitle),
          settingType: Common.Settings.SettingType.BOOLEAN,
          settingName,
          defaultValue: false,
          options: [
            {
              value: true,
              title: i18n.i18n.lockedLazyString(enableTitle),
            },
            {
              value: false,
              title: i18n.i18n.lockedLazyString(disableTitle),
            },
          ],
        }],
        true);

    const allCommands = QuickOpen.CommandMenu.CommandMenu.instance({forceNew: true}).commands();
    const disableSettingCommands = allCommands.filter(
        command => command.title === disableTitle &&
            command.category === Common.Settings.getLocalizedSettingsCategory(settingCategory));
    const enableSettingCommands = allCommands.filter(
        command => command.title === enableTitle &&
            command.category === Common.Settings.getLocalizedSettingsCategory(settingCategory));
    assert.lengthOf(disableSettingCommands, 1, 'Commands for changing a setting\'s value were not added correctly');
    assert.lengthOf(enableSettingCommands, 1, 'Commands for changing a setting\'s value were not added correctly');
  });
});

describe('CommandMenu Views', () => {
  const viewId = 'mock-view';
  const viewTitle = 'Mock view';
  const commandPrompt = 'Show mock view';
  const category = UI.ViewManager.ViewLocationCategory.PANEL;

  before(async () => {
    UI.ViewManager.registerLocationResolver({
      name: UI.ViewManager.ViewLocationValues.PANEL,
      category,
      async loadResolver() {
        return {
          resolveLocation() {
            return null;
          },
        };
      },
    });

    UI.ViewManager.registerViewExtension({
      location: UI.ViewManager.ViewLocationValues.PANEL,
      id: viewId,
      title: () => viewTitle as Platform.UIString.LocalizedString,
      commandPrompt: () => commandPrompt as Platform.UIString.LocalizedString,
      async loadView() {
        return new UI.Widget.Widget();
      },
    });

    await initializeGlobalVars({reset: false});
  });

  after(async () => {
    await deinitializeGlobalVars();
  });

  it('adds commands for showing a view', async () => {
    const allCommands = QuickOpen.CommandMenu.CommandMenu.instance({forceNew: true}).commands();
    const viewCommands = allCommands.filter(
        command => command.title === commandPrompt &&
            command.category === UI.ViewManager.getLocalizedViewLocationCategory(category));
    assert.lengthOf(viewCommands, 1, 'Commands for showing a view were not added correctly');
  });

  it('executes a command for showing a view', async () => {
    const allCommands = QuickOpen.CommandMenu.CommandMenu.instance({forceNew: true}).commands();
    const viewCommand = allCommands.find(
        command => command.title === commandPrompt &&
            command.category === UI.ViewManager.getLocalizedViewLocationCategory(category));
    assert.exists(viewCommand);

    const showViewStub = sinon.stub(UI.ViewManager.ViewManager.instance(), 'showView').resolves();

    viewCommand.execute();

    sinon.assert.calledOnceWithExactly(showViewStub, viewId, true);
    showViewStub.restore();
  });
});
