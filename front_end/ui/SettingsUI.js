/*
 * Copyright (C) 2014 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../common/common.js';
import * as Root from '../root/root.js';

import * as ARIAUtils from './ARIAUtils.js';
import {InspectorView} from './InspectorView.js';
import {CheckboxLabel} from './UIUtils.js';

/**
 * @param {string} name
 * @param {!Common.Settings.Setting<boolean>} setting
 * @param {boolean=} omitParagraphElement
 * @param {string=} tooltip
 * @return {!Element}
 */
export const createSettingCheckbox = function(name, setting, omitParagraphElement, tooltip) {
  const label = CheckboxLabel.create(name);
  if (tooltip) {
    label.title = tooltip;
  }

  const input = label.checkboxElement;
  input.name = name;
  bindCheckbox(input, setting);

  if (omitParagraphElement) {
    return label;
  }

  const p = document.createElement('p');
  p.appendChild(label);
  return p;
};

/**
 * @param {string} name
 * @param {!Array<!{text: string, value: *, raw: (boolean|undefined)}>} options
 * @param {boolean|undefined} requiresReload
 * @param {!Common.Settings.Setting<*>} setting
 * @param {string=} subtitle
 * @return {!Element}
 */
const createSettingSelect = function(name, options, requiresReload, setting, subtitle) {
  const settingSelectElement = document.createElement('p');
  const label = settingSelectElement.createChild('label');
  /** @type {!HTMLSelectElement} */
  const select = /** @type {!HTMLSelectElement} */ (settingSelectElement.createChild('select', 'chrome-select'));
  label.textContent = name;
  if (subtitle) {
    settingSelectElement.classList.add('chrome-select-label');
    label.createChild('p').textContent = subtitle;
  }
  ARIAUtils.bindLabelToControl(label, select);

  for (const option of options) {
    // The "raw" flag indicates text is non-i18n-izable.
    const optionName = option.raw ? option.text : Common.UIString.UIString(option.text);
    select.add(new Option(optionName, option.value));
  }

  let reloadWarning = /** @type {?Element} */ (null);
  if (requiresReload) {
    reloadWarning = settingSelectElement.createChild('span', 'reload-warning hidden');
    reloadWarning.textContent = ls`${'*'}Requires reload`;
    ARIAUtils.markAsAlert(reloadWarning);
  }

  setting.addChangeListener(settingChanged);
  settingChanged();
  select.addEventListener('change', selectChanged, false);
  return settingSelectElement;

  function settingChanged() {
    const newValue = setting.get();
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === newValue) {
        select.selectedIndex = i;
      }
    }
  }

  function selectChanged() {
    // Don't use event.target.value to avoid conversion of the value to string.
    setting.set(options[select.selectedIndex].value);
    if (reloadWarning) {
      reloadWarning.classList.remove('hidden');
      InspectorView.instance().displayReloadRequiredWarning(
          ls`One or more settings have changed which requires a reload to take effect.`);
    }
  }
};

/**
 * @param {!Element} inputElement
 * @param {!Common.Settings.Setting<boolean>} setting
 */
export const bindCheckbox = function(inputElement, setting) {
  const input = /** @type {!HTMLInputElement} */ (inputElement);
  function settingChanged() {
    if (input.checked !== setting.get()) {
      input.checked = setting.get();
    }
  }
  setting.addChangeListener(settingChanged);
  settingChanged();

  function inputChanged() {
    if (setting.get() !== input.checked) {
      setting.set(input.checked);
    }
  }
  input.addEventListener('change', inputChanged, false);
};

/**
 * @param {string} name
 * @param {!Element} element
 * @return {!Element}
 */
export const createCustomSetting = function(name, element) {
  const p = document.createElement('p');
  const fieldsetElement = p.createChild('fieldset');
  const label = fieldsetElement.createChild('label');
  label.textContent = name;
  ARIAUtils.bindLabelToControl(label, element);
  fieldsetElement.appendChild(element);
  return p;
};

class SettingsRuntimeExtensionDescriptor extends  // eslint-disable-line no-unused-vars
    Root.Runtime.RuntimeExtensionDescriptor {
  constructor() {
    super();

    /**
     * @type {!Array<{
      *   text: string,
      *   value: *,
      *   raw: (boolean|undefined)
      * }>|undefined}
      */
    this.options;

    /** @type {boolean|undefined} */
    this.reloadRequired;
  }
}

/**
 * @param {!Common.Settings.Setting<*>} setting
 * @param {string=} subtitle
 * @return {?Element}
 */
export const createControlForSetting = function(setting, subtitle) {
  const extension = setting.extension();
  if (!extension) {
    return null;
  }
  const descriptor = /** @type {!SettingsRuntimeExtensionDescriptor} */ (extension.descriptor());
  const uiTitle = Common.UIString.UIString(setting.title() || '');
  switch (descriptor.settingType) {
    case 'boolean':
      return createSettingCheckbox(uiTitle, /** @type {!Common.Settings.Setting<boolean>} */ (setting));
    case 'enum':
      if (Array.isArray(descriptor.options)) {
        return createSettingSelect(uiTitle, descriptor.options, descriptor.reloadRequired, setting, subtitle);
      }
      console.error('Enum setting defined without options');
      return null;
    default:
      console.error('Invalid setting type: ' + descriptor.settingType);
      return null;
  }
};

/**
 * @interface
 */
export class SettingUI {
  /**
   * @return {?Element}
   */
  settingElement() {
    throw new Error('not implemented');
  }
}
