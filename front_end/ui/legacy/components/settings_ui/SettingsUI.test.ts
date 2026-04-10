// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import {renderElementIntoDOM} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createSettingsForTest} from '../../../../testing/SettingsHelpers.js';
import * as Lit from '../../../lit/lit.js';
import * as UI from '../../legacy.js';

import * as SettingsUI from './settings_ui.js';

describeWithEnvironment('SettingsUI', () => {
  function setup(
      options: Common.Settings.SettingExtensionOption[] =
          [
            {value: 'a', text: 'A', title: () => i18n.i18n.lockedString('A'), raw: true},
            {value: 'b', text: 'B', title: () => i18n.i18n.lockedString('B'), raw: true},
          ],
      registrationOverrides: Partial<Common.Settings.SettingRegistration> = {}) {
    const registration: Common.Settings.SettingRegistration = {
      settingName: 'test-setting',
      settingType: Common.Settings.SettingType.ENUM,
      defaultValue: 'a',
      options,
      title: () => i18n.i18n.lockedString('Test Setting'),
      ...registrationOverrides,
    };
    const settings = createSettingsForTest([registration]);
    return settings.moduleSetting('test-setting');
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

  it('renders a deprecation warning if provided', () => {
    const deprecationNotice = {
      disabled: true,
      warning: () => i18n.i18n.lockedString('Test Deprecation Warning'),
    };
    const setting = setup(undefined, {deprecationNotice});

    const template = SettingsUI.SettingsUI.renderSettingSelect(setting);
    const container = document.createElement('div');
    Lit.render(template, container);
    renderElementIntoDOM(container);

    const warning = container.querySelector('devtools-setting-deprecation-warning');
    assert.isNotNull(warning);
    assert.isNotNull(warning.shadowRoot);
    const icon = warning.shadowRoot.querySelector('devtools-icon');
    assert.isNotNull(icon);
    assert.strictEqual(icon.getAttribute('title'), 'Test Deprecation Warning');
  });

  describe('renderControlForSetting', () => {
    it('renders a checkbox for a boolean setting', () => {
      const setting = createSettingsForTest([{
                        settingName: 'test-boolean-setting',
                        settingType: Common.Settings.SettingType.BOOLEAN,
                        defaultValue: false,
                      }]).moduleSetting('test-boolean-setting');

      const template = SettingsUI.SettingsUI.renderControlForSetting(setting);
      assert.notStrictEqual(template, Lit.nothing);

      const container = document.createElement('div');
      Lit.render(template, container);
      renderElementIntoDOM(container);

      const checkbox = container.querySelector('setting-checkbox');
      assert.isNotNull(checkbox);
    });

    it('renders a select for an enum setting', () => {
      const setting = createSettingsForTest([{
                        settingName: 'test-enum-setting',
                        settingType: Common.Settings.SettingType.ENUM,
                        defaultValue: 'a',
                        options: [
                          {value: 'a', text: 'A', title: () => i18n.i18n.lockedString('A'), raw: true},
                        ],
                      }]).moduleSetting('test-enum-setting');

      const template = SettingsUI.SettingsUI.renderControlForSetting(setting);
      assert.notStrictEqual(template, Lit.nothing);

      const container = document.createElement('div');
      Lit.render(template, container);
      renderElementIntoDOM(container);

      const select = container.querySelector('select');
      assert.isNotNull(select);
    });

    it('returns nothing for an unsupported setting type', () => {
      const setting = createSettingsForTest([{
                        settingName: 'test-array-setting',
                        settingType: Common.Settings.SettingType.ARRAY,
                        defaultValue: [],
                      }]).moduleSetting('test-array-setting');

      const template = SettingsUI.SettingsUI.renderControlForSetting(setting);
      assert.strictEqual(template, Lit.nothing);
    });
  });
});
