"use strict";
import * as i18n from "../i18n/i18n.js";
import * as Root from "../root/root.js";
const UIStrings = {
  /**
   * @description Title of the Elements Panel
   */
  elements: "Elements",
  /**
   * @description Text for DevTools AI
   */
  ai: "AI",
  /**
   * @description Text for DevTools appearance
   */
  appearance: "Appearance",
  /**
   * @description Name of the Sources panel
   */
  sources: "Sources",
  /**
   * @description Title of the Network tool
   */
  network: "Network",
  /**
   * @description Text for the performance of something
   */
  performance: "Performance",
  /**
   * @description Title of the Console tool
   */
  console: "Console",
  /**
   * @description A title of the 'Persistence' setting category
   */
  persistence: "Persistence",
  /**
   * @description Text that refers to the debugger
   */
  debugger: "Debugger",
  /**
   * @description Text describing global shortcuts and settings that are available throughout the DevTools
   */
  global: "Global",
  /**
   * @description Title of the Rendering tool
   */
  rendering: "Rendering",
  /**
   * @description Title of a section on CSS Grid tooling
   */
  grid: "Grid",
  /**
   * @description Text for the mobile platform, as opposed to desktop
   */
  mobile: "Mobile",
  /**
   * @description Text for the memory of the page
   */
  memory: "Memory",
  /**
   * @description Text for the extension of the page
   */
  extension: "Extension",
  /**
   * @description Text for the adorner of the page
   */
  adorner: "Adorner",
  /**
   * @description Header for the "Account" section in the settings UI. The "Account"
   * section allows users see their signed in account and configure which DevTools data is synced via Chrome Sync.
   */
  account: "Account",
  /**
   * @description Text for the privacy section of the page.
   */
  privacy: "Privacy"
};
const str_ = i18n.i18n.registerUIStrings("core/common/SettingRegistration.ts", UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(void 0, str_);
let registeredSettings = [];
const settingNameSet = /* @__PURE__ */ new Set();
export function registerSettingExtension(registration) {
  const settingName = registration.settingName;
  if (settingNameSet.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  settingNameSet.add(settingName);
  registeredSettings.push(registration);
}
export function getRegisteredSettings() {
  return registeredSettings.filter((setting) => Root.Runtime.Runtime.isDescriptorEnabled(setting));
}
export function registerSettingsForTest(settings, forceReset = false) {
  if (registeredSettings.length === 0 || forceReset) {
    registeredSettings = settings;
    settingNameSet.clear();
    for (const setting of settings) {
      const settingName = setting.settingName;
      if (settingNameSet.has(settingName)) {
        throw new Error(`Duplicate setting name '${settingName}'`);
      }
      settingNameSet.add(settingName);
    }
  }
}
export function resetSettings() {
  registeredSettings = [];
  settingNameSet.clear();
}
export function maybeRemoveSettingExtension(settingName) {
  const settingIndex = registeredSettings.findIndex((setting) => setting.settingName === settingName);
  if (settingIndex < 0 || !settingNameSet.delete(settingName)) {
    return false;
  }
  registeredSettings.splice(settingIndex, 1);
  return true;
}
export var SettingCategory = /* @__PURE__ */ ((SettingCategory2) => {
  SettingCategory2["NONE"] = "";
  SettingCategory2["ELEMENTS"] = "ELEMENTS";
  SettingCategory2["AI"] = "AI";
  SettingCategory2["APPEARANCE"] = "APPEARANCE";
  SettingCategory2["SOURCES"] = "SOURCES";
  SettingCategory2["NETWORK"] = "NETWORK";
  SettingCategory2["PERFORMANCE"] = "PERFORMANCE";
  SettingCategory2["CONSOLE"] = "CONSOLE";
  SettingCategory2["PERSISTENCE"] = "PERSISTENCE";
  SettingCategory2["DEBUGGER"] = "DEBUGGER";
  SettingCategory2["GLOBAL"] = "GLOBAL";
  SettingCategory2["RENDERING"] = "RENDERING";
  SettingCategory2["GRID"] = "GRID";
  SettingCategory2["MOBILE"] = "MOBILE";
  SettingCategory2["EMULATION"] = "EMULATION";
  SettingCategory2["MEMORY"] = "MEMORY";
  SettingCategory2["EXTENSIONS"] = "EXTENSIONS";
  SettingCategory2["ADORNER"] = "ADORNER";
  SettingCategory2["ACCOUNT"] = "ACCOUNT";
  SettingCategory2["PRIVACY"] = "PRIVACY";
  return SettingCategory2;
})(SettingCategory || {});
export function getLocalizedSettingsCategory(category) {
  switch (category) {
    case "ELEMENTS" /* ELEMENTS */:
      return i18nString(UIStrings.elements);
    case "AI" /* AI */:
      return i18nString(UIStrings.ai);
    case "APPEARANCE" /* APPEARANCE */:
      return i18nString(UIStrings.appearance);
    case "SOURCES" /* SOURCES */:
      return i18nString(UIStrings.sources);
    case "NETWORK" /* NETWORK */:
      return i18nString(UIStrings.network);
    case "PERFORMANCE" /* PERFORMANCE */:
      return i18nString(UIStrings.performance);
    case "CONSOLE" /* CONSOLE */:
      return i18nString(UIStrings.console);
    case "PERSISTENCE" /* PERSISTENCE */:
      return i18nString(UIStrings.persistence);
    case "DEBUGGER" /* DEBUGGER */:
      return i18nString(UIStrings.debugger);
    case "GLOBAL" /* GLOBAL */:
      return i18nString(UIStrings.global);
    case "RENDERING" /* RENDERING */:
      return i18nString(UIStrings.rendering);
    case "GRID" /* GRID */:
      return i18nString(UIStrings.grid);
    case "MOBILE" /* MOBILE */:
      return i18nString(UIStrings.mobile);
    case "EMULATION" /* EMULATION */:
      return i18nString(UIStrings.console);
    case "MEMORY" /* MEMORY */:
      return i18nString(UIStrings.memory);
    case "EXTENSIONS" /* EXTENSIONS */:
      return i18nString(UIStrings.extension);
    case "ADORNER" /* ADORNER */:
      return i18nString(UIStrings.adorner);
    case "" /* NONE */:
      return i18n.i18n.lockedString("");
    case "ACCOUNT" /* ACCOUNT */:
      return i18nString(UIStrings.account);
    case "PRIVACY" /* PRIVACY */:
      return i18nString(UIStrings.privacy);
  }
}
export var SettingType = /* @__PURE__ */ ((SettingType2) => {
  SettingType2["ARRAY"] = "array";
  SettingType2["REGEX"] = "regex";
  SettingType2["ENUM"] = "enum";
  SettingType2["BOOLEAN"] = "boolean";
  return SettingType2;
})(SettingType || {});
//# sourceMappingURL=SettingRegistration.js.map
