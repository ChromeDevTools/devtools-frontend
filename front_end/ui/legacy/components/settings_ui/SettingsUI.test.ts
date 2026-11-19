// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';
import {afterEach, describe, it} from 'mocha';
import sinon from 'sinon';

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Lit from '../../../lit/lit.js';
import * as SettingUIRegistration from '../../../settings/settings.js';
import * as UI from '../../legacy.js';

import * as SettingsUI from './settings_ui.js';

describeWithEnvironment('SettingsUI', () => {
  afterEach(() => {
    SettingUIRegistration.SettingUIRegistration.resetSettings();
  });

  function setup(options: Common.Settings.SettingExtensionOption[] =
                     [
                       {value: 'a', text: 'A', title: () => i18n.i18n.lockedString('A'), raw: true},
                       {value: 'b', text: 'B', title: () => i18n.i18n.lockedString('B'), raw: true},
                     ],
                 uiOverrides: Partial<SettingUIRegistration.SettingUIRegistration.SettingUIDescriptor> = {}) {
    const descriptor: Common.Settings.SettingDescriptor<string> = {
      name: 'test-setting',
      type: Common.Settings.SettingType.ENUM,
      defaultValue: 'a',
    };
    SettingUIRegistration.SettingUIRegistration.register(descriptor, {
      options,
      title: () => i18n.i18n.lockedString('Test Setting'),
      ...uiOverrides,
    });
    return Common.Settings.Settings.instance().resolve(descriptor);
  }

  it('renders a setting select', () => {
    const setting = setup();

    const template = SettingsUI.SettingsUI.renderSettingSelect(setting);
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);

    const select = container.querySelector('select');
    assert.isNotNull(select);
    assert.strictEqual(select.value, 'a');
    assert.lengthOf(select.options, 2);
    assert.strictEqual(select.options[0].text, 'A');
    assert.strictEqual(select.options[1].text, 'B');

    const label = container.querySelector('label');
    assert.isNotNull(label);
    assert.include(label.textContent || '', 'Test Setting');
  });

  it('disables the select element when disabled is true', () => {
    const setting = setup();

    const template = SettingsUI.SettingsUI.renderSettingSelect(setting, undefined, true);
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);

    const select = container.querySelector('select');
    assert.isNotNull(select);
    assert.isTrue(select.disabled);
  });

  it('updates the setting when the select changes', () => {
    const setting = setup();

    const template = SettingsUI.SettingsUI.renderSettingSelect(setting);
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);

    const select = container.querySelector('select');
    assert.isNotNull(select);
    select.value = 'b';
    select.dispatchEvent(new Event('change'));

    assert.strictEqual(setting.get(), 'b');
  });

  it('shows a reload warning if required', () => {
    const setting = setup(undefined, {reloadRequired: true});

    const displayReloadRequiredWarningStub =
        sinon.stub(UI.InspectorView.InspectorView.instance(), 'displayReloadRequiredWarning');

    const template = SettingsUI.SettingsUI.renderSettingSelect(setting);
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);

    const reloadWarning = container.querySelector('.reload-warning');
    assert.isNotNull(reloadWarning);
    assert.isTrue(reloadWarning.classList.contains('hidden'));

    const select = container.querySelector('select');
    assert.isNotNull(select);
    select.value = 'b';
    select.dispatchEvent(new Event('change'));

    assert.isFalse(reloadWarning.classList.contains('hidden'));
    sinon.assert.calledOnce(displayReloadRequiredWarningStub);
  });

  it('renders a subtitle if provided', () => {
    const setting = setup();

    const template = SettingsUI.SettingsUI.renderSettingSelect(setting, 'Test Subtitle');
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);

    const subtitle = container.querySelector('label p');
    assert.isNotNull(subtitle);
    assert.strictEqual(subtitle.textContent, 'Test Subtitle');
    assert.isTrue(container.firstElementChild?.classList.contains('chrome-select-label'));
  });

  it('renders overridden option texts', () => {
    const setting = setup();
    const container = document.createElement('div');
    renderElementIntoDOM(container);

    Lit.render(SettingsUI.SettingsUI.renderSettingSelect(setting, undefined, false, new Map([['a', 'A (default)']])),
               container);

    const select = container.querySelector('select');
    assert.isNotNull(select);
    assert.deepEqual([...select.options].map(option => option.text), ['A (default)', 'B']);
    assert.deepEqual([...select.options].map(option => option.value), ['a', 'b']);

    select.value = 'b';
    select.dispatchEvent(new Event('change'));
    assert.strictEqual(setting.get(), 'b');

    Lit.render(SettingsUI.SettingsUI.renderSettingSelect(setting, undefined, false, new Map([['a', 'A (other)']])),
               container);

    assert.deepEqual([...select.options].map(option => option.text), ['A (other)', 'B']);
    assert.strictEqual(select.value, 'b');
  });

  describe('renderControlForSetting', () => {
    it('renders a checkbox for a boolean setting', () => {
      const setting = Common.Settings.Settings.instance().resolve({
        name: 'test-boolean-setting',
        type: Common.Settings.SettingType.BOOLEAN,
        defaultValue: false,
      });

      const template = SettingsUI.SettingsUI.renderControlForSetting(setting);
      assert.notStrictEqual(template, Lit.nothing);

      const container = document.createElement('div');
      Lit.render(template, container);
      renderElementIntoDOM(container);

      const checkbox = container.querySelector('setting-checkbox');
      assert.isNotNull(checkbox);
    });

    it('renders a select for an enum setting', () => {
      const descriptor: Common.Settings.SettingDescriptor<string> = {
        name: 'test-enum-setting',
        type: Common.Settings.SettingType.ENUM,
        defaultValue: 'a',
      };
      SettingUIRegistration.SettingUIRegistration.register(descriptor, {
        options: [
          {value: 'a', text: 'A', title: () => i18n.i18n.lockedString('A'), raw: true},
        ],
      });
      const setting = Common.Settings.Settings.instance().resolve(descriptor);

      const template = SettingsUI.SettingsUI.renderControlForSetting(setting);
      assert.notStrictEqual(template, Lit.nothing);

      const container = document.createElement('div');
      Lit.render(template, container);
      renderElementIntoDOM(container);

      const select = container.querySelector('select');
      assert.isNotNull(select);
    });

    it('returns nothing for an unsupported setting type', () => {
      const consoleErrorStub = sinon.stub(console, 'error');
      const setting = Common.Settings.Settings.instance().resolve({
        name: 'test-array-setting',
        type: Common.Settings.SettingType.ARRAY,
        defaultValue: [],
      });

      const template = SettingsUI.SettingsUI.renderControlForSetting(setting);
      assert.strictEqual(template, Lit.nothing);
      sinon.assert.calledWith(consoleErrorStub, 'Invalid setting type: array');
    });
  });
});
