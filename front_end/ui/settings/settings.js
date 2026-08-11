var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/settings/SettingUIRegistration.js
var SettingUIRegistration_exports = {};
__export(SettingUIRegistration_exports, {
  SettingUI: () => SettingUI,
  getRegisteredSettings: () => getRegisteredSettings,
  maybeResolve: () => maybeResolve,
  register: () => register,
  resetSettings: () => resetSettings,
  resolve: () => resolve
});
import * as Common from "./../../core/common/common.js";
var registeredSettings = /* @__PURE__ */ new Map();
function register(settingDescriptor, settingUIDescriptor) {
  const settingName = settingDescriptor.name;
  if (registeredSettings.has(settingName)) {
    throw new Error(`Duplicate setting name '${settingName}'`);
  }
  Common.SettingRegistration.registerCategoryOrder(settingUIDescriptor.category, settingUIDescriptor.order);
  registeredSettings.set(settingName, { descriptor: settingDescriptor, uiDescriptor: settingUIDescriptor });
}
function getRegisteredSettings() {
  const combined = /* @__PURE__ */ new Map();
  for (const legacy of Common.SettingRegistration.getRegisteredSettings()) {
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
    Common.SettingRegistration.removeCategoryOrder(uiDescriptor.category, uiDescriptor.order);
  }
  registeredSettings.clear();
}
export {
  SettingUIRegistration_exports as SettingUIRegistration
};
//# sourceMappingURL=settings.js.map
