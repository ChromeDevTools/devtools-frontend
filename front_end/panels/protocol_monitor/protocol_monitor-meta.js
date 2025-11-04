// gen/front_end/panels/protocol_monitor/protocol_monitor-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as Root from "./../../core/root/root.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Title of the 'Protocol monitor' tool in the bottom drawer. This is a tool for
   * viewing and inspecting 'protocol' messages which are sent/received by DevTools. 'protocol' here
   * could be left untranslated as this refers to the Chrome DevTools Protocol (CDP) which is a
   * specific API name.
   */
  protocolMonitor: "Protocol monitor",
  /**
   * @description Command for showing the 'Protocol monitor' tool in the bottom drawer
   */
  showProtocolMonitor: "Show Protocol monitor"
};
var str_ = i18n.i18n.registerUIStrings("panels/protocol_monitor/protocol_monitor-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedProtocolMonitorModule;
async function loadProtocolMonitorModule() {
  if (!loadedProtocolMonitorModule) {
    loadedProtocolMonitorModule = await import("./protocol_monitor.js");
  }
  return loadedProtocolMonitorModule;
}
UI.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "protocol-monitor",
  title: i18nLazyString(UIStrings.protocolMonitor),
  commandPrompt: i18nLazyString(UIStrings.showProtocolMonitor),
  order: 100,
  persistence: "closeable",
  async loadView() {
    const ProtocolMonitor = await loadProtocolMonitorModule();
    return new ProtocolMonitor.ProtocolMonitor.ProtocolMonitorImpl();
  },
  experiment: "protocol-monitor"
});
//# sourceMappingURL=protocol_monitor-meta.js.map
