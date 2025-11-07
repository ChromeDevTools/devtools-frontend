// gen/front_end/models/workspace/workspace-meta.prebundle.js
import * as Common from "./../../core/common/common.js";
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "skip-stack-frames-pattern",
  settingType: "regex",
  defaultValue: "/node_modules/|^node:"
});
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "skip-content-scripts",
  settingType: "boolean",
  defaultValue: true
});
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "automatically-ignore-list-known-third-party-scripts",
  settingType: "boolean",
  defaultValue: true
});
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "skip-anonymous-scripts",
  settingType: "boolean",
  defaultValue: false
});
Common.Settings.registerSettingExtension({
  storageType: "Synced",
  settingName: "enable-ignore-listing",
  settingType: "boolean",
  defaultValue: true
});
//# sourceMappingURL=workspace-meta.js.map
