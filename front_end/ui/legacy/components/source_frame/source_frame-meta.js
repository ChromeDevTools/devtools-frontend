// gen/front_end/ui/legacy/components/source_frame/source_frame-meta.prebundle.js
import * as Common from "./../../../../core/common/common.js";
import * as i18n from "./../../../../core/i18n/i18n.js";
var UIStrings = {
  /**
   * @description Title of a setting under the Sources category in Settings
   */
  defaultIndentation: "Default indentation:",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToSpaces: "Set indentation to 2 spaces",
  /**
   * @description A drop-down menu option to set indentation to 2 spaces
   */
  Spaces: "2 spaces",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToFSpaces: "Set indentation to 4 spaces",
  /**
   * @description A drop-down menu option to set indentation to 4 spaces
   */
  fSpaces: "4 spaces",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToESpaces: "Set indentation to 8 spaces",
  /**
   * @description A drop-down menu option to set indentation to 8 spaces
   */
  eSpaces: "8 spaces",
  /**
   * @description Title of a setting under the Sources category that can be invoked through the Command Menu
   */
  setIndentationToTabCharacter: "Set indentation to tab character",
  /**
   * @description A drop-down menu option to set indentation to tab character
   */
  tabCharacter: "Tab character"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/source_frame/source_frame-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
Common.Settings.registerSettingExtension({
  category: "SOURCES",
  storageType: "Synced",
  title: i18nLazyString(UIStrings.defaultIndentation),
  settingName: "text-editor-indent",
  settingType: "enum",
  defaultValue: "    ",
  options: [
    {
      title: i18nLazyString(UIStrings.setIndentationToSpaces),
      text: i18nLazyString(UIStrings.Spaces),
      value: "  "
    },
    {
      title: i18nLazyString(UIStrings.setIndentationToFSpaces),
      text: i18nLazyString(UIStrings.fSpaces),
      value: "    "
    },
    {
      title: i18nLazyString(UIStrings.setIndentationToESpaces),
      text: i18nLazyString(UIStrings.eSpaces),
      value: "        "
    },
    {
      title: i18nLazyString(UIStrings.setIndentationToTabCharacter),
      text: i18nLazyString(UIStrings.tabCharacter),
      value: "	"
    }
  ]
});
//# sourceMappingURL=source_frame-meta.js.map
