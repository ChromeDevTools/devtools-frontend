var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// gen/front_end/ui/settings/SettingUIRegistration.js
var SettingUIRegistration_exports = {};
__export(SettingUIRegistration_exports, {
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
        deprecationNotice: legacy.deprecationNotice,
        learnMore: legacy.learnMore
      }
    });
  }
  for (const [name, registeredUI] of registeredSettings) {
    combined.set(name, registeredUI);
  }
  return Array.from(combined.values());
}
function maybeResolve(settingDescriptor) {
  const settingUI = registeredSettings.get(settingDescriptor.name) ?? getRegisteredSettings().find((registered) => registered.descriptor.name === settingDescriptor.name);
  return settingUI?.uiDescriptor ?? null;
}
function resolve(settingDescriptor) {
  const uiDescriptor = maybeResolve(settingDescriptor);
  if (!uiDescriptor) {
    throw new Error(`No UI descriptor registered for setting '${settingDescriptor.name}'`);
  }
  return uiDescriptor;
}
function resetSettings() {
  registeredSettings.clear();
}
export {
  SettingUIRegistration_exports as SettingUIRegistration
};
//# sourceMappingURL=settings.js.map
