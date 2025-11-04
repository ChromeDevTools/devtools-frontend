// gen/front_end/ui/legacy/components/quick_open/quick_open-meta.prebundle.js
import * as i18n from "./../../../../core/i18n/i18n.js";
import * as UI from "./../../legacy.js";
var UIStrings = {
  /**
   * @description Title of action that opens a file
   */
  openFile: "Open file",
  /**
   * @description Title of command that runs a Quick Open command
   */
  runCommand: "Run command"
};
var str_ = i18n.i18n.registerUIStrings("ui/legacy/components/quick_open/quick_open-meta.ts", UIStrings);
var i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(void 0, str_);
var loadedQuickOpenModule;
async function loadQuickOpenModule() {
  if (!loadedQuickOpenModule) {
    loadedQuickOpenModule = await import("./quick_open.js");
  }
  return loadedQuickOpenModule;
}
UI.ActionRegistration.registerActionExtension({
  actionId: "quick-open.show-command-menu",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.runCommand),
  async loadActionDelegate() {
    const QuickOpen = await loadQuickOpenModule();
    return new QuickOpen.CommandMenu.ShowActionDelegate();
  },
  bindings: [
    {
      platform: "windows,linux",
      shortcut: "Ctrl+Shift+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+Shift+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      shortcut: "F1",
      keybindSets: [
        "vsCode"
      ]
    }
  ]
});
UI.ActionRegistration.registerActionExtension({
  actionId: "quick-open.show",
  category: "GLOBAL",
  title: i18nLazyString(UIStrings.openFile),
  async loadActionDelegate() {
    const QuickOpen = await loadQuickOpenModule();
    return new QuickOpen.QuickOpen.ShowActionDelegate();
  },
  order: 100,
  bindings: [
    {
      platform: "mac",
      shortcut: "Meta+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "mac",
      shortcut: "Meta+O",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+P",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    },
    {
      platform: "windows,linux",
      shortcut: "Ctrl+O",
      keybindSets: [
        "devToolsDefault",
        "vsCode"
      ]
    }
  ]
});
UI.ContextMenu.registerItem({
  location: "mainMenu/default",
  actionId: "quick-open.show-command-menu",
  order: void 0
});
UI.ContextMenu.registerItem({
  location: "mainMenu/default",
  actionId: "quick-open.show",
  order: void 0
});
//# sourceMappingURL=quick_open-meta.js.map
