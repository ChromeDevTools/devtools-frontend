var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/legacy/components/settings_ui/SettingsUI.js
var SettingsUI_exports = {};
__export(SettingsUI_exports, {
  createControlForSetting: () => createControlForSetting,
  createSettingCheckbox: () => createSettingCheckbox,
  renderSettingSelect: () => renderSettingSelect
});
import * as Common from "./../../../../core/common/common.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as Platform from "./../../../../core/platform/platform.js";
import { Directives, html, nothing, render } from "./../../../lit/lit.js";
import * as Settings from "./../../../components/settings/settings.js";
import * as VisualLogging from "./../../../visual_logging/visual_logging.js";
import * as UI from "./../../legacy.js";
var { createRef, ref } = Directives;
var UIStrings = {
  /**
   * @description Note when a setting change will require the user to reload DevTools
   */
  srequiresReload: "*Requires reload",
  /**
   * @description Message to display if a setting change requires a reload of DevTools
   */
  settingsChangedReloadDevTools: "Settings changed. To apply, reload DevTools."
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/settings_ui/SettingsUI.ts", UIStrings);
var i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
function createSettingCheckbox(name, setting, tooltip) {
  const label = UI.UIUtils.CheckboxLabel.create(name, void 0, void 0, setting.name);
  label.name = name;
  UI.UIUtils.bindCheckbox(label, setting);
  if (tooltip) {
    UI.Tooltip.Tooltip.install(label, tooltip);
  }
  return label;
}
function renderSettingSelect(setting, subtitle) {
  const name = setting.title();
  const options = setting.options();
  const requiresReload = setting.reloadRequired();
  const { deprecation } = setting;
  const controlId = UI.ARIAUtils.nextId("labelledControl");
  const reloadWarningRef = createRef();
  const onSelectChange = (e) => {
    const select = e.target;
    setting.set(options[select.selectedIndex].value);
    if (requiresReload) {
      UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.settingsChangedReloadDevTools));
      if (reloadWarningRef.value) {
        reloadWarningRef.value.classList.remove("hidden");
      }
    }
  };
  return html`
    <div class=${Directives.classMap({ "chrome-select-label": Boolean(subtitle) })}>
      <p class="settings-select">
        <label for=${controlId}>
          ${name}
          ${subtitle ? html`<p>${subtitle}</p>` : nothing}
          ${deprecation ? html`<devtools-setting-deprecation-warning .data=${deprecation}></devtools-setting-deprecation-warning>` : nothing}
        </label>
        <select
          id=${controlId}
          aria-label=${name}
          .disabled=${setting.disabled()}
          @change=${onSelectChange}
          jslog=${VisualLogging.dropDown().track({ change: true }).context(setting.name)}
        >
          ${options.map((option) => {
    if (option.text && typeof option.value === "string") {
      return html`
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
      ${requiresReload ? html`
        <p ${ref(reloadWarningRef)} class="reload-warning hidden" role="alert" aria-live="polite">
          ${i18nString(UIStrings.srequiresReload)}
        </p>` : nothing}
    </div>
  `;
}
var createControlForSetting = function(setting, subtitle) {
  switch (setting.type()) {
    case "boolean": {
      const component = new Settings.SettingCheckbox.SettingCheckbox();
      component.data = {
        setting
      };
      component.onchange = () => {
        if (setting.reloadRequired()) {
          UI.InspectorView.InspectorView.instance().displayReloadRequiredWarning(i18nString(UIStrings.settingsChangedReloadDevTools));
        }
      };
      return component;
    }
    case "enum": {
      const fragment = document.createDocumentFragment();
      render(renderSettingSelect(setting, subtitle), fragment);
      return fragment.firstElementChild;
    }
    default:
      console.error("Invalid setting type: " + setting.type());
      return null;
  }
};
export {
  SettingsUI_exports as SettingsUI
};
//# sourceMappingURL=settings_ui.js.map
