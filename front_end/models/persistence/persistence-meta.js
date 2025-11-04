// gen/front_end/models/persistence/persistence-meta.prebundle.js
import * as Common from "./../../core/common/common.js";
import * as i18n from "./../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Title of a setting under the Persistence category in Settings
   */
  enableLocalOverrides: "Enable Local Overrides",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  interception: "interception",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  override: "override",
  /**
   * @description A tag of Group Network by frame setting that can be searched in the command menu
   */
  network: "network",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  rewrite: "rewrite",
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu.
   *Noun for network request.
   */
  request: "request",
  /**
   * @description Title of a setting under the Persistence category that can be invoked through the Command Menu
   */
  enableOverrideNetworkRequests: "Enable override network requests",
  /**
   * @description Title of a setting under the Persistence category that can be invoked through the Command Menu
   */
  disableOverrideNetworkRequests: "Disable override network requests"
};
var str_ = i18n.i18n.registerUIStrings("models/persistence/persistence-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
Common.Settings.registerSettingExtension({
  category: "PERSISTENCE",
  title: i18nLazyString(UIStrings.enableLocalOverrides),
  settingName: "persistence-network-overrides-enabled",
  settingType: "boolean",
  defaultValue: false,
  tags: [
    i18nLazyString(UIStrings.interception),
    i18nLazyString(UIStrings.override),
    i18nLazyString(UIStrings.network),
    i18nLazyString(UIStrings.rewrite),
    i18nLazyString(UIStrings.request)
  ],
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableOverrideNetworkRequests)
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableOverrideNetworkRequests)
    }
  ]
});
//# sourceMappingURL=persistence-meta.js.map
