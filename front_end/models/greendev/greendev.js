// gen/front_end/models/greendev/Prototypes.js
import * as Common from "./../../core/common/common.js";
import * as Root from "./../../core/root/root.js";
var instance = null;
var Prototypes = class _Prototypes {
  constructor() {
  }
  static instance() {
    if (instance) {
      return instance;
    }
    instance = new _Prototypes();
    return instance;
  }
  /**
   * Returns true if the specific setting is turned on AND the GreenDev flag is enabled
   */
  isEnabled(setting) {
    const greendevFlagEnabled = Boolean(Root.Runtime.hostConfig.devToolsGreenDevUi?.enabled);
    return greendevFlagEnabled && this.settings()[setting].get();
  }
  settings() {
    const settings = Common.Settings.Settings.instance();
    const inDevToolsFloaty = settings.createSetting(
      "greendev-in-devtools-floaty-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    const inlineWidgets = settings.createSetting(
      "greendev-inline-widgets-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    const aiAnnotations = settings.createSetting(
      "greendev-ai-annotations-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    const artifactViewer = settings.createSetting(
      "greendev-artifact-viewer-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    return { inDevToolsFloaty, inlineWidgets, aiAnnotations, artifactViewer };
  }
};
export {
  Prototypes
};
//# sourceMappingURL=greendev.js.map
