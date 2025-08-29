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

/* eslint-disable rulesdir/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Settings from '../components/settings/settings.js';
import {Directives} from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';

import * as ARIAUtils from './ARIAUtils.js';
import {InspectorView} from './InspectorView.js';
import {Tooltip} from './Tooltip.js';
import {bindInput, CheckboxLabel, createOption} from './UIUtils.js';

const UIStrings = {
  /**
   * @description Note when a setting change will require the user to reload DevTools
   */
  srequiresReload: '*Requires reload',
  /**
   * @description Message to display if a setting change requires a reload of DevTools
   */
  oneOrMoreSettingsHaveChanged: 'One or more settings have changed which requires a reload to take effect',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SettingsUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export function createSettingCheckbox(
    name: Common.UIString.LocalizedString, setting: Common.Settings.Setting<boolean>, tooltip?: string): CheckboxLabel {
  const label = CheckboxLabel.create(name, undefined, undefined, setting.name);
  label.name = name;
  bindCheckbox(label, setting);
  if (tooltip) {
    Tooltip.install(label, tooltip);
  }
  return label;
}

const createSettingSelect = function(
    name: string, options: Common.Settings.SimpleSettingOption[], requiresReload: boolean|null,
    setting: Common.Settings.Setting<unknown>, subtitle?: string): HTMLElement {
  const container = document.createElement('div');
  const settingSelectElement = container.createChild('p');
  settingSelectElement.classList.add('settings-select');
  const label = settingSelectElement.createChild('label');
  const select = settingSelectElement.createChild('select');
  label.textContent = name;
  if (subtitle) {
    container.classList.add('chrome-select-label');
    label.createChild('p').textContent = subtitle;
  }
  select.setAttribute('jslog', `${VisualLogging.dropDown().track({change: true}).context(setting.name)}`);
  ARIAUtils.bindLabelToControl(label, select);

  for (const option of options) {
    if (option.text && typeof option.value === 'string') {
      select.add(createOption(option.text, option.value, Platform.StringUtilities.toKebabCase(option.value)));
    }
  }

  let reloadWarning: HTMLElement|(Element | null) = (null as Element | null);
  if (requiresReload) {
    reloadWarning = container.createChild('p', 'reload-warning hidden');
    reloadWarning.textContent = i18nString(UIStrings.srequiresReload);
    ARIAUtils.markAsAlert(reloadWarning);
  }

  const {deprecation} = setting;
  if (deprecation) {
    const warning = new Settings.SettingDeprecationWarning.SettingDeprecationWarning();
    warning.data = deprecation;
    label.appendChild(warning);
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

export const bindToSetting =
    (setting: string|Common.Settings.Setting<boolean|string>|Common.Settings.RegExpSetting,
     stringValidator?: (newSettingValue: string) => boolean): ReturnType<typeof Directives.ref> => {
      if (typeof setting === 'string') {
        setting = Common.Settings.Settings.instance().moduleSetting(setting);
      }

      // We can't use `setValue` as the change listener directly, otherwise we won't
      // be able to remove it again.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let setValue: (value: any) => void;
      function settingChanged(): void {
        setValue((setting as Common.Settings.Setting<unknown>| Common.Settings.RegExpSetting).get());
      }

      if (setting.type() === Common.Settings.SettingType.BOOLEAN || typeof setting.defaultValue === 'boolean') {
        return Directives.ref(e => {
          if (e === undefined) {
            setting.removeChangeListener(settingChanged);
            return;
          }

          setting.addChangeListener(settingChanged);
          setValue =
              bindCheckboxImpl(e as CheckboxLabel, (setting as Common.Settings.Setting<boolean>).set.bind(setting));
          setValue(setting.get());
        });
      }

      if (setting.type() === Common.Settings.SettingType.REGEX || setting instanceof Common.Settings.RegExpSetting) {
        return Directives.ref(e => {
          if (e === undefined) {
            setting.removeChangeListener(settingChanged);
            return;
          }

          setting.addChangeListener(settingChanged);
          setValue = bindInput(e as HTMLInputElement, setting.set.bind(setting), (value: string) => {
            try {
              new RegExp(value);
              return true;
            } catch {
              return false;
            }
          }, /* numeric */ false);
          setValue(setting.get());
        });
      }

      if (typeof setting.defaultValue === 'string') {
        return Directives.ref(e => {
          if (e === undefined) {
            setting.removeChangeListener(settingChanged);
            return;
          }

          setting.addChangeListener(settingChanged);
          setValue = bindInput(
              e as HTMLInputElement, setting.set.bind(setting), stringValidator ?? (() => true), /* numeric */ false);
          setValue(setting.get());
        });
      }

      throw new Error(`Cannot infer type for setting  '${setting.name}'`);
    };

/**
 * @deprecated Prefer {@link bindToSetting} as this function leaks the checkbox via the setting listener.
 */
export const bindCheckbox = function(
    input: CheckboxLabel, setting: Common.Settings.Setting<boolean>, metric?: UserMetricOptions): void {
  const setValue = bindCheckboxImpl(input, setting.set.bind(setting), metric);
  setting.addChangeListener(event => setValue(event.data));
  setValue(setting.get());
};

const bindCheckboxImpl = function(
    input: CheckboxLabel, apply: (value: boolean) => void, metric?: UserMetricOptions): (value: boolean) => void {
  input.addEventListener('change', onInputChanged, false);

  function onInputChanged(): void {
    apply(input.checked);

    if (input.checked && metric?.enable) {
      Host.userMetrics.actionTaken(metric.enable);
    }

    if (!input.checked && metric?.disable) {
      Host.userMetrics.actionTaken(metric.disable);
    }

    if (metric?.toggle) {
      Host.userMetrics.actionTaken(metric.toggle);
    }
  }

  return function setValue(value: boolean): void {
    if (value !== input.checked) {
      input.checked = value;
    }
  };
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

export const createControlForSetting = function(
    setting: Common.Settings.Setting<unknown>, subtitle?: string): HTMLElement|null {
  const uiTitle = setting.title();
  switch (setting.type()) {
    case Common.Settings.SettingType.BOOLEAN: {
      const component = new Settings.SettingCheckbox.SettingCheckbox();
      component.data = {
        setting: setting as Common.Settings.Setting<boolean>,
      };
      component.onchange = () => {
        if (setting.reloadRequired()) {
          InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
        }
      };
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

/**
 * Track toggle action as a whole or
 * track on and off action separately.
 */
export interface UserMetricOptions {
  toggle?: Host.UserMetrics.Action;
  enable?: Host.UserMetrics.Action;
  disable?: Host.UserMetrics.Action;
}
