// gen/front_end/models/greendev/Prototypes.js
import * as Common from "./../../core/common/common.js";
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
  isEnabled(setting) {
    return this.settings()[setting].get();
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
    return { inDevToolsFloaty, inlineWidgets, aiAnnotations };
  }
};
export {
  Prototypes
};
//# sourceMappingURL=greendev.js.map
