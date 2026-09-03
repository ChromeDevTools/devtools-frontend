var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// ../../front_end/ui/settings/ConsoleSettings.ts
var ConsoleSettings_exports = {};
__export(ConsoleSettings_exports, {
  consoleAutocompleteOnEnterSettingDescriptor: () => consoleAutocompleteOnEnterSettingDescriptor,
  consoleEagerEvalSettingDescriptor: () => consoleEagerEvalSettingDescriptor,
  consoleGroupSimilarSettingDescriptor: () => consoleGroupSimilarSettingDescriptor,
  consoleHistoryAutocompleteSettingDescriptor: () => consoleHistoryAutocompleteSettingDescriptor,
  consoleShowsCorsErrorsSettingDescriptor: () => consoleShowsCorsErrorsSettingDescriptor,
  consoleTimestampsEnabledSettingDescriptor: () => consoleTimestampsEnabledSettingDescriptor,
  consoleTraceExpandSettingDescriptor: () => consoleTraceExpandSettingDescriptor,
  networkMessagesSettingDescriptor: () => networkMessagesSettingDescriptor,
  selectedContextFilterEnabledSettingDescriptor: () => selectedContextFilterEnabledSettingDescriptor
});
import * as Common from "../../core/common/common.js";
var networkMessagesSettingDescriptor = {
  name: "network-messages",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var selectedContextFilterEnabledSettingDescriptor = {
  name: "selected-context-filter-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleTimestampsEnabledSettingDescriptor = {
  name: "console-timestamps-enabled",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleHistoryAutocompleteSettingDescriptor = {
  name: "console-history-autocomplete",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true
};
var consoleAutocompleteOnEnterSettingDescriptor = {
  name: "console-autocomplete-on-enter",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleGroupSimilarSettingDescriptor = {
  name: "console-group-similar",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleShowsCorsErrorsSettingDescriptor = {
  name: "console-shows-cors-errors",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true
};
var consoleEagerEvalSettingDescriptor = {
  name: "console-eager-eval",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};
var consoleTraceExpandSettingDescriptor = {
  name: "console-trace-expand",
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/InspectorMainSettings.ts
var InspectorMainSettings_exports = {};
__export(InspectorMainSettings_exports, {
  adBlockingEnabledSettingDescriptor: () => adBlockingEnabledSettingDescriptor,
  autoAttachToCreatedPagesSettingDescriptor: () => autoAttachToCreatedPagesSettingDescriptor
});
import * as Common2 from "../../core/common/common.js";
var adBlockingEnabledSettingDescriptor = {
  name: "network.ad-blocking-enabled",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common2.Settings.SettingStorageType.SESSION
};
var autoAttachToCreatedPagesSettingDescriptor = {
  name: "auto-attach-to-created-pages",
  type: Common2.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common2.Settings.SettingStorageType.SYNCED
};

// ../../front_end/ui/settings/MainSettings.ts
var MainSettings_exports = {};
__export(MainSettings_exports, {
  activeKeybindSetSettingDescriptor: () => activeKeybindSetSettingDescriptor,
  chromeThemeColorsSettingDescriptor: () => chromeThemeColorsSettingDescriptor,
  currentDockStateSettingDescriptor: () => currentDockStateSettingDescriptor,
  languageSettingDescriptor: () => languageSettingDescriptor,
  searchAsYouTypeSettingDescriptor: () => searchAsYouTypeSettingDescriptor,
  shortcutPanelSwitchSettingDescriptor: () => shortcutPanelSwitchSettingDescriptor,
  sidebarPositionSettingDescriptor: () => sidebarPositionSettingDescriptor,
  syncPreferencesSettingDescriptor: () => syncPreferencesSettingDescriptor,
  uiThemeSettingDescriptor: () => uiThemeSettingDescriptor,
  userShortcutsSettingDescriptor: () => userShortcutsSettingDescriptor
});
import * as Common3 from "../../core/common/common.js";
var uiThemeSettingDescriptor = {
  name: "ui-theme",
  type: Common3.Settings.SettingType.ENUM,
  defaultValue: "systemPreferred",
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var chromeThemeColorsSettingDescriptor = {
  name: "chrome-theme-colors",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var sidebarPositionSettingDescriptor = {
  name: "sidebar-position",
  type: Common3.Settings.SettingType.ENUM,
  defaultValue: "auto",
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var languageSettingDescriptor = {
  name: "language",
  type: Common3.Settings.SettingType.ENUM,
  defaultValue: "en-US",
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var shortcutPanelSwitchSettingDescriptor = {
  name: "shortcut-panel-switch",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var currentDockStateSettingDescriptor = {
  name: "currentDockState",
  type: Common3.Settings.SettingType.ENUM,
  defaultValue: "right"
};
var activeKeybindSetSettingDescriptor = {
  name: "active-keybind-set",
  type: Common3.Settings.SettingType.ENUM,
  defaultValue: "devToolsDefault",
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var syncPreferencesSettingDescriptor = {
  name: "sync-preferences",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: false
};
var userShortcutsSettingDescriptor = {
  name: "user-shortcuts",
  type: Common3.Settings.SettingType.ARRAY,
  defaultValue: [],
  storageType: Common3.Settings.SettingStorageType.SYNCED
};
var searchAsYouTypeSettingDescriptor = {
  name: "search-as-you-type",
  type: Common3.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common3.Settings.SettingStorageType.LOCAL
};

// ../../front_end/ui/settings/SettingUIRegistration.ts
var SettingUIRegistration_exports = {};
__export(SettingUIRegistration_exports, {
  SettingUI: () => SettingUI,
  getRegisteredSettings: () => getRegisteredSettings,
  maybeResolve: () => maybeResolve,
  register: () => register,
  resetSettings: () => resetSettings,
  resolve: () => resolve
});
import * as Common4 from "../../core/common/common.js";
var registeredSettings = /* @__PURE__ */ new Map();
function register(settingDescriptor, settingUIDescriptor) {
  const settingName = settingDescriptor.name;
  if (registeredSettings.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  Common4.SettingRegistration.registerCategoryOrder(settingUIDescriptor.category, settingUIDescriptor.order);
  registeredSettings.set(settingName, { descriptor: settingDescriptor, uiDescriptor: settingUIDescriptor });
}
function getRegisteredSettings() {
  const combined = /* @__PURE__ */ new Map();
  for (const legacy of Common4.SettingRegistration.getRegisteredSettings()) {
    combined.set(legacy.settingName, {
      descriptor: {
        name: legacy.settingName,
        type: legacy.settingType,
        defaultValue: legacy.defaultValue,
        storageType: legacy.storageType
      },
      uiDescriptor: {
        category: legacy.category,
        order: legacy.order,
        title: legacy.title,
        tags: legacy.tags,
        options: legacy.options,
        reloadRequired: legacy.reloadRequired,
        learnMore: legacy.learnMore
      }
    });
  }
  for (const [name, registeredUI] of registeredSettings) {
    combined.set(name, registeredUI);
  }
  return Array.from(combined.values());
}
var SettingUI = class {
  #raw;
  constructor(raw) {
    this.#raw = raw;
  }
  get title() {
    return this.#raw.title?.() ?? "";
  }
  get category() {
    return this.#raw.category ?? null;
  }
  get order() {
    return this.#raw.order ?? null;
  }
  get tags() {
    return this.#raw.tags ? this.#raw.tags.map((tag) => tag()).join("\0") : "";
  }
  get options() {
    return this.#raw.options?.map((opt) => ({
      value: opt.value,
      title: opt.title(),
      text: typeof opt.text === "function" ? opt.text() : opt.text,
      raw: opt.raw
    })) ?? [];
  }
  get reloadRequired() {
    return Boolean(this.#raw.reloadRequired);
  }
  get learnMore() {
    return this.#raw.learnMore ?? null;
  }
};
function maybeResolve(settingDescriptor) {
  const settingUI = registeredSettings.get(settingDescriptor.name) ?? getRegisteredSettings().find((registered) => registered.descriptor.name === settingDescriptor.name);
  return settingUI ? new SettingUI(settingUI.uiDescriptor) : null;
}
function resolve(settingDescriptor) {
  const ui = maybeResolve(settingDescriptor);
  if (!ui) {
    throw new Error(`No UI descriptor registered for setting '${settingDescriptor.name}'`);
  }
  return ui;
}
function resetSettings() {
  for (const { uiDescriptor } of registeredSettings.values()) {
    Common4.SettingRegistration.removeCategoryOrder(uiDescriptor.category, uiDescriptor.order);
  }
  registeredSettings.clear();
}
export {
  ConsoleSettings_exports as ConsoleSettings,
  InspectorMainSettings_exports as InspectorMainSettings,
  MainSettings_exports as MainSettings,
  SettingUIRegistration_exports as SettingUIRegistration
};
//# sourceMappingURL=settings.js.map
