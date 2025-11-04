// gen/front_end/models/logs/logs-meta.prebundle.js
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Text to preserve the log after refreshing
   */
  preserveLog: "Preserve log",
  /**
   * @description A term that can be used to search in the command menu, and will find the search
   * result 'Preserve log on page reload / navigation'. This is an additional search term to help
   * user find the setting even when they don't know the exact name of it.
   */
  preserve: "preserve",
  /**
   * @description A term that can be used to search in the command menu, and will find the search
   * result 'Preserve log on page reload / navigation'. This is an additional search term to help
   * user find the setting even when they don't know the exact name of it.
   */
  clear: "clear",
  /**
   * @description A term that can be used to search in the command menu, and will find the search
   * result 'Preserve log on page reload / navigation'. This is an additional search term to help
   * user find the setting even when they don't know the exact name of it.
   */
  reset: "reset",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  preserveLogOnPageReload: "Preserve log on page reload / navigation",
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  doNotPreserveLogOnPageReload: "Do not preserve log on page reload / navigation",
  /**
   * @description Title of an action in the network tool to toggle recording
   */
  recordNetworkLog: "Record network log"
};
var str_ = i18n.i18n.registerUIStrings("models/logs/logs-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
Common.Settings.registerSettingExtension({
  category: "NETWORK",
  title: i18nLazyString(UIStrings.preserveLog),
  settingName: "network-log.preserve-log",
  settingType: "boolean",
  defaultValue: false,
  tags: [
    i18nLazyString(UIStrings.preserve),
    i18nLazyString(UIStrings.clear),
    i18nLazyString(UIStrings.reset)
  ],
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.preserveLogOnPageReload)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotPreserveLogOnPageReload)
    }
  ]
});
Common.Settings.registerSettingExtension({
  category: "NETWORK",
  title: i18nLazyString(UIStrings.recordNetworkLog),
  settingName: "network-log.record-log",
  settingType: "boolean",
  defaultValue: true,
  storageType: "Session"
});
//# sourceMappingURL=logs-meta.js.map
