// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as Settings from '../../../components/settings/settings.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
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
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/settings_ui/SettingsUI.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export function createSettingCheckbox(name, setting, tooltip) {
    const label = UI.UIUtils.CheckboxLabel.create(name, undefined, undefined, setting.name);
    label.name = name;
    UI.UIUtils.bindCheckbox(label, setting);
    if (tooltip) {
        UI.Tooltip.Tooltip.install(label, tooltip);
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
    UI.ARIAUtils.bindLabelToControl(label, select);
    for (const option of options) {
        if (option.text && typeof option.value === 'string') {
            select.add(UI.UIUtils.createOption(option.text, option.value, Platform.StringUtilities.toKebabCase(option.value)));
        }
    }
    let reloadWarning = null;
    if (requiresReload) {
        reloadWarning = container.createChild('p', 'reload-warning hidden');
        reloadWarning.textContent = i18nString(UIStrings.srequiresReload);
        UI.ARIAUtils.markAsAlert(reloadWarning);
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
            UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
        }
    }
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
                    UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.oneOrMoreSettingsHaveChanged));
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