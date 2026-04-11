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
    const aiAnnotations = settings.createSetting(
      "greendev-ai-annotations-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    const beyondStyling = settings.createSetting(
      "greendev-beyond-styling-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    const breakpointDebuggerAgent = settings.createSetting(
      "greendev-breakpoint-debugger-agent-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    const emulationCapabilities = settings.createSetting(
      "greendev-emulation-capabilities-enabled",
      false,
      "Local"
      /* Common.Settings.SettingStorageType.LOCAL */
    );
    return { aiAnnotations, beyondStyling, breakpointDebuggerAgent, emulationCapabilities };
  }
};
export {
  Prototypes
};
//# sourceMappingURL=greendev.js.map
