// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Settings from '../components/settings/settings.js';
import { Directives } from '../lit/lit.js';
import * as VisualLogging from '../visual_logging/visual_logging.js';
import * as ARIAUtils from './ARIAUtils.js';
import { InspectorView } from './InspectorView.js';
import { Tooltip } from './Tooltip.js';
import { bindInput, CheckboxLabel, createOption } from './UIUtils.js';
const UIStrings = {
    /**
     * @description Note when a setting change will require the user to reload DevTools
     */
    srequiresReload: '*Requires reload',
    /**
     * @description Message to display if a setting change requires a reload of DevTools
     */
    oneOrMoreSettingsHaveChanged: 'One or more settings have changed which requires a reload to take effect',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/SettingsUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function createSettingCheckbox(name, setting, tooltip) {
    const label = CheckboxLabel.create(name, undefined, undefined, setting.name);
    label.name = name;
    bindCheckbox(label, setting);
    if (tooltip) {
        Tooltip.install(label, tooltip);
    }
    return label;
}
const createSettingSelect = function (name, options, requiresReload, setting, subtitle) {
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
    select.setAttribute('jslog', `${VisualLogging.dropDown().track({ change: true }).context(setting.name)}`);
    ARIAUtils.bindLabelToControl(label, select);
    for (const option of options) {
        if (option.text && typeof option.value === 'string') {
            select.add(createOption(option.text, option.value, Platform.StringUtilities.toKebabCase(option.value)));
        }
    }
    let reloadWarning = null;
    if (requiresReload) {
        reloadWarning = container.createChild('p', 'reload-warning hidden');
        reloadWarning.textContent = i18nString(UIStrings.srequiresReload);
        ARIAUtils.markAsAlert(reloadWarning);
    }
    const { deprecation } = setting;
    if (deprecation) {
        const warning = new Settings.SettingDeprecationWarning.SettingDeprecationWarning();
        warning.data = deprecation;
        label.appendChild(warning);
    }
    setting.addChangeListener(settingChanged);
    settingChanged();
    select.addEventListener('change', selectChanged, false);
    return container;
    function settingChanged() {
        const newValue = setting.get();
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === newValue) {
                select.selectedIndex = i;
            }
        }
        select.disabled = setting.disabled();
    }
    function selectChanged() {
        // Don't use event.target.value to avoid conversion of the value to string.
        setting.set(options[select.selectedIndex].value);
        if (reloadWarning) {
            reloadWarning.classList.remove('hidden');
            InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
        }
    }
};
export const bindToSetting = (settingOrName, stringValidator) => {
    const setting = typeof settingOrName === 'string' ?
        Common.Settings.Settings.instance().moduleSetting(settingOrName) :
        settingOrName;
    // We can't use `setValue` as the change listener directly, otherwise we won't
    // be able to remove it again.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let setValue;
    function settingChanged() {
        setValue(setting.get());
    }
    if (setting.type() === "boolean" /* Common.Settings.SettingType.BOOLEAN */ || typeof setting.defaultValue === 'boolean') {
        return Directives.ref(e => {
            if (e === undefined) {
                setting.removeChangeListener(settingChanged);
                return;
            }
            setting.addChangeListener(settingChanged);
            setValue =
                bindCheckboxImpl(e, setting.set.bind(setting));
            setValue(setting.get());
        });
    }
    if (setting.type() === "regex" /* Common.Settings.SettingType.REGEX */ || setting instanceof Common.Settings.RegExpSetting) {
        return Directives.ref(e => {
            if (e === undefined) {
                setting.removeChangeListener(settingChanged);
                return;
            }
            setting.addChangeListener(settingChanged);
            setValue = bindInput(e, setting.set.bind(setting), (value) => {
                try {
                    new RegExp(value);
                    return true;
                }
                catch {
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
            setValue = bindInput(e, setting.set.bind(setting), stringValidator ?? (() => true), /* numeric */ false);
            setValue(setting.get());
        });
    }
    throw new Error(`Cannot infer type for setting  '${setting.name}'`);
};
/**
 * @deprecated Prefer {@link bindToSetting} as this function leaks the checkbox via the setting listener.
 */
export const bindCheckbox = function (input, setting, metric) {
    const setValue = bindCheckboxImpl(input, setting.set.bind(setting), metric);
    setting.addChangeListener(event => setValue(event.data));
    setValue(setting.get());
};
const bindCheckboxImpl = function (input, apply, metric) {
    input.addEventListener('change', onInputChanged, false);
    function onInputChanged() {
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
    return function setValue(value) {
        if (value !== input.checked) {
            input.checked = value;
        }
    };
};
export const createControlForSetting = function (setting, subtitle) {
    const uiTitle = setting.title();
    switch (setting.type()) {
        case "boolean" /* Common.Settings.SettingType.BOOLEAN */: {
            const component = new Settings.SettingCheckbox.SettingCheckbox();
            component.data = {
                setting: setting,
            };
            component.onchange = () => {
                if (setting.reloadRequired()) {
                    InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
                }
            };
            return component;
        }
        case "enum" /* Common.Settings.SettingType.ENUM */:
            return createSettingSelect(uiTitle, setting.options(), setting.reloadRequired(), setting, subtitle);
        default:
            console.error('Invalid setting type: ' + setting.type());
            return null;
    }
};
//# sourceMappingURL=SettingsUI.js.map