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

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as IconButton from '../components/icon_button/icon_button.js';
import * as Settings from '../components/settings/settings.js';

import * as ARIAUtils from './ARIAUtils.js';
import {InspectorView} from './InspectorView.js';
import {Tooltip} from './Tooltip.js';
import {CheckboxLabel} from './UIUtils.js';

const UIStrings = {
  /**
  *@description Note when a setting change will require the user to reload DevTools
  */
  srequiresReload: '*Requires reload',
  /**
  *@description Message to display if a setting change requires a reload of DevTools
  */
  oneOrMoreSettingsHaveChanged: 'One or more settings have changed which requires a reload to take effect.',
  /**
  *@description Tooltip for the colorFormat setting to inform of its deprecation
  */
  colorFormatSettingDisabled:
      'This setting is deprecated because it is incompatible with modern color spaces. To reenable it, you can disable the according experiment.',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SettingsUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const createSettingCheckbox = function(
    name: string, setting: Common.Settings.Setting<boolean>, omitParagraphElement?: boolean,
    tooltip?: string): Element {
  const label = CheckboxLabel.create(name);
  if (tooltip) {
    Tooltip.install(label, tooltip);
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

const createSettingSelect = function(
    name: string, options: Common.Settings.SimpleSettingOption[], requiresReload: boolean|null,
    setting: Common.Settings.Setting<unknown>, subtitle?: string): Element {
  const container = document.createElement('div');
  const settingSelectElement = container.createChild('p');
  settingSelectElement.classList.add('settings-select');
  const label = settingSelectElement.createChild('label');
  const select = (settingSelectElement.createChild('select', 'chrome-select') as HTMLSelectElement);
  label.textContent = name;
  if (subtitle) {
    container.classList.add('chrome-select-label');
    label.createChild('p').textContent = subtitle;
  }
  ARIAUtils.bindLabelToControl(label, select);

  for (const option of options) {
    if (option.text && typeof option.value === 'string') {
      select.add(new Option(option.text, option.value));
    }
  }

  let reloadWarning: HTMLElement|(Element | null) = (null as Element | null);
  if (requiresReload) {
    reloadWarning = container.createChild('span', 'reload-warning hidden');
    reloadWarning.textContent = i18nString(UIStrings.srequiresReload);
    ARIAUtils.markAsAlert(reloadWarning);
  }

  // The color format setting is deprecated and is going to be removed. Hence, handling it as a special case here
  // instead of introducing more general special handling of settings controls.
  // TODO(chromium:1392054) Remove.
  if (setting.name === 'colorFormat') {
    const experiment = Root.Runtime.experiments.allConfigurableExperiments().find(
        e => e.name === Root.Runtime.ExperimentName.DISABLE_COLOR_FORMAT_SETTING);
    if (experiment && experiment.isEnabled()) {
      setting.set(setting.defaultValue);
      setting.setDisabled(true);
      const icon = new IconButton.Icon.Icon();
      icon.style.cursor = 'pointer';
      icon.title = i18nString(UIStrings.colorFormatSettingDisabled);
      icon.data = {iconName: 'ic_info_black_18dp', color: 'var(--color-link)', width: '14px'};
      icon.onclick = (): void => {
        void Common.Revealer.reveal(experiment);
      };
      label.appendChild(icon);
    }
  }

  setting.addChangeListener(settingChanged);
  settingChanged();
  select.addEventListener('change', selectChanged, false);
  return container;

  function settingChanged(): void {
    const newValue = setting.get();
    for (let i = 0; i < options.length; i++) {
      if (options[i].value === newValue) {
        select.selectedIndex = i;
      }
    }
    select.disabled = setting.disabled();
  }

  function selectChanged(): void {
    // Don't use event.target.value to avoid conversion of the value to string.
    setting.set(options[select.selectedIndex].value);
    if (reloadWarning) {
      reloadWarning.classList.remove('hidden');
      InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
    }
  }
};

export const bindCheckbox = function(inputElement: Element, setting: Common.Settings.Setting<boolean>): void {
  const input = (inputElement as HTMLInputElement);
  function settingChanged(): void {
    if (input.checked !== setting.get()) {
      input.checked = setting.get();
    }
  }
  setting.addChangeListener(settingChanged);
  settingChanged();

  function inputChanged(): void {
    if (setting.get() !== input.checked) {
      setting.set(input.checked);
    }
  }
  input.addEventListener('change', inputChanged, false);
};

export const createCustomSetting = function(name: string, element: Element): Element {
  const p = document.createElement('p');
  p.classList.add('settings-select');
  const label = p.createChild('label');
  label.textContent = name;
  ARIAUtils.bindLabelToControl(label, element);
  p.appendChild(element);
  return p;
};

export const createControlForSetting = function(setting: Common.Settings.Setting<unknown>, subtitle?: string): Element|
    null {
      const uiTitle = setting.title();
      switch (setting.type()) {
        case Common.Settings.SettingType.BOOLEAN: {
          const component = new Settings.SettingCheckbox.SettingCheckbox();
          component.data = {setting: setting as Common.Settings.Setting<boolean>};
          return component;
        }
        case Common.Settings.SettingType.ENUM:
          if (Array.isArray(setting.options())) {
            return createSettingSelect(uiTitle, setting.options(), setting.reloadRequired(), setting, subtitle);
          }
          console.error('Enum setting defined without options');
          return null;
        default:
          console.error('Invalid setting type: ' + setting.type());
          return null;
      }
    };

export interface SettingUI {
  settingElement(): Element|null;
}
