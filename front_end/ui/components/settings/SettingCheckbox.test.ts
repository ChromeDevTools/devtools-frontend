// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

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

  it('can be reassigned to a different setting', () => {
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

  it('disables checkbox when disabled property is true', () => {
    stubNoopSettings();
    const setting = createFakeSetting<boolean>('setting', false);

    const {checkbox} = renderSettingCheckbox({setting, disabled: true});

    assert.isTrue(checkbox.disabled);
  });
});
