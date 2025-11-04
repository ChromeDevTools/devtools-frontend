// gen/front_end/panels/coverage/coverage-meta.prebundle.js
import * as i18n from "./../../core/i18n/i18n.js";
import * as UI from "./../../ui/legacy/legacy.js";
var UIStrings = {
  /**
   * @description Title of the 'Coverage' tool in the bottom drawer
   */
  coverage: "Coverage",
  /**
   * @description Command for showing the 'Coverage' tool in the bottom drawer
   */
  showCoverage: "Show Coverage",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  instrumentCoverage: "Instrument coverage",
  /**
   * @description Title of an action under the Performance category that can be invoked through the Command Menu
   */
  stopInstrumentingCoverageAndShow: "Stop instrumenting coverage and show results",
  /**
   * @description Title of an action in the coverage tool to start with reload
   */
  startInstrumentingCoverageAnd: "Start instrumenting coverage and reload page",
  /**
   * @description Title of an action in the Coverage tool to clear all data.
   */
  clearCoverage: "Clear coverage",
  /**
   * @description Title of an action in the Coverage tool to export the data.
   */
  exportCoverage: "Export coverage"
};
var str_ = i18n.i18n.registerUIStrings("panels/coverage/coverage-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedCoverageModule;
async function loadCoverageModule() {
  if (!loadedCoverageModule) {
    loadedCoverageModule = await import("./coverage.js");
  }
  return loadedCoverageModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
  if (loadedCoverageModule === void 0) {
    return [];
  }
  return getClassCallBack(loadedCoverageModule);
}
UI.ViewManager.registerViewExtension({
  location: "drawer-view",
  id: "coverage",
  title: i18nLazyString(UIStrings.coverage),
  commandPrompt: i18nLazyString(UIStrings.showCoverage),
  persistence: "closeable",
  order: 100,
  async loadView() {
    const Coverage = await loadCoverageModule();
    return Coverage.CoverageView.CoverageView.instance();
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "coverage.toggle-recording",
  iconClass: "record-start",
  toggleable: true,
  toggledIconClass: "record-stop",
  toggleWithRedColor: true,
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  category: "PERFORMANCE",
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.instrumentCoverage)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.stopInstrumentingCoverageAndShow)
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "coverage.start-with-reload",
  iconClass: "refresh",
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  category: "PERFORMANCE",
  title: i18nLazyString(UIStrings.startInstrumentingCoverageAnd)
});
UI.ActionRegistration.registerActionExtension({
  actionId: "coverage.clear",
  iconClass: "clear",
  category: "PERFORMANCE",
  title: i18nLazyString(UIStrings.clearCoverage),
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Coverage) => [Coverage.CoverageView.CoverageView]);
  }
});
UI.ActionRegistration.registerActionExtension({
  actionId: "coverage.export",
  iconClass: "download",
  category: "PERFORMANCE",
  title: i18nLazyString(UIStrings.exportCoverage),
  async loadActionDelegate() {
    const Coverage = await loadCoverageModule();
    return new Coverage.CoverageView.ActionDelegate();
  },
  contextTypes() {
    return maybeRetrieveContextTypes((Coverage) => [Coverage.CoverageView.CoverageView]);
  }
});
//# sourceMappingURL=coverage-meta.js.map
