// Copyright 2014 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import { Directives, html, nothing, render } from '../../../../ui/lit/lit.js';
import * as Settings from '../../../components/settings/settings.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
const { createRef, ref } = Directives;
const UIStrings = {
    /**
     * @description Note when a setting change will require the user to reload DevTools
     */
    srequiresReload: '*Requires reload',
    /**
     * @description Message to display if a setting change requires a reload of DevTools
     */
    settingsChangedReloadDevTools: 'Settings changed. To apply, reload DevTools.',
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
export function renderSettingSelect(setting, subtitle) {
    const name = setting.title();
    const options = setting.options();
    const requiresReload = setting.reloadRequired();
    const { deprecation } = setting;
    const controlId = UI.ARIAUtils.nextId('labelledControl');
    const reloadWarningRef = createRef();
    const onSelectChange = (e) => {
        const select = e.target;
        setting.set(options[select.selectedIndex].value);
        if (requiresReload) {
            UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.settingsChangedReloadDevTools));
            if (reloadWarningRef.value) {
                reloadWarningRef.value.classList.remove('hidden');
            }
        }
    };
    // clang-format off
    return html `
    <div class=${Directives.classMap({ 'chrome-select-label': Boolean(subtitle) })}>
      <p class="settings-select">
        <label for=${controlId}>
          ${name}
          ${subtitle ? html `<p>${subtitle}</p>` : nothing}
          ${deprecation ? html `<devtools-setting-deprecation-warning .data=${deprecation}></devtools-setting-deprecation-warning>` :
        nothing}
        </label>
        <select
          id=${controlId}
          aria-label=${name}
          .disabled=${setting.disabled()}
          @change=${onSelectChange}
          jslog=${VisualLogging.dropDown().track({ change: true }).context(setting.name)}
        >
          ${options.map(option => {
        if (option.text && typeof option.value === 'string') {
            return html `
                <option
                  value=${option.value}
                  ?selected=${setting.get() === option.value}
                  jslog=${VisualLogging.item(Platform.StringUtilities.toKebabCase(option.value)).track({ click: true })}
                >
                  ${option.text}
                </option>
              `;
        }
        return nothing;
    })}
        </select>
      </p>
      ${requiresReload ? html `
        <p ${ref(reloadWarningRef)} class="reload-warning hidden" role="alert" aria-live="polite">
          ${i18nString(UIStrings.srequiresReload)}
        </p>` : nothing}
    </div>
  `;
    // clang-format on
}
export const createControlForSetting = function (setting, subtitle) {
    switch (setting.type()) {
        case "boolean" /* Common.Settings.SettingType.BOOLEAN */: {
            const component = new Settings.SettingCheckbox.SettingCheckbox();
            component.data = {
                setting: setting,
            };
            component.onchange = () => {
                if (setting.reloadRequired()) {
                    UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.settingsChangedReloadDevTools));
                }
            };
            return component;
        }
        case "enum" /* Common.Settings.SettingType.ENUM */: {
            const fragment = document.createDocumentFragment();
            // eslint-disable-next-line @devtools/no-lit-render-outside-of-view
            render(renderSettingSelect(setting, subtitle), fragment);
            return fragment.firstElementChild;
        }
        default:
            console.error('Invalid setting type: ' + setting.type());
            return null;
    }
};
//# sourceMappingURL=SettingsUI.js.map