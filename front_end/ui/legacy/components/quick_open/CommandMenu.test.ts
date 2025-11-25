// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import type * as Platform from '../../../../core/platform/platform.js';
import {
  createFakeSetting,
  deinitializeGlobalVars,
  initializeGlobalVars
} from '../../../../testing/EnvironmentHelpers.js';
import {setupLocaleHooks} from '../../../../testing/LocaleHelpers.js';

import * as QuickOpen from './quick_open.js';

function createCommandMenuProvider(
    deprecationNotice: Common.SettingRegistration.SettingRegistration['deprecationNotice']) {
  const setting = createFakeSetting<boolean>('test-setting', false);
  setting.setRegistration({
    settingName: 'test-setting',
    settingType: Common.SettingRegistration.SettingType.BOOLEAN,
    category: Common.SettingRegistration.SettingCategory.APPEARANCE,
    defaultValue: false,
    deprecationNotice,
  });
  const command =
      QuickOpen.CommandMenu.CommandMenu.createSettingCommand(setting, i18n.i18n.lockedString('Test Set Value'), true);
  const provider = new QuickOpen.CommandMenu.CommandMenuProvider([command]);
  return {setting, provider, command};
}

const warning = () => ('Deprecation Warning' as Platform.UIString.LocalizedString);

function setupElements() {
  const toplevel = document.createElement('div');
  const container = toplevel.createChild('div');
  const title = container.createChild('div');
  const subtitle = container.createChild('div');
  return {toplevel, container, title, subtitle};
}

describe('CommandMenu', () => {
  setupLocaleHooks();
  let elements: {title: HTMLDivElement, subtitle: HTMLDivElement, toplevel: HTMLDivElement, container: HTMLDivElement};
  beforeEach(() => {
    elements = setupElements();
  });

  afterEach(() => {
    const {toplevel, container, title, subtitle} = elements;
    subtitle.remove();
    title.remove();
    container.remove();
    toplevel.remove();
  });

  it('shows a deprecation warning for deprecated settings', () => {
    const deprecation = {disabled: true, warning};
    const {provider} = createCommandMenuProvider(deprecation);

    provider.renderItem(0, 'Test', elements.toplevel);

    const tags = Array.from(elements.toplevel.querySelectorAll('.deprecated-tag')) as HTMLElement[];
    assert.deepEqual(tags.map(e => e.textContent), ['— deprecated']);
    assert.deepEqual(tags[0].title, 'Deprecation Warning');
  });

  it('reveals the setting when calling a deprecated setting', () => {
    const deprecation = {disabled: true, warning};
    const {setting, command} = createCommandMenuProvider(deprecation);
    const reveal = sinon.stub(Common.Revealer.RevealerRegistry.prototype, 'reveal');

    command.execute();

    assert.isTrue(
        reveal.calledOnceWithExactly(setting, false),
        'Revealer was either not called or was called with unexpected arguments');
  });
});

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
