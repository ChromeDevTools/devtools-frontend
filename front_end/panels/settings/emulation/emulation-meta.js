// gen/front_end/panels/settings/emulation/emulation-meta.prebundle.js
import * as i18n from "./../../../core/i18n/i18n.js";
import * as UI from "./../../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Title of the Devices tab/tool. Devices refers to e.g. phones/tablets.
   */
  devices: "Devices",
  /**
   * @description Command that opens the device emulation view.
   */
  showDevices: "Show Devices"
};
var str_ = i18n.i18n.registerUIStrings("panels/settings/emulation/emulation-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedEmulationModule;
async function loadEmulationModule() {
  if (!loadedEmulationModule) {
    loadedEmulationModule = await import("./emulation.js");
  }
  return loadedEmulationModule;
}
UI.ViewManager.registerViewExtension({
  location: "settings-view",
  commandPrompt: i18nLazyString(UIStrings.showDevices),
  title: i18nLazyString(UIStrings.devices),
  order: 30,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return new Emulation.DevicesSettingsTab.DevicesSettingsTab();
  },
  id: "devices",
  settings: [
    "standard-emulated-device-list",
    "custom-emulated-device-list"
  ],
  iconName: "devices"
});
//# sourceMappingURL=emulation-meta.js.map
