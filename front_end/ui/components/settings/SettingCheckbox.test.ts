// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../core/common/common.js';
import type * as Platform from '../../../core/platform/platform.js';
import * as Root from '../../../core/root/root.js';
import {
  renderElementIntoDOM,
} from '../../../testing/DOMHelpers.js';
import {createFakeSetting, stubNoopSettings} from '../../../testing/EnvironmentHelpers.js';

import * as Settings from './settings.js';

function renderSettingCheckbox(data: Settings.SettingCheckbox.SettingCheckboxData):
    {component: Settings.SettingCheckbox.SettingCheckbox, checkbox: HTMLInputElement} {
  const component = new Settings.SettingCheckbox.SettingCheckbox();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);

  const checkbox = component.shadowRoot.querySelector('input');
  assert.instanceOf(checkbox, HTMLInputElement);

  return {component, checkbox};
}

describe('SettingCheckbox', () => {
  beforeEach(() => {
    Root.Runtime.experiments.clearForTest();
  });
  afterEach(() => {
    Root.Runtime.experiments.clearForTest();
  });

  it('renders the checkbox ticked when the setting is enabled', () => {
    const setting = createFakeSetting<boolean>('setting', true);
    const {checkbox} = renderSettingCheckbox({setting});

    assert.isTrue(checkbox.checked);
  });

  it('renders the checkbox unticked when the setting is disabled', () => {
    const setting = createFakeSetting<boolean>('setting', false);
    const {checkbox} = renderSettingCheckbox({setting});

    assert.isFalse(checkbox.checked);
  });

  it('updates the checkbox when the setting changes', () => {
    const setting = createFakeSetting<boolean>('setting', true);
    const {checkbox} = renderSettingCheckbox({setting});

    setting.set(false);

    assert.isFalse(checkbox.checked);
  });

  it('can be reassigned to a different settings', () => {
    const setting1 = createFakeSetting<boolean>('setting1', true);
    const setting2 = createFakeSetting<boolean>('setting2', true);
    const {component, checkbox} = renderSettingCheckbox({setting: setting1});

    component.data = {setting: setting2};
    setting1.set(false);

    assert.isTrue(checkbox.checked);
  });

  it('changes the setting when the checkbox changes', () => {
    const setting = createFakeSetting<boolean>('setting', false);
    const {checkbox} = renderSettingCheckbox({setting});

    checkbox.click();

    assert.isTrue(setting.get());
  });

  it('renders override text if provided', () => {
    const setting = createFakeSetting<boolean>('setting', false);
    const {component} = renderSettingCheckbox({setting, textOverride: 'Text override'});

    assert.strictEqual(component.shadowRoot!.querySelector('label')!.innerText, 'Text override');
  });

  it('ignores clicks when disabled', () => {
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setDisabled(true);
    const {checkbox} = renderSettingCheckbox({setting});

    checkbox.click();

    assert.isFalse(setting.get());
  });

  it('can be disabled via registration', () => {
    stubNoopSettings();
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setRegistration({
      settingName: 'setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      disabledCondition: () => {
        return {disabled: true, reason: 'reason'};
      },
    });

    const {checkbox} = renderSettingCheckbox({setting});

    checkbox.click();

    assert.isFalse(setting.get());
    assert.isTrue(checkbox.disabled);
  });

  it('shows disabled reason', () => {
    stubNoopSettings();
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setRegistration({
      settingName: 'setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      disabledCondition: () => {
        return {disabled: true, reason: 'reason'};
      },
    });

    const {component} = renderSettingCheckbox({setting});

    assert.strictEqual(
        (component.shadowRoot!.querySelector('.disabled-reason') as HTMLElement).getAttribute('title'), 'reason');
  });

  it('is disabled for a disabled deprecated settings', () => {
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setRegistration({
      settingName: 'setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      deprecationNotice: {
        warning: () => 'Setting deprecated' as Platform.UIString.LocalizedString,
        disabled: true,
      },
    });

    const {checkbox} = renderSettingCheckbox({setting});
    assert.isTrue(checkbox.disabled);
  });

  it('is enabled for a disabled deprecated settings with enabled experiment', () => {
    const experiment = 'test-experiment';
    Root.Runtime.experiments.register(experiment, experiment);
    Root.Runtime.experiments.setEnabled(experiment, true);
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setRegistration({
      settingName: 'setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      deprecationNotice: {
        warning: () => 'Setting deprecated' as Platform.UIString.LocalizedString,
        disabled: true,
        experiment,
      },
    });

    const {checkbox} = renderSettingCheckbox({setting});
    assert.isTrue(checkbox.disabled);
  });

  it('is enabled for a disabled deprecated settings with disabled experiment', () => {
    const experiment = 'test-experiment';
    Root.Runtime.experiments.register(experiment, experiment);
    Root.Runtime.experiments.setEnabled(experiment, false);
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setRegistration({
      settingName: 'setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      deprecationNotice: {
        warning: () => 'Setting deprecated' as Platform.UIString.LocalizedString,
        disabled: true,
        experiment,
      },
    });

    const {checkbox} = renderSettingCheckbox({setting});
    assert.isFalse(checkbox.disabled);
  });

  it('is disabled for an enabled deprecated settings', () => {
    const setting = createFakeSetting<boolean>('setting', false);
    setting.setRegistration({
      settingName: 'setting',
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
      deprecationNotice: {
        warning: () => 'Setting deprecated' as Platform.UIString.LocalizedString,
        disabled: false,
      },
    });

    const {checkbox} = renderSettingCheckbox({setting});
    assert.isFalse(checkbox.disabled);
  });
});
